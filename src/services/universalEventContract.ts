/**
 * Universal Event Contract Service
 * Enables cross-chain event creation, ticket minting, and check-in
 * Users can interact from any supported blockchain
 */

import { toast } from 'sonner';
import { CONTRACTS } from '@/config/contracts';

// NOTE: After installing @pushchain/ui-kit, uncomment these imports:
/*
import { useUniversalTransaction, useEncodeFunction, parseValue } from '@/hooks/useUniversalContract';
import { usePushChainClient, usePushChain } from '@pushchain/ui-kit';
*/

// Temporary types until @pushchain/ui-kit is installed
type UniversalTxClient = any;
type PushChainUtils = any;

/**
 * Create Event (Universal Chain)
 * Allows event creation from any supported blockchain
 */
export async function createEventUniversal(
  pushChainClient: UniversalTxClient,
  PushChain: PushChainUtils,
  params: {
    eventName: string;
    eventDate: number; // Unix timestamp
    venue: string;
    venueAddress: string;
    venueCoordinates: string;
    description: string;
    totalSupply: number;
    ticketPrice: string; // In PC (will be converted from user's chain)
    baseUri: string; // IPFS metadata URI
    eventImageUri: string;
    eventOrganizerAddress: string;
  },
  onProgress?: (step: string) => void
): Promise<{
  transactionHash: string;
  contractAddress: string;
  blockNumber: number;
}> {
  if (!pushChainClient || !PushChain) {
    throw new Error('Push Chain client not initialized. Please connect wallet first.');
  }

  try {
    onProgress?.('Preparing transaction...');

    // Generate NFT symbol from event name
    const nftSymbol = params.eventName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 5) || 'EVENT';

    // Encode contract deployment transaction
    // This would normally use the factory contract to deploy a new EventTicket instance
    const data = PushChain.utils.helpers.encodeTxData({
      abi: [], // EventFactory ABI would go here
      functionName: 'createEvent',
      args: [
        params.eventName,
        nftSymbol,
        params.totalSupply,
        params.eventDate,
        params.venue,
        params.venueAddress,
        params.venueCoordinates,
        params.description,
        params.baseUri,
        params.eventImageUri,
        params.eventOrganizerAddress,
      ],
    });

    onProgress?.('Waiting for wallet approval...');

    // Send universal transaction
    // User can approve this from ANY chain (Ethereum, Polygon, Solana, etc.)
    const tx = await pushChainClient.universal.sendTransaction({
      to: CONTRACTS.testnet.EventOrganizer,
      data: data,
      // No value needed for deployment (gas is abstracted)
    });

    onProgress?.('Transaction submitted, waiting for confirmation...');

    // Wait for transaction to be mined
    const receipt = await tx.wait();

    onProgress?.('Event created successfully!');

    return {
      transactionHash: tx.transactionHash,
      contractAddress: receipt.contractAddress || '',
      blockNumber: receipt.blockNumber || 0,
    };
  } catch (error: any) {
    console.error('Create event failed:', error);

    if (error.message?.includes('rejected') || error.message?.includes('denied')) {
      throw new Error('Transaction rejected by user');
    }

    if (error.message?.includes('insufficient')) {
      throw new Error('Insufficient balance for transaction');
    }

    throw new Error(error.message || 'Failed to create event');
  }
}

/**
 * Mint Ticket (Universal Chain)
 * Allows users to mint tickets paying from any supported blockchain
 */
