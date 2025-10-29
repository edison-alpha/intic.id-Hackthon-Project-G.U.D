import { ethers } from 'ethers';
import EventTicketArtifact from '@/contracts/EventTicket.json';
import { getNetworkConfig } from '@/config/contracts';
import { getAllDeployedEventsFromBlockchain } from './eventOrganizerContract';

/**
 * Get EventTicket contract instance (read-only)
 */
export const getEventTicketContractReadOnly = (contractAddress: string): ethers.Contract => {
  const networkConfig = getNetworkConfig();

  const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);

  // Use full ABI from compiled artifact instead of manual ABI
  return new ethers.Contract(contractAddress, EventTicketArtifact.abi, provider);
};

/**
 * Get EventTicket contract instance (with signer for transactions)
 */
export const getEventTicketContractWithSigner = async (contractAddress: string): Promise<ethers.Contract> => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  
  return new ethers.Contract(contractAddress, EventTicketArtifact.abi, signer);
};

/**
 * Get event details from deployed contract
 */
export const getEventDetailsFromContract = async (contractAddress: string) => {
  try {

    const contract = getEventTicketContractReadOnly(contractAddress);

    // Add retry mechanism for blockchain calls
    const fetchWithRetry = async (fn: () => Promise<any>, retries = 3): Promise<any> => {
      for (let i = 0; i < retries; i++) {
        try {
          const result = await fn();
          return result;
        } catch (error) {
          console.warn(`⚠️ Attempt ${i + 1}/${retries} failed:`, error);
          if (i === retries - 1) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
        }
      }
    };
    
    const [
      eventName,
      eventDate,
      eventVenue,
      venueAddress,
      venueCoordinates,
      eventImageUri,
      ticketPrice,
      maxSupply,
      totalSupply,
      remainingTickets,
      eventCancelled,
      royaltyPercent,
      owner,
      baseURI,
    ] = await Promise.all([
      fetchWithRetry(() => contract.eventName()),
      fetchWithRetry(() => contract.eventDate()),
      fetchWithRetry(() => contract.eventVenue()),
      fetchWithRetry(() => contract.venueAddress()),
      fetchWithRetry(() => contract.venueCoordinates()),
      fetchWithRetry(() => contract.eventImageUri()),
      fetchWithRetry(() => contract.ticketPrice()),
      fetchWithRetry(() => contract.maxSupply()),
      fetchWithRetry(() => contract.totalSupply()),
      fetchWithRetry(() => contract.getTicketsRemaining()),
      fetchWithRetry(() => contract.eventCancelled()),
      fetchWithRetry(() => contract.royaltyPercent()),
      fetchWithRetry(() => contract.owner()),
      fetchWithRetry(() => contract.baseURI()),
    ]);

    // Convert coordinates string to lat/lon
    const coords = venueCoordinates.split(',');
    const latitude = coords.length > 0 ? parseFloat(coords[0]) : 0;
    const longitude = coords.length > 1 ? parseFloat(coords[1]) : 0;

    return {
      contractAddress,
      eventName,
      eventDate: Number(eventDate),
      eventVenue,
      venueAddress,
      venueCoordinates: {
        lat: latitude,
        lon: longitude,
      },
      eventImageUri,
      ticketPrice: ethers.formatEther(ticketPrice),
      maxSupply: Number(maxSupply),
      totalSupply: Number(totalSupply),
      remainingTickets: Number(remainingTickets),
      eventCancelled,
      royaltyPercent: Number(royaltyPercent),
      owner,
      baseURI,
      // Calculated fields
      soldOut: Number(remainingTickets) === 0,
      soldPercentage: Number(maxSupply) > 0 
        ? ((Number(totalSupply) / Number(maxSupply)) * 100).toFixed(1)
        : '0',
    };
  } catch (error) {
    console.error('❌ Error fetching event details from contract:', contractAddress, error);
    throw new Error(`Failed to load event details from blockchain: ${error}`);
  }
};

/**
 * Mint a ticket NFT using Push Chain Universal Wallet
 * Works from ANY supported blockchain
 */
