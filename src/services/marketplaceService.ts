/**
 * NFT Marketplace Service
 * Handles all marketplace interactions (listings, auctions, offers)
 */

import { ethers } from 'ethers';
import {
  NFT_MARKETPLACE_ABI,
  MARKETPLACE_CONTRACT,
  type MarketplaceListing,
  type MarketplaceAuction,
  type MarketplaceOffer,
  type MarketplaceSale,
  type MarketplaceStats,
  calculatePlatformFee,
  calculateRoyaltyFee,
  calculateSellerProceeds
} from '@/types/marketplace';

const NETWORK = 'testnet'; // Change to 'mainnet' for production

/**
 * Get marketplace contract instance
 */
export function getMarketplaceContract(signer?: ethers.Signer) {
  const contractAddress = MARKETPLACE_CONTRACT[NETWORK];
  if (!contractAddress) {
    throw new Error('Marketplace contract address not configured');
  }

  const provider = signer?.provider || new ethers.providers.Web3Provider(window.ethereum);
  
  if (signer) {
    return new ethers.Contract(contractAddress, NFT_MARKETPLACE_ABI, signer);
  }
  
  return new ethers.Contract(contractAddress, NFT_MARKETPLACE_ABI, provider);
}

// ==================== FIXED PRICE LISTINGS ====================

/**
 * List a ticket for fixed price sale
 */
export async function listTicketForSale(
  signer: ethers.Signer,
  nftContract: string,
  tokenId: number,
  priceInEther: string,
  royaltyPercentage: number = 500, // 5% default
  royaltyRecipient?: string
): Promise<{ success: boolean; listingId?: number; txHash?: string; error?: string }> {
  try {
    const marketplace = getMarketplaceContract(signer);
    const userAddress = await signer.getAddress();
    const recipient = royaltyRecipient || userAddress;
    
    // Convert price to Wei
    const priceWei = ethers.utils.parseEther(priceInEther);
    
    // First, approve marketplace to transfer NFT
    const nft = new ethers.Contract(
      nftContract,
      ['function approve(address to, uint256 tokenId)', 'function setApprovalForAll(address operator, bool approved)'],
      signer
    );
    
    const approvalTx = await nft.setApprovalForAll(marketplace.address, true);
    await approvalTx.wait();
    
    // Create listing
    const tx = await marketplace.listTicketForSale(
      nftContract,
      tokenId,
      priceWei,
      royaltyPercentage,
      recipient
    );
    
    const receipt = await tx.wait();
    
    // Extract listing ID from event
    const event = receipt.events?.find((e: any) => e.event === 'ListingCreated');
    const listingId = event?.args?.listingId?.toNumber();
    
    return {
      success: true,
      listingId,
      txHash: receipt.transactionHash
    };
  } catch (error: any) {
    console.error('Error listing ticket:', error);
    return {
      success: false,
      error: error.message || 'Failed to list ticket'
    };
  }
}

/**
 * Cancel a listing
 */
export async function cancelListing(
  signer: ethers.Signer,
  listingId: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const marketplace = getMarketplaceContract(signer);
    const tx = await marketplace.cancelListing(listingId);
    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: receipt.transactionHash
    };
  } catch (error: any) {
    console.error('Error cancelling listing:', error);
    return {
      success: false,
      error: error.message || 'Failed to cancel listing'
    };
  }
}

/**
 * Buy a listed ticket
 */
export async function buyListing(
  signer: ethers.Signer,
  listingId: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const marketplace = getMarketplaceContract(signer);
    
    // Get listing details
    const listing = await marketplace.getListing(listingId);
    
    if (!listing.active) {
      return { success: false, error: 'Listing is not active' };
    }
    
    // Buy listing with exact price
    const tx = await marketplace.buyListing(listingId, {
      value: listing.price
    });
    
    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: receipt.transactionHash
    };
  } catch (error: any) {
    console.error('Error buying listing:', error);
    return {
      success: false,
      error: error.message || 'Failed to buy listing'
    };
  }
}

/**
 * Get listing details
 */
export async function getListing(listingId: number): Promise<MarketplaceListing | null> {
  try {
    const marketplace = getMarketplaceContract();
    const listing = await marketplace.getListing(listingId);
    
    return {
      seller: listing.seller,
      nftContract: listing.nftContract,
      tokenId: listing.tokenId.toNumber(),
      price: listing.price.toString(),
      royaltyPercentage: listing.royaltyPercentage,
      royaltyRecipient: listing.royaltyRecipient,
      active: listing.active,
      listedAt: listing.listedAt.toNumber()
    };
  } catch (error) {
    console.error('Error getting listing:', error);
    return null;
  }
}

// ==================== AUCTIONS ====================

/**
 * Create an auction
 */
export async function createAuction(
  signer: ethers.Signer,
  nftContract: string,
  tokenId: number,
  startPriceInEther: string,
  durationInDays: number,
  royaltyPercentage: number = 500,
  royaltyRecipient?: string
): Promise<{ success: boolean; auctionId?: number; txHash?: string; error?: string }> {
  try {
    const marketplace = getMarketplaceContract(signer);
    const userAddress = await signer.getAddress();
    const recipient = royaltyRecipient || userAddress;
    
    const startPriceWei = ethers.utils.parseEther(startPriceInEther);
    const duration = durationInDays * 24 * 60 * 60; // Convert to seconds
    
    // Approve marketplace
    const nft = new ethers.Contract(
      nftContract,
      ['function setApprovalForAll(address operator, bool approved)'],
      signer
    );
    
    const approvalTx = await nft.setApprovalForAll(marketplace.address, true);
    await approvalTx.wait();
    
    // Create auction
    const tx = await marketplace.createAuction(
      nftContract,
      tokenId,
      startPriceWei,
      duration,
      royaltyPercentage,
      recipient
    );
    
    const receipt = await tx.wait();
    const event = receipt.events?.find((e: any) => e.event === 'AuctionCreated');
    const auctionId = event?.args?.auctionId?.toNumber();
    
    return {
      success: true,
      auctionId,
      txHash: receipt.transactionHash
    };
  } catch (error: any) {
    console.error('Error creating auction:', error);
    return {
      success: false,
      error: error.message || 'Failed to create auction'
    };
  }
}