export async function mintTicketUniversal(
  pushChainClient: UniversalTxClient,
  PushChain: PushChainUtils,
  params: {
    eventContractAddress: string;
    eventId: string;
    ticketPrice: string; // In PC
    quantity?: number;
  }
): Promise<{
  transactionHash: string;
  tokenIds: string[];
}> {
  if (!pushChainClient || !PushChain) {
    throw new Error('Push Chain client not initialized. Please connect wallet first.');
  }

  try {
    const quantity = params.quantity || 1;

    // Encode mint function call
    const data = PushChain.utils.helpers.encodeTxData({
      abi: [], // EventTicket ABI would go here
      functionName: 'mintTicket',
      args: [params.eventId, quantity],
    });

    // Calculate total cost
    const priceInWei = BigInt(Math.floor(parseFloat(params.ticketPrice) * 1e18));
    const totalCost = priceInWei * BigInt(quantity);

    // Send universal transaction with payment
    // User's wallet will automatically convert their native token to PC
    const tx = await pushChainClient.universal.sendTransaction({
      to: params.eventContractAddress,
      data: data,
      value: totalCost, // Payment amount in destination chain (PC)
    });

    const receipt = await tx.wait();

    // Extract minted token IDs from event logs
    const tokenIds: string[] = []; // Would parse from receipt.logs

    toast.success(`Successfully minted ${quantity} ticket${quantity > 1 ? 's' : ''}!`);

    return {
      transactionHash: tx.transactionHash,
      tokenIds,
    };
  } catch (error: any) {
    console.error('Mint ticket failed:', error);

    if (error.message?.includes('rejected')) {
      throw new Error('Transaction rejected by user');
    }

    if (error.message?.includes('insufficient')) {
      throw new Error('Insufficient balance. Please fund your wallet.');
    }

    if (error.message?.includes('sold out')) {
      throw new Error('Event is sold out');
    }

    throw new Error(error.message || 'Failed to mint ticket');
  }
}

/**
 * Validate Ticket / Check-In (Universal Chain)
 * Event organizers can check-in attendees from any chain
 */
export async function validateTicketUniversal(
  pushChainClient: UniversalTxClient,
  PushChain: PushChainUtils,
  params: {
    eventContractAddress: string;
    tokenId: string;
    eventId: string;
  }
): Promise<{
  transactionHash: string;
  success: boolean;
}> {
  if (!pushChainClient || !PushChain) {
    throw new Error('Push Chain client not initialized. Please connect wallet first.');
  }

  try {
    // Encode validate function call
    const data = PushChain.utils.helpers.encodeTxData({
      abi: [], // EventTicket ABI would go here
      functionName: 'validateTicket',
      args: [params.tokenId],
    });

    // Send universal transaction (no payment needed)
    const tx = await pushChainClient.universal.sendTransaction({
      to: params.eventContractAddress,
      data: data,
      // No value for check-in
    });

    await tx.wait();

    toast.success('Attendee checked in successfully!');

    return {
      transactionHash: tx.transactionHash,
      success: true,
    };
  } catch (error: any) {
    console.error('Validate ticket failed:', error);

    if (error.message?.includes('already used')) {
      throw new Error('Ticket already used');
    }

    if (error.message?.includes('not authorized')) {
      throw new Error('Only event organizer can validate tickets');
    }

    throw new Error(error.message || 'Failed to validate ticket');
  }
}

/**
 * Register as Event Organizer (Universal Chain)
 * Users can register from any supported blockchain
 */
export async function registerEOUniversal(
  pushChainClient: UniversalTxClient,
  PushChain: PushChainUtils,
  params: {
    name: string;
    email: string;
    organizationName?: string;
    profilePictureUri?: string;
  }
): Promise<{
  transactionHash: string;
  success: boolean;
}> {
  if (!pushChainClient || !PushChain) {
    throw new Error('Push Chain client not initialized. Please connect wallet first.');
  }

  try {
    // Encode registration function call
    const data = PushChain.utils.helpers.encodeTxData({
      abi: [], // EventOrganizer ABI would go here
      functionName: 'registerOrganizer',
      args: [
        params.name,
        params.email,
        params.organizationName || '',
        params.profilePictureUri || '',
      ],
    });

    // Send universal transaction
    const tx = await pushChainClient.universal.sendTransaction({
      to: CONTRACTS.testnet.EventOrganizer,
      data: data,
    });

    await tx.wait();

    toast.success('Registered as Event Organizer!');

    return {
      transactionHash: tx.transactionHash,
      success: true,
    };
  } catch (error: any) {
    console.error('Register EO failed:', error);

    if (error.message?.includes('already registered')) {
      throw new Error('Address already registered as Event Organizer');
    }

    throw new Error(error.message || 'Failed to register as Event Organizer');
  }
}

