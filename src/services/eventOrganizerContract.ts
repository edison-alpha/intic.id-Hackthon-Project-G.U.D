import { ethers } from 'ethers';
import { CONTRACTS, getNetworkConfig } from '@/config/contracts';
import EventOrganizerArtifact from '@/contracts/EventOrganizer.json';

// EventOrganizer ABI - key functions only (for ethers.js string-based usage)
const EVENT_ORGANIZER_ABI = [
  'function registerOrganizer(string memory _profileUri, string memory _contentHash, address _originalAddress) public',
  'function organizers(address) public view returns (string profileUri, string contentHash, uint256 registrationDate, bool isVerified, uint256 totalEvents, uint256 totalTicketsSold, uint256 ratingSum, uint256 ratingCount, address payoutAddress, bool exists)',
  'function isVerifiedOrganizer(address organizer) external view returns (bool)',
  'function organizerExists(address organizer) external view returns (bool)',
  'function getPrimaryOrganizerAddress(address organizer) public view returns (address)',
  'function getUEAFromOriginal(address originalAddress) external view returns (address)',
  'function getOriginalFromUEA(address ueaAddress) external view returns (address)',
  'function getOrganizerDetails(address organizerAddr) public view returns (string memory profileUri, string memory contentHash, uint256 registrationDate, bool isVerified, uint256 totalEvents, uint256 totalTicketsSold, uint256 totalRevenue, uint256 averageRating)',
  'function updateOrganizerProfile(string memory _profileUri, string memory _contentHash) public',
  'function getVerifiedOrganizers() public view returns (address[] memory)',
  'function getAllDeployedEvents() public view returns (tuple(address eventContract, address organizer, uint256 eventId, uint256 deployedAt, bool isActive)[] memory)',
  'function getDeployedEventsCount() public view returns (uint256)',
  'function getEventsByOrganizer(address organizer) public view returns (uint256[] memory)',
  'function getActiveEvents() public view returns (tuple(address eventContract, address organizer, uint256 eventId, uint256 deployedAt, bool isActive)[] memory)',
  'function getUpcomingEventsByOrganizer(address organizer) public view returns (tuple(address eventContract, address organizer, uint256 eventId, uint256 deployedAt, bool isActive)[] memory)',
  'function getPastEventsByOrganizer(address organizer) public view returns (tuple(address eventContract, address organizer, uint256 eventId, uint256 deployedAt, bool isActive)[] memory)',
  'function getEventDetails(uint256 eventIndex) public view returns (address eventContract, address organizer, uint256 eventId, uint256 deployedAt, bool isActive)',
  'function deactivateEvent(uint256 eventIndex) external',
  'event OrganizerRegistered(address indexed organizer, string profileUri, uint256 timestamp)',
  'event OrganizerRegisteredWithUEA(address indexed ueaAddress, address indexed originalAddress, string profileUri, uint256 timestamp)',
  'event OrganizerVerified(address indexed organizer, bool verified)',
  'event EventCreated(address indexed eventContract, address indexed creator, string metadataUri)',
];

/**
 * Get EventOrganizer contract instance
 */
const getEventOrganizerContract = async (): Promise<ethers.Contract> => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  
  const contractAddress = CONTRACTS.testnet.EventOrganizer;
  if (!contractAddress) {
    throw new Error('EventOrganizer contract address not configured');
  }

  return new ethers.Contract(contractAddress, EVENT_ORGANIZER_ABI, signer);
};

/**
 * Get EventOrganizer contract instance (read-only)
 */
const getEventOrganizerContractReadOnly = async (): Promise<ethers.Contract> => {
  const networkConfig = getNetworkConfig();
  const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
  
  const contractAddress = CONTRACTS.testnet.EventOrganizer;
  if (!contractAddress) {
    throw new Error('EventOrganizer contract address not configured');
  }

  return new ethers.Contract(contractAddress, EVENT_ORGANIZER_ABI, provider);
};

/**
 * Register as Event Organizer using Push Chain Universal Wallet
 * Works from ANY supported blockchain
 * @param pushChainClient Push Chain client instance
 * @param PushChain Push Chain utilities
 * @param profileUri IPFS URI for organizer profile
 * @param contentHash Content hash of profile
 * @param originalAddress (Optional) Original wallet address before UEA conversion
 */
