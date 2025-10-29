/**
 * Attendee Check-In Page (BLOCKCHAIN VERSION)
 * - User selects their ticket
 * - Scans QR code from EO
 * - Approves transaction to mark ticket as used
 * - Real-time check-in tracking on blockchain
 */

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import QRScanner from '@/components/QRScanner';
import { useWallet } from '@/hooks/usePushChainWallet';
import { toast } from 'sonner';
import {
  CheckCircle,
  Ticket,
  Calendar,
  MapPin,
  AlertTriangle,
  Loader2,
  CheckCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAllUserTickets } from '@/services/eventBrowseContract';
import { checkInTicketUniversal } from '@/services/checkInUniversal';
import { usePushChainClient, usePushChain } from '@pushchain/ui-kit';

interface CheckInPointData {
  contractAddress: string;
  contractName: string;
}

// Parse check-in point QR code
// Supports both formats:
// 1. checkin:address.name (EOCheckInQR format)
// 2. checkin:address.name:eventId (EventCheckInPoint format)
const parseQRCode = (qrData: string): { contractAddress: string; contractName: string } | null => {
  try {
    console.log("🔍 [Parser] Original:", qrData);

    // Clean the QR data
    const cleaned = qrData.trim();
    console.log("🔍 [Parser] Cleaned:", cleaned);

    // Check if it starts with checkin:
    if (!cleaned.startsWith('checkin:')) {
      console.error("❌ [Parser] Missing 'checkin:' prefix");
      return null;
    }

    // Remove the prefix
    const withoutPrefix = cleaned.substring(8); // Remove "checkin:"
    console.log("🔍 [Parser] Without prefix:", withoutPrefix);

    // Split by colon first to handle optional eventId
    // Format can be: address.name OR address.name:eventId
    const colonParts = withoutPrefix.split(':');
    const contractPart = colonParts[0]; // address.name
    const eventId = colonParts.length > 1 ? colonParts[1] : null;

    console.log("🔍 [Parser] Contract Part:", contractPart);
    if (eventId) {
      console.log("🔍 [Parser] Event ID:", eventId);
    }

    // Validate contractPart exists
    if (!contractPart) {
      console.error("❌ [Parser] Missing contract part");
      return null;
    }

    // Now split by dot to get contract address and name
    const parts = contractPart.split('.');
    if (parts.length < 2) {
      console.error("❌ [Parser] Invalid format, expected address.name");
      return null;
    }

    const contractAddress = parts[0];
    // Handle case where contractName might contain dots
    const contractName = parts.slice(1).join('.');

    console.log("🔍 [Parser] Contract Address:", contractAddress);
    console.log("🔍 [Parser] Contract Name:", contractName);

    // Validate that we have both address and name
    if (!contractAddress || !contractName) {
      console.error("❌ [Parser] Missing contract address or name");
      return null;
    }

    // Validate contract address format (Stacks or Ethereum-like)
    const isStacksAddress = contractAddress.startsWith('SP') || contractAddress.startsWith('ST');
    const isEthAddress = /^0x[a-fA-F0-9]{40}$/.test(contractAddress);

    if (!isStacksAddress && !isEthAddress) {
      console.error("❌ [Parser] Invalid contract address format:", contractAddress);
      return null;
    }

    console.log("✅ [Parser] Success:", { contractAddress, contractName });
    return { contractAddress, contractName };
  } catch (error) {
    console.error("❌ [Parser] Error:", error);
    return null;
  }
};

// Define check-in result interface
interface CheckInResult {
  success: boolean;
  txId?: string;
  message?: string;
  status?: string;
}

