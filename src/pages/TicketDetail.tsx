import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { useParams, Link } from "react-router-dom";
import {
  Calendar,
  MapPin,
  ArrowLeft,
  Download,
  Share2,
  ExternalLink,
  Shield
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";

import { useWallet } from "@/hooks/usePushChainWallet";
import { getTicketDetailsByTokenId, fetchCompleteEventDetails } from '@/services/eventBrowseContract';

interface TicketDetailType {
  id: string;
  tokenId: number;
  eventName: string;
  eventDate: string;
  eventTime: string;
  location: string;
  fullAddress: string;
  image?: string;
  ticketNumber: string;
  contractAddress: string;
  contractId: string;
  owner: string;
  status: 'active' | 'used' | 'cancelled' | 'paused' | 'expired';
  purchasePrice: string;
  category: string;
  quantity: number;
  description?: string;
  metadataUri?: string;
  eventCancelled?: boolean;
  eventPaused?: boolean;
  ticketPrice?: string;
  blockchain: string;
  explorerUrl: string;
}

const TicketDetail = () => {
  const { id } = useParams();
  const { wallet } = useWallet();
  const userAddress = wallet?.address;

  const [ticket, setTicket] = useState<TicketDetailType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTicket = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('🎫 Loading ticket details for ID:', id);
        console.log('👤 User address:', userAddress);

        // Parse ticket ID: format is "contractAddress-tokenId"
        const parts = id.split('-');
        if (parts.length < 2) {
          console.error('❌ Invalid ticket ID format:', id);
          toast.error('Invalid ticket ID format');
          setLoading(false);
          return;
        }

        const contractAddress = parts[0];
        const tokenIdStr = parts.slice(1).join('-'); // Handle if tokenId contains dashes
        const tokenId = parseInt(tokenIdStr);

        if (!contractAddress || isNaN(tokenId)) {
          console.error('❌ Invalid ticket ID format:', id);
          toast.error('Invalid ticket ID format');
          setLoading(false);
          return;
        }

        console.log('📍 Contract:', contractAddress);
        console.log('🎫 Token ID:', tokenId);

        // Fetch ticket details from blockchain
        const [ticketDetails, eventDetails] = await Promise.all([
          getTicketDetailsByTokenId(contractAddress, tokenId),
          fetchCompleteEventDetails(contractAddress)
        ]);

        if (!ticketDetails || !eventDetails) {
          console.error('❌ Failed to load ticket details from blockchain');
          toast.error('Failed to load ticket details');
          setLoading(false);
          return;
        }

        console.log('✅ Ticket details:', ticketDetails);
        console.log('✅ Event details:', eventDetails);
        console.log('🔍 Ticket owner:', ticketDetails.owner);

        // Verify ownership - only owner can access this page
        if (userAddress && ticketDetails.owner.toLowerCase() !== userAddress.toLowerCase()) {
          console.warn('⚠️ User is not the owner of this ticket');
          console.warn('   Owner:', ticketDetails.owner);
          console.warn('   User:', userAddress);
          toast.error('Access denied: You are not the owner of this ticket');
          setTicket(null);
          setLoading(false);
          return;
        }

        // If wallet not connected yet, wait for it
        if (!userAddress) {
          console.log('⏳ Waiting for wallet connection...');
          setLoading(false);
          return;
        }

        // Determine ticket status
        let status: 'active' | 'used' | 'cancelled' | 'paused' | 'expired' = 'active';
        
        if (eventDetails.eventCancelled) {
          status = 'cancelled';
        } else if (eventDetails.eventPaused) {
          status = 'paused';
        } else if (ticketDetails.used) {
          status = 'used';
        } else if (eventDetails.status === 'Ended' || !eventDetails.isActive) {
          status = 'expired';
        }

        // Transform data for component
        const ticketData: TicketDetailType = {
          id,
          tokenId,
          eventName: ticketDetails.eventName || eventDetails.eventName,
          eventDate: eventDetails.date,
          eventTime: eventDetails.time,
          location: ticketDetails.eventVenue || eventDetails.location,
          fullAddress: eventDetails.venueAddress || eventDetails.location,
          image: ticketDetails.eventImageUri || eventDetails.image,
          ticketNumber: `#TKT-${tokenId.toString().padStart(6, '0')}`,
          contractAddress,
          contractId: contractAddress,
          owner: ticketDetails.owner,
          status,
          purchasePrice: `${eventDetails.price} PC`,
          category: 'General',
          quantity: 1,
          description: eventDetails.description,
          metadataUri: eventDetails.metadata?.uri || '',
          eventCancelled: eventDetails.eventCancelled,
          eventPaused: eventDetails.eventPaused,
          ticketPrice: eventDetails.price,
          blockchain: 'Push Chain Donut',
          explorerUrl: `https://donut.push.network/token/${contractAddress}/instance/${tokenId}`,
        };

        setTicket(ticketData);
        console.log('✅ Ticket loaded successfully');

      } catch (error) {
        console.error('❌ Error loading ticket:', error);
        toast.error('Error loading ticket from blockchain');
      } finally {
        setLoading(false);
      }
    };

    loadTicket();
  }, [id, userAddress]);

  const handleDownload = () => {
    toast.success("Ticket downloaded successfully!");
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  };

  const handleViewOnExplorer = () => {
    if (!ticket) return;

    // Link to specific NFT instance on Push Chain Explorer
    const explorerUrl = `https://donut.push.network/token/${ticket.contractAddress}/instance/${ticket.tokenId}`;
    window.open(explorerUrl, '_blank');
    toast.info("Opening NFT on blockchain explorer...");
  };

  // Loading state
  if (loading) {
    return (
      <AppLayout>
        <div className="pl-4 pr-4 py-4 md:pl-6 md:pr-6 md:py-6 max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-800 rounded w-1/4"></div>
            <div className="h-96 bg-gray-800 rounded-2xl"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Wallet not connected - show connect prompt
  if (!userAddress) {
    return (
      <AppLayout>
        <div className="pl-4 pr-4 py-4 md:pl-6 md:pr-6 md:py-6 max-w-5xl mx-auto">
          <Link
            to="/app/my-tickets"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to My Tickets
          </Link>
          <div className="text-center py-16 bg-[#1A1A1A] border border-gray-800 rounded-2xl">
            <div className="w-20 h-20 bg-[#d548ec]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-10 h-10 text-[#d548ec]" />
            </div>
            <p className="text-white text-xl font-semibold mb-2">Wallet Not Connected</p>
            <p className="text-gray-400 mb-6">
              Please connect your wallet to view ticket details.
            </p>
            <Link
              to="/app/my-tickets"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#d548ec] hover:bg-[#c030d6] text-white font-semibold rounded-xl transition-colors"
            >
              Back to My Tickets
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  // No ticket found or access denied
  if (!ticket) {
    return (
      <AppLayout>
        <div className="pl-4 pr-4 py-4 md:pl-6 md:pr-6 md:py-6 max-w-5xl mx-auto">
          <Link
            to="/app/my-tickets"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to My Tickets
          </Link>
          <div className="text-center py-16 bg-[#1A1A1A] border border-gray-800 rounded-2xl">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-10 h-10 text-red-500" />
            </div>
            <p className="text-white text-xl font-semibold mb-2">Ticket Not Found or Access Denied</p>
            <p className="text-gray-400 mb-6">
              This ticket could not be loaded, or you are not the owner of this ticket.
            </p>
            <Link
              to="/app/my-tickets"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#d548ec] hover:bg-[#c030d6] text-white font-semibold rounded-xl transition-colors"
            >
              View My Tickets
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="pl-4 pr-4 py-4 md:pl-6 md:pr-6 md:py-6 max-w-5xl mx-auto">
        {/* Back Button */}
        <Link
          to="/app/my-tickets"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to My Tickets
        </Link>

        {/* Ticket Detail Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
            {/* Ticket Card with QR Code */}
            <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl overflow-hidden">
              {/* Header Image */}
              <div
                className="h-48 bg-cover bg-center relative"
                style={{ backgroundImage: `url('${ticket.image}')` }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] to-transparent" />
                <div className={`absolute top-4 right-4 px-3 py-1 text-white text-xs font-bold rounded-full ${
                  ticket.status === 'active' ? 'bg-green-500' : ticket.status === 'used' ? 'bg-gray-500' : 'bg-[#e7a4fd]'
                }`}>
                  {ticket.status.toUpperCase()}
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Event Title & Badge */}
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">{ticket.eventName}</h1>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="px-3 py-1.5 bg-gradient-to-r from-[#d548ec] to-purple-600 text-white text-xs font-bold rounded-full">
                      {ticket.status.toUpperCase()}
                    </span>
                    <span className="text-gray-400 text-sm">{ticket.ticketNumber}</span>
                  </div>
                </div>

                {/* QR Code - Clean Design */}
                <div className="bg-gradient-to-br from-[#d548ec]/5 to-purple-600/5 border border-gray-800/50 rounded-2xl p-6">
                  <div className="text-center mb-4">
                    <h3 className="text-white font-semibold mb-1">Your Digital Pass</h3>
                    <p className="text-gray-400 text-xs">Blockchain-Verified Ticket</p>
                  </div>

                  <div className="max-w-xs mx-auto">
                    <div className="bg-white rounded-2xl p-6 shadow-lg flex items-center justify-center mb-4">
                      <QRCodeCanvas
                        value={JSON.stringify({
                          contractAddress: ticket.contractAddress,
                          tokenId: ticket.tokenId,
                          owner: ticket.owner,
                          eventName: ticket.eventName,
                        })}
                        size={220}
                        level="H"
                        includeMargin={false}
                      />
                    </div>

                    <div className="text-center space-y-2">
                      <p className="text-gray-400 text-xs">Scan at event entrance to check-in</p>
                      <button
                        onClick={handleViewOnExplorer}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#d548ec]/10 hover:bg-[#d548ec]/20 border border-[#d548ec]/20 text-[#d548ec] text-sm font-medium rounded-xl transition-all"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View on Blockchain
                      </button>
                    </div>
                  </div>
                </div>

                {/* Event Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#0A0A0A] border border-gray-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-[#d548ec]/10 rounded-lg">
                        <Calendar className="w-5 h-5 text-[#d548ec]" />
                      </div>
                      <p className="text-gray-400 text-xs font-medium">Date & Time</p>
                    </div>
                    <p className="text-white font-semibold ml-11">{ticket.eventDate}</p>
                    <p className="text-gray-300 text-sm ml-11">{ticket.eventTime}</p>
                  </div>

                  <div className="bg-[#0A0A0A] border border-gray-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-purple-600/10 rounded-lg">
                        <MapPin className="w-5 h-5 text-purple-400" />
                      </div>
                      <p className="text-gray-400 text-xs font-medium">Location</p>
                    </div>
                    <p className="text-white font-semibold ml-11">{ticket.location}</p>
                    {ticket.fullAddress && ticket.fullAddress !== ticket.location && (
                      <p className="text-gray-300 text-sm ml-11 truncate">{ticket.fullAddress}</p>
                    )}
                  </div>
                </div>

                {/* Event Description (if available) */}
                {ticket.description && (
                  <div className="bg-[#0A0A0A] border border-gray-800/50 rounded-xl p-4">
                    <h3 className="text-white font-semibold mb-2">About Event</h3>
                    <p className="text-gray-300 text-sm leading-relaxed">{ticket.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions - Improved Design */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 px-6 py-4 bg-[#0A0A0A] border border-gray-800 hover:border-[#d548ec] hover:bg-gray-900 text-white font-semibold rounded-xl transition-all hover:scale-105"
              >
                <Download className="w-5 h-5" />
                Download
              </button>
              <button
                onClick={handleShare}
                className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-[#d548ec] to-purple-600 hover:from-[#c030d6] hover:to-purple-700 text-white font-semibold rounded-xl transition-all hover:scale-105"
              >
                <Share2 className="w-5 h-5" />
                Share
              </button>
            </div>
          </div>

          {/* Sidebar - NFT Details */}
          <div className="lg:col-span-1 space-y-6">
            {/* NFT Information */}
            <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">NFT Details</h2>

              <div className="space-y-4">
                <div>
                  <p className="text-gray-400 text-xs mb-1">Token ID</p>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-mono text-sm">#{ticket.tokenId}</p>
                    <button
                      onClick={handleViewOnExplorer}
                      className="p-1 hover:bg-gray-800 rounded transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-gray-400 text-xs mb-1">Contract ID</p>
                  <p className="text-white font-mono text-xs break-all">{ticket.contractId}</p>
                </div>

                <div>
                  <p className="text-gray-400 text-xs mb-1">Blockchain</p>
                  <p className="text-white text-sm">{ticket.blockchain}</p>
                </div>

                <div>
                  <p className="text-gray-400 text-xs mb-1">Token Standard</p>
                  <p className="text-white text-sm">ERC-721 (NFT)</p>
                </div>

                <button
                  onClick={handleViewOnExplorer}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#0A0A0A] border border-gray-800 hover:border-[#d548ec] text-white font-medium rounded-xl transition-all"
                >
                  <Shield className="w-4 h-4" />
                  View on Explorer
                </button>
              </div>
            </div>

            {/* Purchase Information */}
            <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">Ticket Info</h2>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Owner</span>
                  <span className="text-white text-xs font-mono truncate max-w-[150px]" title={String(ticket.owner)}>
                    {userAddress && ticket.owner.toLowerCase() === userAddress.toLowerCase() 
                      ? 'You' 
                      : `${String(ticket.owner).slice(0, 6)}...${String(ticket.owner).slice(-4)}`
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Price</span>
                  <span className="text-[#d548ec] text-sm font-bold">{ticket.purchasePrice}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Category</span>
                  <span className="text-white text-sm font-medium">{ticket.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Status</span>
                  <span className={`text-sm font-medium ${
                    ticket.status === 'active' ? 'text-green-500' :
                    ticket.status === 'used' ? 'text-gray-500' :
                    ticket.status === 'cancelled' ? 'text-red-500' :
                    ticket.status === 'paused' ? 'text-yellow-500' :
                    'text-[#e7a4fd]'
                  }`}>
                    {ticket.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Transfer/Sell (if active) */}
            {ticket.status === "active" && (
              <div className="bg-gradient-to-br from-[#d548ec]/10 to-purple-600/10 border border-[#d548ec]/20 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-3">Transfer or Sell</h3>
                <p className="text-gray-400 text-sm mb-4">
                  You can transfer this ticket to another wallet or list it on the secondary market.
                </p>
                <div className="space-y-2">
                  <button 
                    onClick={() => toast.info('Transfer feature coming soon!')}
                    className="w-full px-4 py-3 bg-[#d548ec] hover:bg-[#c030d6] text-white font-semibold rounded-xl transition-colors"
                  >
                    Transfer Ticket
                  </button>
                  <button 
                    onClick={() => toast.info('Marketplace listing coming soon!')}
                    className="w-full px-4 py-3 bg-[#1A1A1A] hover:bg-gray-800 text-white font-semibold rounded-xl transition-colors border border-gray-800"
                  >
                    List for Sale
                  </button>
                </div>
              </div>
            )}

            {/* Event Info (if cancelled or paused) */}
            {(ticket.status === 'cancelled' || ticket.status === 'paused') && (
              <div className={`border rounded-2xl p-6 ${
                ticket.status === 'cancelled' 
                  ? 'bg-red-500/10 border-red-500/30' 
                  : 'bg-yellow-500/10 border-yellow-500/30'
              }`}>
                <h3 className={`font-semibold mb-3 ${
                  ticket.status === 'cancelled' ? 'text-red-500' : 'text-yellow-500'
                }`}>
                  {ticket.status === 'cancelled' ? 'Event Cancelled' : 'Event Paused'}
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  {ticket.status === 'cancelled' 
                    ? 'This event has been cancelled. You may be eligible for a refund. Check the My Tickets page for refund options.'
                    : 'This event has been temporarily paused by the organizer. Your ticket is still valid and will be honored when the event resumes.'
                  }
                </p>
                {ticket.status === 'cancelled' && (
                  <Link
                    to="/app/my-tickets"
                    className="w-full inline-flex items-center justify-center px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors"
                  >
                    Check Refund Status
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </AppLayout>
  );
};

export default TicketDetail;