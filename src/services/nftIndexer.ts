// NFT Indexer Service - For PushChain migration
/**
 * NFT Ticket Indexer Service
 * Simplified version for PushChain blockchain integration
 */

import { fetchIPFSMetadata as fetchIPFS } from './ipfsUtils';

export interface NFTMetadata {
  name?: string;
  description?: string;
  image?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  eventDate?: string;
  eventTime?: string;
  venue?: string;
  venueAddress?: string;
  category?: string;
  ticketType?: string;
  price?: string;
  currency?: string;
  totalSupply?: string;
  properties?: Record<string, any>;
}

export interface NFTTicketMetadata {
  contractId: string;
  contractName: string;
  eventName?: string;
  eventDate?: string;
  venue?: string;
  description?: string;
  imageUri?: string;
  
  totalSupply: number;
  maxSupply?: number;
  mintedCount: number;
  remainingSupply?: number;
  
  mintPrice?: string;
  mintPriceFormatted?: string;
  
  totalHolders: number;
  uniqueHolders: number;

  totalTransfers: number;
  totalMints: number;
  totalBurns: number;

  recentMints: NFTMintEvent[];
  recentTransfers: NFTTransferEvent[];

  isPaused?: boolean;
  isActive: boolean;
  deployedAt: string;
  lastActivityAt?: string;

  contractUri?: string;
  royaltyPercentage?: number;
  creatorAddress?: string;
}

export interface NFTMintEvent {
  txId: string;
  tokenId: number;
  recipient: string;
  timestamp: string;
  blockHeight: number;
  price?: string;
}

export interface NFTTransferEvent {
  txId: string;
  tokenId: number;
  from: string;
  to: string;
  timestamp: string;
  blockHeight: number;
}

export interface NFTHolder {
  address: string;
  tokenIds: number[];
  tokenCount: number;
  firstAcquired: string;
  lastActivity: string;
}

/**
 * Fetch metadata from IPFS
 */
export const fetchIPFSMetadata = async (ipfsUri: string): Promise<NFTMetadata | null> => {
  try {
    return await fetchIPFS(ipfsUri);
  } catch (error) {
    console.error('[NFTIndexer] Error fetching IPFS metadata:', error);
    return null;
  }
};

/**
 * Get NFT ticket data (simplified for PushChain)
 */
export const getNFTTicketData = async (contractId: string): Promise<NFTTicketMetadata | null> => {
  try {
    const [address, name] = contractId.split('.');

    const metadata: NFTTicketMetadata = {
      contractId,
      contractName: name || 'unknown',
      totalSupply: 0,
      mintedCount: 0,
      remainingSupply: 0,
      mintPrice: '0',
      mintPriceFormatted: '0',
      totalHolders: 0,
      uniqueHolders: 0,
      totalTransfers: 0,
      totalMints: 0,
      totalBurns: 0,
      recentMints: [],
      recentTransfers: [],
      isActive: true,
      deployedAt: new Date().toISOString(),
      creatorAddress: address || 'unknown',
    };

    return metadata;

  } catch (error) {
    console.error('❌ Error fetching NFT ticket data:', error);
    return null;
  }
};

/**
 * Index all NFT tickets
 */
export const indexAllNFTTickets = async (
  contractIds: string[]
): Promise<NFTTicketMetadata[]> => {
  try {
    const nftDataPromises = contractIds.map(contractId => getNFTTicketData(contractId));
    const nftData = await Promise.all(nftDataPromises);
    const validNFTData = nftData.filter((data): data is NFTTicketMetadata => data !== null);
    return validNFTData;

  } catch (error) {
    console.error('❌ Error indexing NFT tickets:', error);
    return [];
  }
};

/**
 * Get event data from contract
 */
export const getEventDataFromContract = async (contractId: string): Promise<any | null> => {
  try {
    const [contractAddress, contractName] = contractId.split('.');
    
    const deployedContracts = JSON.parse(
      localStorage.getItem(`deployed-contracts-${contractAddress}`) || '[]'
    );
    
    const deployedContract = deployedContracts.find((c: any) => 
      c.contractAddress === contractId || c.contractName === contractName
    );
    
    if (deployedContract) {
      let metadata: any = deployedContract.metadata;
      if (!metadata && deployedContract.metadataUri) {
        metadata = await fetchIPFSMetadata(deployedContract.metadataUri);
      }
      
      const imageUri = metadata?.image || metadata?.image_url;
      
      return {
        contractId,
        image: imageUri,
        eventName: metadata?.name || deployedContract.eventName || 'Event',
        description: metadata?.description || deployedContract.description,
        eventDate: deployedContract.eventDate || metadata?.properties?.event_date,
        venue: metadata?.properties?.venue,
        venueAddress: deployedContract.venueAddress,
        ticketType: metadata?.properties?.ticket_type,
        category: metadata?.properties?.category,
        price: deployedContract.ticketPrice || '0.1',
        priceFormatted: deployedContract.ticketPrice || '0.1',
        totalSupply: deployedContract.totalSupply || 0,
        available: deployedContract.totalSupply || 0,
        minted: 0,
        isCancelled: false,
        isActive: true,
        tokenUri: deployedContract.metadataUri,
        metadata,
        currency: deployedContract.currency || 'PC',
      };
    }
    
    return null;

  } catch (error) {
    console.error(`❌ Error fetching event data:`, error);
    return null;
  }
};

/**
 * Check if contract is NFT ticket
 */
export const isNFTTicketContract = (contractName: string): boolean => {
  const excludePatterns = [/event-registry/i, /registry/i, /factory/i, /marketplace/i, /governance/i];
  if (excludePatterns.some(pattern => pattern.test(contractName))) return false;
  
  const nftPatterns = [/ticket/i, /event/i, /-20\d{2}-\d{10,}/i];
  return nftPatterns.some(pattern => pattern.test(contractName));
};

/**
 * Extract event name from contract name
 */
export const extractEventNameFromContract = (contractName: string): string => {
  return contractName
    .split('-')
    .filter(part => isNaN(Number(part)))
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default {
  fetchIPFSMetadata,
  getNFTTicketData,
  indexAllNFTTickets,
  getEventDataFromContract,
  isNFTTicketContract,
  extractEventNameFromContract,
};
