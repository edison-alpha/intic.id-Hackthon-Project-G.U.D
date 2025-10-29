/**
 * NFTMarketplace Contract Service
 * Handles ticket listing, buying, and marketplace operations
 */

import { ethers } from 'ethers';
import { getContracts } from '@/config/contracts';

const NFT_MARKETPLACE_ABI = [
  // Read functions
  "function getListing(uint256 listingId) view returns (tuple(uint256 listingId, address seller, address nftContract, uint256 tokenId, uint256 price, bool active, uint256 createdAt))",
  "function getActiveListings(uint256 startIndex, uint256 count) view returns (uint256[])",
  
  // Write functions
  "function listTicketForSale(address nftContract, uint256 tokenId, uint256 price, uint256 royaltyPercentage, address royaltyRecipient) returns (uint256)",
  "function buyListing(uint256 listingId) payable",
  "function cancelListing(uint256 listingId)",
  
  // Events
  "event TicketListed(uint256 indexed listingId, address indexed seller, address indexed nftContract, uint256 tokenId, uint256 price)",
  "event ListingSold(uint256 indexed listingId, address indexed buyer, uint256 price, uint256 platformFee, uint256 royaltyFee)",
];

export interface Listing {
  listingId: number;
  seller: string;
  nftContract: string;
  tokenId: number;
  price: string;
  active: boolean;
  createdAt: number;
}

export class NFTMarketplaceService {
  private contract: ethers.Contract | null = null;

  async initialize(signer: ethers.Signer) {
    const contracts = getContracts();
    this.contract = new ethers.Contract(
      contracts.NFTMarketplace,
      NFT_MARKETPLACE_ABI,
      signer
    );
    return this;
  }

  getReadContract(provider: ethers.Provider) {
    const contracts = getContracts();
    return new ethers.Contract(
      contracts.NFTMarketplace,
      NFT_MARKETPLACE_ABI,
      provider
    );
  }

  // ==================== WRITE FUNCTIONS ====================

  async listTicket(
    nftContract: string,
    tokenId: number,
    price: bigint,
    royaltyPercentage: number = 0,
    royaltyRecipient: string = ethers.ZeroAddress
  ) {
    if (!this.contract) throw new Error('Contract not initialized');
    
    const tx = await this.contract.listTicketForSale(
      nftContract,
      tokenId,
      price,
      royaltyPercentage,
      royaltyRecipient
    );
    const receipt = await tx.wait();

    return {
      transactionHash: receipt.hash,
      success: receipt.status === 1,
    };
  }

  async buyListing(listingId: number, price: bigint) {
    if (!this.contract) throw new Error('Contract not initialized');
    
    const tx = await this.contract.buyListing(listingId, { value: price });
    const receipt = await tx.wait();

    return {
      transactionHash: receipt.hash,
      success: receipt.status === 1,
    };
  }

  async cancelListing(listingId: number) {
    if (!this.contract) throw new Error('Contract not initialized');
    
    const tx = await this.contract.cancelListing(listingId);
    const receipt = await tx.wait();

    return {
      transactionHash: receipt.hash,
      success: receipt.status === 1,
    };
  }

  // ==================== READ FUNCTIONS ====================

  async getListing(listingId: number, provider: ethers.Provider): Promise<Listing> {
    const contract = this.getReadContract(provider);
    const listing = await contract.getListing(listingId);

    return {
      listingId: Number(listing.listingId),
      seller: listing.seller,
      nftContract: listing.nftContract,
      tokenId: Number(listing.tokenId),
      price: listing.price.toString(),
      active: listing.active,
      createdAt: Number(listing.createdAt),
    };
  }

  async getActiveListings(
    startIndex: number,
    count: number,
    provider: ethers.Provider
  ): Promise<number[]> {
    const contract = this.getReadContract(provider);
    const listings = await contract.getActiveListings(startIndex, count);
    return listings.map((id: any) => Number(id));
  }
}

export const nftMarketplaceService = new NFTMarketplaceService();