export const registerOrganizerUniversal = async (
  pushChainClient: any,
  PushChain: any,
  profileUri: string,
  contentHash: string,
  originalAddress?: string
): Promise<{ transactionHash: string; blockNumber?: number }> => {
  if (!pushChainClient || !PushChain) {
    throw new Error('Push Chain client not initialized. Please connect wallet.');
  }

  try {
    const contractAddress = CONTRACTS.testnet.EventOrganizer;
    if (!contractAddress) {
      throw new Error('EventOrganizer contract address not configured');
    }

    // Debug: Log pushChainClient structure
    console.log('🔍 Push Chain Client Debug:', {
      hasClient: !!pushChainClient,
      hasAccount: !!pushChainClient.account,
      accountAddress: pushChainClient.account?.address,
      hasAddress: !!pushChainClient.address,
      directAddress: pushChainClient.address,
      hasGetAddress: typeof pushChainClient.getAddress === 'function',
      hasSigner: !!pushChainClient.signer,
      signerAddress: pushChainClient.signer?.address,
      hasUniversal: !!pushChainClient.universal,
      universalAccount: pushChainClient.universal?.account?.address,
      keys: Object.keys(pushChainClient),
    });

    // Get UEA address (the actual sender)
    // Try multiple methods to get UEA from Push Chain client
    let ueaAddress = null;
    
    try {
      // Method 1: Check account.address
      if (pushChainClient.account?.address) {
        ueaAddress = pushChainClient.account.address;
        console.log('✅ UEA from account.address:', ueaAddress);
      }
      
      // Method 2: Check direct address property
      if (!ueaAddress && pushChainClient.address) {
        ueaAddress = pushChainClient.address;
        console.log('✅ UEA from address:', ueaAddress);
      }
      
      // Method 3: Try getAddress method
      if (!ueaAddress && typeof pushChainClient.getAddress === 'function') {
        ueaAddress = await pushChainClient.getAddress();
        console.log('✅ UEA from getAddress():', ueaAddress);
      }
      
      // Method 4: Check signer (wagmi integration)
      if (!ueaAddress && pushChainClient.signer?.address) {
        ueaAddress = pushChainClient.signer.address;
        console.log('✅ UEA from signer.address:', ueaAddress);
      }
      
      // Method 5: Extract from universal client
      if (!ueaAddress && pushChainClient.universal?.account?.address) {
        ueaAddress = pushChainClient.universal.account.address;
        console.log('✅ UEA from universal.account.address:', ueaAddress);
      }
    } catch (error) {
      console.warn('⚠️ Error getting UEA address:', error);
    }

    console.log('🎫 Registering EO with universal transaction...');
    console.log('📍 Contract:', contractAddress);
    console.log('🔑 UEA Address (will be msg.sender):', ueaAddress || 'Determined by Push Chain');
    console.log('🔑 Original Address (wallet):', originalAddress || 'Not provided');
    console.log('📄 Profile URI:', profileUri);
    console.log('🔖 Content Hash:', contentHash);

    // IMPORTANT: For Push Chain Universal Execution with UEA MAPPING:
    // - msg.sender in the contract will be the UEA address (0xd80E5e191D707BE6c64401900e3aA92fc4F25485)
    // - We SHOULD pass the original wallet address as _originalAddress parameter
    // - Contract will store: ueaToOriginal[msg.sender] = _originalAddress
    // - This allows checking registration by EITHER address
    // 
    // Example:
    // - Original wallet: 0xFc8Cb8fc33e6120e48A1d6cD15DAb5B0c3d9101a
    // - UEA (msg.sender): 0xd80E5e191D707BE6c64401900e3aA92fc4F25485
    // - Mapping stored: ueaToOriginal[0xd80E...] = 0xFc8C...
    //                   originalToUea[0xFc8C...] = 0xd80E...
    
    // Determine the original address parameter
    // If originalAddress is provided and seems valid, use it for mapping
    // Otherwise, use address(0) for standard registration without mapping
    let originalAddrParam = '0x0000000000000000000000000000000000000000';
    
    if (originalAddress && originalAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      // Valid original address provided
      // Normalize to lowercase for consistency
      originalAddrParam = originalAddress.toLowerCase();
      console.log('✅ UEA registration WITH mapping:');
      console.log('   UEA (msg.sender):', ueaAddress || 'will be determined by Push Chain');
      console.log('   Original (normalized):', originalAddrParam);
      console.log('   Contract will store: ueaToOriginal[UEA] = Original');
      console.log('   Contract will store: originalToUea[Original] = UEA');
    } else {
      console.log('✅ Standard registration WITHOUT mapping');
      console.log('   Only UEA will be registered');
    }

    // Encode registerOrganizer function call
    // Pass address(0) as _originalAddress since msg.sender is already UEA
    const data = PushChain.utils.helpers.encodeTxData({
      abi: EventOrganizerArtifact.abi,
      functionName: 'registerOrganizer',
      args: [profileUri, contentHash, originalAddrParam],
    });

    // Send universal transaction
    // User can pay from ETH, Polygon, Solana, etc.
    const tx = await pushChainClient.universal.sendTransaction({
      to: contractAddress,
      data: data,
      // No value needed for registration
    });

    console.log('✅ Transaction sent:', tx);

    // Wait for confirmation
    const receipt = await tx.wait();

    console.log('✅ Transaction confirmed:', receipt);

    // Extract transaction hash from receipt
    const txHash = receipt?.hash || receipt?.transactionHash || tx?.hash || tx?.transactionHash;

    console.log('🔍 Extracted transaction hash:', txHash);

    return {
      transactionHash: txHash,
      blockNumber: receipt?.blockNumber ? Number(receipt.blockNumber) : undefined,
    };
  } catch (error: any) {
    console.error('❌ Registration error:', error);

    // Handle user rejection
    if (error.message?.includes('rejected') || error.message?.includes('denied') || error.message?.includes('cancel')) {
      throw new Error('Transaction rejected by user');
    }

    // Handle already registered
    if (error.message?.includes('already registered') || error.message?.includes('AlreadyRegistered')) {
      throw new Error('This wallet is already registered as an Event Organizer');
    }

    // Handle insufficient balance
    if (error.message?.includes('insufficient funds') || error.message?.includes('insufficient balance')) {
      throw new Error('Insufficient balance for registration');
    }

    throw new Error(error.message || 'Failed to register as Event Organizer');
  }
};

