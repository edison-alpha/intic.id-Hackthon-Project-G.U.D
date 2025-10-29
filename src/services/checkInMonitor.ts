/**
 * Real-time Check-In Monitoring Service
 * Monitors check-in events and ticket usage status
 */

import { ethers } from 'ethers';
import EventTicketABI from '@/contracts/EventTicket.json';

export interface CheckInEvent {
  tokenId: number;
  user: string;
  timestamp: number;
  txHash: string;
  eventName?: string;
}

export interface TicketStatus {
  tokenId: number;
  isUsed: boolean;
  owner: string;
  checkInTimestamp?: number;
  checkInTxHash?: string;
}

class CheckInMonitorService {
  private provider: ethers.BrowserProvider | null = null;
  private contracts: Map<string, ethers.Contract> = new Map();
  private eventListeners: Map<string, any[]> = new Map();

  async initialize() {
    if (typeof window !== 'undefined' && window.ethereum) {
      this.provider = new ethers.BrowserProvider(window.ethereum);
    }
  }

  /**
   * Monitor check-in events for a specific contract
   */
  async monitorContract(contractAddress: string, onCheckIn: (event: CheckInEvent) => void) {
    if (!this.provider) {
      await this.initialize();
    }

    if (!this.provider) {
      throw new Error('No provider available');
    }

    // Create contract instance
    const contract = new ethers.Contract(contractAddress, EventTicketABI.abi, this.provider);
    this.contracts.set(contractAddress, contract);

    // Listen to TicketUsed events
    const listener = async (tokenId: number, user: string, event: any) => {
      const checkInEvent: CheckInEvent = {
        tokenId,
        user,
        timestamp: Date.now(),
        txHash: event.transactionHash,
      };

      console.log('🎫 Check-in event detected:', checkInEvent);
      onCheckIn(checkInEvent);
    };

    // Add event listener
    contract.on('TicketUsed', listener);

    // Store listener for cleanup
    const listeners = this.eventListeners.get(contractAddress) || [];
    listeners.push(listener);
    this.eventListeners.set(contractAddress, listeners);

    console.log(`📡 Monitoring check-ins for contract: ${contractAddress}`);
  }

  /**
   * Stop monitoring a contract
   */
  stopMonitoring(contractAddress: string) {
    const contract = this.contracts.get(contractAddress);
    if (contract) {
      // Remove all listeners
      contract.removeAllListeners('TicketUsed');
      this.contracts.delete(contractAddress);
      this.eventListeners.delete(contractAddress);
      console.log(`🔇 Stopped monitoring contract: ${contractAddress}`);
    }
  }

  /**
   * Get all tickets status for a contract
   */
  async getTicketsStatus(contractAddress: string, totalSupply: number): Promise<TicketStatus[]> {
    if (!this.provider) {
      await this.initialize();
    }

    if (!this.provider) {
      throw new Error('No provider available');
    }

    const contract = new ethers.Contract(contractAddress, EventTicketABI.abi, this.provider);
    const statuses: TicketStatus[] = [];

    try {
      // Check each token from 1 to totalSupply
      for (let tokenId = 1; tokenId <= totalSupply; tokenId++) {
        try {
          const [isUsed, owner] = await Promise.all([
            contract.isTicketUsed(tokenId),
            contract.ownerOf(tokenId)
          ]);

          const status: TicketStatus = {
            tokenId,
            isUsed,
            owner,
          };

          // If ticket is used, try to get usage timestamp from events
          if (isUsed) {
            try {
              const filter = contract.filters.TicketUsed(tokenId);
              const events = await contract.queryFilter(filter);
              if (events.length > 0) {
                const lastEvent = events[events.length - 1];
                const block = await this.provider.getBlock(lastEvent.blockNumber);
                status.checkInTimestamp = block?.timestamp ? block.timestamp * 1000 : undefined;
                status.checkInTxHash = lastEvent.transactionHash;
              }
            } catch (eventError) {
              console.warn(`Failed to get event data for token ${tokenId}:`, eventError);
            }
          }

          statuses.push(status);
        } catch (tokenError) {
          // Token might not exist, skip
          console.warn(`Token ${tokenId} not found:`, tokenError);
        }
      }
    } catch (error) {
      console.error('Error getting tickets status:', error);
      throw error;
    }

    return statuses;
  }

  /**
   * Get check-in statistics for a contract
   */
  async getCheckInStats(contractAddress: string, totalSupply: number) {
    try {
      const statuses = await this.getTicketsStatus(contractAddress, totalSupply);
      
      const totalTickets = statuses.length;
      const usedTickets = statuses.filter(s => s.isUsed).length;
      const unusedTickets = totalTickets - usedTickets;
      const checkInRate = totalTickets > 0 ? (usedTickets / totalTickets) * 100 : 0;

      // Get recent check-ins (last 24 hours)
      const last24Hours = Date.now() - (24 * 60 * 60 * 1000);
      const recentCheckIns = statuses.filter(s => 
        s.isUsed && s.checkInTimestamp && s.checkInTimestamp > last24Hours
      ).length;

      return {
        totalTickets,
        usedTickets,
        unusedTickets,
        checkInRate,
        recentCheckIns,
        statuses
      };
    } catch (error) {
      console.error('Error getting check-in stats:', error);
      throw error;
    }
  }

  /**
   * Check if a specific ticket is used
   */
  async isTicketUsed(contractAddress: string, tokenId: number): Promise<boolean> {
    if (!this.provider) {
      await this.initialize();
    }

    if (!this.provider) {
      throw new Error('No provider available');
    }

    const contract = new ethers.Contract(contractAddress, EventTicketABI.abi, this.provider);
    return await contract.isTicketUsed(tokenId);
  }

  /**
   * Cleanup all listeners
   */
  cleanup() {
    for (const [contractAddress] of this.contracts) {
      this.stopMonitoring(contractAddress);
    }
  }
}

// Singleton instance
export const checkInMonitor = new CheckInMonitorService();

// React hook for using the check-in monitor
import { useState, useEffect, useCallback } from 'react';

export function useCheckInMonitor(contractAddress: string, totalSupply: number = 1000) {
  const [checkInStats, setCheckInStats] = useState<any>(null);
  const [recentEvents, setRecentEvents] = useState<CheckInEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial stats
  const loadStats = useCallback(async () => {
    if (!contractAddress) return;

    try {
      setIsLoading(true);
      setError(null);
      const stats = await checkInMonitor.getCheckInStats(contractAddress, totalSupply);
      setCheckInStats(stats);
    } catch (err: any) {
      console.error('Failed to load check-in stats:', err);
      setError(err.message || 'Failed to load check-in stats');
    } finally {
      setIsLoading(false);
    }
  }, [contractAddress, totalSupply]);

  // Handle new check-in events
  const handleCheckInEvent = useCallback((event: CheckInEvent) => {
    setRecentEvents(prev => [event, ...prev].slice(0, 10)); // Keep last 10 events
    // Reload stats to get updated numbers
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (!contractAddress) return;

    // Load initial stats
    loadStats();

    // Start monitoring
    checkInMonitor.monitorContract(contractAddress, handleCheckInEvent);

    // Cleanup on unmount
    return () => {
      checkInMonitor.stopMonitoring(contractAddress);
    };
  }, [contractAddress, loadStats, handleCheckInEvent]);

  return {
    checkInStats,
    recentEvents,
    isLoading,
    error,
    refetch: loadStats
  };
}