const AttendeeCheckIn = () => {
  const { wallet } = useWallet();
  const navigate = useNavigate();

  // Get Push Chain client for universal transactions
  const { pushChainClient } = usePushChainClient();
  const { PushChain } = usePushChain();

  // Data states
  interface Ticket {
    id: string;
    tokenId: number;
    eventName: string;
    eventDate: string;
    eventTime: string;
    location: string;
    image: string;
    ticketNumber: string;
    contractAddress: string;
    contractName: string;
    contractId: string;
    status: string;
    quantity: number;
    category: string;
    price: string;
    mintTxId: string;
  }

  const [userTickets, setUserTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [txId, setTxId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // UI states
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Load user tickets from blockchain
  useEffect(() => {
    if (wallet?.address) {
      loadUserTickets();
    } else {
      setUserTickets([]);
      setLoading(false);
    }
  }, [wallet?.address]);

  const loadUserTickets = async () => {
    if (!wallet?.address) return;
    
    setLoading(true);
    try {
      const tickets = await getAllUserTickets(wallet.address);
      
      // Filter tickets:
      // - Not used (ticket not checked in)
      // - Event not cancelled
      // - Event not paused
      // - Event not ended
      const availableTickets = tickets.filter(ticket => {
        const isUsed = ticket.ticketDetails.used;
        const eventDetails = ticket.eventDetails;
        const isCancelled = eventDetails.eventCancelled || eventDetails.isCancelled;
        const isPaused = eventDetails.eventPaused;
        const isEnded = eventDetails.status === 'Ended' || eventDetails.ended;
        
        // Only show tickets that are: not used, not cancelled, not paused, not ended
        return !isUsed && !isCancelled && !isPaused && !isEnded;
      });
      
      console.log(`📋 Total tickets: ${tickets.length}, Available for check-in: ${availableTickets.length}`);
      
      // Transform to component format
      const transformedTickets = availableTickets.map((ticket) => {
        const eventDetails = ticket.eventDetails;
        const eventDateMs = Number(eventDetails.eventDate) * 1000;
        
        return {
          id: `${ticket.contractAddress}-${ticket.tokenId}`,
          tokenId: ticket.tokenId,
          eventName: eventDetails.eventName || eventDetails.title,
          eventDate: new Date(eventDateMs).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          eventTime: new Date(eventDateMs).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          }),
          location: eventDetails.eventVenue || eventDetails.location,
          image: eventDetails.eventImageUri || eventDetails.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
          ticketNumber: `#TKT-${ticket.tokenId.toString().padStart(6, '0')}`,
          contractAddress: ticket.contractAddress,
          contractName: '', // Will be extracted from contractId
          contractId: ticket.contractAddress,
          status: 'active',
          quantity: 1,
          category: 'General',
          price: eventDetails.ticketPrice || eventDetails.price || '0',
          mintTxId: '',
        };
      });

      setUserTickets(transformedTickets);
      
      if (transformedTickets.length > 0) {
        setSelectedTicket(transformedTickets[0]);
      }
    } catch (error) {
      console.error('Error loading user tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleScanSuccess = async (decodedText: string) => {
    if (!selectedTicket) {
      toast.error('Please select a ticket first');
      return;
    }

    console.log('📱 Scanned QR:', decodedText);

    // Parse QR data using parseQRCode function
    const pointData = parseQRCode(decodedText);

    if (!pointData) {
      toast.error('Invalid QR code', {
        description: 'Please scan the check-in QR code from event organizer',
      });
      return;
    }

    // Validate ticket matches event (compare contract addresses only)
    const scannedAddress = pointData.contractAddress.toLowerCase();
    const ticketAddress = selectedTicket.contractAddress.toLowerCase();

    console.log('🔍 ========== ADDRESS VALIDATION ==========');
    console.log('🔍 [QR Code] Scanned Address:', scannedAddress);
    console.log('🔍 [QR Code] Contract Name:', pointData.contractName);
    console.log('🔍 [Ticket] Ticket Address:', ticketAddress);
    console.log('🔍 [Ticket] Event Name:', selectedTicket.eventName);
    console.log('🔍 [Ticket] Token ID:', selectedTicket.tokenId);
    console.log('🔍 [Match] Are they equal?', scannedAddress === ticketAddress);
    console.log('🔍 =========================================');

    if (scannedAddress !== ticketAddress) {
      console.error('❌ Address mismatch!');
      console.error('❌ Expected:', ticketAddress);
      console.error('❌ Got:', scannedAddress);
      toast.error('Wrong event!', {
        description: `This QR is for a different event. Your ticket is for: ${selectedTicket.eventName}`,
      });
      return;
    }

    console.log('✅ [Validation] Addresses match! Proceeding with check-in...');
    
    // Success - Process check-in
    setIsScanning(false);
    await handleCheckIn(pointData);
  };

  const handleCheckIn = async (checkInPointData: CheckInPointData) => {
    if (!selectedTicket || !wallet?.address) {
      toast.error('Missing information');
      return;
    }

    if (!pushChainClient || !PushChain) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsProcessing(true);

    try {
      console.log('🎫 Starting universal check-in...');
      console.log('📍 Contract:', checkInPointData.contractAddress);
      console.log('🎫 Token ID:', selectedTicket.tokenId);
      console.log('💡 You can approve from ANY chain!');

      // Universal transaction - works from Sepolia, Arbitrum, Optimism, Solana, etc.
      // Push Chain preserves user's identity as msg.sender on destination chain
      const result = await checkInTicketUniversal(
        pushChainClient,
        PushChain,
        checkInPointData.contractAddress,
        selectedTicket.tokenId
      );

      console.log('✅ Check-in successful:', result);

      // Show success
      setTxId(result.transactionHash || '');
      setShowSuccess(true);

      // Create explorer URL
      const explorerUrl = result.transactionHash
        ? `https://donut.push.network/tx/${result.transactionHash}`
        : null;

      toast.success('Check-in successful!', {
        description: 'Your attendance has been recorded on Push Chain',
        duration: 8000,
        icon: '🎉',
        action: explorerUrl ? {
          label: 'View on Explorer',
          onClick: () => window.open(explorerUrl, '_blank')
        } : undefined
      });
    } catch (error: any) {
      console.error('❌ Check-in error:', error);

      const errorMessage = error.message || 'An unknown error occurred';

      if (errorMessage?.includes('rejected') || errorMessage?.includes('cancelled')) {
        toast.info('Transaction cancelled by user');
        setIsScanning(true);
      } else if (errorMessage?.includes('already used')) {
        toast.error('Ticket already used', {
          description: 'This ticket has already been checked in'
        });
        setIsScanning(true);
      } else if (errorMessage?.includes('not owner') || errorMessage?.includes('not the owner')) {
        toast.error('Not ticket owner', {
          description: 'You are not the owner of this ticket'
        });
        setIsScanning(true);
      } else if (errorMessage?.includes('Insufficient PC balance')) {
        toast.error('Insufficient balance', {
          description: 'You need more PC tokens to pay for gas fee'
        });
        setIsScanning(true);
      } else if (errorMessage?.includes('Network error')) {
        toast.error('Network error', {
          description: 'Please ensure you are connected to Push Chain'
        });
        setIsScanning(true);
      } else {
        toast.error('Check-in failed', {
          description: errorMessage,
          duration: 8000
        });
        setIsScanning(true);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = async () => {
    setShowSuccess(false);
    setTxId('');
    setIsScanning(false);
    
    // Reload tickets to reflect the check-in
    await loadUserTickets();
  };

  // Wallet not connected
  if (!wallet?.address) {
    return (
      <AppLayout>
        <div className="px-4 py-6 md:px-6 md:py-8 max-w-4xl mx-auto">
          <div className="bg-[#1A1A1A] border border-gray-800 rounded-3xl p-12 text-center">
            <AlertTriangle className="w-16 h-16 text-[#e7a4fd] mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Wallet Not Connected</h3>
            <p className="text-gray-400">Please connect your wallet to check-in</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // No tickets
  if (userTickets.length === 0 && !loading) {
    return (
      <AppLayout>
        <div className="px-4 py-6 md:px-6 md:py-8 max-w-4xl mx-auto">
          <div className="bg-[#1A1A1A] border border-gray-800 rounded-3xl p-12 text-center">
            <Ticket className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Active Tickets</h3>
            <p className="text-gray-400 mb-6">You don't have any active tickets available for check-in</p>
            <button
              onClick={() => navigate('/app')}
              className="px-6 py-3 bg-[#d548ec] hover:bg-[#c030d6] text-white font-semibold rounded-xl transition-colors"
            >
              Browse Events
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Loading State
  if (loading) {
    return (
      <AppLayout>
        <div className="px-4 py-2 md:px-6 md:py-6 max-w-7xl mx-auto min-h-screen">
          {/* Header */}
          <div className="mb-2 md:mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Event Check-In</h1>
            <p className="text-sm text-gray-400">Select your ticket and scan QR code</p>
          </div>

          {/* Desktop: 2 Column Layout | Mobile: Stacked */}
          <div className="flex flex-col md:grid md:grid-cols-5 gap-4 md:gap-6 animate-pulse">
            {/* Left Column: Scanner Skeleton - Takes 3 columns */}
            <div className="md:col-span-3">
              <div className="bg-[#1A1A1A] border-2 border-gray-800 rounded-3xl h-[280px] md:h-[600px] flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-gray-800/50 rounded-2xl mx-auto" />
                  <div className="h-6 bg-gray-800/50 rounded w-48 mx-auto" />
                  <div className="h-4 bg-gray-800/50 rounded w-64 mx-auto" />
                  <div className="w-48 h-12 bg-gray-800/50 rounded-2xl mx-auto" />
                </div>
              </div>
            </div>

            {/* Right Column: Tickets Skeleton - Takes 2 columns */}
            <div className="md:col-span-2">
              <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-4 md:h-[600px]">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-5 bg-gray-800/50 rounded w-24" />
                  <div className="h-4 bg-gray-800/50 rounded w-16" />
                </div>
                
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-3 rounded-xl border-2 border-gray-800 bg-[#0A0A0A]">
                      <div className="flex items-start gap-2 mb-2">
                        <div className="w-12 h-12 bg-gray-800/50 rounded-lg" />
                        <div className="flex-1">
                          <div className="h-5 bg-gray-800/50 rounded w-3/4 mb-2" />
                          <div className="h-4 bg-gray-800/50 rounded w-24" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="h-4 bg-gray-800/50 rounded w-16" />
                        <div className="h-6 bg-gray-800/50 rounded w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Info Section Skeleton */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-4">
                <div className="h-5 bg-gray-800/50 rounded w-32 mb-3" />
                <div className="space-y-2">
                  <div className="h-4 bg-gray-800/50 rounded w-full" />
                  <div className="h-4 bg-gray-800/50 rounded w-5/6" />
                  <div className="h-4 bg-gray-800/50 rounded w-4/6" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  // Success State
  if (showSuccess) {
    return (
      <AppLayout>
        <div className="px-4 py-6 md:px-6 md:py-8 max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 border-2 border-green-500 rounded-3xl p-12 text-center">
            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white mb-4">
              Check-In Successful!
            </h1>
            <p className="text-gray-300 mb-2">Your attendance has been recorded</p>
            {txId && (
              <p className="text-gray-400 text-sm mb-6 font-mono">
                TX: {txId.substring(0, 8)}...{txId.substring(txId.length - 6)}
              </p>
            )}

            <div className="flex gap-3 justify-center flex-wrap">
              <button
                onClick={() => navigate('/app/my-tickets')}
                className="px-6 py-3 bg-[#1A1A1A] border border-gray-800 text-white rounded-xl hover:border-green-500 transition-colors"
              >
                View My Tickets
              </button>
              <button
                onClick={handleReset}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors"
              >
                Check-In Another
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Main Check-In UI
  return (
    <AppLayout>
      <div className="px-4 py-2 md:px-6 md:py-6 max-w-7xl mx-auto min-h-screen">
        {/* Header */}
        <div className="mb-2 md:mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Event Check-In</h1>
          <p className="text-sm text-gray-400">Select your ticket and scan QR code</p>
        </div>

        {/* Desktop: 2 Column Layout | Mobile: Stacked */}
        <div className="flex flex-col md:grid md:grid-cols-5 gap-4 md:gap-6">
          {/* Left Column: Scanner - Takes 3 columns */}
          <div className="md:col-span-3">
            <div className="bg-[#1A1A1A] border-2 border-gray-800 rounded-3xl overflow-hidden h-[280px] md:h-[600px] relative">
            {isScanning ? (
              <QRScanner
                isScanning={isScanning}
                onScanSuccess={handleScanSuccess}
                onScanError={(error) => console.error(error)}
                onClose={() => setIsScanning(false)}
              />
            ) : isProcessing ? (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0A0A0A]/90 backdrop-blur-sm">
                <div className="text-center">
                  <Loader2 className="w-16 h-16 text-[#d548ec] mx-auto mb-4 animate-spin" />
                  <h3 className="text-xl font-bold text-white mb-2">Processing Check-In</h3>
                  <p className="text-gray-400 text-sm">Please approve transaction in your wallet</p>
                </div>
              </div>
            ) : showSuccess ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-green-500/10 to-emerald-600/10">
                <div className="text-center">
                  <CheckCheck className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white">QR Scanned Successfully</h3>
                </div>
              </div>
            ) : (
              /* Ready to Scan State */
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500/5 to-purple-600/5">
                <div className="text-center px-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg 
                      className="w-12 h-12 text-blue-500" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" 
                      />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Ready to Scan</h3>
                  <p className="text-gray-400 text-sm mb-6">
                    {selectedTicket 
                      ? `Scanning for: ${selectedTicket.eventName}`
                      : 'Select a ticket below to continue'
                    }
                  </p>
                  <button
                    onClick={() => setIsScanning(true)}
                    disabled={!selectedTicket}
                    className="px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-2xl transition-all shadow-lg hover:shadow-xl disabled:shadow-none"
                  >
                    {selectedTicket ? 'Start Scanning' : 'Select Ticket First'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

          {/* Right Column: Tickets & Info - Takes 2 columns */}
          <div className="md:col-span-2 flex flex-col gap-4">
            {/* Ticket Selector */}
            <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-4 md:h-[600px] flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold text-sm">Select Ticket</h3>
                <span className="text-xs text-gray-500">{userTickets.length} available</span>
              </div>
              
              <div className="overflow-x-auto md:overflow-y-auto md:flex-1 -mx-4 px-4 md:mx-0 md:px-0 pb-2 md:pb-0 scrollbar-thin">
                <div className="flex md:flex-col gap-3 md:pr-2">
                  {userTickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`flex-shrink-0 w-64 md:w-full md:flex-shrink md:min-w-0 text-left p-3 rounded-xl border-2 transition-all ${
                        selectedTicket?.id === ticket.id
                          ? 'bg-gradient-to-br from-[#d548ec]/20 to-purple-600/20 border-[#d548ec] shadow-lg shadow-[#d548ec]/20'
                          : 'bg-[#0A0A0A] border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <img
                          src={ticket.image}
                          alt={ticket.eventName}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm mb-1 truncate ${
                            selectedTicket?.id === ticket.id ? 'text-white' : 'text-gray-300'
                          }`}>
                            {ticket.eventName}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar className="w-3 h-3" />
                            {ticket.eventDate}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">#{ticket.tokenId}</span>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-green-500/10 text-green-500 rounded-full font-medium">
                            {ticket.category}
                          </span>
                          {selectedTicket?.id === ticket.id && (
                            <CheckCircle className="w-4 h-4 text-[#d548ec]" />
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Section - Full Width Below */}
        <div className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* How to Check-In */}
            <div className="bg-gradient-to-br from-blue-500/5 to-purple-600/5 border border-blue-500/20 rounded-2xl p-4">
              <h4 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                How to Check-In
              </h4>
              <ol className="text-xs text-gray-400 space-y-2 ml-6 list-decimal">
                <li>Select your event ticket</li>
                <li>Tap "Start Scanning"</li>
                <li>Scan QR at entrance</li>
                <li>Approve wallet transaction</li>
              </ol>
            </div>

            {/* Valid Ticket */}
            <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-4">
              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center mb-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <h4 className="text-white font-semibold text-sm mb-2">Valid Ticket</h4>
              <p className="text-xs text-gray-400">Only active tickets can be checked in at the event</p>
            </div>
            
            {/* One-Time Use */}
            <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-4">
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h4 className="text-white font-semibold text-sm mb-2">One-Time Use</h4>
              <p className="text-xs text-gray-400">Each ticket can only be used once for check-in</p>
            </div>
          </div>

          {/* Need Help */}
          <div className="mt-4 bg-[#1A1A1A] border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-400 mb-2">Need help with check-in?</p>
            <button className="text-sm text-[#d548ec] hover:text-[#c030d6] font-semibold transition-colors">
              Contact Event Support →
            </button>
          </div>
        </div>
      </div>

      {/* Add custom scrollbar styles */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
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
    </AppLayout>
  );
};

export default AttendeeCheckIn;