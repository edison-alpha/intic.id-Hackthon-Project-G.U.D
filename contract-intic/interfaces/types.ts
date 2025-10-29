// Interface definitions for integration with frontend
// This file contains TypeScript interfaces matching the smart contract structures

export interface ContractAddresses {
  HiBeatsToken: string;
  HiBeatsNFT: string;
  HiBeatsMarketplace: string;
  HiBeatsRoyalties: string;
  HiBeatsFactory: string;
}

export interface TrackInfo {
  sunoId: string;
  genre: string;
  duration: number;
  creator: string;
  createdAt: number;
  modelUsed: string;
  isRemixable: boolean;
  royaltyRate: number;
}

export interface GenerationRequest {
  requester: string;
  prompt: string;
  style: string;
  isCustomMode: boolean;
  isInstrumental: boolean;
  model: string;
  timestamp: number;
  isProcessed: boolean;
  callbackUrl: string;
}

export interface SunoCallbackData {
  taskId: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  sunoIds: string[];
  audioUrls: string[];
  imageUrls: string[];
  titles: string[];
  tags: string[];
  durations: number[];
  errorMessage: string;
}

export interface Listing {
  seller: string;
  price: string;
  isBeatsToken: boolean;
  isActive: boolean;
  listedAt: number;
}

export interface Auction {
  seller: string;
  startPrice: string;
  currentBid: string;
  currentBidder: string;
  isBeatsToken: boolean;
  endTime: number;
  isActive: boolean;
}

export interface Offer {
  buyer: string;
  amount: string;
  isBeatsToken: boolean;
  expiresAt: number;
  isActive: boolean;
}

export interface UserStats {
  totalGenerations: number;
  successfulGenerations: number;
  todayGenerations: number;
  remainingGenerations: number;
  isPremium: boolean;
}

export interface RoyaltyInfo {
  totalPending: string;
  totalClaimed: string;
  streamingRoyalties: string;
  salesRoyalties: string;
  remixRoyalties: string;
}

export enum RevenueSource {
  STREAMING = 0,
  MARKETPLACE_SALES = 1,
  REMIX_USAGE = 2,
  PLATFORM_FEES = 3
}

// Smart Contract ABIs (simplified for key functions)
export const HIBEATS_TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address, uint256) returns (bool)",
  "function allowance(address, address) view returns (uint256)",
  "function approve(address, uint256) returns (bool)",
  "function transferFrom(address, address, uint256) returns (bool)",
  "function mintForRewards(address, uint256)",
  "function mintForRoyalties(address, uint256)",
  "function remainingSupply() view returns (uint256)"
];

export const HIBEATS_NFT_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function tokenURI(uint256) view returns (string)",
  "function ownerOf(uint256) view returns (address)",
  "function balanceOf(address) view returns (uint256)",
  "function approve(address, uint256)",
  "function getApproved(uint256) view returns (address)",
  "function setApprovalForAll(address, bool)",
  "function isApprovedForAll(address, address) view returns (bool)",
  "function transferFrom(address, address, uint256)",
  "function safeTransferFrom(address, address, uint256)",
  "function mintTrack(address, string, string, string, uint256, string, bool, uint256) payable",
  "function getTrackInfo(uint256) view returns (tuple(string, string, uint256, address, uint256, string, bool, uint256))",
  "function getTokenIdBySunoId(string) view returns (uint256)",
  "function trackExists(string) view returns (bool)",
  "function totalSupply() view returns (uint256)",
  "function mintingFee() view returns (uint256)"
];

export const HIBEATS_MARKETPLACE_ABI = [
  "function listToken(uint256, uint256, bool)",
  "function buyToken(uint256) payable",
  "function cancelListing(uint256)",
  "function createAuction(uint256, uint256, uint256, bool)",
  "function placeBid(uint256, uint256) payable",
  "function endAuction(uint256)",
  "function makeOffer(uint256, uint256, bool, uint256) payable",
  "function acceptOffer(uint256, uint256)",
  "function cancelOffer(uint256, uint256)",
  "function listings(uint256) view returns (tuple(address, uint256, bool, bool, uint256))",
  "function auctions(uint256) view returns (tuple(address, uint256, uint256, address, bool, uint256, bool))",
  "function getActiveOffersCount(uint256) view returns (uint256)",
  "function platformFeeRate() view returns (uint256)"
];

export const HIBEATS_ROYALTIES_ABI = [
  "function recordStreaming(uint256, address, uint256)",
  "function addRevenue(uint256, uint8, uint256)",
  "function claimRoyalties(uint8)",
  "function claimAllRoyalties()",
  "function getPendingRoyalties(address, uint8) view returns (uint256)",
  "function getTotalPendingRoyalties(address) view returns (uint256)",
  "function hasActivePremium(address) view returns (bool)",
  "function userStreamingMinutes(address) view returns (uint256)",
  "function trackStreamingMinutes(uint256) view returns (uint256)",
  "function totalCreatorEarnings(address) view returns (uint256)",
  "function trackTotalEarnings(uint256) view returns (uint256)",
  "function streamingRatePerMinute() view returns (uint256)"
];

export const HIBEATS_FACTORY_ABI = [
  "function requestGeneration(string, string, string, bool, bool, string, string) payable",
  "function setPremiumUser(address, bool)",
  "function getRemainingGenerations(address) view returns (uint256)",
  "function getUserStats(address) view returns (tuple(uint256, uint256, uint256, uint256, bool))",
  "function generationRequests(string) view returns (tuple(address, string, string, bool, bool, string, uint256, bool, string))",
  "function totalGenerations(address) view returns (uint256)",
  "function successfulGenerations(address) view returns (uint256)",
  "function premiumUsers(address) view returns (bool)",
  "function generationReward() view returns (uint256)",
  "function premiumGenerationReward() view returns (uint256)"
];

// Contract deployment configuration
export const SOMNIA_CONFIG = {
  testnet: {
    chainId: 50311,
    rpcUrl: "https://testnet.somnia.network",
    blockExplorer: "https://testnet.somnia.network",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18
    }
  },
  mainnet: {
    chainId: 2648,
    rpcUrl: "https://mainnet.somnia.network", 
    blockExplorer: "https://somnia.network",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH", 
      decimals: 18
    }
  }
};

// Helper functions for contract interaction
export const CONTRACT_HELPERS = {
  // Convert wei to ether string
  formatEther: (wei: string): string => {
    return (parseFloat(wei) / 1e18).toFixed(4);
  },
  
  // Convert ether to wei string
  parseEther: (ether: string): string => {
    return (parseFloat(ether) * 1e18).toString();
  },
  
  // Format duration from seconds to mm:ss
  formatDuration: (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },
  
  // Calculate royalty amount
  calculateRoyalty: (price: string, rate: number): string => {
    const priceNum = parseFloat(price);
    const royalty = (priceNum * rate) / 10000;
    return royalty.toString();
  },
  
  // Generate IPFS URL
  generateIPFSUrl: (hash: string, gateway = "https://gateway.pinata.cloud"): string => {
    return `${gateway}/ipfs/${hash}`;
  }
};
