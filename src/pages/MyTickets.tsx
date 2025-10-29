import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Calendar, MapPin, QrCode, Search, Filter, Wallet, RefreshCw, Bell, Mail, AlertCircle, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import TicketQRModal from "@/components/TicketQRModal";
import AddToCalendar from "@/components/AddToCalendar";
import { useWallet } from '@/hooks/usePushChainWallet';
import { getAllUserTickets } from '@/services/eventBrowseContract';
import { toast } from 'sonner';
import { formatEther } from 'ethers';
import { FraudProtectionUI } from '@/components/fraud-protection/FraudProtectionUI';
import { sendRefundClaimedAlert } from '@/services/emailAlertService';
import { checkAndSendDueReminders } from '@/services/eventReminderService';

const MyTickets = () => {
  const { wallet } = useWallet();
  const userAddress = wallet?.address;
  
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [refundingTicket, setRefundingTicket] = useState<string | null>(null);
  const [refundInfoMap, setRefundInfoMap] = useState<Record<string, any>>({});

  // Load user email from localStorage on mount
  useEffect(() => {
    if (userAddress) {
      const savedEmail = localStorage.getItem(`user-email-${userAddress}`) || 
                        localStorage.getItem('user-email');
      if (savedEmail) {
        setUserEmail(savedEmail);
        console.log('✅ Loaded user email from storage:', savedEmail);
      }
    }
  }, [userAddress]);

  // Check and send due event reminders
  useEffect(() => {
    const checkReminders = async () => {
      if (userAddress && userEmail && tickets.length > 0) {
        console.log('⏰ Checking for due event reminders...');
        
        // Check reminders for each ticket
        for (const ticket of tickets) {
          try {
            await checkAndSendDueReminders(userEmail, ticket.contractAddress);
          } catch (error) {
            console.error('Error checking reminders for ticket:', error);
          }
        }
      }
    };

    // Check immediately on load
    checkReminders();

    // Set up interval to check every 30 minutes
    const intervalId = setInterval(checkReminders, 30 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [userAddress, userEmail, tickets.length]);

  // Fetch tickets from blockchain
  useEffect(() => {
    if (userAddress) {
      loadUserTickets();
    } else {
      setTickets([]);
      setRefundInfoMap({});
    }
  }, [userAddress]);

  // Load refund info for all tickets
  useEffect(() => {
    if (tickets.length > 0 && userAddress) {
      loadRefundInfo();
    }
  }, [tickets.length, userAddress]);

  const loadRefundInfo = async () => {
    console.log('🔍 [MyTickets] Loading refund info for', tickets.length, 'tickets...');
    const refundInfoTemp: Record<string, any> = {};
    
    for (const ticket of tickets) {
      try {
        console.log(`\n📋 Checking refund for ticket:`, {
          contractAddress: ticket.contractAddress,
          tokenId: ticket.tokenId,
          eventName: ticket.eventName,
          eventCancelled: ticket.eventCancelled,
          ticketUsed: ticket.used, // CRITICAL: Check if THIS specific ticket is used
        });
        
        // CRITICAL FIX: Skip loading refund info for USED tickets
        // Used tickets should NEVER show refund button, even if event is cancelled
        if (ticket.used) {
          console.log(`   ⚠️ SKIP: Ticket ${ticket.tokenId} is USED - no refund eligible`);
          
          // Store info that this ticket is not eligible (used)
          const ticketKey = `${ticket.contractAddress}-${ticket.tokenId}`;
          refundInfoTemp[ticketKey] = {
            isEligible: false,
            isUsedTicket: true,
            eventCancelled: ticket.eventCancelled,
            reason: 'Ticket already used (checked-in)',
          };
          continue; // Skip to next ticket
        }
        
        // Create provider and contract instance directly
        const provider = new (await import('ethers')).BrowserProvider(window.ethereum as any);
        const EventTicketABI = (await import('@/contracts/EventTicket.json')).default;
        const contract = new (await import('ethers')).Contract(ticket.contractAddress, EventTicketABI.abi, provider) as any;
        
        if (userAddress) {
          // Use new getRefundInfo function from smart contract
          console.log('   Calling getRefundInfo...');
          const [canClaim, unusedCount, usedCount, refundAmount] = await contract.getRefundInfo(userAddress);
          
          console.log('   getRefundInfo result:', {
            canClaim,
            unusedCount: Number(unusedCount),
            usedCount: Number(usedCount),
            refundAmount: refundAmount.toString(),
          });
          
          // Get additional info
          const refundsEnabled = await contract.refundsEnabled();
          const contractBalance = await provider.getBalance(ticket.contractAddress);
          
          let refundDeadline: bigint | null = null;
          let deadlinePassed = false;
          try {
            refundDeadline = await contract.refundDeadline();
            const now = Math.floor(Date.now() / 1000);
            deadlinePassed = now > Number(refundDeadline);
            console.log('   refundDeadline:', new Date(Number(refundDeadline) * 1000).toISOString());
            console.log('   deadlinePassed:', deadlinePassed);
          } catch (err) {
            console.log('   No refundDeadline property');
          }
          
          // CRITICAL: Check if THIS specific ticket is refunded or used
          let thisTicketRefunded = false;
          let thisTicketUsed = ticket.used; // Already checked above, but double-check
          try {
            thisTicketRefunded = await contract.isRefunded(ticket.tokenId);
            thisTicketUsed = await contract.used(ticket.tokenId);
          } catch (err) {
            console.log('   Could not check ticket status:', err);
          }
          
          // CRITICAL: This specific ticket is eligible ONLY if:
          // 1. Event has refunds enabled
          // 2. This ticket is NOT used
          // 3. This ticket is NOT already refunded
          // 4. Contract has enough balance
          // 5. Deadline not passed
          const ticketPrice = await contract.ticketPrice();
          const thisTicketEligible = refundsEnabled &&
                                     !thisTicketUsed &&
                                     !thisTicketRefunded &&
                                     !deadlinePassed &&
                                     contractBalance >= ticketPrice;
          
          const totalTickets = Number(unusedCount) + Number(usedCount);
          
          console.log(`✅ Refund eligibility for ticket ${ticket.tokenId}:`, {
            thisTicketEligible,
            thisTicketUsed,
            thisTicketRefunded,
            canClaimAny: canClaim,
            refundsEnabled,
            totalTickets,
            unusedCount: Number(unusedCount),
            usedCount: Number(usedCount),
            contractBalance: contractBalance.toString(),
            deadlinePassed,
          });
          
          // Store per-ticket info (not per-contract)
          const ticketKey = `${ticket.contractAddress}-${ticket.tokenId}`;
          refundInfoTemp[ticketKey] = {
            isEligible: thisTicketEligible, // CRITICAL: Per-ticket eligibility
            isUsedTicket: thisTicketUsed,
            isRefunded: thisTicketRefunded,
            ticketPrice: ticketPrice.toString(),
            eventCancelled: ticket.eventCancelled,
            contractBalance: contractBalance.toString(),
            refundsEnabled,
            deadlinePassed,
            refundDeadline: refundDeadline ? refundDeadline.toString() : null,
            // Context info (for entire contract)
            totalTickets,
            unusedCount: Number(unusedCount),
            usedCount: Number(usedCount),
            canClaimAny: canClaim,
          };
          
          if (thisTicketEligible) {
            console.log(`✅ 🎉 BUTTON WILL SHOW for ticket ${ticket.tokenId}!`);
          } else {
            console.log(`❌ Button will NOT show for ticket ${ticket.tokenId}:`, {
              reason: thisTicketUsed ? '⚠️ Ticket already used' :
                     thisTicketRefunded ? 'Already refunded' :
                     !refundsEnabled ? 'Refunds not enabled' :
                     deadlinePassed ? 'Deadline passed' :
                     contractBalance < ticketPrice ? 'Insufficient balance' :
                     'Unknown',
            });
          }
        }
      } catch (error) {
        console.error(`❌ Error loading refund info for ticket ${ticket.tokenId}:`, error);
      }
    }
    
    console.log('\n📊 Final refundInfoMap (per-ticket):', refundInfoTemp);
    setRefundInfoMap(refundInfoTemp);
  };

  const loadUserTickets = async () => {
    if (!userAddress) return;
    
    setLoading(true);
    try {

      const userTickets = await getAllUserTickets(userAddress);

      // Transform tickets to match component format
      const transformedTickets = userTickets.map((ticket) => {
        const eventDetails = ticket.eventDetails;
        const ticketDetails = ticket.ticketDetails;

        // Determine status based on blockchain state
        let status = 'active';
        
        if (eventDetails.eventCancelled) {
          status = 'cancelled';
        } else if (eventDetails.eventPaused) {
          status = 'paused';
        } else if (ticketDetails.used) {
          status = 'used';
        } else if (eventDetails.status === 'Ended' || !eventDetails.isActive) {
          status = 'expired';
        }
        
        return {
          id: `${ticket.contractAddress}-${ticket.tokenId}`,
          tokenId: ticket.tokenId,
          eventName: eventDetails.title || eventDetails.eventName,
          eventDate: eventDetails.date,
          eventTime: eventDetails.time,
          location: eventDetails.location || eventDetails.eventVenue,
          image: eventDetails.image || eventDetails.eventImageUri,
          ticketNumber: `#TKT-${ticket.tokenId.toString().padStart(6, '0')}`,
          contractAddress: ticket.contractAddress,
          contractId: ticket.contractAddress,
          status,
          quantity: 1, // Each NFT is one ticket
          category: 'General',
          price: eventDetails.price || eventDetails.ticketPrice,
          mintTxId: '', // Could be fetched from events if needed
          used: ticketDetails.used,
          eventCancelled: eventDetails.eventCancelled,
          eventPaused: eventDetails.eventPaused,
        };
      });

      setTickets(transformedTickets);
      
      if (transformedTickets.length > 0) {
        // Tickets loaded successfully
      } else {

        toast.info('No tickets found. Browse events to get tickets!');
      }
    } catch (error: any) {
      console.error('❌ Error loading tickets:', error);
      console.error('Error stack:', error?.stack);
      toast.error('Failed to load tickets from blockchain');
    } finally {
      setLoading(false);
    }
  };

  const handleShowQR = (ticket: any) => {
    setSelectedTicket({
      id: ticket.ticketNumber,
      eventName: ticket.eventName,
      eventDate: `${ticket.eventDate} at ${ticket.eventTime}`,
      ticketType: `${ticket.category} (${ticket.quantity}x)`,
      holderName: userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : "Unknown",
      seatNumber: `Token #${ticket.tokenId}`,
      mintTxId: ticket.mintTxId || '',
      contractId: ticket.contractId,
      tokenId: ticket.tokenId,
      location: ticket.location,
      price: ticket.price,
      category: ticket.category
    });
    setIsQRModalOpen(true);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUserTickets();
    setRefreshing(false);
  };

  const handleClaimRefund = async (ticket: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!ticket.contractAddress) {
      toast.error('Invalid ticket contract address');
      return;
    }

    // CRITICAL: Use per-ticket refund info
    const ticketKey = `${ticket.contractAddress}-${ticket.tokenId}`;
    const refundInfo = refundInfoMap[ticketKey];
    
    if (!refundInfo || !refundInfo.isEligible) {
      toast.error('This ticket is not eligible for refund');
      return;
    }

    // CRITICAL: Double-check ticket is not used
    if (refundInfo.isUsedTicket || ticket.used) {
      toast.error('This ticket has been used and cannot be refunded');
      return;
    }

    setRefundingTicket(ticket.id);
    
    try {
      // Create provider and contract with signer
      const { BrowserProvider, Contract, formatEther } = await import('ethers');
      const EventTicketABI = (await import('@/contracts/EventTicket.json')).default;
      
      const provider = new BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const contract = new Contract(ticket.contractAddress, EventTicketABI.abi, signer) as any;

      // Check contract balance first
      const contractBalance = await provider.getBalance(ticket.contractAddress);
      const refundAmount = BigInt(refundInfo.ticketPrice);
      
      console.log('Contract balance:', formatEther(contractBalance), 'PC');
      console.log('Refund amount for this ticket:', formatEther(refundAmount), 'PC');
      console.log('Ticket ID:', ticket.tokenId);
      console.log('Ticket used?:', refundInfo.isUsedTicket);
      
      if (contractBalance < refundAmount) {
        toast.error(`Insufficient contract balance. Contract has ${formatEther(contractBalance)} PC but needs ${formatEther(refundAmount)} PC. Contact event organizer.`);
        return;
      }

      // Check if refunds are enabled
      const refundsEnabled = await contract.refundsEnabled();
      console.log('Refunds enabled:', refundsEnabled);
      if (!refundsEnabled) {
        toast.error('Refunds are not enabled for this event yet');
        setRefundingTicket(null);
        return;
      }

      // Try to simulate the call first to catch any errors
      try {
        console.log('Simulating claimRefund call...');
        await contract.claimRefund.staticCall();
        console.log('Simulation successful, proceeding with actual transaction');
      } catch (simError: any) {
        console.error('Simulation failed:', simError);
        let simErrorMsg = 'Cannot claim refund';
        
        if (simError.message?.includes('Refunds not enabled')) {
          simErrorMsg = 'Refunds are not enabled for this event';
        } else if (simError.message?.includes('No tickets')) {
          simErrorMsg = 'You do not own any tickets for this event';
        } else if (simError.message?.includes('NoUnusedTickets')) {
          simErrorMsg = 'All your tickets have been used or already refunded';
        } else if (simError.message?.includes('Insufficient contract balance')) {
          simErrorMsg = 'Contract does not have enough balance for refunds';
        } else if (simError.message?.includes('RefundDeadlinePassed')) {
          simErrorMsg = 'Refund deadline has passed. Contact event organizer.';
        } else {
          simErrorMsg = 'Transaction would fail. Please check contract state or contact event organizer.';
        }
        
        toast.error(simErrorMsg);
        setRefundingTicket(null);
        return;
      }

      toast.loading('Processing refund claim for this ticket...');
      const tx = await contract.claimRefund();

      toast.loading('Waiting for confirmation...');
      const receipt = await tx.wait();

      const refundAmountFormatted = formatEther(refundInfo.ticketPrice);
      
      // Check if there are more unused tickets
      const hasMoreUnused = refundInfo.unusedCount > 1;
      
      if (hasMoreUnused) {
        toast.success(`Refund successful! ${refundAmountFormatted} PC returned. You have ${refundInfo.unusedCount - 1} more unused ticket(s) that can be refunded.`);
      } else {
        toast.success(`Refund successful! ${refundAmountFormatted} PC returned to your wallet`);
      }

      // Send refund confirmation email
      if (userEmail) {
        try {
          const isCancelled = ticket.status === 'cancelled';
          const isEmergency = refundInfo.emergencyRefund || false;
          
          await sendRefundClaimedAlert({
            userEmail,
            userName: wallet?.address?.slice(0, 10) || 'User',
            eventName: ticket.eventName || 'Event',
            eventDate: ticket.eventDate || 'TBA',
            eventTime: ticket.eventTime || 'TBA',
            location: ticket.location || 'TBA',
            ticketCount: 1,
            totalAmount: refundAmountFormatted,
            refundAmount: refundAmountFormatted,
            refundReason: isEmergency ? 'emergency' : (isCancelled ? 'cancel' : 'partial'),
            contractAddress: ticket.contractAddress,
            transactionHash: receipt.hash,
          });
          
          console.log('✅ Refund confirmation email sent');
        } catch (emailError) {
          console.error('⚠️ Failed to send refund confirmation email:', emailError);
          // Don't block the refund flow if email fails
        }
      }
      
      // Refresh tickets and refund info
      await loadUserTickets();
      await loadRefundInfo();
    } catch (error: any) {
      console.error('Error claiming refund:', error);
      
      // Parse error message from contract revert
      let errorMessage = 'Failed to claim refund';
      
      if (error.message?.includes('Refunds not enabled')) {
        errorMessage = 'Refunds are not enabled for this event';
      } else if (error.message?.includes('No tickets to refund') || error.message?.includes('NoTicketsOwned')) {
        errorMessage = 'You do not own any tickets for this event';
      } else if (error.message?.includes('NoUnusedTickets')) {
        errorMessage = 'All your tickets have been used or already refunded';
      } else if (error.message?.includes('Insufficient contract balance')) {
        errorMessage = 'Contract does not have enough balance for refunds. Contact event organizer.';
      } else if (error.message?.includes('RefundDeadlinePassed')) {
        errorMessage = 'Refund deadline has passed. Contact event organizer.';
      } else if (error.message?.includes('user rejected') || error.code === 'ACTION_REJECTED') {
        errorMessage = 'Transaction cancelled by user';
      } else if (error.code === 'CALL_EXCEPTION') {
        // Generic contract error
        errorMessage = 'Transaction failed. Event may not be eligible for refunds.';
      }
      
      toast.error(errorMessage);
    } finally {
      setRefundingTicket(null);
    }
  };

  const handleSetupEmailReminders = async () => {
    if (!userEmail) {
      toast.error('Please enter your email address');
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Save email to localStorage for use across the app
    try {
      localStorage.setItem('user-email', userEmail);
      localStorage.setItem(`user-email-${userAddress}`, userEmail);
      console.log('✅ User email saved:', userEmail);
    } catch (error) {
      console.error('Failed to save email:', error);
    }

    toast.success(`Email reminders enabled for upcoming events`);
    setShowEmailModal(false);
  };

  const filteredTickets = tickets.filter((ticket) => {
    // Safety check - ensure properties are strings
    const eventName = String(ticket.eventName || '');
    const location = String(ticket.location || '');

    const matchesSearch = eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === "all" || ticket.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const statusColors = {
    active: "bg-green-500/10 text-green-500 border-green-500/20",
    used: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    expired: "bg-[#e7a4fd]/10 text-[#e7a4fd] border-[#e7a4fd]/20",
    paused: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    cancelled: "bg-red-500/10 text-red-500 border-red-500/20"
  };

  return (
    <AppLayout>
      <div className="px-4 py-6 md:px-6 md:py-6">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl md:text-4xl font-bold text-white mb-1 md:mb-2">My Tickets</h1>
              <p className="text-sm md:text-base text-gray-400">View and manage your NFT event tickets</p>
            </div>
            {userAddress && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowEmailModal(true)}
                  className="p-3 bg-[#1A1A1A] border border-gray-800 rounded-xl hover:border-[#d548ec] transition-colors group"
                  title="Email reminders"
                >
                  {userEmail ? (
                    <Bell className="w-5 h-5 text-[#d548ec]" />
                  ) : (
                    <Mail className="w-5 h-5 text-gray-400 group-hover:text-[#d548ec]" />
                  )}
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing || loading}
                  className="p-3 bg-[#1A1A1A] border border-gray-800 rounded-xl hover:border-[#d548ec] transition-colors disabled:opacity-50"
                  title="Refresh tickets"
                >
                  <RefreshCw className={`w-5 h-5 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            )}
          </div>

          {/* Alerts for Paused/Cancelled Events */}
          {tickets.some(t => t.status === 'paused' || t.status === 'cancelled') && (
            <div className="space-y-3 mb-6">
              {/* Paused Events Alert */}
              {tickets.some(t => t.status === 'paused') && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-yellow-500 font-semibold mb-1">
                        {tickets.filter(t => t.status === 'paused').length} Event{tickets.filter(t => t.status === 'paused').length > 1 ? 's' : ''} Paused
                      </h3>
                      <p className="text-yellow-400/80 text-sm">
                        The event organizer has temporarily paused ticket sales. Your tickets are still valid and will be honored when the event resumes. 
                        Check back later for updates.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Cancelled Events Alert */}
              {(() => {
                // Get cancelled tickets that haven't claimed refund yet
                const cancelledTickets = tickets.filter(t => t.status === 'cancelled');
                const unclaimedCancelledTickets = cancelledTickets.filter(t => {
                  const refundInfo = refundInfoMap[t.contractAddress];
                  return refundInfo && !refundInfo.hasClaimed;
                });
                
                // Only show alert if there are unclaimed cancelled tickets
                if (unclaimedCancelledTickets.length === 0) {
                  return null;
                }
                
                return (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-red-500 font-semibold mb-2">
                          {unclaimedCancelledTickets.length} Event{unclaimedCancelledTickets.length > 1 ? 's' : ''} Cancelled - Refund Available
                        </h3>
                        <p className="text-red-400/80 text-sm mb-3">
                          Unfortunately, {unclaimedCancelledTickets.length > 1 ? 'these events have' : 'this event has'} been cancelled by the organizer. 
                          You are eligible for a full refund. Your NFT tickets will be burned and funds returned to your wallet.
                        </p>
                        
                        {/* Refund Deadline Info */}
                        {(() => {
                          // Get earliest deadline from unclaimed cancelled tickets
                          let earliestDeadline: Date | null = null;
                          let hasDeadlineInfo = false;
                          
                          for (const ticket of unclaimedCancelledTickets) {
                            const refundInfo = refundInfoMap[ticket.contractAddress];
                            if (refundInfo?.refundDeadline) {
                              hasDeadlineInfo = true;
                              try {
                                // Convert from seconds to milliseconds
                                const deadlineTimestamp = Number(refundInfo.refundDeadline);
                                
                                // Check if timestamp is in seconds (< year 3000) or milliseconds
                                const deadline = deadlineTimestamp < 10000000000 
                                  ? new Date(deadlineTimestamp * 1000) 
                                  : new Date(deadlineTimestamp);
                                
                                // Validate date is reasonable (between 2020 and 2100)
                                if (deadline.getFullYear() >= 2020 && deadline.getFullYear() <= 2100) {
                                  if (!earliestDeadline || deadline < earliestDeadline) {
                                    earliestDeadline = deadline;
                                  }
                                }
                              } catch (err) {
                                console.warn('Invalid deadline:', refundInfo.refundDeadline);
                              }
                            }
                          }
                          
                          if (hasDeadlineInfo && earliestDeadline) {
                            const now = new Date();
                            const daysLeft = Math.ceil((earliestDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                            const isUrgent = daysLeft <= 7 && daysLeft > 0;
                            const hasExpired = daysLeft <= 0;
                            
                            return (
                              <div className={`mb-3 p-3 rounded-xl border ${
                                hasExpired ? 'bg-red-500/10 border-red-500/30' :
                                isUrgent ? 'bg-orange-500/10 border-orange-500/30' : 
                                'bg-blue-500/10 border-blue-500/30'
                              }`}>
                                <div className="flex items-start gap-2">
                                  <Calendar className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                                    hasExpired ? 'text-red-400' :
                                    isUrgent ? 'text-orange-400' : 
                                    'text-blue-400'
                                  }`} />
                                  <div>
                                    <p className={`text-sm font-medium ${
                                      hasExpired ? 'text-red-400' :
                                      isUrgent ? 'text-orange-400' : 
                                      'text-blue-400'
                                    }`}>
                                      {hasExpired ? '❌ Deadline Passed' : isUrgent ? '⚠️ Urgent: Refund Deadline' : 'Refund Deadline'}
                                    </p>
                                    <p className={`text-xs ${
                                      hasExpired ? 'text-red-400/80' :
                                      isUrgent ? 'text-orange-400/80' : 
                                      'text-blue-400/80'
                                    }`}>
                                      {earliestDeadline.toLocaleDateString('en-US', { 
                                        weekday: 'long', 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                      {daysLeft > 0 ? ` (${daysLeft} day${daysLeft > 1 ? 's' : ''} left)` : ' (Expired)'}
                                    </p>
                                    {isUrgent && (
                                      <p className="text-xs text-orange-500 font-semibold mt-1">
                                        Claim your refund before the deadline!
                                      </p>
                                    )}
                                    {hasExpired && (
                                      <p className="text-xs text-red-500 font-semibold mt-1">
                                        Contact organizer for assistance
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              // Scroll to first unclaimed cancelled ticket
                              const firstCancelled = document.querySelector('[data-status="cancelled"]');
                              firstCancelled?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition-colors"
                          >
                            <DollarSign className="w-4 h-4 inline mr-1" />
                            View & Claim Refunds
                          </button>
                          <span className="text-red-400/60 text-xs">
                            Click on individual tickets below to claim
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Search & Filter */}
        <div className="mb-6 md:mb-8 flex flex-col sm:flex-row gap-3 md:gap-4">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search your tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 md:py-3 bg-[#1A1A1A] border border-gray-800 rounded-2xl md:rounded-xl text-base md:text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#d548ec] focus:border-transparent"
            />
          </div>

          {/* Filter Dropdown */}
          <div className="relative sm:w-48">
            <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-12 pr-8 py-3.5 md:py-3 bg-[#1A1A1A] border border-gray-800 rounded-2xl md:rounded-xl text-base md:text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#d548ec] focus:border-transparent appearance-none cursor-pointer"
            >
              <option value="all">All Tickets</option>
              <option value="active">Active</option>
              <option value="used">Used</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-8">
          <div className="bg-[#1A1A1A] border border-gray-800 rounded-3xl md:rounded-2xl p-4 md:p-6">
            <p className="text-gray-400 text-xs md:text-sm mb-1 md:mb-2">Total Tickets</p>
            <p className="text-2xl md:text-3xl font-bold text-white">{tickets.reduce((sum, t) => sum + t.quantity, 0)}</p>
          </div>
          <div className="bg-[#1A1A1A] border border-gray-800 rounded-3xl md:rounded-2xl p-4 md:p-6">
            <p className="text-gray-400 text-xs md:text-sm mb-1 md:mb-2">Active Tickets</p>
            <p className="text-2xl md:text-3xl font-bold text-green-500">
              {tickets.filter(t => t.status === "active").reduce((sum, t) => sum + t.quantity, 0)}
            </p>
          </div>
          <div className="bg-[#1A1A1A] border border-gray-800 rounded-3xl md:rounded-2xl p-4 md:p-6">
            <p className="text-gray-400 text-xs md:text-sm mb-1 md:mb-2">Upcoming</p>
            <p className="text-2xl md:text-3xl font-bold text-[#d548ec]">
              {tickets.filter(t => t.status === "active").length}
            </p>
          </div>
        </div>

        {/* No Wallet Connected */}
        {!userAddress && !loading ? (
          <div className="text-center py-12 md:py-16 bg-[#1A1A1A] border border-gray-800 rounded-3xl md:rounded-2xl">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-[#0A0A0A] rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 md:w-10 md:h-10 text-[#d548ec]" />
            </div>
            <h3 className="text-lg md:text-xl font-semibold text-white mb-2">Connect Your Wallet</h3>
            <p className="text-sm md:text-base text-gray-400 mb-6">Connect your wallet to view your NFT tickets</p>
          </div>
        ) : loading ? (
          /* Loading Skeleton */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#1A1A1A] border border-gray-800 rounded-3xl md:rounded-2xl overflow-hidden animate-pulse">
                <div className="h-36 md:h-40 bg-gray-800" />
                <div className="p-4 md:p-5 space-y-3">
                  <div className="h-6 bg-gray-800 rounded w-3/4" />
                  <div className="h-4 bg-gray-800 rounded w-1/2" />
                  <div className="h-4 bg-gray-800 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : tickets.length === 0 && !loading ? (
          /* No tickets at all - show helpful message */
          <div className="text-center py-12 md:py-16 bg-[#1A1A1A] border border-gray-800 rounded-3xl md:rounded-2xl">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-[#0A0A0A] rounded-full flex items-center justify-center mx-auto mb-4">
              <QrCode className="w-8 h-8 md:w-10 md:h-10 text-gray-600" />
            </div>
            <h3 className="text-lg md:text-xl font-semibold text-white mb-2">No tickets found</h3>
            <p className="text-sm md:text-base text-gray-400 mb-6">
              {userAddress ?
                "You don't have any event tickets yet. Browse events to get started!" :
                "Connect your wallet to view your tickets"
              }
            </p>
            <div className="space-y-3 max-w-md mx-auto text-left px-4">
              <p className="text-xs text-gray-500">
                💡 <strong>Tip:</strong> Tickets are NFTs on the blockchain
              </p>
              <p className="text-xs text-gray-500">
                🎫 Purchase tickets from any event to see them here
              </p>
              <p className="text-xs text-gray-500">
                🔍 Your wallet address: <code className="text-[#d548ec]">{userAddress ? `${userAddress.slice(0, 8)}...${userAddress.slice(-4)}` : 'Not connected'}</code>
              </p>
            </div>
            <Link
              to="/app"
              className="inline-flex items-center gap-2 px-6 py-3.5 md:py-3 bg-[#d548ec] active:bg-[#c030d6] md:hover:bg-[#c030d6] text-white text-sm font-semibold rounded-2xl md:rounded-xl transition-colors mt-6"
            >
              Browse Events
            </Link>
          </div>
        ) : filteredTickets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredTickets.map((ticket) => (
              <Link
                key={ticket.id}
                to={`/app/ticket/${ticket.id}`}
                data-status={ticket.status}
                className="group bg-[#1A1A1A] border border-gray-800 rounded-3xl md:rounded-2xl overflow-hidden active:scale-[0.98] md:hover:border-[#d548ec] transition-all duration-200 md:hover:transform md:hover:scale-[1.02]"
              >
                {/* Event Image */}
                <div
                  className="h-36 md:h-40 bg-cover bg-center relative"
                  style={{ backgroundImage: `url('${ticket.image}')` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] to-transparent" />
                  <div className="absolute top-3 right-3">
                    <div className={`px-3 py-1.5 md:py-1 text-xs font-bold rounded-full border ${statusColors[ticket.status as keyof typeof statusColors]}`}>
                      {ticket.status.toUpperCase()}
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-xs text-gray-400 mb-1">{ticket.ticketNumber}</p>
                  </div>
                </div>

                {/* Ticket Info */}
                <div className="p-4 md:p-5">
                  <h3 className="text-base md:text-lg font-bold text-white mb-3 group-hover:text-[#d548ec] transition-colors line-clamp-2">
                    {ticket.eventName}
                  </h3>

                  {/* Refund Alert - ONLY for UNUSED tickets */}
                  {(() => {
                    const ticketKey = `${ticket.contractAddress}-${ticket.tokenId}`;
                    const refundInfo = refundInfoMap[ticketKey];
                    
                    // CRITICAL: Only show refund alert if THIS ticket is eligible
                    return refundInfo?.eventCancelled && refundInfo?.isEligible && !refundInfo?.isUsedTicket && (
                      <div className="mb-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-orange-500 mb-1">
                              Event Cancelled - Refund Available for This Ticket
                            </p>
                            <p className="text-xs text-orange-400/80 mb-1">
                              This ticket is unused and eligible for refund: {formatEther(refundInfo.ticketPrice)} PC
                            </p>
                            {refundInfo.unusedCount > 1 && (
                              <p className="text-xs text-orange-400/60 mb-1">
                                You have {refundInfo.unusedCount} unused ticket(s) total
                                {refundInfo.usedCount > 0 && ` and ${refundInfo.usedCount} used ticket(s)`}
                              </p>
                            )}
                            {/* Deadline Info */}
                            {refundInfo.refundDeadline && (
                              <div className="mt-2 pt-2 border-t border-orange-500/20">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-orange-400" />
                                  <p className="text-xs text-orange-400/80">
                                    Deadline: {(() => {
                                      try {
                                        const deadlineTimestamp = Number(refundInfo.refundDeadline);
                                        const deadline = deadlineTimestamp < 10000000000 
                                          ? new Date(deadlineTimestamp * 1000) 
                                          : new Date(deadlineTimestamp);
                                        
                                        if (deadline.getFullYear() >= 2020 && deadline.getFullYear() <= 2100) {
                                          return deadline.toLocaleDateString('en-US', { 
                                            month: 'short', 
                                            day: 'numeric',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          });
                                        }
                                        return 'Invalid date';
                                      } catch (err) {
                                        return 'Unknown';
                                      }
                                    })()}
                                  </p>
                                </div>
                                {(() => {
                                  try {
                                    const deadlineTimestamp = Number(refundInfo.refundDeadline);
                                    const deadline = deadlineTimestamp < 10000000000 
                                      ? new Date(deadlineTimestamp * 1000) 
                                      : new Date(deadlineTimestamp);
                                    
                                    if (deadline.getFullYear() >= 2020 && deadline.getFullYear() <= 2100) {
                                      const now = new Date();
                                      const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                      if (daysLeft > 0 && daysLeft <= 7) {
                                        return (
                                          <p className="text-xs text-orange-500 font-semibold mt-1">
                                            ⚠️ Only {daysLeft} day{daysLeft > 1 ? 's' : ''} left!
                                          </p>
                                        );
                                      } else if (daysLeft <= 0) {
                                        return (
                                          <p className="text-xs text-red-500 font-semibold mt-1">
                                            ❌ Deadline has passed
                                          </p>
                                        );
                                      }
                                    }
                                  } catch (err) {
                                    console.warn('Error calculating days left:', err);
                                  }
                                  return null;
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Ticket Used - Cannot Refund (Show ONLY for used tickets in cancelled events) */}
                  {(() => {
                    const ticketKey = `${ticket.contractAddress}-${ticket.tokenId}`;
                    const refundInfo = refundInfoMap[ticketKey];
                    
                    // Show ONLY if event is cancelled AND this ticket is used
                    return refundInfo?.eventCancelled && refundInfo?.isUsedTicket && (
                      <div className="mb-3 p-3 bg-gray-500/10 border border-gray-500/20 rounded-xl">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-400">Event Cancelled - This Ticket Cannot Be Refunded</p>
                            <p className="text-xs text-gray-400/80">
                              This ticket was already used (checked-in) and is not eligible for refund. Only unused tickets can be refunded.
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Insufficient Balance Warning */}
                  {(() => {
                    const ticketKey = `${ticket.contractAddress}-${ticket.tokenId}`;
                    const refundInfo = refundInfoMap[ticketKey];
                    
                    return refundInfo?.eventCancelled && 
                           !refundInfo?.isEligible && 
                           !refundInfo?.isUsedTicket &&
                           !refundInfo?.isRefunded &&
                           !refundInfo?.hasEnoughBalance && (
                      <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-red-500 mb-1">Refund Unavailable</p>
                            <p className="text-xs text-red-400/80">
                              Contract has insufficient balance for refunds. Please contact the event organizer.
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Already Refunded */}
                  {(() => {
                    const ticketKey = `${ticket.contractAddress}-${ticket.tokenId}`;
                    const refundInfo = refundInfoMap[ticketKey];
                    
                    return refundInfo?.isRefunded && (
                      <div className="mb-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                        <div className="flex items-start gap-2">
                          <DollarSign className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-green-500">Refund Already Claimed</p>
                            <p className="text-xs text-green-400/80">This ticket has been refunded and burned</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* FRAUD PROTECTION UI - V3.1 */}
                  {(() => {
                    const ticketKey = `${ticket.contractAddress}-${ticket.tokenId}`;
                    const refundInfo = refundInfoMap[ticketKey];
                    
                    // Show fraud protection if event is cancelled (for both used and unused tickets)
                    // This allows users to report fraud even if their ticket was checked-in
                    return refundInfo?.eventCancelled && (
                      <div className="mb-3">
                        <FraudProtectionUI
                          contractAddress={ticket.contractAddress}
                          userAddress={userAddress}
                          showReportButton={true}
                          showEmergencyRefund={true}
                        />
                      </div>
                    );
                  })()}

                  <div className="space-y-2.5 md:space-y-2 mb-4">
                    <div className="flex items-center gap-2.5 md:gap-2 text-gray-400 text-sm">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span>{ticket.eventDate}</span>
                    </div>
                    <div className="flex items-center gap-2.5 md:gap-2 text-gray-400 text-sm">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{ticket.location}</span>
                    </div>
                  </div>

                  {/* Refund Button - ONLY for UNUSED tickets */}
                  {(() => {
                    const ticketKey = `${ticket.contractAddress}-${ticket.tokenId}`;
                    const refundInfo = refundInfoMap[ticketKey];
                    
                    // CRITICAL: Only show button if THIS specific ticket is eligible
                    return refundInfo?.isEligible && !refundInfo?.isUsedTicket && !refundInfo?.isRefunded && (
                      <button
                        onClick={(e) => handleClaimRefund(ticket, e)}
                        disabled={refundingTicket === ticket.id}
                        className="w-full mb-3 px-4 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        {refundingTicket === ticket.id ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Claiming Refund...</span>
                          </>
                        ) : (
                          <>
                            <DollarSign className="w-4 h-4" />
                            <span>Claim Refund ({formatEther(refundInfo.ticketPrice)} PC)</span>
                          </>
                        )}
                      </button>
                    );
                  })()}

                  <div className="flex items-center justify-between gap-2 pt-4 border-t border-gray-800">
                    <div>
                      <p className="text-gray-500 text-xs mb-1">Quantity</p>
                      <p className="text-white text-lg font-bold">×{ticket.quantity}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Add to Calendar Button */}
                      <div onClick={(e) => e.preventDefault()}>
                        <AddToCalendar
                          eventName={ticket.eventName}
                          eventDate={ticket.eventDate}
                          eventTime={ticket.eventTime}
                          location={ticket.location}
                          ticketId={ticket.ticketNumber}
                          variant="icon"
                        />
                      </div>
                      
                      {/* QR Code Button */}
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          handleShowQR(ticket);
                        }}
                        className="p-2.5 md:p-2 bg-[#0A0A0A] border border-gray-800 rounded-xl md:rounded-lg active:border-[#d548ec] md:hover:border-[#d548ec] transition-colors group-hover:bg-[#d548ec] group-hover:border-[#d548ec]"
                      >
                        <QrCode className="w-5 h-5 text-gray-400 group-hover:text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 md:py-16 bg-[#1A1A1A] border border-gray-800 rounded-3xl md:rounded-2xl">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-[#0A0A0A] rounded-full flex items-center justify-center mx-auto mb-4">
              <QrCode className="w-8 h-8 md:w-10 md:h-10 text-gray-600" />
            </div>
            <h3 className="text-lg md:text-xl font-semibold text-white mb-2">No tickets found</h3>
            <p className="text-sm md:text-base text-gray-400 mb-6">Try adjusting your search or browse events to get tickets</p>
            <Link
              to="/app"
              className="inline-flex items-center gap-2 px-6 py-3.5 md:py-3 bg-[#d548ec] active:bg-[#c030d6] md:hover:bg-[#c030d6] text-white text-sm font-semibold rounded-2xl md:rounded-xl transition-colors"
            >
              Browse Events
            </Link>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {selectedTicket && (
        <TicketQRModal
          isOpen={isQRModalOpen}
          onClose={() => setIsQRModalOpen(false)}
          ticket={selectedTicket}
        />
      )}

      {/* Email Reminder Setup Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[#d548ec]/10 rounded-full flex items-center justify-center">
                <Bell className="w-6 h-6 text-[#d548ec]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Email Reminders</h3>
                <p className="text-sm text-gray-400">Get notified before your events</p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#d548ec] focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-2">
                We'll send you reminders 24 hours before your events
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowEmailModal(false)}
                className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-gray-800 text-white rounded-xl hover:border-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSetupEmailReminders}
                className="flex-1 px-4 py-3 bg-[#d548ec] text-white rounded-xl hover:bg-[#c030d6] transition-colors font-semibold"
              >
                Save & Enable
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default MyTickets;