export const mintEventTicketUniversal = async (
  pushChainClient: any,
  PushChain: any,
  contractAddress: string,
  ticketPriceWei: bigint
): Promise<{ transactionHash: string; tokenId: number }> => {
  if (!pushChainClient || !PushChain) {
    throw new Error('Push Chain client not initialized. Please connect wallet.');
  }

  try {
    // Encode mint function call
    const data = PushChain.utils.helpers.encodeTxData({
      abi: Array.from(EventTicketArtifact.abi),
      functionName: 'mintTicket',
      args: [], // mintTicket() has no arguments
    });

    console.log('🎫 Minting ticket with universal transaction...');
    console.log('📍 Contract:', contractAddress);
    console.log('💰 Price:', ticketPriceWei.toString(), 'wei');

    // Send universal transaction
    // User can pay from ETH, Polygon, Solana, etc.
    const tx = await pushChainClient.universal.sendTransaction({
      to: contractAddress,
      data: data,
      value: ticketPriceWei, // Payment in destination chain native token (PC)
    });

    console.log('✅ Transaction sent:', tx);

    // Wait for confirmation
    const receipt = await tx.wait();

    console.log('✅ Transaction confirmed:', receipt);

    // Extract transaction hash from receipt
    // Push Chain receipt structure: { hash, blockNumber, blockHash, ... }
    const txHash = receipt?.hash || receipt?.transactionHash || tx?.hash || tx?.transactionHash;

    console.log('🔍 Extracted transaction hash:', txHash);

    // Extract tokenId from event logs
    let tokenId = 0;
    try {
      // Find Transfer event
      const logs = receipt?.logs || [];
      const transferEvent = logs.find((log: any) => {
        try {
          // Try to parse log
          const iface = new ethers.Interface(EventTicketArtifact.abi);
          const parsed = iface.parseLog(log);
          return parsed?.name === 'Transfer';
        } catch {
          return false;
        }
      });

      if (transferEvent) {
        const iface = new ethers.Interface(EventTicketArtifact.abi);
        const parsedLog = iface.parseLog(transferEvent);
        tokenId = Number(parsedLog?.args?.tokenId || 0);
        console.log('✅ Extracted tokenId:', tokenId);
      } else {
        console.warn('⚠️ Transfer event not found in logs');
      }
    } catch (error) {
      console.warn('⚠️ Could not extract tokenId from logs:', error);
      // Token ID will be 0, but transaction still succeeded
    }

    return {
      transactionHash: txHash,
      tokenId,
    };
  } catch (error: any) {
    console.error('❌ Mint error:', error);

    // Handle user rejection
    if (error.message?.includes('rejected') || error.message?.includes('denied') || error.message?.includes('cancel')) {
      throw new Error('Transaction rejected by user');
    }

    // Handle insufficient balance
    if (error.message?.includes('insufficient funds') || error.message?.includes('insufficient balance')) {
      throw new Error('Insufficient balance to mint ticket');
    }

    // Handle sold out
    if (error.message?.includes('sold out') || error.message?.includes('NoTicketsAvailable')) {
      throw new Error('Event tickets are sold out');
    }

    // Handle event cancelled
    if (error.message?.includes('event cancelled') || error.message?.includes('EventCancelled')) {
      throw new Error('Event has been cancelled');
    }

    throw new Error(error.message || 'Failed to mint ticket');
  }
};

/**
 * Check-in ticket using DIRECT transaction (not universal)
 *
 * NOTE: Check-in uses direct transaction because the smart contract's useTicket()
 * function requires msg.sender to be the ticket owner. Universal transactions use
 * a relayer which causes msg.sender mismatch.
 *
 * User must be connected to Push Chain to check-in their ticket.
 */
