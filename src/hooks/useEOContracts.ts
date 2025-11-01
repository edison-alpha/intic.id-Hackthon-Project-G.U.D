/**
 * Custom Hook for EO Deployed Contracts
 * Fetches all events/contracts deployed by Event Organizer from blockchain
 */

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@/hooks/usePushChainWallet';
import EventOrganizerABI from '@/contracts/EventOrganizer.json';
import EventTicketABI from '@/contracts/EventTicket.json';
import { getContracts, getNetworkConfig } from '@/config/contracts';

// Types
export interface DeployedContract {
  contractAddress: string;
  contractName: string;
  eventName: string;
  eventDescription?: string;
  image?: string;
  eventImage?: string;
  totalSupply: number;
  ticketPrice: number;
  ticketPriceFormatted: string;
  pricingMode?: 'fixed' | 'dynamic';
  currency?: string;
  royaltyPercent?: number;
  eventDate: number;
  deployedAt: number;
  txId?: string;
  metadataUri?: string;
  eventCancelled?: boolean;
  eventPaused?: boolean;
  // Real-time stats
  ticketsSold: number;
  ticketsRemaining: number;
  revenue: number;
  revenueFormatted: string;
  eventStatus: 'active' | 'upcoming' | 'past' | 'sold-out' | 'cancelled' | 'paused';
  // Analytics
  totalTransactions: number;
  uniqueHolders: number;
  baseUri?: string;
}

export interface ContractStats {
  totalContracts: number;
  totalRevenue: number;
  totalTicketsSold: number;
  averagePrice: number;
  activeEvents: number;
  upcomingEvents: number;
}

