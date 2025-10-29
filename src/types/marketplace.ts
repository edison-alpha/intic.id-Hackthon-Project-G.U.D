/**
 * TypeScript Interfaces for NFT Marketplace & Refund System
 * Auto-generated ABIs and type definitions
 */

// ==================== NFT MARKETPLACE ====================

export const NFT_MARKETPLACE_ABI = [
  // Fixed Price Listings
  "function listTicketForSale(address nftContract, uint256 tokenId, uint256 price, uint256 royaltyPercentage, address royaltyRecipient) returns (uint256)",
  "function cancelListing(uint256 listingId)",
  "function buyListing(uint256 listingId) payable",
  
  // Auctions
  "function createAuction(address nftContract, uint256 tokenId, uint256 startPrice, uint256 duration, uint256 royaltyPercentage, address royaltyRecipient) returns (uint256)",
  "function placeBid(uint256 auctionId) payable",
  "function endAuction(uint256 auctionId)",
  
  // Offers
  "function makeOffer(address nftContract, uint256 tokenId, uint256 duration) payable returns (uint256)",
  "function acceptOffer(uint256 offerId)",
  "function cancelOffer(uint256 offerId)",
  
  // View Functions
  "function getListing(uint256 listingId) view returns (tuple(address seller, address nftContract, uint256 tokenId, uint256 price, uint256 royaltyPercentage, address royaltyRecipient, bool active, uint256 listedAt))",
  "function getAuction(uint256 auctionId) view returns (tuple(address seller, address nftContract, uint256 tokenId, uint256 startPrice, uint256 currentBid, address currentBidder, uint256 endTime, uint256 royaltyPercentage, address royaltyRecipient, bool active, bool ended))",
  "function getOffer(uint256 offerId) view returns (tuple(address buyer, address nftContract, uint256 tokenId, uint256 price, uint256 expiresAt, bool active))",
  "function getSale(uint256 saleId) view returns (tuple(address seller, address buyer, address nftContract, uint256 tokenId, uint256 price, uint256 platformFee, uint256 royaltyFee, uint256 timestamp))",
  "function getMarketplaceStats() view returns (uint256 totalListings, uint256 totalSales, uint256 totalVolume, uint256 accumulatedFees)",
  
  // Platform Management
  "function platformFeeRate() view returns (uint256)",
  "function setPlatformFeeRate(uint256 newFeeRate)",
  "function withdrawFees()",
  
  // Events
  "event ListingCreated(uint256 indexed listingId, address indexed seller, address indexed nftContract, uint256 tokenId, uint256 price, uint256 royaltyPercentage)",
  "event ListingCancelled(uint256 indexed listingId)",
  "event ListingSold(uint256 indexed listingId, address indexed buyer, uint256 price, uint256 platformFee, uint256 royaltyFee)",
  "event AuctionCreated(uint256 indexed auctionId, address indexed seller, address indexed nftContract, uint256 tokenId, uint256 startPrice, uint256 endTime)",
  "event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount)",
  "event AuctionEnded(uint256 indexed auctionId, address indexed winner, uint256 finalPrice)",
  "event OfferCreated(uint256 indexed offerId, address indexed buyer, address indexed nftContract, uint256 tokenId, uint256 price)",
  "event OfferAccepted(uint256 indexed offerId, address indexed seller, uint256 price)",
  "event OfferCancelled(uint256 indexed offerId)"
];

export interface MarketplaceListing {
  seller: string;
  nftContract: string;
  tokenId: number;
  price: string;
  royaltyPercentage: number;
  royaltyRecipient: string;
  active: boolean;
  listedAt: number;
}

export interface MarketplaceAuction {
  seller: string;
  nftContract: string;
  tokenId: number;
  startPrice: string;
  currentBid: string;
  currentBidder: string;
  endTime: number;
  royaltyPercentage: number;
  royaltyRecipient: string;
  active: boolean;
  ended: boolean;
}

export interface MarketplaceOffer {
  buyer: string;
  nftContract: string;
  tokenId: number;
  price: string;
  expiresAt: number;
  active: boolean;
}

export interface MarketplaceSale {
  seller: string;
  buyer: string;
  nftContract: string;
  tokenId: number;
  price: string;
  platformFee: string;
  royaltyFee: string;
  timestamp: number;
}

export interface MarketplaceStats {
  totalListings: number;
  totalSales: number;
  totalVolume: string;
  accumulatedFees: string;
}

// ==================== EVENT REFUND ====================

export const EVENT_REFUND_ABI = [
  // Event Cancellation
  "function cancelEvent(address eventContract, uint256 eventId, uint256 ticketPrice, uint256 totalTicketsSold, uint256 refundDeadlineDays, uint8 reason) returns (bool)",
  "function fundRefundPool(address eventContract, uint256 eventId) payable returns (bool)",
  
  // Refund Claims
  "function claimRefund(address eventContract, uint256 eventId, uint256 tokenId) returns (uint256)",
  "function approveRefund(uint256 claimId)",
  "function rejectRefund(uint256 claimId)",
  "function batchApproveRefunds(uint256[] calldata claimIds)",
  
  // Withdrawals
  "function withdrawUnclaimedRefunds(address eventContract, uint256 eventId)",
  
  // View Functions
  "function getEventCancellation(address eventContract, uint256 eventId) view returns (tuple(address eventContract, uint256 eventId, address organizer, uint256 ticketPrice, uint256 totalTicketsSold, uint256 refundDeadline, uint256 cancelledAt, uint8 reason, bool refundPoolFunded, bool active))",
  "function getRefundClaim(uint256 claimId) view returns (tuple(address claimant, address eventContract, uint256 eventId, uint256 tokenId, uint256 refundAmount, uint8 status, uint256 claimedAt, uint256 processedAt, bool ticketBurned))",
  "function canClaimRefund(address eventContract, uint256 eventId, uint256 tokenId, address user) view returns (bool)",
  "function getRefundStats() view returns (uint256 totalCancellations, uint256 totalRefundsClaimed, uint256 totalRefundAmount)",
  "function getRefundPoolBalance(address eventContract, uint256 eventId) view returns (uint256)",
  
  // Events
  "event EventCancelled(address indexed eventContract, uint256 indexed eventId, address indexed organizer, uint8 reason, uint256 refundDeadline)",
  "event RefundPoolFunded(address indexed eventContract, uint256 indexed eventId, uint256 amount)",
  "event RefundClaimCreated(uint256 indexed claimId, address indexed claimant, address indexed eventContract, uint256 eventId, uint256 tokenId, uint256 refundAmount)",
  "event RefundClaimed(uint256 indexed claimId, address indexed claimant, uint256 refundAmount)",
  "event RefundApproved(uint256 indexed claimId)",
  "event RefundRejected(uint256 indexed claimId)"
];

