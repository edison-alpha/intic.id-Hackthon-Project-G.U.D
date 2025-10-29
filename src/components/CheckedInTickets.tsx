import { useState, useEffect } from 'react';
import { CheckCircle, User, Clock, RefreshCw, Loader2 } from 'lucide-react';
import { ethers } from 'ethers';
import EventTicketABI from '@/contracts/EventTicket.json';
import { getNetworkConfig } from '@/config/contracts';

interface CheckedInTicket {
  tokenId: number;
  owner: string;
  checkedInAt: string;
  used: boolean;
}

interface CheckedInTicketsProps {
  contractAddress: string;
  contractName: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

const CheckedInTickets = ({ 
  contractAddress, 
  contractName,
  autoRefresh = true,
  refreshInterval = 10000 // Default 10 seconds
}: CheckedInTicketsProps) => {
  const [checkedInTickets, setCheckedInTickets] = useState<CheckedInTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  /**
   * Fetch all checked-in tickets from blockchain
   */
  const fetchCheckedInTickets = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const networkConfig = getNetworkConfig();
      const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
      const contract = new ethers.Contract(contractAddress, EventTicketABI.abi, provider) as any;

      // Get total supply to know how many tokens to check
      const totalSupply = await contract.totalSupply();
      const checkedIn: CheckedInTicket[] = [];

      // Check each token using tokenByIndex (more reliable for ERC721Enumerable)
      for (let i = 0; i < Number(totalSupply); i++) {
        try {
          // Get token ID by index
          const tokenId = await contract.tokenByIndex(i);
          
          // Check if ticket is used
          const isUsed = await contract.used(tokenId);
          
          if (isUsed) {
            // Get owner of the token
            const owner = await contract.ownerOf(tokenId);
            
            checkedIn.push({
              tokenId: Number(tokenId),
              owner,
              checkedInAt: new Date().toISOString(), // You can enhance this by listening to events
              used: true,
            });
          }
        } catch (error) {
          // Token might not exist or other error, skip it
          console.warn(`Could not check token at index ${i}:`, error);
        }
      }

      setCheckedInTickets(checkedIn);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching checked-in tickets:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchCheckedInTickets();
  }, [contractAddress]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchCheckedInTickets(true);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, contractAddress]);

  const handleManualRefresh = () => {
    fetchCheckedInTickets(true);
  };

  if (loading && checkedInTickets.length === 0) {
    return (
      <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-[#d548ec] animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Checked-In Tickets</h3>
            <p className="text-sm text-gray-400">
              {checkedInTickets.length} ticket{checkedInTickets.length !== 1 ? 's' : ''} used
            </p>
          </div>
        </div>
        
        <button
          onClick={handleManualRefresh}
          disabled={refreshing}
          className="p-2 bg-[#0A0A0A] border border-gray-800 rounded-lg hover:border-[#d548ec] transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Status Bar */}
      {lastUpdate && (
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-4 pb-4 border-b border-gray-800">
          <Clock className="w-3 h-3" />
          <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
          {autoRefresh && <span className="ml-auto text-green-500">● Auto-refresh enabled</span>}
        </div>
      )}

      {/* Tickets List */}
      {checkedInTickets.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-8 h-8 text-gray-600" />
          </div>
          <p className="text-gray-400 text-sm">No tickets checked in yet</p>
          <p className="text-gray-600 text-xs mt-1">Attendees will appear here after checking in</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin">
          {checkedInTickets.map((ticket) => (
            <div
              key={ticket.tokenId}
              className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-green-500 font-bold text-sm">#{ticket.tokenId}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-white font-semibold text-sm">Token #{ticket.tokenId}</p>
                      <div className="px-2 py-0.5 bg-green-500/10 text-green-500 text-xs font-medium rounded-full">
                        Used
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <User className="w-3 h-3" />
                      <span className="truncate font-mono">
                        {ticket.owner.slice(0, 6)}...{ticket.owner.slice(-4)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Custom Scrollbar Styles */}
      <style>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: #1A1A1A;
          border-radius: 10px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #374151;
          border-radius: 10px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #4B5563;
        }
      `}</style>
    </div>
  );
};

export default CheckedInTickets;