export const checkInTicketUniversal = async (
  pushChainClient: any,
  PushChain: any,
  contractAddress: string,
  tokenId: number
): Promise<{ transactionHash: string; success: boolean }> => {
  try {
    console.log('🎫 ============ CHECK-IN START ============');
    console.log('📍 Contract:', contractAddress);
    console.log('🎫 Token ID:', tokenId, 'Type:', typeof tokenId);
    console.log('🔧 Push Chain Client:', !!pushChainClient);
    console.log('🔧 PushChain Utils:', !!PushChain);

    // Ensure tokenId is a number (not string)
    const tokenIdNumber = Number(tokenId);
    if (isNaN(tokenIdNumber)) {
      throw new Error(`Invalid token ID: ${tokenId}`);
    }

    // Use ethers.js for direct transaction
    const { BrowserProvider, Contract } = await import('ethers');

    // Check if window.ethereum exists
    if (!window.ethereum) {
      throw new Error('No wallet found. Please install MetaMask or connect your wallet.');
    }

    console.log('🔌 Window.ethereum detected:', !!window.ethereum);

    // Create provider and signer
    const provider = new BrowserProvider(window.ethereum);

    // Check network
    const network = await provider.getNetwork();
    console.log('🌐 Network:', {
      chainId: network.chainId.toString(),
      name: network.name,
      expectedChainId: '42101'
    });

    // Verify we're on Push Chain
    if (Number(network.chainId) !== 42101) {
      throw new Error(`Please switch to Push Chain Donut Testnet. Current chain: ${network.chainId}`);
    }

    const signer = await provider.getSigner();
    const signerAddress = await signer.getAddress();

    console.log('👤 Signer address:', signerAddress);

    // Check balance
    const balance = await provider.getBalance(signerAddress);
    console.log('💰 PC Balance:', balance.toString(), 'wei (', Number(balance) / 1e18, 'PC )');

    if (balance === 0n) {
      throw new Error('Insufficient PC balance for gas fee. Please fund your wallet.');
    }

    // Create contract instance
    const contract = new Contract(contractAddress, EventTicketArtifact.abi, signer);

    console.log('📋 Contract instance created');

    // Verify ticket ownership before attempting check-in
    try {
      console.log('🔍 Verifying ticket ownership...');
      const owner = await contract.ownerOf(tokenIdNumber);
      console.log('🔍 Ticket owner:', owner);
      console.log('🔍 Signer:', signerAddress);
      console.log('🔍 Match:', owner.toLowerCase() === signerAddress.toLowerCase());

      if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
        throw new Error('You are not the owner of this ticket');
      }

      // Check if already used
      console.log('🔍 Checking if ticket is already used...');
      const isUsed = await contract.used(tokenIdNumber);
      console.log('🔍 Ticket used status:', isUsed);

      if (isUsed) {
        throw new Error('This ticket has already been used');
      }

      console.log('✅ Pre-flight checks passed!');
    } catch (verifyError: any) {
      console.error('❌ Verification error:', verifyError);
      if (verifyError.message.includes('not the owner')) {
        throw verifyError;
      }
      if (verifyError.message.includes('already been used')) {
        throw verifyError;
      }
      console.warn('⚠️ Could not verify ownership, proceeding anyway:', verifyError.message);
    }

    // Call useTicket function
    console.log('📝 Calling useTicket on blockchain...');
    console.log('📝 Function: useTicket(' + tokenIdNumber + ')');

    const tx = await contract.useTicket(tokenIdNumber);

    console.log('✅ Transaction sent!');
    console.log('📦 TX Hash:', tx.hash);
    console.log('⏳ Waiting for confirmation...');

    const receipt = await tx.wait();

    console.log('✅ Transaction confirmed!');
    console.log('📦 Receipt:', {
      hash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      status: receipt.status
    });
    console.log('🎫 ============ CHECK-IN SUCCESS ============');

    return {
      transactionHash: receipt.hash,
      success: true,
    };
  } catch (error: any) {
    console.error('❌ ============ CHECK-IN FAILED ============');
    console.error('❌ Error:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error data:', error.data);

    // Handle user rejection
    if (error.code === 'ACTION_REJECTED' || error.code === 4001 || error.message?.includes('rejected')) {
      throw new Error('Transaction rejected by user');
    }

    // Handle ticket already used
    if (error.message?.includes('already used') || error.message?.includes('TicketAlreadyUsed')) {
      throw new Error('This ticket has already been used');
    }

    // Handle not owner
    if (error.message?.includes('not owner') || error.message?.includes('NotTokenOwner') || error.message?.includes('not the owner')) {
      throw new Error('You are not the owner of this ticket');
    }

    // Handle event cancelled
    if (error.message?.includes('event cancelled') || error.message?.includes('EventCancelled')) {
      throw new Error('Event has been cancelled');
    }

    // Handle insufficient gas
    if (error.message?.includes('insufficient funds')) {
      throw new Error('Insufficient PC balance for gas fee');
    }

    // Handle network error
    if (error.message?.includes('network') || error.message?.includes('chain')) {
      throw new Error('Network error. Please check your connection to Push Chain.');
    }

    // Generic error with details
    const errorMsg = error.message || error.reason || 'Failed to check-in ticket';
    throw new Error(errorMsg);
  }
};