export enum RefundStatus {
  None = 0,
  Pending = 1,
  Approved = 2,
  Rejected = 3,
  Claimed = 4
}

export enum CancellationReason {
  OrganizerCancelled = 0,
  VenueClosed = 1,
  Forcemajeure = 2,
  LowSales = 3,
  Other = 4
}

export interface EventCancellation {
  eventContract: string;
  eventId: number;
  organizer: string;
  ticketPrice: string;
  totalTicketsSold: number;
  refundDeadline: number;
  cancelledAt: number;
  reason: CancellationReason;
  refundPoolFunded: boolean;
  active: boolean;
}

export interface RefundClaim {
  claimant: string;
  eventContract: string;
  eventId: number;
  tokenId: number;
  refundAmount: string;
  status: RefundStatus;
  claimedAt: number;
  processedAt: number;
  ticketBurned: boolean;
}

export interface RefundStats {
  totalCancellations: number;
  totalRefundsClaimed: number;
  totalRefundAmount: string;
}

// ==================== CONTRACT ADDRESSES ====================

export const MARKETPLACE_CONTRACT = {
  testnet: process.env.VITE_MARKETPLACE_CONTRACT_TESTNET || '',
  mainnet: process.env.VITE_MARKETPLACE_CONTRACT_MAINNET || ''
};

export const REFUND_CONTRACT = {
  testnet: process.env.VITE_REFUND_CONTRACT_TESTNET || '',
  mainnet: process.env.VITE_REFUND_CONTRACT_MAINNET || ''
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Calculate platform fee
 */
export function calculatePlatformFee(price: string, feeRate: number = 250): string {
  const priceWei = BigInt(price);
  const fee = (priceWei * BigInt(feeRate)) / BigInt(10000);
  return fee.toString();
}

/**
 * Calculate royalty fee
 */
export function calculateRoyaltyFee(price: string, royaltyPercentage: number): string {
  const priceWei = BigInt(price);
  const fee = (priceWei * BigInt(royaltyPercentage)) / BigInt(10000);
  return fee.toString();
}

/**
 * Calculate seller proceeds
 */
export function calculateSellerProceeds(
  price: string,
  platformFeeRate: number = 250,
  royaltyPercentage: number = 500
): string {
  const priceWei = BigInt(price);
  const platformFee = calculatePlatformFee(price, platformFeeRate);
  const royaltyFee = calculateRoyaltyFee(price, royaltyPercentage);
  const proceeds = priceWei - BigInt(platformFee) - BigInt(royaltyFee);
  return proceeds.toString();
}

/**
 * Format listing for display
 */
export function formatListing(listing: MarketplaceListing) {
  return {
    ...listing,
    priceInEther: parseFloat(listing.price) / 1e18,
    royaltyPercent: listing.royaltyPercentage / 100,
    listedDate: new Date(listing.listedAt * 1000)
  };
}

/**
 * Format auction for display
 */
export function formatAuction(auction: MarketplaceAuction) {
  return {
    ...auction,
    startPriceInEther: parseFloat(auction.startPrice) / 1e18,
    currentBidInEther: parseFloat(auction.currentBid) / 1e18,
    royaltyPercent: auction.royaltyPercentage / 100,
    endDate: new Date(auction.endTime * 1000),
    timeRemaining: auction.endTime * 1000 - Date.now()
  };
}

/**
 * Check if refund is claimable
 */
export function isRefundClaimable(cancellation: EventCancellation): boolean {
  const now = Date.now() / 1000;
  return (
    cancellation.active &&
    cancellation.refundPoolFunded &&
    now <= cancellation.refundDeadline
  );
}

/**
 * Get refund status text
 */
export function getRefundStatusText(status: RefundStatus): string {
  switch (status) {
    case RefundStatus.None:
      return 'Not Claimed';
    case RefundStatus.Pending:
      return 'Pending Review';
    case RefundStatus.Approved:
      return 'Approved';
    case RefundStatus.Rejected:
      return 'Rejected';
    case RefundStatus.Claimed:
      return 'Claimed';
    default:
      return 'Unknown';
  }
}

/**
 * Get cancellation reason text
 */
export function getCancellationReasonText(reason: CancellationReason): string {
  switch (reason) {
    case CancellationReason.OrganizerCancelled:
      return 'Cancelled by Organizer';
    case CancellationReason.VenueClosed:
      return 'Venue Closed';
    case CancellationReason.Forcemajeure:
      return 'Force Majeure';
    case CancellationReason.LowSales:
      return 'Low Ticket Sales';
    case CancellationReason.Other:
      return 'Other Reason';
    default:
      return 'Unknown';
  }
}
