/**
 * Custom Hook for EO Registration Check using UEA
 * This hook properly checks EO registration using Universal Executor Account (UEA)
 * which is required for Push Chain Universal Wallet
 */

import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { usePushChainClient } from '@pushchain/ui-kit';
import { CONTRACTS } from '@/config/contracts';
import EventOrganizerArtifact from '@/contracts/EventOrganizer.json';

interface UseEORegistrationResult {
  isRegistered: boolean;
  isLoading: boolean;
  ueaAddress: string | null;
  originalAddress: string | null;
  refetch: () => Promise<any>;
}

/**
 * Hook to check if current wallet is registered as Event Organizer
 * Checks BOTH UEA address AND original address for maximum compatibility
 */
export const useEORegistration = (walletAddress?: string): UseEORegistrationResult => {
  const [ueaAddress, setUeaAddress] = useState<string | null>(null);
  const [isLoadingUEA, setIsLoadingUEA] = useState(false);
  const { pushChainClient } = usePushChainClient();

  // Fetch UEA address when wallet connects
  useEffect(() => {
    const fetchUEA = async () => {
      if (!pushChainClient || !walletAddress) {
        setUeaAddress(null);
        return;
      }

      setIsLoadingUEA(true);
      try {
        // Get UEA address from Push Chain client
        // Try multiple ways to get the address
        let uea = null;

        if (pushChainClient.account?.address) {
          uea = pushChainClient.account.address;
        } else if (pushChainClient.address) {
          uea = pushChainClient.address;
        } else if (typeof pushChainClient.getAddress === 'function') {
          uea = await pushChainClient.getAddress();
        }

        if (uea) {
          console.log('🔑 Original Address:', walletAddress);
          console.log('🔑 UEA Address (Push Chain):', uea);
          setUeaAddress(uea);
        } else {
          console.warn('⚠️ Could not fetch UEA address, using wallet address as fallback');
          setUeaAddress(walletAddress);
        }
      } catch (error) {
        console.error('❌ Error fetching UEA:', error);
        // Fallback to wallet address if UEA fetch fails
        setUeaAddress(walletAddress);
      } finally {
        setIsLoadingUEA(false);
      }
    };

    fetchUEA();
  }, [pushChainClient, walletAddress]);

  // Check with UEA address
  const {
    data: isRegisteredWithUEA,
    isLoading: isLoadingUEA_Check,
    refetch: refetchUEA
  } = useReadContract({
    address: CONTRACTS.testnet.EventOrganizer as `0x${string}`,
    abi: EventOrganizerArtifact.abi,
    functionName: 'organizerExists',
    args: ueaAddress ? [ueaAddress] : undefined,
    query: {
      enabled: !!ueaAddress,
    }
  });

  // Check with original wallet address (for backward compatibility)
  const {
    data: isRegisteredWithOriginal,
    isLoading: isLoadingOriginal_Check,
    refetch: refetchOriginal
  } = useReadContract({
    address: CONTRACTS.testnet.EventOrganizer as `0x${string}`,
    abi: EventOrganizerArtifact.abi,
    functionName: 'organizerExists',
    args: walletAddress ? [walletAddress] : undefined,
    query: {
      enabled: !!walletAddress,
    }
  });

  // Registered if EITHER UEA or original address is registered
  const isRegistered = !!isRegisteredWithUEA || !!isRegisteredWithOriginal;

  // Log untuk debugging
  useEffect(() => {
    if (walletAddress && ueaAddress) {
      console.log('📊 Registration Check:');
      console.log('  Original Address:', walletAddress, '→', isRegisteredWithOriginal ? '✅' : '❌');
      console.log('  UEA Address:', ueaAddress, '→', isRegisteredWithUEA ? '✅' : '❌');
      console.log('  Final Result:', isRegistered ? '✅ REGISTERED' : '❌ NOT REGISTERED');
    }
  }, [walletAddress, ueaAddress, isRegisteredWithOriginal, isRegisteredWithUEA, isRegistered]);

  const refetch = async () => {
    const results = await Promise.all([refetchUEA(), refetchOriginal()]);
    return results[0]; // Return UEA result as primary
  };

  return {
    isRegistered,
    isLoading: isLoadingUEA || isLoadingUEA_Check || isLoadingOriginal_Check,
    ueaAddress,
    originalAddress: walletAddress || null,
    refetch,
  };
};