/**
 * Legacy mint function (for backward compatibility)
 * @deprecated Use mintEventTicketUniversal instead
 */
export const mintEventTicket = async (
  contractAddress: string,
  _ticketPrice: string // Keep parameter for API compatibility but not used
): Promise<{ transactionHash: string; tokenId: number }> => {
  try {
    const contract = await getEventTicketContractWithSigner(contractAddress) as any;

    // Get the exact ticket price from the contract to avoid precision issues
    const exactPrice = await contract.ticketPrice();

    // Call mintTicket function with EXACT price from contract
    const tx = await contract.mintTicket({ value: exactPrice });

    // Wait for confirmation
    const receipt = await tx.wait();

    // Get tokenId from event logs
    const transferEvent = receipt.logs.find((log: any) => {
      try {
        const parsedLog = contract.interface.parseLog(log);
        return parsedLog?.name === 'Transfer';
      } catch {
        return false;
      }
    });

    let tokenId = 0;
    if (transferEvent) {
      const parsedLog = contract.interface.parseLog(transferEvent);
      tokenId = Number(parsedLog?.args?.tokenId || 0);
    }

    return {
      transactionHash: receipt.hash,
      tokenId,
    };
  } catch (error: any) {
    console.error('❌ Mint error:', error);

    if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
      throw new Error('Transaction rejected by user');
    } else if (error.message?.includes('insufficient funds')) {
      throw new Error('Insufficient PC balance to mint ticket');
    } else if (error.message?.includes('sold out')) {
      throw new Error('Event tickets are sold out');
    } else if (error.message?.includes('event cancelled')) {
      throw new Error('Event has been cancelled');
    }

    throw new Error(error.message || 'Failed to mint ticket');
  }
};

/**
 * Get user's owned tickets for an event
 */
export const getUserEventTickets = async (
  contractAddress: string,
  userAddress: string
): Promise<number[]> => {
  try {
    const contract = getEventTicketContractReadOnly(contractAddress);
    
    const balance = await contract.balanceOf(userAddress);
    const tokenIds: number[] = [];
    
    for (let i = 0; i < Number(balance); i++) {
      const tokenId = await contract.tokenOfOwnerByIndex(userAddress, i);
      tokenIds.push(Number(tokenId));
    }
    
    return tokenIds;
  } catch (error) {
    console.error('Error fetching user tickets:', error);
    return [];
  }
};

/**
 * Get ticket metadata URI
 */
export const getTicketTokenURI = async (
  contractAddress: string,
  tokenId: number
): Promise<string> => {
  try {
    const contract = getEventTicketContractReadOnly(contractAddress);
    return await contract.tokenURI(tokenId);
  } catch (error) {
    console.error('Error fetching token URI:', error);
    return '';
  }
};

/**
 * Get all deployed events from localStorage
 */
export const getAllDeployedEvents = (userAddress?: string): any[] => {
  try {
    const allEvents: any[] = [];
    
    // Get from all possible user addresses in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('deployed-contracts-')) {
        const events = JSON.parse(localStorage.getItem(key) || '[]');
        allEvents.push(...events);
      }
    }
    
    // If specific user address, filter by deployer
    if (userAddress) {
      return allEvents.filter(event => 
        event.deployer?.toLowerCase() === userAddress.toLowerCase()
      );
    }
    
    return allEvents;
  } catch (error) {
    console.error('Error loading deployed events:', error);
    return [];
  }
};

/**
 * Fetch complete event details using new getEventDetails function
 * This uses the optimized getEventDetails() function from smart contract
 */