/**
 * Register as Event Organizer (Legacy - MetaMask only)
 * @deprecated Use registerOrganizerUniversal instead
 */
export const registerEventOrganizer = async (
  profileUri: string,
  contentHash: string
): Promise<{ transactionHash: string; blockNumber: number }> => {
  try {
    const contract = await getEventOrganizerContract();

    // Call registerOrganizer function with address(0) for standard registration
    const tx = await contract.registerOrganizer?.(
      profileUri, 
      contentHash, 
      '0x0000000000000000000000000000000000000000'
    );

    // Wait for confirmation
    const receipt = await tx.wait();

    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  } catch (error: any) {
    console.error('❌ Registration error:', error);

    if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
      throw new Error('Transaction rejected by user');
    } else if (error.message?.includes('already registered')) {
      throw new Error('This wallet is already registered as an Event Organizer');
    } else if (error.message?.includes('insufficient funds')) {
      throw new Error('Insufficient PC balance for registration');
    }

    throw new Error(error.message || 'Failed to register as Event Organizer');
  }
};

/**
 * Check if address is registered as organizer
 */
export const isOrganizerRegistered = async (address: string): Promise<boolean> => {
  try {

    const contract = await getEventOrganizerContractReadOnly();
    const exists = await contract.organizerExists(address);

    return exists;
  } catch (error) {
    console.error('❌ Error checking organizer registration:', error);
    return false;
  }
};

/**
 * Check if organizer is verified
 */
