/**
 * Custom React Hooks for Smart Contract Interactions
 * Provides easy-to-use hooks for all contract operations
 */

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@/hooks/usePushChainWallet';
import { userProfileService } from '@/services/contracts';

// ==================== USER PROFILE HOOKS ====================

/**
 * Hook to get user profile data
 */
export function useUserProfile(address?: string) {
  const { wallet } = useWallet();
  const userAddress = address || wallet?.address;
  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!userAddress) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const profileData = await userProfileService.getProfile(userAddress, provider);
      setProfile(profileData);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, error, refetch: fetchProfile };
}

/**
 * Hook to create user profile
 */
export function useCreateProfile() {
  const { data: signer } = useSigner();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProfile = useCallback(async (profileUri: string, contentHash: string) => {
    if (!signer) {
      setError('No signer available');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      await userProfileService.initialize(signer);
      const result = await userProfileService.createProfile(profileUri, contentHash);
      return result;
    } catch (err: any) {
      setError(err.message);
      console.error('Error creating profile:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [signer]);

  return { createProfile, loading, error };
}

/**
 * Hook to check if profile exists
 */
export function useProfileExists(address?: string) {
  const { address: connectedAddress } = useAccount();
  const userAddress = address || connectedAddress;
  
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkProfile() {
      if (!userAddress) return;
      
      setLoading(true);
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const profileExists = await userProfileService.profileExists(userAddress, provider);
        setExists(profileExists);
      } catch (err) {
        console.error('Error checking profile:', err);
      } finally {
        setLoading(false);
      }
    }

    checkProfile();
  }, [userAddress]);

  return { exists, loading };
}

/**
 * Hook to get user's tickets
 */
export function useUserTickets(address?: string) {
  const { address: connectedAddress } = useAccount();
  const userAddress = address || connectedAddress;
  
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    if (!userAddress) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const userTickets = await userProfileService.getUserTickets(userAddress, provider);
      setTickets(userTickets);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  return { tickets, loading, error, refetch: fetchTickets };
}

// ==================== HELPER HOOKS ====================

/**
 * Hook to format PC amounts
 */
export function useFormatPC() {
  const formatPC = useCallback((amount: bigint | string): string => {
    const value = typeof amount === 'string' ? BigInt(amount) : amount;
    return (Number(value) / 1e18).toFixed(6) + ' PC';
  }, []);

  return { formatPC };
}

/**
 * Hook to parse PC to Wei
 */
export function useParsePC() {
  const parsePC = useCallback((pc: number): bigint => {
    return BigInt(Math.floor(pc * 1e18));
  }, []);

  return { parsePC };
}

/**
 * Hook for transaction state management
 */
export function useTransaction() {
  const [txHash, setTxHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = useCallback(() => {
    setTxHash(null);
    setLoading(false);
    setError(null);
    setSuccess(false);
  }, []);

  const executeTransaction = useCallback(async (txFunction: () => Promise<any>) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const result = await txFunction();
      setTxHash(result.transactionHash);
      setSuccess(true);
      return result;
    } catch (err: any) {
      setError(err.message);
      console.error('Transaction error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    txHash,
    loading,
    error,
    success,
    reset,
    executeTransaction,
  };
}