export const fetchCompleteEventDetails = async (contractAddress: string) => {
  try {

    const contract = getEventTicketContractReadOnly(contractAddress);
    
    // Call new getEventDetails function that returns all data in one call
    const eventDetails = await contract.getEventDetails();

    // Parse the returned tuple
    const [
      eventName,
      eventDate,
      eventVenue,
      venueAddress,
      venueCoordinates,
      eventImageUri,
      maxSupply,
      ticketPrice,
      ticketsSold,
      ticketsRemaining,
      eventCancelled,
      eventPaused,
      status,
      organizer,
      eventDescription
    ] = eventDetails;

    console.log('🔍 Reading event from contract:', contractAddress.substring(0, 10) + '...');
    console.log('📅 Raw eventDate from contract:', eventDate.toString());
    console.log('📅 eventDate type:', typeof eventDate);
    
    // Fetch metadata from IPFS if available
    let metadata: any = {};
    try {
      const baseURI = await contract._baseURI();
      if (baseURI) {

        const response = await fetch(baseURI);
        if (response.ok) {
          metadata = await response.json();

        }
      }
    } catch (err) {
      console.warn('⚠️ Could not fetch metadata from IPFS:', err);
    }
    
    // Convert coordinates string to lat/lon
    const coords = venueCoordinates.split(',');
    const latitude = coords.length > 0 ? parseFloat(coords[0]) : 0;
    const longitude = coords.length > 1 ? parseFloat(coords[1]) : 0;
    
    // eventDate from blockchain is in seconds, convert to milliseconds
    const eventDateSeconds = Number(eventDate);
    const eventDateMs = eventDateSeconds * 1000;

    console.log('📅 Date Conversion:');
    console.log('   - eventDate (seconds):', eventDateSeconds);
    console.log('   - eventDate (ms):', eventDateMs);
    console.log('   - Converted Date:', new Date(eventDateMs).toLocaleString());

    // Convert event status enum to string
    const statusMap = ['Active', 'SoldOut', 'Ended', 'Cancelled', 'Paused'];
    const eventStatus = statusMap[Number(status)] || 'Active';

    const transformedData = {
      contractAddress,
      eventName,
      eventDate: eventDateSeconds, // Keep as seconds for contract compatibility
      eventVenue,
      venueAddress,
      venueCoordinates: {
        lat: latitude,
        lon: longitude,
      },
      eventImageUri,
      eventDescription: eventDescription || '',
      ticketPrice: ethers.formatEther(ticketPrice),
      maxSupply: Number(maxSupply),
      ticketsSold: Number(ticketsSold),
      ticketsRemaining: Number(ticketsRemaining),
      eventCancelled: Boolean(eventCancelled),
      eventPaused: Boolean(eventPaused),
      status: eventStatus,
      organizer,
      metadata,
      // Format for display
      title: eventName,
      image: eventImageUri || metadata.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
      date: new Date(eventDateMs).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      time: new Date(eventDateMs).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }),
      location: eventVenue,
      description: metadata.description || '',
      category: metadata.category || 'other',
      price: ethers.formatEther(ticketPrice),
      available: Number(ticketsRemaining),
      total: Number(maxSupply),
      minted: Number(ticketsSold),
      verified: true,
      isActive: !eventCancelled && eventStatus === 'Active',
      isCancelled: eventCancelled,
      soldOut: eventStatus === 'SoldOut',
      ended: eventStatus === 'Ended',
    };

    return transformedData;
  } catch (error) {
    console.error('❌ Error fetching complete event details for', contractAddress, ':', error);
    return null;
  }
};

/**
 * Fetch live event details for browse page
 * @deprecated Use fetchCompleteEventDetails instead for better performance
 */
export const fetchLiveEventDetails = async (contractAddress: string) => {
  try {

    const details = await getEventDetailsFromContract(contractAddress);

    // Fetch metadata from IPFS if available
    let metadata: any = {};
    if (details.baseURI) {
      try {

        const response = await fetch(details.baseURI);
        if (response.ok) {
          metadata = await response.json();

        }
      } catch (err) {
        console.warn('⚠️ Could not fetch metadata from IPFS:', err);
      }
    }
    
    // eventDate from blockchain is in seconds, convert to milliseconds for Date object
    const eventDateSeconds = Number(details.eventDate);
    const eventDateMs = eventDateSeconds * 1000;

    const transformedData = {
      ...details,
      metadata,
      // Format for display
      title: details.eventName,
      image: details.eventImageUri || metadata.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
      date: new Date(eventDateMs).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      time: new Date(eventDateMs).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }),
      location: details.eventVenue,
      description: metadata.description || '',
      category: metadata.category || 'other',
      price: details.ticketPrice,
      available: details.remainingTickets,
      total: details.maxSupply,
      minted: details.totalSupply,
      verified: true, // All on-chain events are verified
      isActive: !details.eventCancelled,
      isCancelled: details.eventCancelled,
    };

    return transformedData;
  } catch (error) {
    console.error('❌ Error fetching live event details for', contractAddress, ':', error);
    return null;
  }
};

