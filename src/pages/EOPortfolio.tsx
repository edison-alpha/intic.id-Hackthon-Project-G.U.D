import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import {
  DollarSign,
  TrendingUp,
  Ticket,
  Calendar,
  BarChart3,
  Users,
  Package,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import AdvancedAnalytics from "@/components/AdvancedAnalytics";
import UEAAddressInfo from "@/components/UEAAddressInfo";
import { useEOPortfolioData } from "@/hooks/useEOPortfolioData";
import { useWallet } from "@/hooks/usePushChainWallet";
import { useEOMode } from "@/contexts/EOContext";
import { useEffect } from "react";

const EOPortfolio = () => {
  const navigate = useNavigate();
  const { isEOMode, isTransitioning } = useEOMode();
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "1y">("30d");
  const [activeView, setActiveView] = useState<'overview' | 'analytics'>('overview');
  const [transactionPage, setTransactionPage] = useState(1);
  const transactionsPerPage = 10;
  const { wallet, isWalletConnected } = useWallet();

  // Fetch real data from blockchain - MUST be called before any conditional returns
  const {
    loading,
    error,
    eoStats,
    eventPerformance,
    recentTransactions,
    revenueData,
    refetch
  } = useEOPortfolioData();

  // Redirect to regular portfolio if not in EO mode
  useEffect(() => {
    if (!isEOMode && !isTransitioning) {
      // Delay navigation to avoid React error #300
      const timer = setTimeout(() => {
        navigate('/app/portofolio');
      }, 100);
      return () => clearTimeout(timer);
    }
    // Return undefined explicitly when condition not met
    return undefined;
  }, [isEOMode, isTransitioning, navigate]);

  // Don't render anything if not in EO mode
  if (!isEOMode) {
    return null;
  }

  return (
    <AppLayout>
      <div className="px-6 pb-8 md:px-6 md:pb-6">
        {/* Header */}
        <div className="mb-8 md:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">EO Portfolio</h1>
                <span className="px-3 py-1 bg-gradient-to-r from-[#d548ec] to-purple-600 text-white text-xs font-bold rounded-full">
                  ORGANIZER
                </span>
              </div>
              <p className="text-base md:text-base text-gray-400 leading-relaxed">Manage your events, revenue, and analytics</p>
            </div>

            {/* View Toggle */}
            <div className="flex gap-1 bg-[#1A1A1A] border border-gray-800/50 rounded-2xl p-1.5 shadow-lg backdrop-blur-sm">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'analytics', label: 'Analytics', icon: TrendingUp }
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
          </div>

          {/* UEA Address Info - Show when wallet is connected */}
          {isWalletConnected && wallet?.address && (
            <UEAAddressInfo originalAddress={wallet.address} className="mt-6" />
          )}
        </div>

        {/* Loading Indicator - Skeleton */}
        {loading && activeView === 'overview' && (
          <>
            {/* Skeleton Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8 animate-pulse">
              {/* Skeleton Card 1 - Revenue */}
              <div className="bg-gradient-to-br from-[#d548ec]/20 to-[#e7a4fd]/20 rounded-3xl p-6 md:p-6 border border-[#d548ec]/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl" />
                  <div className="w-16 h-7 bg-white/10 rounded-full" />
                </div>
                <div className="h-4 bg-white/10 rounded w-24 mb-2" />
                <div className="h-8 bg-white/10 rounded w-32 mb-1" />
                <div className="h-3 bg-white/10 rounded w-20" />
              </div>

              {/* Skeleton Card 2, 3, 4 - Regular Cards */}
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-[#1A1A1A] border border-gray-800/50 rounded-3xl p-6 md:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gray-800/50 rounded-2xl" />
                    <div className="w-16 h-7 bg-gray-800/50 rounded-full" />
                  </div>
                  <div className="h-4 bg-gray-800/50 rounded w-24 mb-2" />
                  <div className="h-8 bg-gray-800/50 rounded w-20 mb-1" />
                  <div className="h-3 bg-gray-800/50 rounded w-16" />
                </div>
              ))}
            </div>

            {/* Skeleton Revenue Chart */}
            <div className="bg-[#1A1A1A] border border-gray-800/50 rounded-3xl p-6 mb-6 md:mb-8 animate-pulse">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="h-6 bg-gray-800/50 rounded w-40 mb-2" />
                  <div className="h-4 bg-gray-800/50 rounded w-56" />
                </div>
                <div className="w-32 h-10 bg-gray-800/50 rounded-xl" />
              </div>
              <div className="h-64 bg-gray-800/30 rounded-2xl" />
            </div>

            {/* Skeleton Event Performance */}
            <div className="mb-6 md:mb-8">
              <div className="flex items-center justify-between mb-6 animate-pulse">
                <div className="h-7 bg-gray-800/50 rounded w-48" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-[#1A1A1A] border border-gray-800/50 rounded-2xl overflow-hidden">
                    {/* Skeleton Image */}
                    <div className="h-48 bg-gray-800/50" />
                    
                    {/* Skeleton Content */}
                    <div className="p-5">
                      <div className="h-6 bg-gray-800/50 rounded w-3/4 mb-4" />
                      
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between">
                          <div className="h-4 bg-gray-800/50 rounded w-24" />
                          <div className="h-4 bg-gray-800/50 rounded w-16" />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="h-4 bg-gray-800/50 rounded w-20" />
                          <div className="h-4 bg-gray-800/50 rounded w-20" />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-gray-800">
                        <div className="h-2 bg-gray-800/50 rounded-full mb-2" />
                        <div className="flex items-center justify-between">
                          <div className="h-3 bg-gray-800/50 rounded w-16" />
                          <div className="h-3 bg-gray-800/50 rounded w-12" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Skeleton Recent Sales */}
            <div className="animate-pulse">
              <div className="flex items-center justify-between mb-6">
                <div className="h-7 bg-gray-800/50 rounded w-32" />
                <div className="w-24 h-10 bg-gray-800/50 rounded-xl" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="bg-[#1A1A1A] border border-gray-800/50 rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 bg-gray-800/50 rounded-xl" />
                        <div className="flex-1">
                          <div className="h-5 bg-gray-800/50 rounded w-48 mb-2" />
                          <div className="h-4 bg-gray-800/50 rounded w-32" />
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="h-5 bg-gray-800/50 rounded w-24 mb-1" />
                        <div className="h-3 bg-gray-800/50 rounded w-20" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Error Message */}
        {error && activeView === 'overview' && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-red-500 font-semibold mb-2">Error Loading Data</h3>
                <p className="text-gray-400 text-sm mb-4">{error}</p>
                <button
                  onClick={() => refetch()}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-xl transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* No Wallet Connected */}
        {!isWalletConnected && activeView === 'overview' && !loading && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-yellow-500 font-semibold mb-2">Wallet Not Connected</h3>
                <p className="text-gray-400 text-sm">Please connect your wallet to view your EO portfolio.</p>
              </div>
            </div>
          </div>
        )}

        {/* Content based on active view */}
        {!loading && !error && isWalletConnected && activeView === 'overview' && (
          <>
            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
              {/* Total Revenue */}
              <div className="bg-gradient-to-br from-[#d548ec] to-[#e7a4fd] rounded-3xl p-6 md:p-6 text-white shadow-2xl shadow-[#d548ec]/20 border border-[#d548ec]/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-1 text-sm font-medium text-white bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
                    <TrendingUp className="w-4 h-4" />
                    <span>{eoStats.revenueChange}%</span>
                  </div>
                </div>
                <p className="text-white/80 text-sm mb-2">Total Revenue</p>
                <p className="text-3xl md:text-3xl font-bold text-white mb-1">{eoStats.totalRevenue.toFixed(2)} PUSH</p>
                <p className="text-white/60 text-xs">≈ ${(eoStats.totalRevenue * 0.5).toFixed(2)} USD</p>
              </div>

              {/* Total Events */}
              <div className="bg-[#1A1A1A] border border-gray-800/50 rounded-3xl p-6 md:p-6 shadow-xl backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                    <Package className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="flex items-center gap-1 text-sm font-medium text-gray-400 bg-gray-800/50 px-3 py-1.5 rounded-full">
                    {eoStats.activeEvents} active
                  </div>
                </div>
                <p className="text-gray-400 text-sm mb-2">Total Events</p>
                <p className="text-3xl md:text-3xl font-bold text-white mb-1">{eoStats.totalEvents}</p>
                <p className="text-gray-500 text-xs">All time</p>
              </div>

              {/* Tickets Sold */}
              <div className="bg-[#1A1A1A] border border-gray-800/50 rounded-3xl p-6 md:p-6 shadow-xl backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center">
                    <Ticket className="w-6 h-6 text-green-500" />
                  </div>
                  <div className="flex items-center gap-1 text-sm font-medium text-green-500 bg-green-500/10 px-3 py-1.5 rounded-full">
                    <TrendingUp className="w-4 h-4" />
                    {eoStats.ticketsChange}%
                  </div>
                </div>
                <p className="text-gray-400 text-sm mb-2">Tickets Sold</p>
                <p className="text-3xl md:text-3xl font-bold text-white mb-1">{eoStats.totalTicketsSold.toLocaleString()}</p>
                <p className="text-gray-500 text-xs">Across all events</p>
              </div>

              {/* Total Attendees */}
              <div className="bg-[#1A1A1A] border border-gray-800/50 rounded-3xl p-6 md:p-6 shadow-xl backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-500" />
                  </div>
                  <div className="flex items-center gap-1 text-sm font-medium text-gray-400 bg-gray-800/50 px-3 py-1.5 rounded-full">
                    Last 30d
                  </div>
                </div>
                <p className="text-gray-400 text-sm mb-2">Total Attendees</p>
                <p className="text-3xl md:text-3xl font-bold text-white mb-1">{eoStats.totalAttendees.toLocaleString()}</p>
                <p className="text-gray-500 text-xs">Unique visitors</p>
              </div>
            </div>

            {/* Revenue Chart */}
            <div className="bg-[#1A1A1A] border border-gray-800/50 rounded-3xl p-6 md:p-8 shadow-xl backdrop-blur-sm mb-6 md:mb-8">
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

              {revenueData.length === 0 ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="text-center">
                    <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg mb-2">No revenue data yet</p>
                    <p className="text-gray-500 text-sm">Revenue chart will populate as you sell tickets</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d548ec" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#d548ec" stopOpacity={0.3}/>
                      </linearGradient>
                      <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.3}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                    <XAxis 
                      dataKey="month" 
                      stroke="#6B7280"
                      style={{ fontSize: '12px', fill: '#fff' }}
                    />
                    <YAxis 
                      yAxisId="left"
                      stroke="#6B7280"
                      style={{ fontSize: '12px', fill: '#fff' }}
                      tickFormatter={(value) => `${value.toFixed(0)} PUSH`}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      stroke="#6B7280"
                      style={{ fontSize: '12px', fill: '#fff' }}
                      tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1A1A1A',
                        border: '1px solid #374151',
                        borderRadius: '12px',
                        color: '#fff'
                      }}
                      formatter={(value, name) => {
                        if (name === 'revenue') return [`${Number(value).toFixed(2)} PUSH`, 'Revenue'];
                        return [`${value} tickets`, 'Tickets Sold'];
                      }}
                      labelStyle={{ color: '#d548ec', fontWeight: 'bold' }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px', color: '#fff' }}
                      iconType="circle"
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="revenue"
                      fill="url(#colorRevenue)"
                      name="Revenue (PUSH)"
                      radius={[8, 8, 0, 0]}
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="tickets"
                      fill="url(#colorTickets)"
                      name="Tickets Sold"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              {/* Event Performance */}
              <div className="bg-[#1A1A1A] border border-gray-800/50 rounded-3xl p-6 md:p-8 shadow-xl backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl md:text-2xl font-bold text-white">Event Performance</h2>
                  <Link 
                    to="/app/create-event" 
                    className="text-sm md:text-base text-[#d548ec] hover:text-[#c030d6] font-medium transition-colors"
                  >
                    Create Event →
                  </Link>
                </div>

                {eventPerformance.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg mb-2">No events yet</p>
                    <p className="text-gray-500 text-sm mb-6">Create your first event to start selling tickets</p>
                    <Link 
                      to="/app/create-event"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#d548ec] hover:bg-[#c030d6] text-white rounded-xl transition-colors"
                    >
                      <Package className="w-5 h-5" />
                      Create Event
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {eventPerformance.map((event) => (
                      <div key={event.id} className="flex items-center gap-4 p-4 bg-[#0A0A0A] rounded-2xl hover:bg-[#0A0A0A]/80 transition-all duration-200 cursor-pointer group border border-gray-800/30">
                        <img
                          src={event.image}
                          alt={event.name}
                          className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover"
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-base font-semibold text-white truncate group-hover:text-[#d548ec] transition-colors">
                              {event.name}
                            </p>
                            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                              event.status === 'active' ? 'bg-green-500/20 text-green-500' : 
                              event.status === 'upcoming' ? 'bg-blue-500/20 text-blue-500' :
                              'bg-gray-500/20 text-gray-500'
                            }`}>
                              {event.status}
                            </span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>{event.date}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Ticket className="w-4 h-4" />
                              <span>{event.ticketsSold}/{event.capacity} sold</span>
                            </div>
                          </div>
                          {/* Progress bar */}
                          <div className="mt-2 w-full bg-gray-800 rounded-full h-1.5">
                            <div 
                              className="bg-gradient-to-r from-[#d548ec] to-purple-600 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${(event.ticketsSold / event.capacity) * 100}%` }}
                            />
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p className="text-base font-semibold text-white">{event.revenue} PUSH</p>
                          <p className="text-sm text-gray-500">{((event.ticketsSold / event.capacity) * 100).toFixed(0)}% sold</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Transactions */}
              <div className="bg-[#1A1A1A] border border-gray-800/50 rounded-3xl p-6 md:p-8 shadow-xl backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl md:text-2xl font-bold text-white">Recent Sales</h2>
                  <button 
                    onClick={() => {
                      setTransactionPage(1); // Reset to page 1 when refreshing
                      refetch();
                    }}
                    className="text-sm md:text-base text-[#d548ec] hover:text-[#c030d6] font-medium transition-colors flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                </div>

                {recentTransactions.length === 0 ? (
                  <div className="text-center py-12">
                    <Ticket className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg mb-2">No sales yet</p>
                    <p className="text-gray-500 text-sm">Ticket sales will appear here once customers start purchasing</p>
                  </div>
                ) : (
                  <>
                    {/* Transactions List */}
                    <div className="space-y-4">
                      {recentTransactions
                        .slice((transactionPage - 1) * transactionsPerPage, transactionPage * transactionsPerPage)
                        .map((tx) => (
                          <div key={tx.id} className="flex items-start gap-4 p-4 bg-[#0A0A0A] rounded-2xl hover:bg-[#0A0A0A]/80 transition-all duration-200 border border-gray-800/30">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                              tx.type === 'refund' ? 'bg-red-500/10' : 'bg-green-500/10'
                            }`}>
                              <Ticket className={`w-6 h-6 ${
                                tx.type === 'refund' ? 'text-red-500' : 'text-green-500'
                              }`} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-base font-semibold text-white">
                                  {tx.eventName || tx.event || 'Unknown Event'}
                                </p>
                                {tx.type === 'refund' && (
                                  <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded-full text-[10px] font-semibold text-red-500">
                                    REFUND
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-gray-500">
                                  {tx.type === 'refund' ? 'Refunded to' : 'Buyer'}: {tx.buyer.slice(0, 6)}...{tx.buyer.slice(-4)}
                                </p>
                                <span className="text-xs text-gray-600">•</span>
                                <p className="text-sm text-gray-500">{tx.tickets || 1}x ticket</p>
                              </div>
                            </div>

                            <div className="text-right flex-shrink-0">
                              <p className={`text-base font-semibold ${
                                tx.type === 'refund' ? 'text-red-500' : 'text-green-500'
                              }`}>
                                {tx.amount}
                              </p>
                              <p className="text-sm text-gray-500">{new Date(tx.timestamp).toLocaleDateString()}</p>
                            </div>
                          </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {recentTransactions.length > transactionsPerPage && (
                      <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-800">
                        <p className="text-sm text-gray-400">
                          Showing {((transactionPage - 1) * transactionsPerPage) + 1} to {Math.min(transactionPage * transactionsPerPage, recentTransactions.length)} of {recentTransactions.length} transactions
                        </p>
                        
                        <div className="flex items-center gap-2">
                          {/* Previous Button */}
                          <button
                            onClick={() => setTransactionPage(prev => Math.max(1, prev - 1))}
                            disabled={transactionPage === 1}
                            className="flex items-center gap-2 px-3 py-2 bg-[#0A0A0A] hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-800 text-white rounded-lg text-sm font-medium transition-all"
                          >
                            <ChevronLeft className="w-4 h-4" />
                            <span className="hidden sm:inline">Previous</span>
                          </button>

                          {/* Page Numbers */}
                          <div className="flex items-center gap-1">
                            {Array.from({ length: Math.ceil(recentTransactions.length / transactionsPerPage) }, (_, i) => i + 1)
                              .filter(page => {
                                // Show first page, last page, current page, and pages around current
                                const totalPages = Math.ceil(recentTransactions.length / transactionsPerPage);
                                return page === 1 || 
                                       page === totalPages || 
                                       Math.abs(page - transactionPage) <= 1;
                              })
                              .map((page, index, array) => (
                                <div key={page} className="flex items-center gap-1">
                                  {/* Show ellipsis if there's a gap */}
                                  {index > 0 && array[index - 1] !== undefined && page - array[index - 1]! > 1 && (
                                    <span className="px-2 text-gray-500">...</span>
                                  )}
                                  
                                  <button
                                    onClick={() => setTransactionPage(page)}
                                    className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                                      transactionPage === page
                                        ? 'bg-[#d548ec] text-white'
                                        : 'bg-[#0A0A0A] text-gray-400 hover:bg-gray-800 hover:text-white border border-gray-800'
                                    }`}
                                  >
                                    {page}
                                  </button>
                                </div>
                              ))}
                          </div>

                          {/* Next Button */}
                          <button
                            onClick={() => setTransactionPage(prev => Math.min(Math.ceil(recentTransactions.length / transactionsPerPage), prev + 1))}
                            disabled={transactionPage === Math.ceil(recentTransactions.length / transactionsPerPage)}
                            className="flex items-center gap-2 px-3 py-2 bg-[#0A0A0A] hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-800 text-white rounded-lg text-sm font-medium transition-all"
                          >
                            <span className="hidden sm:inline">Next</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* Advanced Analytics View */}
        {activeView === 'analytics' && (
          <AdvancedAnalytics 
            userId={wallet?.address || ''} 
            eoStats={eoStats}
            revenueData={revenueData}
          />
        )}
      </div>
    </AppLayout>
  );
};

export default EOPortfolio;