export const isOrganizerVerified = async (address: string): Promise<boolean> => {
  try {
    const contract = await getEventOrganizerContractReadOnly();
    return await contract.isVerifiedOrganizer(address);
  } catch (error) {
    console.error('Error checking organizer verification:', error);
    return false;
  }
};

/**
 * Get organizer details from blockchain
 */
export const getOrganizerDetails = async (address: string) => {
  try {
    const contract = await getEventOrganizerContractReadOnly();
    
    const [
      profileUri,
      contentHash,
      registrationDate,
      isVerified,
      totalEvents,
      totalTicketsSold,
      averageRating,
    ] = await contract.getOrganizerDetails(address);

    return {
      profileUri,
      contentHash,
      registrationDate: Number(registrationDate),
      isVerified,
      totalEvents: Number(totalEvents),
      totalTicketsSold: Number(totalTicketsSold),
      averageRating: Number(averageRating),
    };
  } catch (error) {
    console.error('Error getting organizer details:', error);
    throw new Error('Failed to fetch organizer details');
  }
};

/**
 * Get all verified organizers
 */
export const getVerifiedOrganizers = async (): Promise<string[]> => {
  try {
    const contract = await getEventOrganizerContractReadOnly();
    return await contract.getVerifiedOrganizers();
  } catch (error) {
    console.error('Error getting verified organizers:', error);
    return [];
  }
};

/**
 * Update organizer profile
 */
export const updateOrganizerProfile = async (
  address: string,
  profileUri: string
): Promise<{ transactionHash: string }> => {
  try {
    const contract = await getEventOrganizerContract();
    
    // Generate content hash from URI
    const contentHash = ethers.keccak256(ethers.toUtf8Bytes(profileUri));
    
    const tx = await contract.updateOrganizerProfile(profileUri, contentHash);
    const receipt = await tx.wait();
    
    return {
      transactionHash: receipt.hash,
    };
  } catch (error: any) {
    console.error('Error updating profile:', error);
    throw new Error(error.message || 'Failed to update organizer profile');
  }
};

/**
 * Get organizer profile with metadata from IPFS
 */