/**
 * Get all NFT token IDs owned by an address for a specific event
 */
export const getTokensByOwner = async (
  contractAddress: string,
  ownerAddress: string
): Promise<number[]> => {
  try {
    const contract = getEventTicketContractReadOnly(contractAddress);
    const tokenIds = await contract.getTokensByOwner(ownerAddress);
    return tokenIds.map((id: any) => Number(id));
  } catch (error) {
    console.error('Error fetching tokens by owner:', error);
    return [];
  }
};

/**
 * Get NFT details by token ID
 */
export const getTicketDetailsByTokenId = async (
  contractAddress: string,
  tokenId: number
) => {
  try {
    const contract = getEventTicketContractReadOnly(contractAddress);
    const details = await contract.getTicketDetails(tokenId);
    
    const [owner, used, eventName, eventDate, eventVenue, eventImageUri, status] = details;
    
    const statusMap = ['Active', 'SoldOut', 'Ended', 'Cancelled'];
    const eventStatus = statusMap[Number(status)] || 'Active';
    
    return {
      owner,
      used,
      eventName,
      eventDate: Number(eventDate),
      eventVenue,
      eventImageUri,
      status: eventStatus,
    };
  } catch (error) {
    console.error('Error fetching ticket details:', error);
    throw error;
  }
};

/**
 * Get all ticket details for an owner (batch operation)
 */
export const getOwnerTicketsDetails = async (
  contractAddress: string,
  ownerAddress: string
) => {
  try {
    const contract = getEventTicketContractReadOnly(contractAddress);
    const details = await contract.getOwnerTicketsDetails(ownerAddress);
    
    const [tokenIds, isUsed] = details;
    
    return {
      tokenIds: tokenIds.map((id: any) => Number(id)),
      isUsed: isUsed.map((used: any) => Boolean(used)),
    };
  } catch (error) {
    console.error('Error fetching owner tickets details:', error);
    throw error;
  }
};

/**
 * Get all tickets owned by user across all events
 */
export const getAllUserTickets = async (
  ownerAddress: string
): Promise<any[]> => {
  try {

    // Get all deployed events
    const allEvents = await getAllDeployedEventsFromBlockchain();

    if (allEvents.length === 0) {
      console.warn('⚠️ No events found on blockchain');
      return [];
    }
    
    const userTickets = [];
    
    // Check each event for user's tickets
    for (const eventData of allEvents) {
      try {
        // Extract contract address from event object
        const eventContract = eventData.eventContract || eventData;

        // Get tokens owned by user in this event
        const tokenIds = await getTokensByOwner(eventContract, ownerAddress);
        
        if (tokenIds.length > 0) {

          // Get event details
          const eventDetails = await fetchCompleteEventDetails(eventContract);
          
          if (!eventDetails) {
            console.warn(`⚠️ Could not fetch event details for ${eventContract}`);
            continue;
          }
          
          // Get ticket details for each token
          for (const tokenId of tokenIds) {
            try {
              const ticketDetails = await getTicketDetailsByTokenId(eventContract, tokenId);
              
              userTickets.push({
                tokenId,
                contractAddress: eventContract,
                eventDetails,
                ticketDetails,
                owner: ownerAddress,
              });

            } catch (error) {
              console.warn(`⚠️ Could not fetch details for token ${tokenId}:`, error);
            }
          }
        } else {

        }
      } catch (error: any) {
        const eventAddr = eventData.eventContract || eventData;
        console.warn(`⚠️ Error checking event ${eventAddr}:`, error?.message || error);
      }
    }

    return userTickets;
  } catch (error: any) {
    console.error('❌ Error fetching all user tickets:', error);
    console.error('Error details:', error?.message || error);
    return []; // Return empty array instead of throwing
  }
};

export default {
  getEventDetailsFromContract,
  mintEventTicket,
  mintEventTicketUniversal,
  checkInTicketUniversal,
  getUserEventTickets,
  getTicketTokenURI,
  getAllDeployedEvents,
  fetchLiveEventDetails,
  fetchCompleteEventDetails,
  getTokensByOwner,
  getTicketDetailsByTokenId,
  getOwnerTicketsDetails,
  getAllUserTickets,
};
