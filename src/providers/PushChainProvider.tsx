/**
 * Push Chain Universal Wallet Provider
 * Enables cross-chain transactions and universal wallet support
 * Users can pay with any token from any supported blockchain
 */

import React from 'react';
import {
  PushUI,
  PushUniversalWalletProvider,
  type AppMetadata,
  type ProviderConfigProps,
} from "@pushchain/ui-kit";

// Logo data - replace with your actual logo
const INTIC_LOGO_BASE64 = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Q1NDhlYyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjgwIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+aW50aWM8L3RleHQ+PC9zdmc+";

interface PushChainProvidersProps {
  children: React.ReactNode;
}

/**
 * PushChainProviders Component
 *
 * Wraps the application with Push Chain's Universal Wallet Provider
 * Enables cross-chain transactions and multi-wallet support
 *
 * Configuration:
 * - network: TESTNET for development, MAINNET for production
 * - login: Email, Google OAuth, and wallet connection support
 * - chainConfig: Custom RPC endpoints for supported chains
 */
const PushChainProviders: React.FC<PushChainProvidersProps> = ({ children }) => {
  const walletConfig: ProviderConfigProps = {
    // Network selection: MAINNET for production, TESTNET for development
    network: PushUI.CONSTANTS.PUSH_NETWORK.TESTNET,

    // Login options - enable/disable authentication methods
    login: {
      email: true, // Allow email authentication
      google: true, // Allow Google OAuth
      wallet: {
        enabled: true, // Allow wallet connection (MetaMask, WalletConnect, etc.)
      },
      appPreview: true, // Show app preview in login modal
    },

    // Modal UI customization
    modal: {
      // Layout: SPLIT (side-by-side) or STACKED (vertical)
      loginLayout: PushUI.CONSTANTS.LOGIN.LAYOUT.SPLIT,

      // Connected wallet display: HOVER (on hover) or FULL (always visible)
      connectedLayout: PushUI.CONSTANTS.CONNECTED.LAYOUT.HOVER,

      // Show app preview in modals
      appPreview: true,

      // Background interaction when modal is open: BLUR or NONE
      connectedInteraction: PushUI.CONSTANTS.CONNECTED.INTERACTION.BLUR,
    },

    // Chain configuration - add custom RPC endpoints here
    chainConfig: {
      rpcUrls: {
        // Push Chain Testnet
        "eip155:50311": [
          "https://evm.rpc-testnet-donut-node1.push.org/",
        ],

        // Ethereum Sepolia testnet
        "eip155:11155111": [
          "https://sepolia.gateway.tenderly.co/",
          "https://rpc.sepolia.org",
        ],

        // Polygon Mumbai testnet
        "eip155:80001": [
          "https://rpc-mumbai.maticvigil.com/",
        ],

        // Solana Push Devnet
        "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1": [
          "https://api.devnet.solana.com",
        ],

        // Solana Devnet (standard)
        "solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z": [
          "https://api.devnet.solana.com",
        ],
      },
    },
  };

  const appMetadata: AppMetadata = {
    // App logo (using base64 for better compatibility)
    logoUrl: INTIC_LOGO_BASE64,

    // App display name
    title: "intic",

    // Brief description shown in wallet connection prompts
    description:
      "Universal Event Ticketing Platform - Create, manage, and sell event tickets as NFTs. Accept payments from any blockchain.",
  };

  return (
    <PushUniversalWalletProvider
      config={walletConfig}
      app={appMetadata}
      themeOverrides={{
        // Dark theme overrides - customize to match your app's design
        '--pw-core-bg-primary-color': '#0A0A0A',
        '--pw-core-bg-secondary-color': '#1A1A1A',
        '--pw-core-bg-tertiary-color': '#2D2D2D',
        '--pw-core-text-primary-color': '#FFFFFF',
        '--pw-core-text-secondary-color': '#A3A3A3',
        '--pw-core-text-tertiary-color': '#737373',
        // @ts-expect-error - Push Wallet types incomplete
        '--pw-core-border-primary-color': '#404040',
        '--pw-core-border-secondary-color': '#262626',
        '--pw-core-btn-primary-bg-color': '#d548ec', // intic brand color
        '--pw-core-btn-primary-text-color': '#FFFFFF',
        '--pw-core-btn-secondary-bg-color': '#374151',
        '--pw-core-btn-secondary-text-color': '#FFFFFF',
        '--pw-core-btn-border-radius': '12px',
        '--pw-core-font-family': 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        '--pw-core-shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.5)',
        '--pw-core-shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.6)',
        '--pw-core-shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.7)',
        '--pw-core-modal-bg-color': 'rgba(0, 0, 0, 0.8)',
        '--pw-core-card-bg-color': '#1A1A1A',
        '--pw-core-card-border-color': '#404040',
        '--pw-core-input-bg-color': '#2D2D2D',
        '--pw-core-input-border-color': '#404040',
        '--pw-core-input-text-color': '#FFFFFF',
        '--pw-core-success-color': '#10B981',
        '--pw-core-error-color': '#EF4444',
        '--pw-core-warning-color': '#F59E0B',
        '--pw-core-info-color': '#3B82F6',
      }}
    >
      {children}
    </PushUniversalWalletProvider>
  );
};

export { PushChainProviders };
