/**
 * Custom Hook for EO Analytics Data from Blockchain
 * Fetches analytics data for AdvancedAnalytics component
 */

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@/hooks/usePushChainWallet';
import EventOrganizerABI from '@/contracts/EventOrganizer.json';
import EventTicketABI from '@/contracts/EventTicket.json';
import { getContracts } from '@/config/contracts';

export interface AnalyticsData {
  portfolio: {
    totalValue: number;
    totalChange: number;
    totalTickets: number;
    activeEvents: number;
    stakingRewards: number;
    monthlyROI: number;
  };
  spending: {
    monthly: Array<{
      month: string;
      spending: number;
      rewards: number;
      events: number;
      ticketsSold: number;
    }>;
  };
}

/**
 * Hook to fetch EO Analytics Data from blockchain
 */
export function useEOAnalytics() {
  const { wallet } = useWallet();
  const address = wallet?.address;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    portfolio: {
      totalValue: 0,
      totalChange: 0,
      totalTickets: 0,
      activeEvents: 0,
      stakingRewards: 0,
      monthlyROI: 0,
    },
    spending: {
      monthly: [],
    },
  });

  /**
   * Fetch analytics data from blockchain
   */
  const fetchAnalyticsData = useCallback(async () => {
    if (!address || !window.ethereum) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const contracts = getContracts();

      const organizerContract = new ethers.Contract(
        contracts.EventOrganizer,
        EventOrganizerABI.abi,
        provider
      );

      // Get organizer event indices
      const eventIndices = await organizerContract.getEventsByOrganizer!(address) as bigint[];
      
      let totalTicketsSold = 0;
      let totalRevenue = 0;
      let activeEventsCount = 0;
      const monthlyData: { [key: string]: { spending: number; events: number; ticketsSold: number } } = {};

      // Fetch all event details
      for (const idx of eventIndices) {
        try {
          const eventIndex = Number(idx);
          const deployedEvent = await organizerContract.deployedEvents!(eventIndex) as any;
          const eventContract = deployedEvent.eventContract as string;
          const isActive = deployedEvent.isActive as boolean;

          if (isActive) activeEventsCount++;

          const ticketContract = new ethers.Contract(
            eventContract,
            EventTicketABI.abi,
            provider
          );

          const eventDetails = await ticketContract.getEventDetails!() as any;
          const ticketsSold = Number(eventDetails._ticketsSold);
          const ticketPrice = eventDetails._ticketPrice;
          const priceInEth = Number(ethers.formatEther(ticketPrice));
          const revenue = ticketsSold * priceInEth;

          totalTicketsSold += ticketsSold;
          totalRevenue += revenue;

          // Get event date for monthly grouping
          const eventDate = Number(eventDetails._eventDate);
          const date = new Date(eventDate * 1000);
          const monthKey = date.toLocaleDateString('en-US', { month: 'short' });

          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { spending: 0, events: 0, ticketsSold: 0 };
          }
          monthlyData[monthKey].spending += revenue;
          monthlyData[monthKey].events += 1;
          monthlyData[monthKey].ticketsSold += ticketsSold;
        } catch (err) {
          console.error(`Error fetching event ${idx}:`, err);
        }
      }

      // Format monthly data
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = new Date().getMonth();
      const monthlyArray = [];

      for (let i = 5; i >= 0; i--) {
        const monthIndex = (currentMonth - i + 12) % 12;
        const month = months[monthIndex]!;
        monthlyArray.push({
          month,
          spending: monthlyData[month]?.spending || 0,
          rewards: 0, // TODO: Implement rewards system
          events: monthlyData[month]?.events || 0,
          ticketsSold: monthlyData[month]?.ticketsSold || 0,
        });
      }

      setAnalyticsData({
        portfolio: {
          totalValue: totalRevenue,
          totalChange: 0, // TODO: Calculate based on previous period
          totalTickets: totalTicketsSold,
          activeEvents: activeEventsCount,
          stakingRewards: 0, // TODO: Implement staking
          monthlyROI: 0, // TODO: Calculate ROI
        },
        spending: {
          monthly: monthlyArray,
        },
      });

    } catch (err: any) {
      console.error('Error fetching analytics data:', err);
      setError(err.message || 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  return {
    loading,
    error,
    analyticsData,
    refetch: fetchAnalyticsData,
  };
}
