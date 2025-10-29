/**
 * Universal Contract Hooks
 * Cross-chain transaction utilities using Push Chain Universal Wallet
 * Enables users to execute transactions from any supported blockchain
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { usePushChainClient, usePushChain } from "@pushchain/ui-kit";

interface UniversalTransactionParams {
  to: string;
  data: string;
  value?: bigint | string;
  chainId?: string; // CAIP-2 format: "eip155:1" or "solana:5eykt..."
}

interface UniversalTransactionResult {
  transactionHash: string;
  blockNumber?: number;
  from: string;
  to: string;
  wait: () => Promise<any>;
}

/**
 * Hook for executing universal cross-chain transactions
 * Users can pay from any supported chain (ETH, Polygon, Solana, etc.)
 * Automatically converts and settles on destination chain (Push Chain)
 */
export function useUniversalTransaction() {
  const [isPending, setIsPending] = useState(false);
  const { pushChainClient } = usePushChainClient();
  const { PushChain } = usePushChain();

  const sendTransaction = async (
    params: UniversalTransactionParams
  ): Promise<UniversalTransactionResult> => {
    if (!pushChainClient || !PushChain) {
      throw new Error("Push Chain client not initialized. Please connect wallet first.");
    }

    setIsPending(true);

    try {
      // Execute universal transaction
      // This handles:
      // 1. User approval on source chain
      // 2. Token swap if needed
      // 3. Cross-chain bridge
      // 4. Execution on destination chain (Push Chain)
      const tx = await pushChainClient.universal.sendTransaction({
        to: params.to,
        data: params.data,
        value: params.value || 0n,
        // chainId is optional - if not provided, uses connected chain
      });

      // Wait for transaction confirmation
      await tx.wait();

      toast.success('Transaction successful!');

      return tx;
    } catch (error: any) {
      console.error('Universal transaction failed:', error);

      // Handle user rejection
      if (error.message?.includes('rejected') || error.message?.includes('denied')) {
        toast.error('Transaction rejected by user');
        throw new Error('Transaction rejected by user');
      }

      // Handle insufficient funds
      if (error.message?.includes('insufficient funds')) {
        toast.error('Insufficient balance for transaction');
        throw new Error('Insufficient balance for transaction');
      }

      // Generic error
      toast.error(error.message || 'Transaction failed');
      throw error;
    } finally {
      setIsPending(false);
    }
  };

  return { sendTransaction, isPending };
}

/**
 * Hook for encoding contract function calls
 * Compatible with Push Chain's universal transaction system
 */
export function useEncodeFunction() {
  const { PushChain } = usePushChain();

  const encodeFunction = (
    abi: any[],
    functionName: string,
    args: any[]
  ): string => {
    if (!PushChain) {
      throw new Error("Push Chain not initialized");
    }

    return PushChain.utils.helpers.encodeTxData({
      abi: Array.from(abi),
      functionName,
      args,
    });
  };

  return { encodeFunction };
}

/**
 * Hook for getting wallet connection status and info
 */
export function useUniversalWallet() {
  // Note: usePushWalletContext can be imported if needed
  // For now, returning basic structure
  return {
    isConnected: false,
    address: null,
    chainId: null,
    balance: null,
    connectionStatus: 'disconnected' as const,
  };
}

/**
 * Helper function to convert value to bigint
 */
export function parseValue(value: string | number | bigint, decimals: number = 18): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') {
    return BigInt(Math.floor(value * Math.pow(10, decimals)));
  }
  // String - parse as decimal
  const parts = value.split('.');
  const wholePart = parts[0] || '0';
  const fracPart = (parts[1] || '').padEnd(decimals, '0').slice(0, decimals);
  return BigInt(wholePart + fracPart);
}

/**
 * Helper function to format bigint value to human-readable string
 */
export function formatValue(value: bigint, decimals: number = 18, precision: number = 4): string {
  const divisor = BigInt(Math.pow(10, decimals));
  const wholePart = value / divisor;
  const fracPart = value % divisor;

  if (fracPart === 0n) {
    return wholePart.toString();
  }

  const fracStr = fracPart.toString().padStart(decimals, '0');
  const trimmedFrac = fracStr.slice(0, precision).replace(/0+$/, '');

  if (trimmedFrac === '') {
    return wholePart.toString();
  }

  return `${wholePart}.${trimmedFrac}`;
}

export type { UniversalTransactionParams, UniversalTransactionResult };
