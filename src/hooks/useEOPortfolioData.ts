/**
 * Custom Hook for EO Portfolio Data from Blockchain
 * Fetches real event data, revenue, and transactions
 */

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@/hooks/usePushChainWallet';
import EventOrganizerABI from '@/contracts/EventOrganizer.json';
import EventTicketABI from '@/contracts/EventTicket.json';
import { getContracts } from '@/config/contracts';
import { fetchCompleteEventDetails } from '@/services/eventBrowseContract';

// Types
export interface EventPerformance {
  id: string;
  eventId: number;
  contractAddress: string;
  name: string;
  date: string;
  ticketsSold: number;
  capacity: number;
  revenue: string;
  status: 'active' | 'upcoming' | 'past';
  image: string;
  ticketPrice: string;
}

export interface Transaction {
  id: string;
  type: 'sale' | 'refund';
  event: string;
  eventName?: string;
  eventContract: string;
  buyer: string;
  amount: string;
  date: string;
  timestamp: number;
  tickets: number;
  tokenId?: number;
}

export interface EOStats {
  totalRevenue: number;
  revenueChange: number;
  totalEvents: number;
  activeEvents: number;
  totalTicketsSold: number;
  ticketsChange: number;
  avgTicketPrice: number;
  totalAttendees: number;
}

export interface RevenueDataPoint {
  month: string;
  revenue: number;
  tickets: number;
}

/**
 * Hook to fetch EO Portfolio Data from blockchain
 */