export const useEOContracts = () => {
  const { wallet } = useWallet();
  const [contracts, setContracts] = useState<DeployedContract[]>([]);
  const [stats, setStats] = useState<ContractStats>({
    totalContracts: 0,
    totalRevenue: 0,
    totalTicketsSold: 0,
    averagePrice: 0,
    activeEvents: 0,
    upcomingEvents: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch contract details from EventTicket contract
   */
  const fetchContractDetails = async (
    contractAddress: string,
    provider: ethers.Provider
  ): Promise<DeployedContract | null> => {
    try {
      console.log(`🔍 [fetchContractDetails] Fetching details for ${contractAddress}`);
      
      const ticketContract = new ethers.Contract(
        contractAddress,
        EventTicketABI.abi,
        provider
      );

      // Get event details
      console.log('   Calling getEventDetails()...');
      let eventDetails;
      
      try {
        eventDetails = await (ticketContract as any).getEventDetails();
        console.log('   Event details from getEventDetails():', eventDetails);
      } catch (err) {
        console.warn('   getEventDetails() failed, trying direct property access:', err);
        eventDetails = null;
      }
      
      // Safe extraction with null checks and fallback to direct property access
      let eventName = '';
      let eventDescription = '';
      let maxSupply = 0;
      let ticketPrice = BigInt(0);
      let eventDate = Date.now();
      let imageUri = '';
      let eventCancelled = false;
      let eventPaused = false;
      
      if (eventDetails) {
        // Extract from getEventDetails() result
        eventName = eventDetails._eventName as string || '';
        eventDescription = eventDetails._eventDescription as string || '';
        maxSupply = eventDetails._maxSupply ? Number(eventDetails._maxSupply) : 0;
        ticketPrice = eventDetails._ticketPrice || BigInt(0);
        eventDate = eventDetails._eventDate ? Number(eventDetails._eventDate) * 1000 : Date.now();
        imageUri = eventDetails._eventImageUri as string || '';
        eventCancelled = eventDetails._eventCancelled as boolean || false;
        eventPaused = eventDetails._eventPaused as boolean || false;
      }
      
      // Fallback: Try direct property access if getEventDetails failed or returned empty
      if (!eventName) {
        console.log('   Trying direct property access...');
        try {
          eventName = await (ticketContract as any).eventName?.() || '';
          console.log('   eventName:', eventName);
        } catch (err) {
          console.warn('   Failed to get eventName:', err);
        }
      }
      
      if (!eventDescription) {
        try {
          eventDescription = await (ticketContract as any).eventDescription?.() || '';
          console.log('   eventDescription:', eventDescription);
        } catch (err) {
          console.warn('   Failed to get eventDescription:', err);
        }
      }
      
      if (maxSupply === 0) {
        try {
          const supply = await (ticketContract as any).maxSupply?.();
          maxSupply = supply ? Number(supply) : 0;
          console.log('   maxSupply:', maxSupply);
        } catch (err) {
          console.warn('   Failed to get maxSupply:', err);
        }
      }
      
      if (ticketPrice === BigInt(0)) {
        try {
          const price = await (ticketContract as any).ticketPrice?.();
          ticketPrice = price || BigInt(0);
          console.log('   ticketPrice:', ticketPrice.toString());
        } catch (err) {
          console.warn('   Failed to get ticketPrice:', err);
        }
      }
      
      if (eventDate === Date.now() || !eventDate) {
        try {
          const date = await (ticketContract as any).eventDate?.();
          eventDate = date ? Number(date) * 1000 : Date.now();
          console.log('   eventDate:', new Date(eventDate).toISOString());
        } catch (err) {
          console.warn('   Failed to get eventDate:', err);
        }
      }
      
      if (!imageUri) {
        try {
          imageUri = await (ticketContract as any).eventImageUri?.() || '';
          console.log('   eventImageUri:', imageUri);
        } catch (err) {
          console.warn('   Failed to get eventImageUri:', err);
        }
      }
      
      // Check eventCancelled and eventPaused status directly from contract
      // These are critical for status determination
      if (!eventCancelled) {
        try {
          const cancelled = await (ticketContract as any).eventCancelled?.();
          eventCancelled = Boolean(cancelled);
          console.log('   eventCancelled (direct):', eventCancelled);
        } catch (err) {
          console.warn('   Failed to get eventCancelled:', err);
        }
      }
      
      if (!eventPaused) {
        try {
          const paused = await (ticketContract as any).eventPaused?.();
          eventPaused = Boolean(paused);
          console.log('   eventPaused (direct):', eventPaused);
        } catch (err) {
          console.warn('   Failed to get eventPaused:', err);
        }
      }
      
      if (!eventName) {
        eventName = `Event ${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}`;
      }
      
      const priceInEth = ticketPrice ? ethers.formatEther(ticketPrice) : '0';

      console.log('   Parsed event data:', {
        eventName,
        maxSupply,
        ticketPrice: ticketPrice.toString(),
        priceInEth,
        eventDate: new Date(eventDate).toISOString(),
      });

      // Get tickets sold and remaining with error handling
      let ticketsSold = 0;
      let remainingTickets = maxSupply;
      
      try {
        console.log('   Calling totalSupply()...');
        const totalSupply = await (ticketContract as any).totalSupply();
        ticketsSold = totalSupply ? Number(totalSupply) : 0;
        console.log('   Total supply:', ticketsSold);
      } catch (err) {
        console.warn('   Failed to get totalSupply:', err);
      }
      
      try {
        console.log('   Calling getTicketsRemaining()...');
        const ticketsRemainingResult = await (ticketContract as any).getTicketsRemaining();
        remainingTickets = ticketsRemainingResult ? Number(ticketsRemainingResult) : maxSupply - ticketsSold;
        console.log('   Tickets remaining:', remainingTickets);
      } catch (err) {
        console.warn('   Failed to get ticketsRemaining, calculating:', err);
        remainingTickets = Math.max(0, maxSupply - ticketsSold);
      }

      // Calculate revenue
      const revenue = ticketsSold * parseFloat(priceInEth);

      // Determine event status
      let eventStatus: 'active' | 'upcoming' | 'past' | 'sold-out' | 'cancelled' | 'paused' = 'active';
      const now = Date.now();
      
      console.log('   Determining event status...');
      console.log('   - eventCancelled:', eventCancelled);
      console.log('   - eventPaused:', eventPaused);
      console.log('   - remainingTickets:', remainingTickets);
      console.log('   - eventDate:', new Date(eventDate).toISOString());
      console.log('   - now:', new Date(now).toISOString());
      
      if (eventCancelled) {
        eventStatus = 'cancelled';
        console.log('   ❌ Status: CANCELLED');
      } else if (eventPaused) {
        eventStatus = 'paused';
        console.log('   ⏸️ Status: PAUSED');
      } else if (remainingTickets === 0) {
        eventStatus = 'sold-out';
        console.log('   🎫 Status: SOLD OUT');
      } else if (eventDate > now + 7 * 24 * 60 * 60 * 1000) { // More than 7 days away
        eventStatus = 'upcoming';
        console.log('   🔜 Status: UPCOMING');
      } else if (eventDate < now) {
        eventStatus = 'past';
        console.log('   ⏰ Status: PAST');
      } else {
        console.log('   ✅ Status: ACTIVE');
      }

      // Get Transfer events for analytics (with error handling)
      let totalTransactions = 0;
      let uniqueHoldersCount = 0;
      
      try {
        console.log('   Fetching Transfer events...');
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 5000);
        
        const filter = (ticketContract as any).filters.Transfer(
          ethers.ZeroAddress,
          null
        );
        
        const events = await ticketContract.queryFilter(filter, fromBlock, currentBlock);
        totalTransactions = events.length;
        
        // Get unique holders
        const holders = new Set<string>();
        events.forEach(event => {
          if ('args' in event && event.args) {
            holders.add(event.args.to as string);
          }
        });
        uniqueHoldersCount = holders.size;
        
        console.log('   Transfer events:', totalTransactions, 'Unique holders:', uniqueHoldersCount);
      } catch (err) {
        console.warn('   Failed to fetch Transfer events:', err);
      }

      const contractDetails = {
        contractAddress,
        contractName: contractAddress.slice(-8),
        eventName,
        eventDescription,
        image: imageUri,
        eventImage: imageUri,
        totalSupply: maxSupply,
        ticketPrice: parseFloat(priceInEth),
        ticketPriceFormatted: `${parseFloat(priceInEth).toFixed(4)} PUSH`,
        pricingMode: 'fixed' as const,
        currency: 'PUSH',
        eventDate,
        deployedAt: Date.now(), // We don't have this info, use current time
        eventCancelled,
        eventPaused,
        ticketsSold,
        ticketsRemaining: remainingTickets,
        revenue,
        revenueFormatted: `${revenue.toFixed(4)} PUSH`,
        eventStatus,
        totalTransactions,
        uniqueHolders: uniqueHoldersCount,
        metadataUri: imageUri,
      };
      
      console.log(`✅ [fetchContractDetails] Successfully fetched details for ${contractAddress}`);
      return contractDetails;
    } catch (err) {
      console.error(`Error fetching contract details for ${contractAddress}:`, err);
      return null;
    }
  };

  /**
   * Fetch all contracts deployed by organizer
   */
  const fetchAllContracts = useCallback(async () => {
    if (!wallet?.address) {
      setContracts([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get provider and contract addresses
      const networkConfig = getNetworkConfig();
      const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
      const { EventOrganizer } = getContracts();

      // Get EventOrganizer contract
      const organizerContract = new ethers.Contract(
        EventOrganizer,
        EventOrganizerABI.abi,
        provider
      );

      // First check if organizer exists
      // Support both original wallet address and UEA address
      let actualOrganizerAddress = wallet.address;
      let organizerExists = false;
      
      try {
        console.log('🔍 [useEOContracts] Checking organizer existence...');
        console.log('   Wallet Address:', wallet.address);
        console.log('   EventOrganizer Contract:', EventOrganizer);
        
        // Try with current wallet address first
        organizerExists = await (organizerContract as any).organizerExists(wallet.address);
        console.log('   Organizer Exists (direct)?', organizerExists);
        
        // If not found, try UEA resolution
        if (!organizerExists) {
          console.log('   Trying UEA address resolution...');
          
          // Try to get UEA from original address
          try {
            const ueaAddr = await (organizerContract as any).getUEAFromOriginal?.(wallet.address);
            if (ueaAddr && ueaAddr !== ethers.ZeroAddress) {
              console.log('   Found UEA mapping:', ueaAddr);
              const ueaExists = await (organizerContract as any).organizerExists(ueaAddr);
              console.log('   Organizer Exists (via UEA)?', ueaExists);
              
              if (ueaExists) {
                actualOrganizerAddress = ueaAddr;
                organizerExists = true;
                console.log('   ✅ Using UEA address for queries');
              }
            }
          } catch (err) {
            console.log('   No getUEAFromOriginal method or failed:', err);
          }
        }
        
        // If still not found, try reverse (wallet might BE the UEA)
        if (!organizerExists) {
          console.log('   Trying reverse UEA resolution (wallet might be UEA)...');
          
          try {
            const originalAddr = await (organizerContract as any).getOriginalFromUEA?.(wallet.address);
            if (originalAddr && originalAddr !== ethers.ZeroAddress) {
              console.log('   Found Original mapping:', originalAddr);
              const originalExists = await (organizerContract as any).organizerExists(originalAddr);
              console.log('   Organizer Exists (via Original)?', originalExists);
              
              if (originalExists) {
                actualOrganizerAddress = originalAddr;
                organizerExists = true;
                console.log('   ✅ Using Original address for queries');
              }
            }
          } catch (err) {
            console.log('   No getOriginalFromUEA method or failed:', err);
          }
        }
        
        if (!organizerExists) {
          console.warn('⚠️ [useEOContracts] Organizer not registered!');
          console.warn('   Address:', wallet.address);
          console.warn('   Contract:', EventOrganizer);
          console.warn('   This is why events do not appear in Contract Management');
          console.warn('   Solution: Register as organizer first');
          console.warn('');
          console.warn('   💡 If events appear in Browse Events but not here:');
          console.warn('      - Events might be registered with different address (UEA)');
          console.warn('      - Check browser console for UEA resolution attempts');
          console.warn('      - Or register this wallet as organizer');
          
          setContracts([]);
          setStats({
            totalContracts: 0,
            totalRevenue: 0,
            totalTicketsSold: 0,
            averagePrice: 0,
            activeEvents: 0,
            upcomingEvents: 0,
          });
          setLoading(false);
          return;
        }
        
        console.log('✅ [useEOContracts] Organizer is registered');
        console.log('   Using address:', actualOrganizerAddress);
      } catch (err) {
        console.error('❌ [useEOContracts] Error checking organizer existence:', err);
      }

      // Get all events created by this organizer (using resolved address)
      console.log('🔍 [useEOContracts] Fetching events by organizer...');
      const eventIndices = await (organizerContract as any).getEventsByOrganizer(actualOrganizerAddress);
      console.log('   Event Indices:', eventIndices);
      
      // Convert BigInt results to regular arrays
      const indices = Array.from(eventIndices).map(idx => Number(idx));
      console.log('   Indices (converted):', indices);

      if (indices.length === 0) {
        console.warn('⚠️ [useEOContracts] No events found for organizer!');
        console.warn('   Organizer Address:', actualOrganizerAddress);
        console.warn('   Original Wallet:', wallet.address);
        console.warn('');
        console.warn('   🔍 Checking ALL events to find organizer mismatch...');
        
        // Get all events to check who the actual organizer is
        try {
          const allDeployedEvents = await (organizerContract as any).getAllDeployedEvents();
          console.warn('   Total events in contract:', allDeployedEvents.length);
          
          if (allDeployedEvents.length > 0) {
            console.warn('   📋 Event Organizers (first 10):');
            
            for (let i = 0; i < Math.min(10, allDeployedEvents.length); i++) {
              const event = allDeployedEvents[i];
              const eventOrganizer = event[1] || event.organizer || 'unknown';
              const eventContract = event[0] || event.eventContract || 'unknown';
              
              console.warn(`   Event ${i}:`);
              console.warn(`      Contract: ${eventContract}`);
              console.warn(`      Organizer: ${eventOrganizer}`);
              console.warn(`      Match wallet? ${eventOrganizer.toLowerCase() === wallet.address.toLowerCase()}`);
              console.warn(`      Match actualOrganizer? ${eventOrganizer.toLowerCase() === actualOrganizerAddress.toLowerCase()}`);
            }
            
            // Check if any event matches wallet address
            const matchingEvents = allDeployedEvents.filter((event: any) => {
              const eventOrganizer = (event[1] || event.organizer || '').toLowerCase();
              return eventOrganizer === wallet.address.toLowerCase() ||
                     eventOrganizer === actualOrganizerAddress.toLowerCase();
            });
            
            if (matchingEvents.length > 0) {
              console.error('   ❌ INCONSISTENCY DETECTED!');
              console.error(`   Found ${matchingEvents.length} events with matching organizer in getAllDeployedEvents()`);
              console.error(`   But getEventsByOrganizer() returns empty array!`);
              console.error('');
              console.error('   🔧 WORKAROUND: Using manual filter instead...');
              
              // Extract indices manually
              const manualIndices: number[] = [];
              for (let i = 0; i < allDeployedEvents.length; i++) {
                const event = allDeployedEvents[i];
                const eventOrganizer = (event[1] || event.organizer || '').toLowerCase();
                if (eventOrganizer === wallet.address.toLowerCase() ||
                    eventOrganizer === actualOrganizerAddress.toLowerCase()) {
                  manualIndices.push(i);
                }
              }
              
              console.error('   Manual indices found:', manualIndices);
              console.error('   Proceeding with manual indices...');
              
              // Override indices with manual ones
              indices.length = 0;
              indices.push(...manualIndices);
            }
          }
        } catch (err) {
          console.error('   Error checking all events:', err);
        }
        
        if (indices.length === 0) {
          console.warn('');
          console.warn('   ❌ CONCLUSION: No events found even after checking all events');
          console.warn('   Possible causes:');
          console.warn('   1. No events deployed by this organizer yet');
          console.warn('   2. Events deployed with completely different address');
          console.warn('   3. Events deployed to different EventOrganizer contract');
          console.warn('   4. recordEventCreation() was never called or failed');
          
          setContracts([]);
          setStats({
            totalContracts: 0,
            totalRevenue: 0,
            totalTicketsSold: 0,
            averagePrice: 0,
            activeEvents: 0,
            upcomingEvents: 0,
          });
          setLoading(false);
          return;
        }
      }

      console.log(`✅ [useEOContracts] Found ${indices.length} event(s) for organizer`);

      // Get all deployed events
      console.log('🔍 [useEOContracts] Fetching all deployed events...');
      const allDeployedEvents = await (organizerContract as any).getAllDeployedEvents();
      console.log('   Total events in contract:', allDeployedEvents.length);
      
      // Convert proxy result to regular array and extract contract addresses
      const eventAddresses: string[] = [];
      
      console.log('🔍 [useEOContracts] Extracting contract addresses from indices...');
      
      for (const index of indices) {
        if (index < allDeployedEvents.length) {
          const eventData = allDeployedEvents[index];
          
          console.log(`   Processing index ${index}:`, {
            hasData: !!eventData,
            type: typeof eventData,
            keys: eventData ? Object.keys(eventData) : [],
            raw: eventData,
          });
          
          // Try different ways to extract contract address
          let contractAddress = '';
          
          // If it's a Proxy object, try to access properties directly
          if (eventData && typeof eventData === 'object') {
            // The DeployedEvent struct has: eventContract, organizer, eventId, deployedAt, isActive
            // So eventContract should be the first field (index 0)
            if (eventData[0]) {
              contractAddress = String(eventData[0]);
              console.log(`   ✅ Found address via [0]:`, contractAddress);
            }
            // Try accessing as object properties
            else if (eventData.eventContract) {
              contractAddress = String(eventData.eventContract);
              console.log(`   ✅ Found address via .eventContract:`, contractAddress);
            }
            // Try accessing by other possible names
            else if (eventData.contractAddress) {
              contractAddress = String(eventData.contractAddress);
              console.log(`   ✅ Found address via .contractAddress:`, contractAddress);
            }
            // Try converting to array and get first element
            else {
              try {
                const arrayData = Array.from(eventData as any);
                if (arrayData.length > 0) {
                  contractAddress = String(arrayData[0]);
                  console.log(`   ✅ Found address via Array.from():`, contractAddress);
                }
              } catch (e) {
                // Last resort: try direct property access on proxy
                if (eventData.eventContract) {
                  contractAddress = String(eventData.eventContract);
                  console.log(`   ✅ Found address (last resort):`, contractAddress);
                } else {
                  console.warn(`   ⚠️ Could not extract address from:`, eventData);
                }
              }
            }
          }
          
          if (contractAddress && 
              contractAddress !== ethers.ZeroAddress && 
              contractAddress !== '0x0000000000000000000000000000000000000000' &&
              contractAddress.startsWith('0x') &&
              contractAddress.length === 42) {
            eventAddresses.push(contractAddress);
            console.log(`   ✅ Added valid address:`, contractAddress);
          } else {
            console.warn(`   ⚠️ Invalid or zero address, skipped:`, contractAddress);
          }
        } else {
          console.warn(`   ⚠️ Index ${index} out of bounds (total: ${allDeployedEvents.length})`);
        }
      }

      console.log(`✅ [useEOContracts] Extracted ${eventAddresses.length} valid addresses`);

      // If no addresses found, try alternative method
      if (eventAddresses.length === 0 && indices.length > 0) {
        for (const index of indices) {
          try {
            // Try calling deployedEvents function directly with index
            const eventData = await (organizerContract as any).deployedEvents(index);
            
            if (eventData && eventData[0] && String(eventData[0]).startsWith('0x')) {
              const addr = String(eventData[0]);
              if (addr.length === 42) {
                eventAddresses.push(addr);
              }
            }
          } catch (err) {
            // Silent fail for alternative method
          }
        }
      }

      // Fetch details for each contract
      const contractDetailsPromises = eventAddresses.map(address =>
        fetchContractDetails(address, provider)
      );

      const contractDetails = await Promise.all(contractDetailsPromises);
      const validContracts = contractDetails.filter(c => c !== null) as DeployedContract[];

      // Calculate stats
      const totalRevenue = validContracts.reduce((sum, c) => sum + c.revenue, 0);
      const totalTicketsSold = validContracts.reduce((sum, c) => sum + c.ticketsSold, 0);
      const averagePrice = totalTicketsSold > 0 ? totalRevenue / totalTicketsSold : 0;
      const activeEvents = validContracts.filter(c => c.eventStatus === 'active').length;
      const upcomingEvents = validContracts.filter(c => c.eventStatus === 'upcoming').length;

      setContracts(validContracts);
      setStats({
        totalContracts: validContracts.length,
        totalRevenue,
        totalTicketsSold,
        averagePrice,
        activeEvents,
        upcomingEvents,
      });
    } catch (err) {
      console.error('❌ Error fetching EO contracts:', err);
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to load contracts';
      
      if (err instanceof Error) {
        if (err.message.includes('CALL_EXCEPTION')) {
          errorMessage = 'Failed to connect to the blockchain. Please check your wallet connection and try again.';
        } else if (err.message.includes('NETWORK_ERROR')) {
          errorMessage = 'Network connection error. Please check your internet connection.';
        } else if (err.message.includes('TIMEOUT')) {
          errorMessage = 'Request timed out. Please try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [wallet?.address]);

  // Auto-fetch when wallet connects
  useEffect(() => {
    if (wallet?.address) {
      fetchAllContracts();
    }
  }, [wallet?.address, fetchAllContracts]);

  return {
    contracts,
    stats,
    loading,
    error,
    refetch: fetchAllContracts,
  };
};
