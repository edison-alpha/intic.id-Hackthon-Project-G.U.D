import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useWallet } from "@/hooks/usePushChainWallet";
import { useEOMode } from "@/contexts/EOContext";
import {
  DollarSign,
  TrendingUp,
  Ticket,
  Calendar,
  Award,
  BarChart3,
  Settings,
  Wallet
} from "lucide-react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import AdvancedAnalytics from "@/components/AdvancedAnalytics";
import ContractManagement from "@/components/ContractManagement";
import { getAllUserTickets } from '@/services/eventBrowseContract';

// Category colors
const CATEGORY_COLORS: Record<string, string> = {
  concert: "#d548ec",
  sports: "#3B82F6",
  conference: "#10B981",
  festival: "#8B5CF6",
  theater: "#F59E0B",
  other: "#6B7280"
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { wallet } = useWallet();
  const { isEOMode, isTransitioning } = useEOMode();
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "1y">("30d");
  const [activeView, setActiveView] = useState<'overview' | 'analytics' | 'contracts'>('overview');
  const [loading, setLoading] = useState(true);

  // Real data states
  const [tickets, setTickets] = useState<any[]>([]);
  const [portfolioStats, setPortfolioStats] = useState({
    totalValue: 0,
    totalChange: 0,
    totalTickets: 0,
    upcomingEvents: 0,
    stakingRewards: 0,
    stakingAPY: 12.5,
    totalSpent: 0,
    avgTicketPrice: 0,
    totalRefunded: 0
  });
  const [spendingData, setSpendingData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);

  // Redirect to EO portfolio if in EO mode
  useEffect(() => {
    if (isEOMode && !isTransitioning) {
      // Delay navigation to avoid React error
      const timer = setTimeout(() => {
        navigate('/app/eo-portfolio');
      }, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isEOMode, isTransitioning, navigate]);

  // Reset to overview if not in EO mode and trying to view EO-only tabs
  useEffect(() => {
    if (!isEOMode && (activeView === 'analytics' || activeView === 'contracts')) {
      setActiveView('overview');
    }
  }, [isEOMode, activeView]);

  // Load real data from blockchain
  useEffect(() => {
    if (wallet?.address && !isEOMode) {
      loadPortfolioData();
    }
  }, [wallet?.address, isEOMode]);

  /**
   * Load portfolio data from blockchain
   */
  const loadPortfolioData = async () => {
    if (!wallet?.address) return;
    
    setLoading(true);
    try {
      console.log('📊 Loading portfolio data for:', wallet.address);
      
      // Get all user tickets from blockchain
      const userTickets = await getAllUserTickets(wallet.address);
      console.log('🎫 User tickets loaded:', userTickets.length);
      console.log('📋 Sample ticket structure:', userTickets[0]);
      
      setTickets(userTickets);
      
      // Calculate portfolio stats
      calculatePortfolioStats(userTickets);
      
      // Calculate spending data (by month)
      calculateSpendingData(userTickets);
      
      // Calculate category distribution
      calculateCategoryData(userTickets);
      
      // Load recent activity from tickets
      loadRecentActivity(userTickets);
      
      // Get upcoming events
      calculateUpcomingEvents(userTickets);
      
      console.log('✅ Portfolio data loaded successfully');
      
    } catch (error) {
      console.error('❌ Error loading portfolio data:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calculate portfolio statistics from tickets
   */
  const calculatePortfolioStats = (userTickets: any[]) => {
    console.log('💰 Calculating portfolio stats...');
    let totalSpent = 0;
    let totalRefunded = 0;
    let upcomingCount = 0;
    
    userTickets.forEach(ticket => {
      const eventDetails = ticket.eventDetails;
      const ticketDetails = ticket.ticketDetails;
      
      // Add to total spent
      const price = parseFloat(eventDetails?.price || '0');
      totalSpent += price;
      
      // Check if refunded
      if (ticketDetails?.refunded) {
        totalRefunded += price;
      }
      
      // Count upcoming events (not used, not cancelled, future date)
      if (!ticketDetails?.used && !eventDetails?.eventCancelled && !ticketDetails?.refunded) {
        try {
          const eventDate = new Date(eventDetails?.date);
          if (eventDate > new Date()) {
            upcomingCount++;
          }
        } catch (e) {
          // Invalid date format, skip
        }
      }
    });
    
    const totalValue = totalSpent - totalRefunded;
    const avgTicketPrice = userTickets.length > 0 ? totalSpent / userTickets.length : 0;
    
    console.log('📊 Portfolio Stats:', {
      totalValue,
      totalTickets: userTickets.length,
      upcomingEvents: upcomingCount,
      totalSpent,
      avgTicketPrice,
      totalRefunded
    });
    
    setPortfolioStats({
      totalValue,
      totalChange: 0, // Can calculate based on historical data
      totalTickets: userTickets.length,
      upcomingEvents: upcomingCount,
      stakingRewards: 0, // Not implemented yet
      stakingAPY: 12.5,
      totalSpent,
      avgTicketPrice,
      totalRefunded
    });
  };

  /**
   * Calculate spending data by month
   */
  const calculateSpendingData = (userTickets: any[]) => {
    const monthlyData: Record<string, { spending: number; rewards: number; refunded: number }> = {};
    
    // Get last 6 months
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
      months.push(monthKey);
      monthlyData[monthKey] = { spending: 0, rewards: 0, refunded: 0 };
    }
    
    // Aggregate ticket purchases by month
    userTickets.forEach(ticket => {
      const eventDetails = ticket.eventDetails;
      const ticketDetails = ticket.ticketDetails;
      
      // Get purchase date from ticket metadata or use current date as fallback
      let purchaseDate = new Date();
      try {
        if (ticketDetails?.mintedAt) {
          purchaseDate = new Date(ticketDetails.mintedAt * 1000);
        }
      } catch (e) {
        // Use current date as fallback
      }
      
      const monthKey = purchaseDate.toLocaleDateString('en-US', { month: 'short' });
      
      if (monthlyData[monthKey]) {
        const price = parseFloat(eventDetails?.price || '0');
        monthlyData[monthKey].spending += price;
        
        // Add refunded amount
        if (ticketDetails?.refunded) {
          monthlyData[monthKey].refunded += price;
        }
      }
    });
    
    const chartData = months.map(month => ({
      month,
      spending: parseFloat(monthlyData[month].spending.toFixed(4)),
      rewards: parseFloat(monthlyData[month].rewards.toFixed(4)),
      refunded: parseFloat(monthlyData[month].refunded.toFixed(4))
    }));
    
    setSpendingData(chartData);
  };

  /**
   * Calculate category distribution
   */
  const calculateCategoryData = (userTickets: any[]) => {
    const categoryCount: Record<string, number> = {};
    
    userTickets.forEach(ticket => {
      const eventDetails = ticket.eventDetails;
      const category = eventDetails?.category || 'other';
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });
    
    const total = userTickets.length || 1;
    const chartData = Object.entries(categoryCount).map(([name, count]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: Math.round((count / total) * 100),
      color: CATEGORY_COLORS[name] || CATEGORY_COLORS.other
    }));
    
    setCategoryData(chartData);
  };

  /**
   * Load recent activity from localStorage and tickets
   */
  const loadRecentActivity = (userTickets: any[]) => {
    console.log('📜 Loading recent activity...');
    const activities: any[] = [];
    
    // Add ticket purchases (sort by mintedAt timestamp)
    const sortedTickets = [...userTickets].sort((a, b) => {
      const timeA = a.ticketDetails?.mintedAt || 0;
      const timeB = b.ticketDetails?.mintedAt || 0;
      return timeB - timeA; // Descending (newest first)
    });
    
    sortedTickets.slice(0, 3).forEach((ticket) => {
      const eventDetails = ticket.eventDetails;
      const ticketDetails = ticket.ticketDetails;
      
      const mintedAt = ticketDetails?.mintedAt || Math.floor(Date.now() / 1000);
      const price = parseFloat(eventDetails?.price || '0');
      
      // Determine status text
      let statusText = 'Active';
      if (ticketDetails?.used) {
        statusText = 'Used';
      } else if (ticketDetails?.refunded) {
        statusText = 'Refunded';
      } else if (eventDetails?.eventCancelled) {
        statusText = 'Event Cancelled';
      } else if (eventDetails?.eventPaused) {
        statusText = 'Event Paused';
      }
      
      activities.push({
        id: `ticket-${ticket.tokenId}`,
        type: 'purchase',
        title: eventDetails?.title || 'Unknown Event',
        event: statusText,
        amount: `-${price.toFixed(4)} PUSH`,
        date: new Date(mintedAt * 1000).toLocaleDateString(),
        timestamp: mintedAt
      });
    });
    
    // Add refund transactions
    const refundedTickets = userTickets.filter(t => t.ticketDetails?.refunded);
    console.log('💸 Refunded tickets found:', refundedTickets.length);
    
    refundedTickets.slice(0, 2).forEach((ticket) => {
      const eventDetails = ticket.eventDetails;
      const ticketDetails = ticket.ticketDetails;
      const price = parseFloat(eventDetails?.price || '0');
      const refundedAt = ticketDetails?.refundedAt || Math.floor(Date.now() / 1000);
      
      activities.push({
        id: `refund-${ticket.tokenId}`,
        type: 'reward',
        title: 'Refund Received',
        event: eventDetails?.title || 'Unknown Event',
        amount: `+${price.toFixed(4)} PUSH`,
        date: new Date(refundedAt * 1000).toLocaleDateString(),
        timestamp: refundedAt
      });
    });
    
    // Sort by timestamp and take latest 4
    activities.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    console.log('✅ Recent activities loaded:', activities.length);
    setRecentActivity(activities.slice(0, 4));
  };

  /**
   * Calculate upcoming events from tickets
   */
  const calculateUpcomingEvents = (userTickets: any[]) => {
    console.log('📅 Calculating upcoming events...');
    const now = new Date();
    
    // Filter upcoming events (not used, not cancelled, not refunded, future date)
    const upcoming = userTickets
      .filter(ticket => {
        const eventDetails = ticket.eventDetails;
        const ticketDetails = ticket.ticketDetails;
        
        if (ticketDetails?.used || eventDetails?.eventCancelled || ticketDetails?.refunded) {
          return false;
        }
        
        try {
          const eventDate = new Date(eventDetails?.date);
          return eventDate > now;
        } catch (e) {
          return false;
        }
      })
      .sort((a, b) => {
        try {
          const dateA = new Date(a.eventDetails?.date).getTime();
          const dateB = new Date(b.eventDetails?.date).getTime();
          return dateA - dateB;
        } catch (e) {
          return 0;
        }
      })
      .slice(0, 3)
      .map(ticket => {
        const eventDetails = ticket.eventDetails;
        const price = parseFloat(eventDetails?.price || '0');
        
        return {
          id: ticket.tokenId,
          name: eventDetails?.title || 'Unknown Event',
          date: new Date(eventDetails?.date).toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
          }),
          time: eventDetails?.time || 'TBA',
          tickets: 1,
          value: `${price.toFixed(4)} PUSH`,
          image: eventDetails?.image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80',
          contractAddress: ticket.contractAddress
        };
      });
    
    console.log('✅ Upcoming events found:', upcoming.length);
    setUpcomingEvents(upcoming);
  };

  // Don't render anything if in EO mode
  if (isEOMode) {
    return null;
  }

  return (
    <AppLayout>
      <div className="px-6 pb-8 md:px-6 md:pb-6">
        {/* Header */}
        <div className="mb-8 md:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">Portfolio</h1>
              <p className="text-base md:text-base text-gray-400 leading-relaxed">Track your tickets, spending, and rewards</p>
            </div>

            {/* View Toggle - Only show Analytics and Contracts in EO Mode */}
            {isEOMode && (
              <div className="flex gap-1 bg-[#1A1A1A] border border-gray-800/50 rounded-2xl p-1.5 shadow-lg backdrop-blur-sm">
                {[
                  { id: 'overview', label: 'Overview', icon: BarChart3 },
                  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
                  { id: 'contracts', label: 'Contracts', icon: Settings }
                ].map((view) => (
                  <button
                    key={view.id}
                    onClick={() => setActiveView(view.id as any)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 min-h-[44px] ${
                      activeView === view.id
                        ? 'bg-[#d548ec] text-white shadow-lg'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50 active:bg-gray-700/50'
                    }`}
                  >
                    <view.icon className="w-5 h-5" />
                    <span className="hidden sm:inline">{view.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Loading Indicator - Skeleton */}
        {loading && activeView === 'overview' && (
          <>
            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-[#1A1A1A] border border-gray-800/50 rounded-3xl p-6 md:p-6 shadow-xl backdrop-blur-sm animate-pulse">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gray-800 rounded-2xl"></div>
                    <div className="w-20 h-6 bg-gray-800 rounded-full"></div>
                  </div>
                  <div className="h-4 bg-gray-800 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-800 rounded w-3/4 mb-1"></div>
                  <div className="h-3 bg-gray-800 rounded w-1/3"></div>
                </div>
              ))}
            </div>

            {/* Charts Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 mb-6 md:mb-8">
              {/* Main Chart Skeleton */}
              <div className="lg:col-span-2 bg-[#1A1A1A] border border-gray-800/50 rounded-3xl p-6 md:p-8 shadow-xl backdrop-blur-sm animate-pulse">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <div className="h-6 bg-gray-800 rounded w-48 mb-2"></div>
                    <div className="h-4 bg-gray-800 rounded w-64"></div>
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-16 h-10 bg-gray-800 rounded-xl"></div>
                    ))}
                  </div>
                </div>
                <div className="h-[300px] bg-gray-800/50 rounded-2xl"></div>
              </div>

              {/* Pie Chart Skeleton */}
              <div className="bg-[#1A1A1A] border border-gray-800/50 rounded-3xl p-6 md:p-8 shadow-xl backdrop-blur-sm animate-pulse">
                <div className="h-6 bg-gray-800 rounded w-32 mb-1"></div>
                <div className="h-4 bg-gray-800 rounded w-48 mb-6"></div>
                <div className="w-40 h-40 mx-auto bg-gray-800/50 rounded-full mb-6"></div>
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center justify-between p-2">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-gray-800 rounded-full"></div>
                        <div className="h-4 bg-gray-800 rounded w-20"></div>
                      </div>
                      <div className="h-4 bg-gray-800 rounded w-12"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Section Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              {/* Recent Activity Skeleton */}
              <div className="bg-[#1A1A1A] border border-gray-800/50 rounded-3xl p-6 md:p-8 shadow-xl backdrop-blur-sm animate-pulse">
                <div className="flex items-center justify-between mb-6">
                  <div className="h-6 bg-gray-800 rounded w-40"></div>
                  <div className="h-4 bg-gray-800 rounded w-20"></div>
                </div>
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-start gap-4 p-4 bg-[#0A0A0A] rounded-2xl border border-gray-800/30">
                      <div className="w-12 h-12 bg-gray-800 rounded-2xl"></div>
                      <div className="flex-1">
                        <div className="h-5 bg-gray-800 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-gray-800 rounded w-1/2"></div>
                      </div>
                      <div className="text-right">
                        <div className="h-5 bg-gray-800 rounded w-24 mb-1"></div>
                        <div className="h-4 bg-gray-800 rounded w-20"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming Events Skeleton */}
              <div className="bg-[#1A1A1A] border border-gray-800/50 rounded-3xl p-6 md:p-8 shadow-xl backdrop-blur-sm animate-pulse">
                <div className="flex items-center justify-between mb-6">
                  <div className="h-6 bg-gray-800 rounded w-40"></div>
                  <div className="h-4 bg-gray-800 rounded w-20"></div>
                </div>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-[#0A0A0A] rounded-2xl border border-gray-800/30">
                      <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-800 rounded-2xl"></div>
                      <div className="flex-1">
                        <div className="h-5 bg-gray-800 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-gray-800 rounded w-full mb-1"></div>
                        <div className="h-4 bg-gray-800 rounded w-1/2"></div>
                      </div>
                      <div className="text-right">
                        <div className="h-5 bg-gray-800 rounded w-24 mb-1"></div>
                        <div className="h-4 bg-gray-800 rounded w-16"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* No wallet connected state */}
        {!wallet?.address && activeView === 'overview' && !loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 mx-auto mb-6 bg-gray-800 rounded-full flex items-center justify-center">
                <Wallet className="w-10 h-10 text-gray-600" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Connect Your Wallet</h3>
              <p className="text-gray-400 mb-6">
                Connect your wallet to view your portfolio, tickets, and transaction history.
              </p>
            </div>
          </div>
        )}

        {/* Content based on active view */}
        {!loading && wallet?.address && activeView === 'overview' && (
          <>
        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          {/* Total Portfolio Value */}
          <div className="bg-gradient-to-br from-[#d548ec] to-[#e7a4fd] rounded-3xl p-6 md:p-6 text-white shadow-2xl shadow-[#d548ec]/20 border border-[#d548ec]/20">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <DollarSign className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-1 text-sm font-medium text-white bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
                <TrendingUp className="w-4 h-4" />
                <span>{portfolioStats.totalChange}%</span>
              </div>
            </div>
            <p className="text-white/80 text-sm mb-2">Total Portfolio Value</p>
            <p className="text-3xl md:text-3xl font-bold text-white mb-1">{portfolioStats.totalValue.toFixed(2)} PUSH</p>
            <p className="text-white/60 text-xs">≈ ${(portfolioStats.totalValue * 0.5).toFixed(2)} USD</p>
          </div>

          {/* Total Tickets */}
          <div className="bg-[#1A1A1A] border border-gray-800/50 rounded-3xl p-6 md:p-6 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                <Ticket className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex items-center gap-1 text-sm font-medium text-gray-400 bg-gray-800/50 px-3 py-1.5 rounded-full">
                {portfolioStats.upcomingEvents} upcoming
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-2">Total Tickets</p>
            <p className="text-3xl md:text-3xl font-bold text-white mb-1">{portfolioStats.totalTickets}</p>
            <p className="text-gray-500 text-xs">Across all events</p>
          </div>

          {/* Staking Rewards */}
          <div className="bg-[#1A1A1A] border border-gray-800/50 rounded-3xl p-6 md:p-6 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center">
                <Award className="w-6 h-6 text-green-500" />
              </div>
              <div className="flex items-center gap-1 text-sm font-medium text-green-500 bg-green-500/10 px-3 py-1.5 rounded-full">
                <TrendingUp className="w-4 h-4" />
                {portfolioStats.stakingAPY}% APY
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-2">Staking Rewards</p>
            <p className="text-3xl md:text-3xl font-bold text-white mb-1">{portfolioStats.stakingRewards.toFixed(4)} PUSH</p>
            <p className="text-gray-500 text-xs">This month</p>
          </div>

          {/* Avg Ticket Price */}
          <div className="bg-[#1A1A1A] border border-gray-800/50 rounded-3xl p-6 md:p-6 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-500" />
              </div>
              <div className="flex items-center gap-1 text-sm font-medium text-gray-400 bg-gray-800/50 px-3 py-1.5 rounded-full">
                Last 30d
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-2">Avg Ticket Price</p>
            <p className="text-3xl md:text-3xl font-bold text-white mb-1">{portfolioStats.avgTicketPrice.toFixed(2)} PUSH</p>
            <p className="text-gray-500 text-xs">Per ticket</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 mb-6 md:mb-8">
          {/* Spending & Rewards Chart - Takes 2 columns */}
          <div className="lg:col-span-2 bg-[#1A1A1A] border border-gray-800/50 rounded-3xl p-6 md:p-8 shadow-xl backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-white mb-1">Revenue & Tickets</h2>
                <p className="text-sm md:text-base text-gray-400">Your revenue and ticket sales over time</p>
              </div>
              <div className="flex gap-2">
                {(["7d", "30d", "90d", "1y"] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 min-h-[44px] ${
                      timeRange === range
                        ? "bg-[#d548ec] text-white shadow-lg"
                        : "bg-[#0A0A0A] text-gray-400 hover:text-white hover:bg-gray-800/50"
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={spendingData}>
                <defs>
                  <linearGradient id="colorSpending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d548ec" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#d548ec" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRewards" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRefunded" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                <XAxis 
                  dataKey="month" 
                  stroke="#6B7280"
                  style={{ fontSize: '12px', fill: '#fff' }}
                />
                <YAxis 
                  stroke="#6B7280"
                  style={{ fontSize: '12px', fill: '#fff' }}
                  tickFormatter={(value) => `${value.toFixed(2)} PUSH`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1A1A1A',
                    border: '1px solid #374151',
                    borderRadius: '12px',
                    color: '#fff'
                  }}
                  formatter={(value, name) => [`${Number(value).toFixed(4)} PUSH`, name]}
                  labelStyle={{ color: '#d548ec', fontWeight: 'bold' }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px', color: '#fff' }}
                  iconType="circle"
                />
                <Area
                  type="monotone"
                  dataKey="spending"
                  stroke="#d548ec"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSpending)"
                  name="Spending (PUSH)"
                />
                <Area
                  type="monotone"
                  dataKey="rewards"
                  stroke="#10B981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRewards)"
                  name="Rewards (PUSH)"
                />
                <Area
                  type="monotone"
                  dataKey="refunded"
                  stroke="#EF4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRefunded)"
                  name="Refunded (PUSH)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Category Distribution - Pie Chart */}
          <div className="bg-[#1A1A1A] border border-gray-800/50 rounded-3xl p-6 md:p-8 shadow-xl backdrop-blur-sm">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-1">Categories</h2>
            <p className="text-sm md:text-base text-gray-400 mb-6">Ticket distribution by type</p>

            {categoryData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1A1A1A',
                        border: '1px solid #374151',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}
                      formatter={(value, name) => [`${value}%`, name]}
                      labelStyle={{ color: '#f4f4f4ff', fontWeight: 'bold', fontSize: '14px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-3 mt-4">
                  {categoryData.map((category) => (
                    <div key={category.name} className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-800/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="text-sm text-gray-400">{category.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-white">{category.value}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-800/50 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-gray-400 text-sm">No tickets yet</p>
                <p className="text-gray-500 text-xs mt-1">Purchase tickets to see distribution</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Recent Activity */}
          <div className="bg-[#1A1A1A] border border-gray-800/50 rounded-3xl p-6 md:p-8 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-white">Recent Activity</h2>
              <Link 
                to="/app/my-tickets" 
                className="text-sm md:text-base text-[#d548ec] hover:text-[#c030d6] font-medium transition-colors"
              >
                View All →
              </Link>
            </div>

            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4 p-4 bg-[#0A0A0A] rounded-2xl hover:bg-[#0A0A0A]/80 transition-all duration-200 border border-gray-800/30">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                      activity.type === "purchase" ? "bg-blue-500/10" :
                      activity.type === "reward" ? "bg-green-500/10" :
                      "bg-purple-500/10"
                    }`}>
                      {activity.type === "purchase" ? (
                        <Ticket className="w-6 h-6 text-blue-500" />
                      ) : activity.type === "reward" ? (
                        <Award className="w-6 h-6 text-green-500" />
                      ) : (
                        <TrendingUp className="w-6 h-6 text-purple-500" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-white mb-1">{activity.title}</p>
                      <p className="text-sm text-gray-500 truncate">{activity.event}</p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className={`text-base font-semibold ${
                        activity.amount.startsWith("+") ? "text-green-500" : 
                        activity.amount.startsWith("-") ? "text-red-500" : 
                        "text-gray-400"
                      }`}>
                        {activity.amount}
                      </p>
                      <p className="text-sm text-gray-500">{activity.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-800/50 rounded-full flex items-center justify-center">
                  <Calendar className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-gray-400 text-sm">No recent activity</p>
                <p className="text-gray-500 text-xs mt-1">Your transactions will appear here</p>
              </div>
            )}
          </div>

          {/* Upcoming Events */}
          <div className="bg-[#1A1A1A] border border-gray-800/50 rounded-3xl p-6 md:p-8 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-white">Upcoming Events</h2>
              <Link 
                to="/app/my-tickets" 
                className="text-sm md:text-base text-[#d548ec] hover:text-[#c030d6] font-medium transition-colors"
              >
                View All →
              </Link>
            </div>

            {upcomingEvents.length > 0 ? (
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <Link
                    key={event.id}
                    to={`/app/event/${event.contractAddress}`}
                    className="flex items-center gap-4 p-4 bg-[#0A0A0A] rounded-2xl hover:bg-[#0A0A0A]/80 transition-all duration-200 cursor-pointer group border border-gray-800/30"
                  >
                    <img
                      src={event.image}
                      alt={event.name}
                      className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-white mb-2 truncate group-hover:text-[#d548ec] transition-colors">
                        {event.name}
                      </p>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{event.date}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Ticket className="w-4 h-4" />
                          <span>{event.tickets}x tickets</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-base font-semibold text-white">{event.value}</p>
                      <p className="text-sm text-gray-500">{event.time}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-800/50 rounded-full flex items-center justify-center">
                  <Ticket className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-gray-400 text-sm">No upcoming events</p>
                <p className="text-gray-500 text-xs mt-1">Purchase tickets to see your events</p>
                <Link
                  to="/app/browse"
                  className="inline-block mt-4 px-4 py-2 bg-[#d548ec] hover:bg-[#c030d6] text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Browse Events
                </Link>
              </div>
            )}
          </div>
        </div>
          </>
        )}

        {/* Advanced Analytics View */}
        {activeView === 'analytics' && (
          <AdvancedAnalytics userId="current-user" />
        )}

        {/* Contract Management View */}
        {activeView === 'contracts' && (
          <ContractManagement />
        )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;