/**
 * Hook to get EO profile details
 * Tries UEA first, falls back to original address
 */
export const useEOProfile = (walletAddress?: string) => {
  const [ueaAddress, setUeaAddress] = useState<string | null>(null);
  const [isLoadingUEA, setIsLoadingUEA] = useState(false);
  const { pushChainClient } = usePushChainClient();

  // Fetch UEA address
  useEffect(() => {
    const fetchUEA = async () => {
      if (!pushChainClient || !walletAddress) {
        setUeaAddress(null);
        return;
      }

      setIsLoadingUEA(true);
      try {
        const uea = await pushChainClient.getAddress();
        setUeaAddress(uea);
      } catch (error) {
        console.error('❌ Error fetching UEA:', error);
        setUeaAddress(null);
      } finally {
        setIsLoadingUEA(false);
      }
    };

    fetchUEA();
  }, [pushChainClient, walletAddress]);

  // Get organizer details using UEA
  const {
    data: profileDataUEA,
    isLoading: isLoadingUEAProfile,
    refetch: refetchUEA
  } = useReadContract({
    address: CONTRACTS.testnet.EventOrganizer as `0x${string}`,
    abi: EventOrganizerArtifact.abi,
    functionName: 'getOrganizerDetails',
    args: ueaAddress ? [ueaAddress] : undefined,
    query: {
      enabled: !!ueaAddress,
    }
  });

  // Get organizer details using original address (fallback)
  const {
    data: profileDataOriginal,
    isLoading: isLoadingOriginalProfile,
    refetch: refetchOriginal
  } = useReadContract({
    address: CONTRACTS.testnet.EventOrganizer as `0x${string}`,
    abi: EventOrganizerArtifact.abi,
    functionName: 'getOrganizerDetails',
    args: walletAddress ? [walletAddress] : undefined,
    query: {
      enabled: !!walletAddress,
    }
  });

  // Use UEA profile if exists, otherwise use original
  const profileData = profileDataUEA || profileDataOriginal;

  // Parse profile data
  const profile = profileData ? {
    profileUri: profileData[0] as string,
    contentHash: profileData[1] as string,
    registrationDate: Number(profileData[2]),
    isVerified: profileData[3] as boolean,
    totalEvents: Number(profileData[4]),
    totalTicketsSold: Number(profileData[5]),
    averageRating: Number(profileData[6]),
  } : null;

  const refetch = async () => {
    const results = await Promise.all([refetchUEA(), refetchOriginal()]);
    return results[0];
  };

  return {
    profile,
    isLoading: isLoadingUEA || isLoadingUEAProfile || isLoadingOriginalProfile,
    ueaAddress,
    originalAddress: walletAddress || null,
    refetch,
  };
};

/**
 * Hook to check if EO is verified using UEA
 */
export const useEOVerification = (walletAddress?: string) => {
  const [ueaAddress, setUeaAddress] = useState<string | null>(null);
  const { pushChainClient } = usePushChainClient();

  useEffect(() => {
    const fetchUEA = async () => {
      if (!pushChainClient || !walletAddress) {
        setUeaAddress(null);
        return;
      }

      try {
        const uea = await pushChainClient.getAddress();
        setUeaAddress(uea);
      } catch (error) {
        console.error('❌ Error fetching UEA:', error);
        setUeaAddress(null);
      }
    };

    fetchUEA();
  }, [pushChainClient, walletAddress]);

  const { data: isVerified, isLoading, refetch } = useReadContract({
    address: CONTRACTS.testnet.EventOrganizer as `0x${string}`,
    abi: EventOrganizerArtifact.abi,
    functionName: 'isVerifiedOrganizer',
    args: ueaAddress ? [ueaAddress] : undefined,
    query: {
      enabled: !!ueaAddress,
    }
  });

  return {
    isVerified: !!isVerified,
    isLoading,
    ueaAddress,
    refetch,
  };
};