/**
 * List Ticket on Marketplace (Universal Chain)
 */
export async function listTicketUniversal(
  pushChainClient: UniversalTxClient,
  PushChain: PushChainUtils,
  params: {
    tokenId: string;
    price: string; // In PC
  }
): Promise<{
  transactionHash: string;
  listingId: string;
}> {
  if (!pushChainClient || !PushChain) {
    throw new Error('Push Chain client not initialized.');
  }

  try {
    const priceInWei = BigInt(Math.floor(parseFloat(params.price) * 1e18));

    const data = PushChain.utils.helpers.encodeTxData({
      abi: [], // NFTMarketplace ABI
      functionName: 'listTicket',
      args: [params.tokenId, priceInWei],
    });

    const tx = await pushChainClient.universal.sendTransaction({
      to: CONTRACTS.testnet.NFTMarketplace,
      data: data,
    });

    const receipt = await tx.wait();

    toast.success('Ticket listed on marketplace!');

    return {
      transactionHash: tx.transactionHash,
      listingId: '', // Would parse from logs
    };
  } catch (error: any) {
    console.error('List ticket failed:', error);
    throw new Error(error.message || 'Failed to list ticket');
  }
}

/**
 * Buy Ticket from Marketplace (Universal Chain)
 */
export async function buyTicketUniversal(
  pushChainClient: UniversalTxClient,
  PushChain: PushChainUtils,
  params: {
    listingId: string;
    price: string; // In PC
  }
): Promise<{
  transactionHash: string;
  tokenId: string;
}> {
  if (!pushChainClient || !PushChain) {
    throw new Error('Push Chain client not initialized.');
  }

  try {
    const priceInWei = BigInt(Math.floor(parseFloat(params.price) * 1e18));

    const data = PushChain.utils.helpers.encodeTxData({
      abi: [], // NFTMarketplace ABI
      functionName: 'buyTicket',
      args: [params.listingId],
    });

    const tx = await pushChainClient.universal.sendTransaction({
      to: CONTRACTS.testnet.NFTMarketplace,
      data: data,
      value: priceInWei, // Payment
    });

    await tx.wait();

    toast.success('Ticket purchased successfully!');

    return {
      transactionHash: tx.transactionHash,
      tokenId: '', // Would parse from logs
    };
  } catch (error: any) {
    console.error('Buy ticket failed:', error);

    if (error.message?.includes('insufficient')) {
      throw new Error('Insufficient balance');
    }

    throw new Error(error.message || 'Failed to buy ticket');
  }
}

/**
 * Refund Ticket (Universal Chain)
 */
export async function refundTicketUniversal(
  pushChainClient: UniversalTxClient,
  PushChain: PushChainUtils,
  params: {
    tokenId: string;
    eventContractAddress: string;
  }
): Promise<{
  transactionHash: string;
  refundAmount: string;
}> {
  if (!pushChainClient || !PushChain) {
    throw new Error('Push Chain client not initialized.');
  }

  try {
    const data = PushChain.utils.helpers.encodeTxData({
      abi: [], // EventTicket ABI
      functionName: 'refundTicket',
      args: [params.tokenId],
    });

    const tx = await pushChainClient.universal.sendTransaction({
      to: params.eventContractAddress,
      data: data,
    });

    await tx.wait();

    toast.success('Ticket refunded!');

    return {
      transactionHash: tx.transactionHash,
      refundAmount: '', // Would parse from logs
    };
  } catch (error: any) {
    console.error('Refund ticket failed:', error);

    if (error.message?.includes('refund period expired')) {
      throw new Error('Refund period has expired');
    }

    throw new Error(error.message || 'Failed to refund ticket');
  }
}

// Export all functions
export default {
  createEventUniversal,
  mintTicketUniversal,
  validateTicketUniversal,
  registerEOUniversal,
  listTicketUniversal,
  buyTicketUniversal,
  refundTicketUniversal,
};
