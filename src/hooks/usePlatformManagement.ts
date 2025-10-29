/**
 * Custom Hook for Platform Management
 * Provides functions to interact with PushChainEticketingPlatform contract
 */

import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { getContracts } from '@/config/contracts';
import PlatformABI from '@/contracts/Platform.json';

export interface PlatformContract {
  name: string;
  address: string;
  isRegistered: boolean;
}

export interface PlatformInfo {
  owner: string;
  isPaused: boolean;
  balance: string;
  totalRegisteredContracts: number;
  contracts: {
    eventOrganizer: string;
    universalValidator: string;
    userProfile: string;
    eventReview: string;
    notificationSystem: string;
    eventStatistics: string;
    ticketManagement: string;
    nftMarketplace: string;
    eventRefund: string;
  };
}

export const usePlatformManagement = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get platform contract instance
   */
  const getPlatformContract = useCallback(async (withSigner = false) => {
    if (!window.ethereum) throw new Error('No wallet detected');
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    const { Platform } = getContracts();
    
    if (withSigner) {
      const signer = await provider.getSigner();
      return new ethers.Contract(Platform, PlatformABI.abi, signer) as any;
    }
    
    return new ethers.Contract(Platform, PlatformABI.abi, provider) as any;
  }, []);

  /**
   * Get platform information
   */
  const getPlatformInfo = useCallback(async (): Promise<PlatformInfo | null> => {
    try {
      setLoading(true);
      setError(null);

      const contract = await getPlatformContract();
      
      const [
        owner,
        isPaused,
        balance,
        allContracts
      ] = await Promise.all([
        contract.owner(),
        contract.platformPaused(),
        contract.getPlatformBalance(),
        contract.getAllPlatformContracts()
      ]);

      return {
        owner,
        isPaused,
        balance: ethers.formatEther(balance),
        totalRegisteredContracts: allContracts.filter((addr: string) => addr !== ethers.ZeroAddress).length,
        contracts: {
          eventOrganizer: allContracts[0] || ethers.ZeroAddress,
          universalValidator: allContracts[1] || ethers.ZeroAddress,
          userProfile: allContracts[2] || ethers.ZeroAddress,
          eventReview: allContracts[3] || ethers.ZeroAddress,
          notificationSystem: allContracts[4] || ethers.ZeroAddress,
          eventStatistics: allContracts[5] || ethers.ZeroAddress,
          ticketManagement: allContracts[6] || ethers.ZeroAddress,
          nftMarketplace: allContracts[7] || ethers.ZeroAddress,
          eventRefund: allContracts[8] || ethers.ZeroAddress,
        }
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get platform info');
      return null;
    } finally {
      setLoading(false);
    }
  }, [getPlatformContract]);

  /**
   * Pause the platform (owner only)
   */
  const pausePlatform = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const contract = await getPlatformContract(true);
      const tx = await contract.pausePlatform();
      await tx.wait();
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause platform');
      return false;
    } finally {
      setLoading(false);
    }
  }, [getPlatformContract]);

  /**
   * Unpause the platform (owner only)
   */
  const unpausePlatform = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const contract = await getPlatformContract(true);
      const tx = await contract.unpausePlatform();
      await tx.wait();
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unpause platform');
      return false;
    } finally {
      setLoading(false);
    }
  }, [getPlatformContract]);

  /**
   * Register a new contract (owner only)
   */
  const registerContract = useCallback(async (
    name: string, 
    contractAddress: string
  ): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const contract = await getPlatformContract(true);
      const tx = await contract.registerContract(name, contractAddress);
      await tx.wait();
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register contract');
      return false;
    } finally {
      setLoading(false);
    }
  }, [getPlatformContract]);

  /**
   * Get contract address by name
   */
  const getContractAddress = useCallback(async (name: string): Promise<string | null> => {
    try {
      const contract = await getPlatformContract();
      const address = await contract.getContractAddress(name);
      return address === ethers.ZeroAddress ? null : address;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get contract address');
      return null;
    }
  }, [getPlatformContract]);

  /**
   * Check if address is authorized contract upgrader
   */
  const isAuthorizedUpgrader = useCallback(async (address: string): Promise<boolean> => {
    try {
      const contract = await getPlatformContract();
      return await contract.isAuthorizedContractUpgrader(address);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check upgrader status');
      return false;
    }
  }, [getPlatformContract]);

  /**
   * Add contract upgrader (owner only)
   */
  const addContractUpgrader = useCallback(async (upgraderAddress: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const contract = await getPlatformContract(true);
      const tx = await contract.addContractUpgrader(upgraderAddress);
      await tx.wait();
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add contract upgrader');
      return false;
    } finally {
      setLoading(false);
    }
  }, [getPlatformContract]);

  /**
   * Remove contract upgrader (owner only)
   */
  const removeContractUpgrader = useCallback(async (upgraderAddress: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const contract = await getPlatformContract(true);
      const tx = await contract.removeContractUpgrader(upgraderAddress);
      await tx.wait();
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove contract upgrader');
      return false;
    } finally {
      setLoading(false);
    }
  }, [getPlatformContract]);

  /**
   * Grant permission to contract
   */
  const grantPermission = useCallback(async (
    contractAddr: string, 
    permission: string
  ): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const contract = await getPlatformContract(true);
      const tx = await contract.grantPermission(contractAddr, permission);
      await tx.wait();
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to grant permission');
      return false;
    } finally {
      setLoading(false);
    }
  }, [getPlatformContract]);

  /**
   * Revoke permission from contract
   */
  const revokePermission = useCallback(async (
    contractAddr: string, 
    permission: string
  ): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const contract = await getPlatformContract(true);
      const tx = await contract.revokePermission(contractAddr, permission);
      await tx.wait();
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke permission');
      return false;
    } finally {
      setLoading(false);
    }
  }, [getPlatformContract]);

  /**
   * Withdraw funds from platform (owner only)
   */
  const withdrawFunds = useCallback(async (
    toAddress: string, 
    amount: string
  ): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const contract = await getPlatformContract(true);
      const tx = await contract.withdrawFunds(toAddress, ethers.parseEther(amount));
      await tx.wait();
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to withdraw funds');
      return false;
    } finally {
      setLoading(false);
    }
  }, [getPlatformContract]);

  return {
    // State
    loading,
    error,
    
    // Platform Info
    getPlatformInfo,
    
    // Platform Control
    pausePlatform,
    unpausePlatform,
    
    // Contract Management
    registerContract,
    getContractAddress,
    
    // Permission Management
    grantPermission,
    revokePermission,
    
    // Upgrader Management
    isAuthorizedUpgrader,
    addContractUpgrader,
    removeContractUpgrader,
    
    // Financial
    withdrawFunds,
  };
};