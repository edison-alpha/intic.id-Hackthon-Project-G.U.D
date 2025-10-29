/**
 * Refund Claim Component
 * Allows users to claim refunds for cancelled events
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/hooks/usePushChainWallet';
import { toast } from 'sonner';
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Wallet,
  RefreshCw,
  DollarSign,
  Ticket,
} from 'lucide-react';
import { ethers } from 'ethers';
import EventTicketABI from '@/contracts/EventTicket.json';

interface RefundableTicket {
  contractAddress: string;
  eventName: string;
  eventImage: string;
  ticketCount: number;
  refundAmount: string;
  refundAmountFormatted: string;
  alreadyClaimed: boolean;
  canClaim: boolean;
}

const RefundClaim = () => {
  const { wallet } = useWallet();
  const [refundableTickets, setRefundableTickets] = useState<RefundableTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);

  /**
   * Load refundable tickets from blockchain
   */
  const loadRefundableTickets = async () => {
    if (!wallet?.address) return;

    setLoading(true);
    try {
      const provider = new ethers.JsonRpcProvider('https://rpc-testnet.push.org');
      
      // Get all user tickets (you'll need to implement this)
      // For now, we'll use a placeholder
      // In production, you'd fetch from EventOrganizer contract or indexed events
      
      const refundable: RefundableTicket[] = [];
      
      // This is a placeholder - you'd fetch actual contracts from blockchain
      // const userTickets = await getAllUserTickets(wallet.address);
      
      // For each contract, check if refunds are enabled
      // if (refundsEnabled) {
      //   const refundInfo = await contract.getRefundInfo(wallet.address);
      //   refundable.push(...);
      // }
      
      setRefundableTickets(refundable);
    } catch (error) {
      console.error('Error loading refundable tickets:', error);
      toast.error('Failed to load refundable tickets');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Claim refund for a specific event
   */
  const handleClaimRefund = async (contractAddress: string) => {
    if (!wallet?.address) return;

    setClaiming(contractAddress);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, EventTicketABI.abi, signer);

      // Call claimRefund function
      const tx = await contract.claimRefund();
      
      toast.info('Transaction submitted', {
        description: 'Waiting for confirmation...',
      });

      await tx.wait();

      toast.success('Refund claimed successfully!', {
        description: 'Your PUSH has been returned to your wallet',
      });

      // Reload refundable tickets
      await loadRefundableTickets();
    } catch (error: any) {
      console.error('Error claiming refund:', error);
      toast.error('Failed to claim refund', {
        description: error.message || 'Please try again',
      });
    } finally {
      setClaiming(null);
    }
  };

  useEffect(() => {
    if (wallet?.address) {
      loadRefundableTickets();
    }
  }, [wallet?.address]);

  if (!wallet?.address) {
    return (
      <Card className="bg-[#1A1A1A] border-gray-800">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Wallet className="w-12 h-12 text-gray-600 mb-4" />
          <p className="text-gray-400 text-center">Connect your wallet to view refundable tickets</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="bg-[#1A1A1A] border-gray-800">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#d548ec] animate-spin mb-4" />
          <p className="text-gray-400">Loading refundable tickets...</p>
        </CardContent>
      </Card>
    );
  }

  if (refundableTickets.length === 0) {
    return (
      <Card className="bg-[#1A1A1A] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Refund Claims
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle className="w-12 h-12 text-gray-600 mb-4" />
          <p className="text-gray-400 text-center">No refundable tickets found</p>
          <p className="text-gray-600 text-sm text-center mt-2">
            Refunds are available when events are cancelled
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-[#1A1A1A] border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Refund Claims
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={loadRefundableTickets}
              disabled={loading}
              className="bg-[#0A0A0A] border-gray-700 text-white hover:bg-[#2A2A2A]"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Refundable Tickets List */}
      {refundableTickets.map((ticket) => (
        <Card key={ticket.contractAddress} className="bg-[#1A1A1A] border-gray-800 hover:border-gray-700 transition-colors">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Event Image */}
              <div className="w-full md:w-48 h-32 flex-shrink-0">
                <img
                  src={ticket.eventImage || 'https://via.placeholder.com/400x300?text=Event'}
                  alt={ticket.eventName}
                  className="w-full h-full object-cover rounded-xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Event';
                  }}
                />
              </div>

              {/* Event Info */}
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{ticket.eventName}</h3>
                  <Badge variant="destructive" className="bg-red-600/20 text-red-400 border-red-600/30">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Event Cancelled
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500 text-sm">Your Tickets</p>
                    <p className="text-white font-semibold flex items-center gap-2">
                      <Ticket className="w-4 h-4" />
                      {ticket.ticketCount} ticket{ticket.ticketCount > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Refund Amount</p>
                    <p className="text-green-400 font-bold text-lg">
                      {ticket.refundAmountFormatted}
                    </p>
                  </div>
                </div>

                {/* Claim Status */}
                {ticket.alreadyClaimed ? (
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Refund already claimed</span>
                  </div>
                ) : (
                  <Button
                    onClick={() => handleClaimRefund(ticket.contractAddress)}
                    disabled={!ticket.canClaim || claiming === ticket.contractAddress}
                    className="bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] hover:from-[#c030d6] hover:to-[#d183f0] text-white font-semibold disabled:opacity-50"
                  >
                    {claiming === ticket.contractAddress ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Claiming...
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-4 h-4 mr-2" />
                        Claim Refund
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default RefundClaim;
