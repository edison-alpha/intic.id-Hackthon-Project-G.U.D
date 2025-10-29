/**
 * wagmi Configuration for Push Chain
 * Used for reading contract data
 */

import { http, createConfig } from 'wagmi';
import { defineChain } from 'viem';

// Define Push Chain Donut Testnet
export const pushChainTestnet = defineChain({
  id: 42101,
  name: 'Push Chain Donut Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Push Chain',
    symbol: 'PC',
  },
  rpcUrls: {
    default: {
      http: ['https://evm.rpc-testnet-donut-node1.push.org/'],
    },
    public: {
      http: ['https://evm.rpc-testnet-donut-node1.push.org/'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Push Scan',
      url: 'https://donut.push.network',
    },
  },
  testnet: true,
});

// Create wagmi config
export const wagmiConfig = createConfig({
  chains: [pushChainTestnet],
  transports: {
    [pushChainTestnet.id]: http(),
  },
});

// Helper functions
export function getChainName(chainId: number): string {
  return chainId === 42101 ? 'Push Chain Donut Testnet' : `Chain ${chainId}`;
}

export function getBlockExplorerUrl(chainId: number): string {
  return chainId === 42101 ? 'https://donut.push.network' : '';
}

export function getTransactionUrl(chainId: number, txHash: string): string {
  const baseUrl = getBlockExplorerUrl(chainId);
  return baseUrl ? `${baseUrl}/tx/${txHash}` : '';
}

export function getAddressUrl(chainId: number, address: string): string {
  const baseUrl = getBlockExplorerUrl(chainId);
  return baseUrl ? `${baseUrl}/address/${address}` : '';
}