/**
 * Place a bid on an auction
 */
export async function placeBid(
  signer: ethers.Signer,
  auctionId: number,
  bidAmountInEther: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const marketplace = getMarketplaceContract(signer);
    const bidAmountWei = ethers.utils.parseEther(bidAmountInEther);
    
    const tx = await marketplace.placeBid(auctionId, {
      value: bidAmountWei
    });
    
    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: receipt.transactionHash
    };
  } catch (error: any) {
    console.error('Error placing bid:', error);
    return {
      success: false,
      error: error.message || 'Failed to place bid'
    };
  }
}

/**
 * End an auction
 */
export async function endAuction(
  signer: ethers.Signer,
  auctionId: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const marketplace = getMarketplaceContract(signer);
    const tx = await marketplace.endAuction(auctionId);
    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: receipt.transactionHash
    };
  } catch (error: any) {
    console.error('Error ending auction:', error);
    return {
      success: false,
      error: error.message || 'Failed to end auction'
    };
  }
}

/**
 * Get auction details
 */
export async function getAuction(auctionId: number): Promise<MarketplaceAuction | null> {
  try {
    const marketplace = getMarketplaceContract();
    const auction = await marketplace.getAuction(auctionId);
    
    return {
      seller: auction.seller,
      nftContract: auction.nftContract,
      tokenId: auction.tokenId.toNumber(),
      startPrice: auction.startPrice.toString(),
      currentBid: auction.currentBid.toString(),
      currentBidder: auction.currentBidder,
      endTime: auction.endTime.toNumber(),
      royaltyPercentage: auction.royaltyPercentage,
      royaltyRecipient: auction.royaltyRecipient,
      active: auction.active,
      ended: auction.ended
    };
  } catch (error) {
    console.error('Error getting auction:', error);
    return null;
  }
}

// ==================== OFFERS ====================

/**
 * Make an offer on a ticket
 */
export async function makeOffer(
  signer: ethers.Signer,
  nftContract: string,
  tokenId: number,
  offerAmountInEther: string,
  durationInDays: number = 7
): Promise<{ success: boolean; offerId?: number; txHash?: string; error?: string }> {
  try {
    const marketplace = getMarketplaceContract(signer);
    const offerAmountWei = ethers.utils.parseEther(offerAmountInEther);
    const duration = durationInDays * 24 * 60 * 60;
    
    const tx = await marketplace.makeOffer(nftContract, tokenId, duration, {
      value: offerAmountWei
    });
    
    const receipt = await tx.wait();
    const event = receipt.events?.find((e: any) => e.event === 'OfferCreated');
    const offerId = event?.args?.offerId?.toNumber();
    
    return {
      success: true,
      offerId,
      txHash: receipt.transactionHash
    };
  } catch (error: any) {
    console.error('Error making offer:', error);
    return {
      success: false,
      error: error.message || 'Failed to make offer'
    };
  }
}

/**
 * Accept an offer
 */
export async function acceptOffer(
  signer: ethers.Signer,
  offerId: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const marketplace = getMarketplaceContract(signer);
    
    // Get offer details
    const offer = await marketplace.getOffer(offerId);
    
    // Approve marketplace
    const nft = new ethers.Contract(
      offer.nftContract,
      ['function setApprovalForAll(address operator, bool approved)'],
      signer
    );
    
    const approvalTx = await nft.setApprovalForAll(marketplace.address, true);
    await approvalTx.wait();
    
    // Accept offer
    const tx = await marketplace.acceptOffer(offerId);
    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: receipt.transactionHash
    };
  } catch (error: any) {
    console.error('Error accepting offer:', error);
    return {
      success: false,
      error: error.message || 'Failed to accept offer'
    };
  }
}

/**
 * Cancel an offer
 */
export async function cancelOffer(
  signer: ethers.Signer,
  offerId: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const marketplace = getMarketplaceContract(signer);
    const tx = await marketplace.cancelOffer(offerId);
    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: receipt.transactionHash
    };
  } catch (error: any) {
    console.error('Error cancelling offer:', error);
    return {
      success: false,
      error: error.message || 'Failed to cancel offer'
    };
  }
}

// ==================== STATISTICS ====================

/**
 * Get marketplace statistics
 */
export async function getMarketplaceStats(): Promise<MarketplaceStats | null> {
  try {
    const marketplace = getMarketplaceContract();
    const stats = await marketplace.getMarketplaceStats();
    
    return {
      totalListings: stats.totalListings.toNumber(),
      totalSales: stats.totalSales.toNumber(),
      totalVolume: stats.totalVolume.toString(),
      accumulatedFees: stats.accumulatedFees.toString()
    };
  } catch (error) {
    console.error('Error getting marketplace stats:', error);
    return null;
  }
}

/**
 * Get platform fee rate
 */
export async function getPlatformFeeRate(): Promise<number> {
  try {
    const marketplace = getMarketplaceContract();
    const feeRate = await marketplace.platformFeeRate();
    return feeRate.toNumber();
  } catch (error) {
    console.error('Error getting platform fee rate:', error);
    return 250; // Default 2.5%
  }
}

// Export helper functions
export {
  calculatePlatformFee,
  calculateRoyaltyFee,
  calculateSellerProceeds
};