export const getOrganizerProfile = async (address: string) => {
  try {
    const contract = await getEventOrganizerContractReadOnly();
    
    const [
      profileUri,
      contentHash,
      registrationDate,
      isVerified,
      totalEvents,
      totalTicketsSold,
      averageRating,
    ] = await contract.getOrganizerDetails(address);

    // Fetch metadata from IPFS if profileUri exists with retry and fallback gateways
    let metadata = null;
    if (profileUri && profileUri.length > 0) {
      try {
        let ipfsHash = profileUri;
        if (profileUri.startsWith('ipfs://')) {
          ipfsHash = profileUri.replace('ipfs://', '');
        } else if (profileUri.startsWith('https://gateway.pinata.cloud/ipfs/')) {
          ipfsHash = profileUri.replace('https://gateway.pinata.cloud/ipfs/', '');
        }

        // Multiple gateway fallbacks
        const gateways = [
          `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
          `https://ipfs.io/ipfs/${ipfsHash}`,
          `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
        ];

        for (const gateway of gateways) {
          try {

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

            const response = await fetch(gateway, {
              signal: controller.signal,
              headers: {
                'Accept': 'application/json',
              },
            });
            
            clearTimeout(timeoutId);

            if (response.ok) {
              metadata = await response.json();

              break;
            } else {
              console.warn(`⚠️ Gateway ${gateway} returned status:`, response.status);
            }
          } catch (err: any) {
            console.warn(`⚠️ Gateway ${gateway} failed:`, err.message);
            continue;
          }
        }

        if (!metadata) {
          console.error('❌ All IPFS gateways failed to fetch metadata');
        }
      } catch (error) {
        console.error('❌ Error fetching IPFS metadata:', error);
      }
    }

    return {
      profileUri,
      contentHash,
      registrationDate: Number(registrationDate),
      isVerified,
      totalEvents: Number(totalEvents),
      totalTicketsSold: Number(totalTicketsSold),
      averageRating: Number(averageRating),
      metadata: metadata ? { ...metadata, profileUri } : metadata,
    };
  } catch (error) {
    console.error('Error getting organizer profile:', error);
    throw new Error('Failed to fetch organizer profile');
  }
};

/**
 * Get metadata directly from profileUri
 * Useful for fetching data without going through smart contract
 * Supports both ipfs:// and gateway URL formats
 */
export const getMetadataFromProfileUri = async (profileUri: string) => {
  try {
    if (!profileUri) {
      throw new Error('Invalid profileUri: URI is empty');
    }

    let gatewayUrl: string;
    
    // Handle different URI formats
    if (profileUri.startsWith('ipfs://')) {
      // Format: ipfs://QmXxx... or ipfs://bafxxx...
      const ipfsHash = profileUri.replace('ipfs://', '');
      gatewayUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    } else if (profileUri.startsWith('https://gateway.pinata.cloud/ipfs/') || 
               profileUri.startsWith('https://ipfs.io/ipfs/') ||
               profileUri.startsWith('http')) {
      // Already a gateway URL
      gatewayUrl = profileUri;
    } else if (profileUri.match(/^(Qm[a-zA-Z0-9]{44}|baf[a-zA-Z0-9]+)$/)) {
      // Just a CID without prefix
      gatewayUrl = `https://gateway.pinata.cloud/ipfs/${profileUri}`;
    } else {
      throw new Error(`Invalid profileUri format: ${profileUri}`);
    }

    const response = await fetch(gatewayUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.status} ${response.statusText}`);
    }
    
    const metadata = await response.json();

    return metadata;
  } catch (error) {
    console.error('Error fetching metadata from profileUri:', error);
    throw error;
  }
};

/**
 * Get complete organizer data by fetching from both blockchain and profileUri
 * This combines blockchain data with IPFS metadata
 */
export const getCompleteOrganizerData = async (address: string) => {
  try {

    // Get blockchain data
    const contract = await getEventOrganizerContractReadOnly();
    const [
      profileUri,
      contentHash,
      registrationDate,
      isVerified,
      totalEvents,
      totalTicketsSold,
      averageRating,
    ] = await contract.getOrganizerDetails(address);

    // Get metadata from profileUri
    let metadata = null;
    if (profileUri) {
      try {
        metadata = await getMetadataFromProfileUri(profileUri);
      } catch (error) {
        console.warn('⚠️ Failed to fetch metadata from profileUri, continuing with blockchain data only');
      }
    }

    const completeData = {
      address,
      profileUri,
      contentHash,
      registrationDate: Number(registrationDate),
      isVerified,
      totalEvents: Number(totalEvents),
      totalTicketsSold: Number(totalTicketsSold),
      averageRating: Number(averageRating),
      metadata: metadata ? { ...metadata, profileUri } : metadata,
    };

    return completeData;
    
  } catch (error) {
    console.error('Error getting complete organizer data:', error);
    throw new Error('Failed to fetch complete organizer data');
  }
};

/**
 * Get all deployed events from blockchain
 */
export const getAllDeployedEventsFromBlockchain = async (): Promise<any[]> => {
  try {

    // Log contract configuration
    const contractAddress = CONTRACTS.testnet.EventOrganizer;

    if (!contractAddress) {
      console.error('❌ EventOrganizer contract address not configured!');
      console.error('Please check CONTRACTS in src/config/contracts.ts');
      return [];
    }
    
    const contract = await getEventOrganizerContractReadOnly();
    
    if (!contract) {
      console.error('❌ EventOrganizer contract is null or undefined');
      return [];
    }

    // Check if function exists
    if (!contract.getAllDeployedEvents) {
      console.error('❌ getAllDeployedEvents function not found in contract');
      return [];
    }
    
    const events = await contract.getAllDeployedEvents();

    if (events.length === 0) {
      console.warn('⚠️ No events found in EventOrganizer contract');
      console.warn('⚠️ Possible reasons:');
      console.warn('  1. No events have been deployed yet');
      console.warn('  2. Events were deployed but recordEventCreation() was not called');
      console.warn('  3. recordEventCreation() failed due to permission issues');
      console.warn('  4. Contract was recently reset/redeployed');
      console.warn('');
      console.warn('💡 To fix: When creating an event, ensure recordEventCreation() is called');
      console.warn('   OR deploy events through the Platform contract');
    }
    
    const mappedEvents = events.map((event: any, index: number) => {
      const mapped = {
        eventContract: event.eventContract,
        organizer: event.organizer,
        eventId: Number(event.eventId),
        deployedAt: Number(event.deployedAt),
        isActive: event.isActive,
      };

      return mapped;
    });
    
    return mappedEvents;
  } catch (error: any) {
    console.error('❌ Error fetching deployed events:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      data: error?.data,
    });
    return [];
  }
};

/**
 * Get active events only
 */
export const getActiveEventsFromBlockchain = async (): Promise<any[]> => {
  try {
    const contract = await getEventOrganizerContractReadOnly();
    const events = await contract.getActiveEvents?.();
    
    if (!events) return [];
    
    return events.map((event: any) => ({
      eventContract: event.eventContract,
      organizer: event.organizer,
      eventId: Number(event.eventId),
      deployedAt: Number(event.deployedAt),
      isActive: event.isActive,
    }));
  } catch (error) {
    console.error('Error fetching active events:', error);
    return [];
  }
};

/**
 * Get events by organizer address
 * Returns array of event indices for this organizer
 */
export const getEventsByOrganizer = async (organizer: string): Promise<number[]> => {
  try {
    const contract = await getEventOrganizerContractReadOnly();
    const eventIndices = await contract.getEventsByOrganizer?.(organizer);
    
    if (!eventIndices) return [];
    
    return eventIndices.map((idx: any) => Number(idx));
  } catch (error) {
    console.error('Error fetching organizer events:', error);
    return [];
  }
};

/**
 * Get upcoming events by organizer address
 */
export const getUpcomingEventsByOrganizer = async (organizer: string): Promise<any[]> => {
  try {
    const contract = await getEventOrganizerContractReadOnly();
    const events = await contract.getUpcomingEventsByOrganizer?.(organizer);
    
    if (!events) return [];
    
    return events.map((event: any) => ({
      eventContract: event.eventContract,
      organizer: event.organizer,
      eventId: Number(event.eventId),
      deployedAt: Number(event.deployedAt),
      isActive: event.isActive,
    }));
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    return [];
  }
};

/**
 * Get past events by organizer address
 */
export const getPastEventsByOrganizer = async (organizer: string): Promise<any[]> => {
  try {
    const contract = await getEventOrganizerContractReadOnly();
    const events = await contract.getPastEventsByOrganizer?.(organizer);
    
    if (!events) return [];
    
    return events.map((event: any) => ({
      eventContract: event.eventContract,
      organizer: event.organizer,
      eventId: Number(event.eventId),
      deployedAt: Number(event.deployedAt),
      isActive: event.isActive,
    }));
  } catch (error) {
    console.error('Error fetching past events:', error);
    return [];
  }
};

/**
 * Get event details by event index
 */
export const getEventDetailsByIndex = async (eventIndex: number): Promise<any> => {
  try {
    const contract = await getEventOrganizerContractReadOnly();
    const details = await contract.getEventDetails?.(eventIndex);
    
    if (!details) return null;
    
    return {
      eventContract: details.eventContract || details[0],
      organizer: details.organizer || details[1],
      eventId: Number(details.eventId || details[2]),
      deployedAt: Number(details.deployedAt || details[3]),
      isActive: details.isActive !== undefined ? details.isActive : details[4],
    };
  } catch (error) {
    console.error('Error fetching event details by index:', error);
    return null;
  }
};

/**
 * Deactivate event (mark as ended)
 */
export const deactivateEvent = async (eventIndex: number): Promise<{ transactionHash: string }> => {
  try {
    const contract = await getEventOrganizerContract();
    const tx = await contract.deactivateEvent?.(eventIndex);
    const receipt = await tx?.wait();
    
    return {
      transactionHash: receipt?.hash || '',
    };
  } catch (error: any) {
    console.error('Error deactivating event:', error);
    throw new Error(error.message || 'Failed to deactivate event');
  }
};

/**
 * Verify if event contract is recorded in EventOrganizer
 * This should be called after deploying an EventTicket contract to ensure it was recorded
 */
export const verifyEventRecorded = async (
  eventContractAddress: string,
  maxRetries: number = 3,
  retryDelay: number = 2000
): Promise<{ recorded: boolean; eventData?: any }> => {

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {

      // Wait a bit for blockchain to update
      if (attempt > 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
      
      // Get all deployed events
      const allEvents = await getAllDeployedEventsFromBlockchain();
      
      // Find the event
      const eventData = allEvents.find(
        (event) => event.eventContract.toLowerCase() === eventContractAddress.toLowerCase()
      );
      
      if (eventData) {

        return { recorded: true, eventData };
      }

    } catch (error) {
      console.error(`Error on attempt ${attempt}:`, error);
    }
  }
  
  console.error('❌ Event NOT recorded in EventOrganizer after all retries!');
  console.error('Possible reasons:');
  console.error('1. recordEventCreation() failed silently in EventTicket constructor');
  console.error('2. Organizer not verified or not registered');
  console.error('3. EventOrganizer contract permission issue');
  
  return { recorded: false };
};

/**
 * Manual record event creation (fallback if auto-record fails)
 * NOTE: This requires the caller to have permission (platform contract, owner, or event contract itself)
 */
export const manualRecordEventCreation = async (
  eventContractAddress: string,
  organizerAddress: string
): Promise<{ transactionHash: string }> => {
  try {

    const contract = await getEventOrganizerContract();
    
    // This will likely fail if caller doesn't have permission
    // But we try anyway as a fallback
    const tx = await contract.recordEventCreation(
      eventContractAddress,
      organizerAddress,
      0 // eventId will be auto-assigned
    );

    const receipt = await tx.wait();

    return {
      transactionHash: receipt.hash,
    };
  } catch (error: any) {
    console.error('❌ Manual recording failed:', error);
    
    if (error.message?.includes('Not authorized')) {
      throw new Error('Not authorized to record event. Only platform contract, owner, or event contract itself can record events.');
    }
    
    throw new Error(error.message || 'Failed to manually record event');
  }
};

/**
 * Create Event using Push Chain Universal Wallet
 * Works from ANY supported blockchain
 */
export const createEventUniversal = async (
  pushChainClient: any,
  PushChain: any,
  params: {
    totalSupply: number;
    ticketPrice: string;
    nftName: string;
    nftSymbol: string;
    eventName: string;
    eventDate: number;
    metadataUri: string;
    contentHash: string;
  }
): Promise<{ transactionHash: string; contractAddress?: string }> => {
  if (!pushChainClient || !PushChain) {
    throw new Error('Push Chain client not initialized. Please connect wallet.');
  }

  try {
    const contractAddress = CONTRACTS.testnet.EventOrganizer;
    if (!contractAddress) {
      throw new Error('EventOrganizer contract address not configured');
    }

    // Clean and validate ticket price
    let cleanTicketPrice = params.ticketPrice.toString().trim();
    cleanTicketPrice = cleanTicketPrice.replace(/[^0-9.]/g, '');
    const ticketPriceNum = parseFloat(cleanTicketPrice);

    if (isNaN(ticketPriceNum) || ticketPriceNum <= 0) {
      throw new Error(`Invalid ticket price: ${params.ticketPrice}`);
    }

    // Convert to wei using ethers
    const ticketPriceWei = ethers.parseEther(cleanTicketPrice.toString());

    // Validate eventDate (convert to seconds if milliseconds)
    let eventDateSeconds = params.eventDate;
    if (eventDateSeconds > 10000000000) {
      eventDateSeconds = Math.floor(eventDateSeconds / 1000);
    }

    console.log('🎫 Creating event with universal transaction...');
    console.log('📍 EventOrganizer Contract:', contractAddress);
    console.log('🎪 Event Name:', params.eventName);
    console.log('💰 Ticket Price:', cleanTicketPrice, 'PC');
    console.log('🎟️ Total Supply:', params.totalSupply);

    // Encode createEvent function call
    const data = PushChain.utils.helpers.encodeTxData({
      abi: EventOrganizerArtifact.abi,
      functionName: 'createEvent',
      args: [
        params.totalSupply,
        ticketPriceWei,
        params.nftName,
        params.nftSymbol,
        params.eventName,
        eventDateSeconds,
        params.metadataUri,
        params.contentHash
      ],
    });

    console.log('📤 Sending universal transaction...');

    // Send universal transaction
    // User can pay from ETH, Polygon, Solana, etc.
    const tx = await pushChainClient.universal.sendTransaction({
      to: contractAddress,
      data: data,
      // No value needed for createEvent
    });

    console.log('✅ Transaction sent:', tx);

    // Wait for confirmation
    const receipt = await tx.wait();

    console.log('✅ Transaction confirmed:', receipt);

    // Extract transaction hash
    const txHash = receipt?.hash || receipt?.transactionHash || tx?.hash || tx?.transactionHash;

    console.log('🔍 Extracted transaction hash:', txHash);

    // Try to extract the deployed contract address from logs
    let deployedContractAddress: string | undefined;

    if (receipt?.logs) {
      // Look for EventCreated event
      // Event signature: EventCreated(address indexed eventContract, address indexed creator, string metadataUri)
      const eventCreatedTopic = ethers.id('EventCreated(address,address,string)');

      const eventLog = receipt.logs.find((log: any) =>
        log.topics && log.topics[0] === eventCreatedTopic
      );

      if (eventLog && eventLog.topics && eventLog.topics.length > 1) {
        // topics[1] is the indexed eventContract address
        deployedContractAddress = ethers.getAddress('0x' + eventLog.topics[1].slice(26));
        console.log('🏗️ Deployed contract address:', deployedContractAddress);
      }
    }

    return {
      transactionHash: txHash,
      contractAddress: deployedContractAddress,
    };
  } catch (error: any) {
    console.error('❌ Create event error:', error);

    // Handle user rejection
    if (error.message?.includes('rejected') || error.message?.includes('denied') || error.message?.includes('cancel')) {
      throw new Error('Transaction rejected by user');
    }

    // Handle insufficient balance
    if (error.message?.includes('insufficient funds') || error.message?.includes('insufficient balance')) {
      throw new Error('Insufficient balance for event creation');
    }

    // Handle not registered as EO
    if (error.message?.includes('not registered') || error.message?.includes('Only registered organizers')) {
      throw new Error('You must register as an Event Organizer first');
    }

    throw new Error(error.message || 'Failed to create event');
  }
};

/**
 * Record event creation in the EventOrganizer contract
 * This function should be called after successfully deploying an event contract
 */
export const recordEventCreationOnChain = async (
  eventContract: string,
  eventId: number
): Promise<{ transactionHash: string }> => {
  try {

    const contract = await getEventOrganizerContract();
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const creator = await signer.getAddress();

    // Call recordEventCreation function
    // NOTE: This will fail if the sender is not the platform contract or owner
    // We need to update the smart contract to allow organizers to record their own events
    // For now, we'll save to localStorage as a workaround
    
    // TODO: Update smart contract to add a function like:
    // function recordMyEventCreation(address eventContract, uint256 eventId) external onlyVerifiedOrganizer
    
    console.warn('⚠️ recordEventCreation requires platform contract permission');
    console.warn('⚠️ Skipping on-chain recording for now, will save to localStorage');
    
    return {
      transactionHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
    };
  } catch (error: any) {
    console.error('Error recording event creation:', error);
    console.warn('⚠️ Continuing without on-chain event recording');
    return {
      transactionHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
    };
  }
};

export default {
  registerEventOrganizer,
  isOrganizerRegistered,
  isOrganizerVerified,
  getOrganizerDetails,
  getVerifiedOrganizers,
  updateOrganizerProfile,
  getOrganizerProfile,
  getMetadataFromProfileUri,
  getCompleteOrganizerData,
  getAllDeployedEventsFromBlockchain,
  getActiveEventsFromBlockchain,
  getEventsByOrganizer,
  getUpcomingEventsByOrganizer,
  getPastEventsByOrganizer,
  getEventDetailsByIndex,
  deactivateEvent,
  recordEventCreationOnChain,
};
