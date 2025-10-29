import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { toast } from 'sonner';
import EventTicketABI from '@/contracts/EventTicket.json';

export interface FraudProtectionInfo {
  reportCount: number;
  threshold: number;
  emergencyActive: boolean;
  fundsUnlockTime: number;
  canWithdraw: boolean;
  timeUntilUnlock?: number;
}

export interface UseFraudProtectionResult {
  fraudInfo: FraudProtectionInfo | null;
  isLoading: boolean;
  hasReported: boolean;
  reportFraud: () => Promise<void>;
  claimEmergencyRefund: () => Promise<void>;
  refreshFraudInfo: () => Promise<void>;
}

/**
 * Hook untuk fraud protection features
 * - Fetch fraud protection info (report count, threshold, emergency status)
 * - Report fraud jika event tidak terjadi meski sudah check-in
 * - Claim emergency refund untuk used tickets
 */
export const useFraudProtection = (
  contractAddress: string,
  userAddress?: string
): UseFraudProtectionResult => {
  const [fraudInfo, setFraudInfo] = useState<FraudProtectionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasReported, setHasReported] = useState(false);

  // Fetch fraud protection info dari smart contract
  const fetchFraudInfo = useCallback(async () => {
    if (!contractAddress) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(
        contractAddress,
        EventTicketABI.abi,
        provider
      );

      // Call getFraudProtectionInfo()
      const result = await contract.getFraudProtectionInfo?.();
      if (!result) return;

      const [reportCount, threshold, emergencyActive, fundsUnlock, canWithdraw] = result;

      const now = Math.floor(Date.now() / 1000);
      const unlockTime = Number(fundsUnlock);
      const timeUntilUnlock = unlockTime > now ? unlockTime - now : 0;

      setFraudInfo({
        reportCount: Number(reportCount),
        threshold: Number(threshold),
        emergencyActive,
        fundsUnlockTime: unlockTime,
        canWithdraw,
        timeUntilUnlock,
      });

      // Check if user already reported
      if (userAddress) {
        const reported = await contract.hasReportedFraud?.(userAddress);
        setHasReported(reported || false);
      }
    } catch (error) {
      console.error('Error fetching fraud info:', error);
    } finally {
      setIsLoading(false);
    }
  }, [contractAddress, userAddress]);

  // Report fraud
  const reportFraud = useCallback(async () => {
    if (!contractAddress || !window.ethereum) {
      toast.error('Wallet not connected');
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        contractAddress,
        EventTicketABI.abi,
        signer
      );

      toast.loading('Reporting fraud...');

      const tx = await contract.reportFraud?.();
      if (!tx) {
        toast.dismiss();
        toast.error('Contract method not available');
        return;
      }
      await tx.wait();

      toast.dismiss();
      toast.success('Fraud reported successfully!');

      // Refresh info
      await fetchFraudInfo();
    } catch (error: any) {
      toast.dismiss();
      
      if (error.code === 'ACTION_REJECTED') {
        toast.error('Transaction cancelled');
      } else if (error.message?.includes('AlreadyReportedFraud')) {
        toast.error('You have already reported this event as fraud');
      } else if (error.message?.includes('NoTicketsOwned')) {
        toast.error('You must own tickets to report fraud');
      } else {
        console.error('Report fraud error:', error);
        toast.error('Failed to report fraud: ' + (error.reason || error.message));
      }
    }
  }, [contractAddress, fetchFraudInfo]);

  // Claim emergency refund (including used tickets)
  const claimEmergencyRefund = useCallback(async () => {
    if (!contractAddress || !window.ethereum) {
      toast.error('Wallet not connected');
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        contractAddress,
        EventTicketABI.abi,
        signer
      );

      toast.loading('Processing emergency refund...');

      const tx = await contract.claimEmergencyRefund?.();
      if (!tx) {
        toast.dismiss();
        toast.error('Contract method not available');
        return;
      }
      const receipt = await tx.wait();

      toast.dismiss();

      // Parse EmergencyRefundClaimed event
      const refundEvent = receipt.logs
        .map((log: any) => {
          try {
            return contract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((event: any) => event?.name === 'EmergencyRefundClaimed');

      if (refundEvent) {
        const amount = ethers.formatEther(refundEvent.args[1]);
        const ticketCount = refundEvent.args[2].length;
        toast.success(
          `Emergency refund successful! ${amount} PC refunded for ${ticketCount} ticket(s) (including used tickets)`
        );
      } else {
        toast.success('Emergency refund processed successfully!');
      }

      // Refresh info
      await fetchFraudInfo();
    } catch (error: any) {
      toast.dismiss();
      
      if (error.code === 'ACTION_REJECTED') {
        toast.error('Transaction cancelled');
      } else if (error.message?.includes('EmergencyRefundNotEnabled')) {
        toast.error('Emergency refund not activated yet. More users need to report fraud.');
      } else if (error.message?.includes('NoTicketsOwned')) {
        toast.error('You do not own any tickets');
      } else if (error.message?.includes('TicketAlreadyRefunded')) {
        toast.error('All your tickets have already been refunded');
      } else {
        console.error('Emergency refund error:', error);
        toast.error('Failed to claim emergency refund: ' + (error.reason || error.message));
      }
    }
  }, [contractAddress, fetchFraudInfo]);

  // Initial load
  useEffect(() => {
    fetchFraudInfo();
  }, [fetchFraudInfo]);

  return {
    fraudInfo,
    isLoading,
    hasReported,
    reportFraud,
    claimEmergencyRefund,
    refreshFraudInfo: fetchFraudInfo,
  };
};
