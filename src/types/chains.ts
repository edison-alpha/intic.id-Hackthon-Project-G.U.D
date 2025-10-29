/**
 * Universal Chain Support Configuration
 * Based on Push Chain Universal Wallet implementation
 * Supports EVM chains and Solana
 */

export interface SupportedChain {
  id: string; // Format: "eip155:chainId" for EVM, "solana:genesisHash" for Solana
  name: string;
  symbol: string;
  icon: string;
  type: "evm" | "solana";
  testnet?: boolean;
  rpcUrl?: string;
  blockExplorer?: string;
}

export const SUPPORTED_CHAINS: SupportedChain[] = [
  // Push Chain (Primary - Testnet)
  {
    id: "eip155:50311",
    name: "Push Chain Testnet",
    symbol: "PC",
    icon: "pushchain",
    type: "evm",
    testnet: true,
    rpcUrl: "https://evm.rpc-testnet-donut-node1.push.org/",
    blockExplorer: "https://donut.push.network/",
  },

  // Ethereum
  {
    id: "eip155:1",
    name: "Ethereum",
    symbol: "ETH",
    icon: "ethereum",
    type: "evm",
    blockExplorer: "https://etherscan.io/",
  },
  {
    id: "eip155:11155111",
    name: "Ethereum Sepolia",
    symbol: "ETH",
    icon: "ethereum",
    type: "evm",
    testnet: true,
    blockExplorer: "https://sepolia.etherscan.io/",
  },

  // Polygon
  {
    id: "eip155:137",
    name: "Polygon",
    symbol: "MATIC",
    icon: "polygon",
    type: "evm",
    blockExplorer: "https://polygonscan.com/",
  },
  {
    id: "eip155:80001",
    name: "Polygon Mumbai",
    symbol: "MATIC",
    icon: "polygon",
    type: "evm",
    testnet: true,
    blockExplorer: "https://mumbai.polygonscan.com/",
  },

  // Arbitrum
  {
    id: "eip155:42161",
    name: "Arbitrum One",
    symbol: "ETH",
    icon: "arbitrum",
    type: "evm",
    blockExplorer: "https://arbiscan.io/",
  },
  {
    id: "eip155:421614",
    name: "Arbitrum Sepolia",
    symbol: "ETH",
    icon: "arbitrum",
    type: "evm",
    testnet: true,
    blockExplorer: "https://sepolia.arbiscan.io/",
  },

  // Optimism
  {
    id: "eip155:10",
    name: "Optimism",
    symbol: "ETH",
    icon: "optimism",
    type: "evm",
    blockExplorer: "https://optimistic.etherscan.io/",
  },
  {
    id: "eip155:11155420",
    name: "Optimism Sepolia",
    symbol: "ETH",
    icon: "optimism",
    type: "evm",
    testnet: true,
    blockExplorer: "https://sepolia-optimism.etherscan.io/",
  },

  // BNB Smart Chain
  {
    id: "eip155:56",
    name: "BNB Smart Chain",
    symbol: "BNB",
    icon: "bnb",
    type: "evm",
    blockExplorer: "https://bscscan.com/",
  },
  {
    id: "eip155:97",
    name: "BNB Testnet",
    symbol: "BNB",
    icon: "bnb",
    type: "evm",
    testnet: true,
    blockExplorer: "https://testnet.bscscan.com/",
  },

  // Base
  {
    id: "eip155:8453",
    name: "Base",
    symbol: "ETH",
    icon: "base",
    type: "evm",
    blockExplorer: "https://basescan.org/",
  },
  {
    id: "eip155:84532",
    name: "Base Sepolia",
    symbol: "ETH",
    icon: "base",
    type: "evm",
    testnet: true,
    blockExplorer: "https://sepolia.basescan.org/",
  },

  // Avalanche
  {
    id: "eip155:43114",
    name: "Avalanche",
    symbol: "AVAX",
    icon: "avalanche",
    type: "evm",
    blockExplorer: "https://snowtrace.io/",
  },
  {
    id: "eip155:43113",
    name: "Avalanche Fuji",
    symbol: "AVAX",
    icon: "avalanche",
    type: "evm",
    testnet: true,
    blockExplorer: "https://testnet.snowtrace.io/",
  },

  // Solana
  {
    id: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    name: "Solana",
    symbol: "SOL",
    icon: "solana",
    type: "solana",
    blockExplorer: "https://explorer.solana.com/",
  },
  {
    id: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
    name: "Solana Devnet (Push)",
    symbol: "SOL",
    icon: "solana",
    type: "solana",
    testnet: true,
    blockExplorer: "https://explorer.solana.com/?cluster=devnet",
  },
  {
    id: "solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z",
    name: "Solana Devnet (Standard)",
    symbol: "SOL",
    icon: "solana",
    type: "solana",
    testnet: true,
    blockExplorer: "https://explorer.solana.com/?cluster=devnet",
  },
];

// Helper function to get chain by ID
export const getChainById = (chainId: string): SupportedChain | undefined => {
  return SUPPORTED_CHAINS.find((chain) => chain.id === chainId);
};

// Helper function to get mainnet chains only
export const getMainnetChains = (): SupportedChain[] => {
  return SUPPORTED_CHAINS.filter((chain) => !chain.testnet);
};

// Helper function to get testnet chains only
export const getTestnetChains = (): SupportedChain[] => {
  return SUPPORTED_CHAINS.filter((chain) => chain.testnet);
};

// Helper function to get EVM chains only
export const getEVMChains = (): SupportedChain[] => {
  return SUPPORTED_CHAINS.filter((chain) => chain.type === "evm");
};

// Helper function to get Solana chains only
export const getSolanaChains = (): SupportedChain[] => {
  return SUPPORTED_CHAINS.filter((chain) => chain.type === "solana");
};

// Default chain for development (Push Chain Testnet)
export const DEFAULT_CHAIN = "eip155:50311";

// Helper to convert numeric chain ID to CAIP-2 format
export const toCAIP2ChainId = (chainId: number): string => {
  return `eip155:${chainId}`;
};

// Helper to extract numeric chain ID from CAIP-2 format
export const fromCAIP2ChainId = (caip2Id: string): number | null => {
  const match = caip2Id.match(/^eip155:(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
};

// Helper to get block explorer URL for transaction
export const getTransactionUrl = (chainId: string, txHash: string): string => {
  const chain = getChainById(chainId);
  if (!chain?.blockExplorer) return "";
  return `${chain.blockExplorer}/tx/${txHash}`;
};

// Helper to get block explorer URL for address
export const getAddressUrl = (chainId: string, address: string): string => {
  const chain = getChainById(chainId);
  if (!chain?.blockExplorer) return "";
  return `${chain.blockExplorer}/address/${address}`;
};
