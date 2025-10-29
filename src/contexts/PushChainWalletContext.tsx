import React, { ReactNode } from 'react';
import {
  PushUniversalWalletProvider,
  PushUI,
} from '@pushchain/ui-kit';

interface PushChainWalletProviderProps {
  children: ReactNode;
}

export const PushChainWalletProvider: React.FC<PushChainWalletProviderProps> = ({ children }) => {
  const walletConfig = {
    network: PushUI.CONSTANTS.PUSH_NETWORK.TESTNET,
    login: {
      email: true,
      google: true,
      wallet: {
        enabled: true,
      },
      appPreview: true,
    },
    modal: {
      loginLayout: PushUI.CONSTANTS.LOGIN.LAYOUT.SPLIT,
      connectedLayout: PushUI.CONSTANTS.CONNECTED.LAYOUT.HOVER,
      appPreview: true,
    },
  };

  const appMetadata = {
    logoUrl:
      'https://plus.unsplash.com/premium_photo-1746731481770-08b2f71661d0?q=80&w=2671&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: 'Intic - Event Ticketing Platform',
    description: 'Decentralized event ticketing platform powered by blockchain NFT technology',
  };

  return (
    <PushUniversalWalletProvider config={walletConfig} app={appMetadata}>
      {children}
    </PushUniversalWalletProvider>
  );
};
