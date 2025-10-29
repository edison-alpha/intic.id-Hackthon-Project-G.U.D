/**
 * Hook for ticket refund functionality
 * Handles checking refund eligibility and claiming refunds
 */

import { useState, useCallback } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import EventTicketABI from '@/contracts/EventTicket.json';
import { usePushChainWallet } from './usePushChainWallet';

interface RefundInfo {
  isEligible: boolean;
  refundAmount: string;
  ticketCount: number;
  hasClaimed: boolean;
  eventCancelled: boolean;
}

export function useTicketRefund(ticketContractAddress: string) {
  const { address } = usePushChainWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRefundInfo = useCallback(async (): Promise<RefundInfo | null> => {
    if (!address || !ticketContractAddress) {
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      const provider = new BrowserProvider(window.ethereum as any);
      const contract = new Contract(ticketContractAddress, EventTicketABI.abi, provider);

      // Get refund info from contract
      const refundInfo = await contract.getRefundInfo(address);
      
      return {
        isEligible: refundInfo.isEligible,
        refundAmount: refundInfo.refundAmount.toString(),
        ticketCount: Number(refundInfo.ticketCount),
        hasClaimed: refundInfo.hasClaimed,
        eventCancelled: refundInfo.refundsEnabled,
      };
    } catch (err: any) {
      console.error('Error getting refund info:', err);
      setError(err.message || 'Failed to get refund info');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [address, ticketContractAddress]);

  const claimRefund = useCallback(async (): Promise<boolean> => {
    if (!address || !ticketContractAddress) {
      setError('Wallet not connected');
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      const provider = new BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const contract = new Contract(ticketContractAddress, EventTicketABI.abi, signer);

      console.log('🔄 Claiming refund...');
      const tx = await contract.claimRefund();
      
      console.log('⏳ Waiting for transaction confirmation...');
      const receipt = await tx.wait();
      
      console.log('✅ Refund claimed successfully!', receipt);
      return true;
    } catch (err: any) {
      console.error('Error claiming refund:', err);
      
      // Parse error message
      let errorMessage = 'Failed to claim refund';
      if (err.message.includes('Refunds not enabled')) {
        errorMessage = 'Refunds are not enabled for this event';
      } else if (err.message.includes('No tickets to refund')) {
        errorMessage = 'You do not own any tickets for this event';
      } else if (err.message.includes('Already claimed refund')) {
        errorMessage = 'You have already claimed your refund';
      } else if (err.message.includes('user rejected')) {
        errorMessage = 'Transaction cancelled by user';
      }
      
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [address, ticketContractAddress]);

  return {
    getRefundInfo,
    claimRefund,
    isLoading,
    error,
  };
}