export function useEOPortfolioData() {
  const { wallet } = useWallet();
  const address = wallet?.address;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for all portfolio data
  const [eoStats, setEOStats] = useState<EOStats>({
    totalRevenue: 0,
    revenueChange: 0,
    totalEvents: 0,
    activeEvents: 0,
    totalTicketsSold: 0,
    ticketsChange: 0,
    avgTicketPrice: 0,
    totalAttendees: 0,
  });

  const [eventPerformance, setEventPerformance] = useState<EventPerformance[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([]);

  /**
   * Fetch event details from contract
   */
  const fetchEventDetails = async (
    eventIndex: number,
    provider: ethers.Provider
  ) => {
    try {
      const contracts = getContracts();
      const organizerContract = new ethers.Contract(
        contracts.EventOrganizer,
        EventOrganizerABI.abi,
        provider
      );

      console.log(`🔍 Fetching event details for index ${eventIndex}`);

      // Get deployed event details
      const deployedEvent = await organizerContract.deployedEvents!(eventIndex) as any;
      const eventContract = deployedEvent.eventContract as string;
      const isActive = deployedEvent.isActive as boolean;

      console.log(`📋 Event contract: ${eventContract}, isActive: ${isActive}`);

      // Get ticket contract details
      const ticketContract = new ethers.Contract(
        eventContract,
        EventTicketABI.abi,
        provider
      );

      // Try to get event details using new getEventDetails() that returns tuple
      let eventName = 'Unnamed Event';
      let eventDate = 0;
      let maxSupply = 0;
      let ticketPrice: bigint | null = null;
      let ticketsSold = 0;
      let eventImageUri = '';
      let priceInEth = 0; // Declare here for use in fallback
      let eventCancelled = false;
      let eventPaused = false;

      try {
        // Primary method: getEventDetails() - returns tuple
        console.log(`📞 Calling getEventDetails() for ${eventContract}`);
        const eventDetails = await ticketContract.getEventDetails!();
        
        console.log(`📦 Raw eventDetails:`, eventDetails);
        
        // Destructure the tuple based on smart contract return values
        // EventTicketV3.getEventDetails() returns:
        // [eventName, eventDate, eventVenue, venueAddress, venueCoordinates, eventImageUri,
        //  maxSupply, ticketPrice, ticketsSold, ticketsRemaining, eventCancelled, eventPaused,
        //  status, organizer, eventDescription]
        
        if (Array.isArray(eventDetails) && eventDetails.length >= 15) {
          eventName = eventDetails[0] || eventName;
          eventDate = eventDetails[1] ? Number(eventDetails[1]) : 0;
          eventImageUri = eventDetails[5] || '';
          maxSupply = eventDetails[6] ? Number(eventDetails[6]) : 0;
          ticketPrice = eventDetails[7];
          ticketsSold = eventDetails[8] ? Number(eventDetails[8]) : 0;
          eventCancelled = Boolean(eventDetails[10]); // Index 10
          eventPaused = Boolean(eventDetails[11]); // Index 11
          
          console.log(`✅ Parsed from tuple: ${eventName}, ${ticketsSold}/${maxSupply} sold, cancelled: ${eventCancelled}, paused: ${eventPaused}`);
        } else {
          // Fallback for older contract structure
          console.log(`⚠️ Unexpected tuple structure, trying old format`);
          eventName = eventDetails._eventName || eventDetails[0] || eventName;
          eventDate = eventDetails._eventDate ? Number(eventDetails._eventDate) : (eventDetails[1] ? Number(eventDetails[1]) : 0);
          maxSupply = eventDetails._maxSupply ? Number(eventDetails._maxSupply) : (eventDetails[6] ? Number(eventDetails[6]) : 0);
          ticketPrice = eventDetails._ticketPrice || eventDetails[7];
          ticketsSold = eventDetails._ticketsSold ? Number(eventDetails._ticketsSold) : (eventDetails[8] ? Number(eventDetails[8]) : 0);
          eventImageUri = eventDetails._eventImageUri || eventDetails[5] || '';
          eventCancelled = Boolean(eventDetails._eventCancelled || eventDetails[10]);
          eventPaused = Boolean(eventDetails._eventPaused || eventDetails[11]);
          
          console.log(`✅ Parsed from old format: ${eventName}, ${ticketsSold}/${maxSupply} sold, cancelled: ${eventCancelled}, paused: ${eventPaused}`);
        }
      } catch (detailError) {
        console.warn(`⚠️ getEventDetails failed, trying individual calls:`, detailError);
        
        // Fallback: individual property calls with detailed logging
        try {
          const name = await ticketContract.eventName!();
          console.log(`📝 eventName raw:`, name);
          eventName = name || eventName;
        } catch (e) { console.log('❌ eventName failed:', e); }
        
        try {
          const date = await ticketContract.eventDate!();
          console.log(`📅 eventDate raw:`, date);
          eventDate = date ? Number(date) : 0;
        } catch (e) { console.log('❌ eventDate failed:', e); }
        
        try {
          const supply = await ticketContract.maxSupply!();
          console.log(`📦 maxSupply raw:`, supply);
          maxSupply = supply ? Number(supply) : 0;
        } catch (e) { console.log('❌ maxSupply failed:', e); }
        
        try {
          const price = await ticketContract.ticketPrice!();
          console.log(`💵 ticketPrice raw:`, price);
          ticketPrice = price;
        } catch (e) { console.log('❌ ticketPrice failed:', e); }
        
        try {
          const sold = await ticketContract.ticketsSold!();
          console.log(`🎫 ticketsSold raw:`, sold);
          ticketsSold = sold ? Number(sold) : 0;
        } catch (e) { console.log('❌ ticketsSold failed:', e); }
        
        try {
          const uri = await ticketContract.eventImageUri!();
          console.log(`🖼️ eventImageUri raw:`, uri);
          eventImageUri = uri || '';
        } catch (e) { console.log('❌ eventImageUri failed:', e); }

        try {
          const cancelled = await ticketContract.eventCancelled!();
          console.log(`❌ eventCancelled raw:`, cancelled);
          eventCancelled = Boolean(cancelled);
        } catch (e) { console.log('❌ eventCancelled failed:', e); }

        try {
          const paused = await ticketContract.eventPaused!();
          console.log(`⏸️ eventPaused raw:`, paused);
          eventPaused = Boolean(paused);
        } catch (e) { console.log('❌ eventPaused failed:', e); }

        console.log(`✅ Individual calls completed for ${eventName}`);
      }

      // ULTIMATE FALLBACK: Use fetchCompleteEventDetails from service
      if (eventName === 'Unnamed Event' || maxSupply === 0) {
        console.log(`⚠️ Data still incomplete, trying fetchCompleteEventDetails service...`);
        try {
          const completeData = await fetchCompleteEventDetails(eventContract);
          
          if (completeData) {
            console.log(`✅ fetchCompleteEventDetails succeeded:`, completeData.eventName);
            eventName = completeData.eventName || eventName;
            eventDate = completeData.eventDate || eventDate;
            maxSupply = completeData.maxSupply || maxSupply;
            ticketsSold = completeData.ticketsSold || ticketsSold;
            eventImageUri = completeData.eventImageUri || eventImageUri;
            eventCancelled = completeData.eventCancelled || eventCancelled;
            eventPaused = completeData.eventPaused || eventPaused;
            
            // Get ticketPrice from formatted price string
            if (completeData.ticketPrice && !ticketPrice) {
              try {
                priceInEth = parseFloat(completeData.price || completeData.ticketPrice);
              } catch (e) {
                console.warn('Failed to parse price from service:', e);
              }
            }
            
            console.log(`✅ Service data applied: ${eventName}, ${ticketsSold}/${maxSupply} sold`);
          }
        } catch (serviceError) {
          console.warn(`❌ fetchCompleteEventDetails also failed:`, serviceError);
        }
      }

      // Calculate revenue with null checking
      if (ticketPrice !== null && ticketPrice !== undefined) {
        try {
          priceInEth = Number(ethers.formatEther(ticketPrice));
        } catch (e) {
          console.warn('Failed to format ticket price:', e);
          priceInEth = 0;
        }
      }
      const revenue = ticketsSold * priceInEth;

      console.log(`💰 Revenue calculated: ${revenue} (${ticketsSold} tickets × ${priceInEth} PUSH)`);

      // Determine status with priority: cancelled > paused > past > active > upcoming
      const now = Math.floor(Date.now() / 1000);
      let status: 'active' | 'upcoming' | 'past' = 'upcoming';
      
      if (eventCancelled) {
        // Cancelled events show as past (or we could add 'cancelled' status)
        status = 'past';
        console.log(`⚠️ Event is CANCELLED`);
      } else if (eventPaused) {
        // Paused events show as upcoming (or we could add 'paused' status)
        status = 'upcoming';
        console.log(`⏸️ Event is PAUSED`);
      } else if (eventDate && eventDate < now) {
        status = 'past';
      } else if (isActive && (!eventDate || eventDate >= now)) {
        status = 'active';
      }

      console.log(`🎯 Status determined: ${status}`);

      // Get image from metadata or use placeholder
      let image = `https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80`;
      if (eventImageUri && eventImageUri.startsWith('ipfs://')) {
        const ipfsHash = eventImageUri.replace('ipfs://', '');
        image = `https://ipfs.io/ipfs/${ipfsHash}`;
      } else if (eventImageUri && eventImageUri.startsWith('http')) {
        image = eventImageUri;
      }

      const eventData = {
        id: `evt-${eventIndex}`,
        eventId: eventIndex,
        contractAddress: eventContract,
        name: eventName,
        date: eventDate ? new Date(eventDate * 1000).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }) : 'Date TBA',
        ticketsSold,
        capacity: maxSupply,
        revenue: revenue.toFixed(2),
        status,
        image,
        ticketPrice: priceInEth.toFixed(4),
      };

      console.log(`✅ Event ${eventIndex} fetched:`, eventData.name, `- ${eventData.ticketsSold}/${eventData.capacity} sold`);

      return eventData;
    } catch (err) {
      console.error('Error fetching event details:', err);
      return null;
    }
  };

  /**
   * Fetch all transactions from events
   */
  const fetchTransactions = async (
    eventContracts: string[],
    provider: ethers.Provider
  ): Promise<Transaction[]> => {
    const allTransactions: Transaction[] = [];

    for (const contractAddress of eventContracts) {
      try {
        console.log(`🔄 Fetching transactions for ${contractAddress}`);
        
        const ticketContract = new ethers.Contract(
          contractAddress,
          EventTicketABI.abi,
          provider
        );

        // Get event details with fallback
        let eventName = 'Unknown Event';
        let ticketPrice: bigint | null = null;
        let priceInEth = '0';

        try {
          const eventDetails = await ticketContract.getEventDetails!();
          
          // Try tuple format first
          if (Array.isArray(eventDetails) && eventDetails.length >= 15) {
            eventName = eventDetails[0] || eventName;
            ticketPrice = eventDetails[7];
          } else {
            // Try old format
            eventName = eventDetails._eventName || eventDetails[0] || eventName;
            ticketPrice = eventDetails._ticketPrice || eventDetails[7];
          }
          
          if (ticketPrice) {
            priceInEth = ethers.formatEther(ticketPrice);
          }
        } catch (detailError) {
          console.warn(`⚠️ Failed to get event details for transactions:`, detailError);
          
          // Fallback to individual calls
          try {
            eventName = await ticketContract.eventName!() || eventName;
          } catch (e) { /* ignore */ }
          
          try {
            const price = await ticketContract.ticketPrice!();
            if (price) {
              priceInEth = ethers.formatEther(price);
            }
          } catch (e) { /* ignore */ }
        }

        console.log(`📊 Event: ${eventName}, Price: ${priceInEth} PUSH`);

        // Get current block number
        const currentBlock = await provider.getBlockNumber();
        // Only query last 5000 blocks to avoid RPC limit (max 10000)
        const fromBlock = Math.max(0, currentBlock - 5000);

        console.log(`🔍 Querying Transfer events from block ${fromBlock} to ${currentBlock}`);

        // Get Transfer events (from address(0) = minting)
        const filter = ticketContract.filters!.Transfer!(
          ethers.ZeroAddress, // from (null address = minting)
          null // to (any address)
        );
        
        const events = await ticketContract.queryFilter(filter, fromBlock, currentBlock);

        console.log(`✅ Found ${events.length} Transfer events for ${eventName}`);

        for (const event of events.slice(-20)) { // Get last 20 transactions
          if (!('args' in event)) continue;
          const args = event.args;
          if (!args) continue;

          const block = await provider.getBlock(event.blockNumber);
          const timestamp = block ? Number(block.timestamp) * 1000 : Date.now();
          const dateStr = new Date(timestamp).toISOString().split('T')[0]!;
          
          allTransactions.push({
            id: `tx-${event.transactionHash}-${event.index}`,
            type: 'sale',
            event: eventName,
            eventName: eventName,
            eventContract: contractAddress,
            buyer: args.to || 'Unknown',
            amount: `+${priceInEth} PUSH`,
            date: dateStr,
            timestamp: timestamp,
            tickets: 1,
            tokenId: Number(args.tokenId),
          });
        }

        console.log(`✅ Added ${Math.min(events.length, 20)} transactions from ${eventName}`);
      } catch (err) {
        console.error(`❌ Error fetching transactions for ${contractAddress}:`, err);
      }
    }

    // Fetch Refund Events (V3.1 - Fraud Protection)
    for (const contractAddress of eventContracts) {
      try {
        console.log(`💸 Fetching refund events for ${contractAddress}`);
        
        const ticketContract = new ethers.Contract(
          contractAddress,
          EventTicketABI.abi,
          provider
        );

        // Get event details
        let eventName = 'Unknown Event';
        let ticketPrice: bigint | null = null;
        let priceInEth = '0';

        try {
          const eventDetails = await ticketContract.getEventDetails!();
          
          if (Array.isArray(eventDetails) && eventDetails.length >= 15) {
            eventName = eventDetails[0] || eventName;
            ticketPrice = eventDetails[7];
          } else {
            eventName = eventDetails._eventName || eventDetails[0] || eventName;
            ticketPrice = eventDetails._ticketPrice || eventDetails[7];
          }
          
          if (ticketPrice) {
            priceInEth = ethers.formatEther(ticketPrice);
          }
        } catch (detailError) {
          try {
            eventName = await ticketContract.eventName!() || eventName;
          } catch (e) { /* ignore */ }
          
          try {
            const price = await ticketContract.ticketPrice!();
            if (price) {
              priceInEth = ethers.formatEther(price);
            }
          } catch (e) { /* ignore */ }
        }

        // Get current block number
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 5000);

        console.log(`🔍 Querying Refund events from block ${fromBlock} to ${currentBlock}`);

        // Get RefundClaimed, PartialRefundClaimed, and EmergencyRefundClaimed events
        const refundFilter = ticketContract.filters!.RefundClaimed!();
        const partialRefundFilter = ticketContract.filters!.PartialRefundClaimed!();
        const emergencyRefundFilter = ticketContract.filters!.EmergencyRefundClaimed!();
        
        const [refundEvents, partialRefundEvents, emergencyRefundEvents] = await Promise.all([
          ticketContract.queryFilter(refundFilter, fromBlock, currentBlock).catch(() => []),
          ticketContract.queryFilter(partialRefundFilter, fromBlock, currentBlock).catch(() => []),
          ticketContract.queryFilter(emergencyRefundFilter, fromBlock, currentBlock).catch(() => []),
        ]);

        const allRefundEvents = [...refundEvents, ...partialRefundEvents, ...emergencyRefundEvents];

        console.log(`✅ Found ${allRefundEvents.length} refund events for ${eventName}`);

        for (const event of allRefundEvents.slice(-20)) { // Get last 20 refunds
          if (!('args' in event)) continue;
          const args = event.args as any;
          if (!args) continue;

          const block = await provider.getBlock(event.blockNumber);
          const timestamp = block ? Number(block.timestamp) * 1000 : Date.now();
          const dateStr = new Date(timestamp).toISOString().split('T')[0]!;
          
          // Parse refund amount
          const refundAmount = args[1]; // Second argument is amount
          const refundInEth = ethers.formatEther(refundAmount);
          
          // Get ticket count
          let ticketCount = 1;
          if (args[2]) {
            // PartialRefundClaimed has ticketCount as third argument
            ticketCount = Number(args[2]);
          } else if (args.length > 2 && Array.isArray(args[2])) {
            // tokenIds array
            ticketCount = args[2].length;
          }
          
          allTransactions.push({
            id: `refund-${event.transactionHash}-${event.index}`,
            type: 'refund',
            event: eventName,
            eventName: eventName,
            eventContract: contractAddress,
            buyer: args[0] || 'Unknown', // User who claimed refund
            amount: `-${refundInEth} PUSH`,
            date: dateStr,
            timestamp: timestamp,
            tickets: ticketCount,
          });
        }

        console.log(`✅ Added ${Math.min(allRefundEvents.length, 20)} refund transactions from ${eventName}`);
      } catch (err) {
        console.error(`❌ Error fetching refund events for ${contractAddress}:`, err);
      }
    }

    console.log(`📊 Total transactions collected: ${allTransactions.length}`);

    // Sort by timestamp descending (most recent first)
    const sortedTransactions = allTransactions.sort((a, b) => 
      b.timestamp - a.timestamp
    );
    
    console.log(`✅ Returning ${sortedTransactions.length} transactions (sorted by most recent)`);
    
    // Return ALL transactions, pagination will be handled in the UI
    return sortedTransactions;
  };

  /**
   * Calculate revenue data by month
   */
  const calculateRevenueData = (transactions: Transaction[]): RevenueDataPoint[] => {
    const monthlyData: { [key: string]: { revenue: number; tickets: number } } = {};

    transactions.forEach(tx => {
      const date = new Date(tx.date);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { revenue: 0, tickets: 0 };
      }

      const revenue = parseFloat(tx.amount.replace(/[^0-9.]/g, ''));
      monthlyData[monthKey].revenue += revenue;
      monthlyData[monthKey].tickets += tx.tickets;
    });

    // Get last 6 months
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const result: RevenueDataPoint[] = [];

    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      const month = months[monthIndex];
      if (month) {
        result.push({
          month,
          revenue: monthlyData[month]?.revenue || 0,
          tickets: monthlyData[month]?.tickets || 0,
        });
      }
    }

    return result;
  };

  /**
   * Resolve UEA address - Try to get the UEA address or use original
   */
  const resolveUEAAddress = async (
    originalAddress: string,
    organizerContract: ethers.Contract
  ): Promise<string> => {
    console.log('🔍 Resolving UEA address for:', originalAddress);

    try {
      // Method 1: Try direct check if organizer exists with original address
      const organizerExistsWithOriginal = await organizerContract.organizerExists!(originalAddress);
      console.log('📋 Organizer exists with original address:', organizerExistsWithOriginal);

      if (organizerExistsWithOriginal) {
        console.log('✅ Using original address:', originalAddress);
        return originalAddress;
      }

      // Method 2: Try to get UEA from original (if contract has this function)
      try {
        const ueaAddress = await organizerContract.getUEAFromOriginal!(originalAddress);
        console.log('🔗 UEA address from getUEAFromOriginal:', ueaAddress);
        
        if (ueaAddress && ueaAddress !== ethers.ZeroAddress) {
          const organizerExistsWithUEA = await organizerContract.organizerExists!(ueaAddress);
          console.log('📋 Organizer exists with UEA:', organizerExistsWithUEA);
          
          if (organizerExistsWithUEA) {
            console.log('✅ Using UEA address:', ueaAddress);
            return ueaAddress;
          }
        }
      } catch (e) {
        console.log('⚠️ getUEAFromOriginal not available or failed:', e);
      }

      // Method 3: Try to get original from UEA (reverse lookup)
      try {
        const mappedOriginal = await organizerContract.getOriginalFromUEA!(originalAddress);
        console.log('🔗 Original address from getOriginalFromUEA:', mappedOriginal);
        
        if (mappedOriginal && mappedOriginal !== ethers.ZeroAddress) {
          // If we found a mapping, the input was actually a UEA, use it
          const organizerExistsWithInput = await organizerContract.organizerExists!(originalAddress);
          if (organizerExistsWithInput) {
            console.log('✅ Input was UEA, using it:', originalAddress);
            return originalAddress;
          }
        }
      } catch (e) {
        console.log('⚠️ getOriginalFromUEA not available or failed:', e);
      }

      // If all methods fail, return original and let it fail gracefully
      console.log('⚠️ No UEA mapping found, using original address:', originalAddress);
      return originalAddress;
    } catch (error) {
      console.error('❌ Error resolving UEA address:', error);
      return originalAddress;
    }
  };

  /**
   * Main fetch function
   */
  const fetchPortfolioData = useCallback(async () => {
    if (!address || !window.ethereum) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🚀 Fetching EO Portfolio data for:', address);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const contracts = getContracts();

      // Get organizer info
      const organizerContract = new ethers.Contract(
        contracts.EventOrganizer,
        EventOrganizerABI.abi,
        provider
      );

      // Resolve UEA address
      const resolvedAddress = await resolveUEAAddress(address, organizerContract);
      console.log('🎯 Using resolved address:', resolvedAddress);

      // Get organizer event indices with resolved address
      const eventIndices = await organizerContract.getEventsByOrganizer!(resolvedAddress) as bigint[];
      console.log('📊 Event indices found:', eventIndices.length, eventIndices);
      
      // Fetch all event details
      const eventsPromises = eventIndices.map((idx: bigint) => 
        fetchEventDetails(Number(idx), provider)
      );
      const events = (await Promise.all(eventsPromises)).filter(Boolean) as EventPerformance[];
      console.log('✅ Events fetched:', events.length);

      setEventPerformance(events);

      // Calculate stats
      const totalRevenue = events.reduce((sum, evt) => sum + parseFloat(evt.revenue), 0);
      const totalTicketsSold = events.reduce((sum, evt) => sum + evt.ticketsSold, 0);
      const activeEvents = events.filter(evt => evt.status === 'active').length;
      const avgTicketPrice = totalTicketsSold > 0 ? totalRevenue / totalTicketsSold : 0;

      const stats = {
        totalRevenue,
        revenueChange: 12.5, // TODO: Calculate based on previous period
        totalEvents: events.length,
        activeEvents,
        totalTicketsSold,
        ticketsChange: 8.3, // TODO: Calculate based on previous period
        avgTicketPrice,
        totalAttendees: totalTicketsSold, // Each ticket = 1 attendee
      };

      console.log('📊 EO Stats calculated:', stats);
      setEOStats(stats);

      // Fetch transactions only if we have events
      if (events.length > 0) {
        const eventContracts = events.map(evt => evt.contractAddress);
        console.log('🔄 Fetching transactions for contracts:', eventContracts.length);
        const transactions = await fetchTransactions(eventContracts, provider);
        console.log('✅ Transactions fetched:', transactions.length);
        setRecentTransactions(transactions);

        // Calculate revenue data
        const revData = calculateRevenueData(transactions);
        console.log('📈 Revenue data calculated:', revData);
        setRevenueData(revData);
      } else {
        console.log('⚠️ No events found, skipping transaction fetch');
        setRecentTransactions([]);
        setRevenueData([]);
      }

    } catch (err: any) {
      console.error('Error fetching portfolio data:', err);
      setError(err.message || 'Failed to fetch portfolio data');
    } finally {
      setLoading(false);
    }
  }, [address]);

  // Fetch on mount and when address changes
  useEffect(() => {
    fetchPortfolioData();
  }, [fetchPortfolioData]);

  return {
    loading,
    error,
    eoStats,
    eventPerformance,
    recentTransactions,
    revenueData,
    refetch: fetchPortfolioData,
  };
}
