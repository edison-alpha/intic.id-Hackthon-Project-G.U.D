import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  Activity,
  BarChart3,
  Target,
  Zap,
  Award,
  Eye,
  Users2,
  Clock,
  MapPin,
  Ticket
} from 'lucide-react';

// Mock data for advanced analytics
const mockAnalyticsData = {
  portfolio: {
    totalValue: 1250.50,
    totalChange: 12.5,
    totalTickets: 24,
    activeEvents: 6,
    stakingRewards: 125.50,
    monthlyROI: 8.7
  },
  spending: {
    monthly: [
      { month: 'Jan', spending: 450, rewards: 20, events: 3, ticketsSold: 5 },
      { month: 'Feb', spending: 680, rewards: 35, events: 4, ticketsSold: 8 },
      { month: 'Mar', spending: 520, rewards: 28, events: 2, ticketsSold: 6 },
      { month: 'Apr', spending: 890, rewards: 45, events: 5, ticketsSold: 12 },
      { month: 'May', spending: 1200, rewards: 65, events: 6, ticketsSold: 15 },
      { month: 'Jun', spending: 980, rewards: 52, events: 4, ticketsSold: 11 }
    ],
    byCategory: [
      { category: 'Music', amount: 2850, percentage: 45, color: '#d548ec' },
      { category: 'Sports', amount: 1900, percentage: 30, color: '#8B5CF6' },
      { category: 'Conferences', amount: 950, percentage: 15, color: '#3B82F6' },
      { category: 'Theater', amount: 630, percentage: 10, color: '#10B981' }
    ],
    byTier: [
      { tier: 'VIP', count: 8, value: 4200, color: '#FFD700' },
      { tier: 'Premium', count: 12, value: 2100, color: '#C0C0C0' },
      { tier: 'General', count: 18, value: 900, color: '#CD7F32' }
    ]
  },
  events: {
    attendance: [
      { month: 'Jan', attended: 3, missed: 0, upcoming: 2 },
      { month: 'Feb', attended: 4, missed: 1, upcoming: 3 },
      { month: 'Mar', attended: 2, missed: 0, upcoming: 1 },
      { month: 'Apr', attended: 5, missed: 0, upcoming: 4 },
      { month: 'May', attended: 6, missed: 1, upcoming: 5 },
      { month: 'Jun', attended: 4, missed: 0, upcoming: 6 }
    ],
    satisfaction: [
      { event: 'Summer Festival', rating: 4.8, category: 'Music' },
      { event: 'NBA Finals', rating: 4.9, category: 'Sports' },
      { event: 'Tech Conference', rating: 4.2, category: 'Conference' },
      { event: 'Jazz Night', rating: 4.6, category: 'Music' }
    ],
    geography: [
      { location: 'New York', count: 8, value: 3200 },
      { location: 'Los Angeles', count: 6, value: 2400 },
      { location: 'Chicago', count: 4, value: 1600 },
      { location: 'Miami', count: 3, value: 1200 },
      { location: 'Austin', count: 3, value: 900 }
    ]
  },
  market: {
    priceHistory: [
      { date: '2025-01', avgPrice: 45.2, volume: 12000, sales: 245 },
      { date: '2025-02', avgPrice: 48.7, volume: 15000, sales: 289 },
      { date: '2025-03', avgPrice: 52.1, volume: 18000, sales: 334 },
      { date: '2025-04', avgPrice: 49.8, volume: 16500, sales: 312 },
      { date: '2025-05', avgPrice: 55.3, volume: 21000, sales: 398 },
      { date: '2025-06', avgPrice: 58.9, volume: 24000, sales: 445 }
    ],
    topEvents: [
      { name: 'Summer Music Festival', totalSales: 15000, avgPrice: 125.5, growth: 24.5 },
      { name: 'NBA Championship', totalSales: 12000, avgPrice: 189.2, growth: 18.7 },
      { name: 'Web3 Conference', totalSales: 8500, avgPrice: 75.8, growth: 31.2 },
      { name: 'Jazz Festival', totalSales: 6200, avgPrice: 95.4, growth: 12.3 }
    ],
    trends: [
      { category: 'Music', growth: 28.5, volume: 45000 },
      { category: 'Sports', growth: 15.2, volume: 32000 },
      { category: 'Conference', growth: 42.1, volume: 18000 },
      { category: 'Theater', growth: 8.7, volume: 12000 }
    ]
  },
  social: {
    engagement: [
      { metric: 'Profile Views', value: 1250, change: 15.2 },
      { metric: 'Badge Shares', value: 89, change: 32.1 },
      { metric: 'Event Reviews', value: 24, change: 8.7 },
      { metric: 'Referrals', value: 12, change: 25.0 }
    ],
    referrals: [
      { month: 'Jan', referrals: 2, rewards: 50 },
      { month: 'Feb', referrals: 3, rewards: 75 },
      { month: 'Mar', referrals: 1, rewards: 25 },
      { month: 'Apr', referrals: 4, rewards: 100 },
      { month: 'May', referrals: 2, rewards: 50 },
      { month: 'Jun', referrals: 3, rewards: 75 }
    ],
    badges: [
      { badge: 'Event Attendee', level: 3, progress: 75, maxLevel: 5 },
      { badge: 'Community Champion', level: 2, progress: 40, maxLevel: 3 },
      { badge: 'Early Adopter', level: 1, progress: 100, maxLevel: 1 },
      { badge: 'Referral Master', level: 2, progress: 60, maxLevel: 4 }
    ]
  },
  predictions: {
    portfolioGrowth: [
      { month: 'Jul', predicted: 9200, confidence: 85 },
      { month: 'Aug', predicted: 9850, confidence: 78 },
      { month: 'Sep', predicted: 10500, confidence: 72 },
      { month: 'Oct', predicted: 11200, confidence: 68 },
      { month: 'Nov', predicted: 11800, confidence: 65 },
      { month: 'Dec', predicted: 12500, confidence: 62 }
    ],
    marketTrends: [
      { category: 'Music', prediction: 'bullish', confidence: 87, reason: 'Summer festival season approaching' },
      { category: 'Sports', prediction: 'neutral', confidence: 72, reason: 'Off-season for major sports' },
      { category: 'Conference', prediction: 'bullish', confidence: 91, reason: 'Rising Web3 adoption' },
      { category: 'Theater', prediction: 'bearish', confidence: 65, reason: 'Seasonal decline expected' }
    ]
  }
};

interface AnalyticsData {
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
    byCategory: Array<{
      category: string;
      amount: number;
      percentage: number;
      color: string;
    }>;
    byTier: Array<{
      tier: string;
      count: number;
      value: number;
      color: string;
    }>;
  };
  events: {
    attendance: Array<{
      month: string;
      attended: number;
      missed: number;
      upcoming: number;
    }>;
    satisfaction: Array<{
      event: string;
      rating: number;
      category: string;
    }>;
    geography: Array<{
      location: string;
      count: number;
      value: number;
    }>;
  };
  market: {
    priceHistory: Array<{
      date: string;
      avgPrice: number;
      volume: number;
      sales: number;
    }>;
    topEvents: Array<{
      name: string;
      totalSales: number;
      avgPrice: number;
      growth: number;
    }>;
    trends: Array<{
      category: string;
      growth: number;
      volume: number;
    }>;
  };
  social: {
    engagement: Array<{
      metric: string;
      value: number;
      change: number;
    }>;
    referrals: Array<{
      month: string;
      referrals: number;
      rewards: number;
    }>;
    badges: Array<{
      badge: string;
      level: number;
      progress: number;
      maxLevel: number;
    }>;
  };
  predictions: {
    portfolioGrowth: Array<{
      month: string;
      predicted: number;
      confidence: number;
    }>;
    marketTrends: Array<{
      category: string;
      prediction: 'bullish' | 'bearish' | 'neutral';
      confidence: number;
      reason: string;
    }>;
  };
}

interface AdvancedAnalyticsProps {
  userId?: string;
  className?: string;
  eoStats?: {
    totalRevenue: number;
    revenueChange: number;
    totalEvents: number;
    activeEvents: number;
    totalTicketsSold: number;
    ticketsChange: number;
    avgTicketPrice: number;
    totalAttendees: number;
  };
  revenueData?: Array<{
    month: string;
    revenue: number;
    tickets: number;
  }>;
}

export const AdvancedAnalytics: React.FC<AdvancedAnalyticsProps> = ({
  userId,
  className = '',
  eoStats,
  revenueData: propRevenueData
}) => {
  const [data, setData] = useState<AnalyticsData>(mockAnalyticsData);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'spending' | 'events' | 'market' | 'social' | 'predictions'>('overview');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  // Update data when props change
  useEffect(() => {
    if (eoStats && propRevenueData) {
      setData(prevData => ({
        ...prevData,
        portfolio: {
          totalValue: eoStats.totalRevenue,
          totalChange: eoStats.revenueChange,
          totalTickets: eoStats.totalTicketsSold,
          activeEvents: eoStats.activeEvents,
          stakingRewards: prevData.portfolio.stakingRewards, // Keep mock for now
          monthlyROI: prevData.portfolio.monthlyROI, // Keep mock for now
        },
        spending: {
          ...prevData.spending,
          monthly: propRevenueData.map(item => ({
            month: item.month,
            spending: item.revenue,
            rewards: 0,
            events: 0,
            ticketsSold: item.tickets,
          })),
        },
      }));
    }
  }, [eoStats, propRevenueData]);

  // Simulate loading
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  if (loading || !data) {
    return (
      <div className={`animate-pulse space-y-4 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-700 rounded-lg"></div>
          ))}
        </div>
        <div className="h-64 bg-gray-700 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Advanced Analytics</h2>
        <div className="flex gap-2">
          {(['7d', '30d', '90d', '1y'] as const).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
              className={timeRange === range ? 'bg-[#d548ec]' : ''}
            >
              {range}
            </Button>
          ))}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-[#1A1A1A] border border-gray-800 rounded-lg p-1 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'spending', label: 'Spending', icon: DollarSign },
          { id: 'events', label: 'Events', icon: Calendar },
          { id: 'market', label: 'Market', icon: TrendingUp },
          { id: 'social', label: 'Social', icon: Users2 },
          { id: 'predictions', label: 'Predictions', icon: Target }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[#d548ec] text-white'
                : 'text-gray-400 hover:text-white hover:bg-[#0A0A0A]'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {[
              { label: 'Total Value', value: formatCurrency(data.portfolio.totalValue), change: data.portfolio.totalChange, icon: DollarSign, color: 'from-[#d548ec] to-[#e7a4fd]' },
              { label: 'Total Tickets', value: data.portfolio.totalTickets.toString(), change: 8.3, icon: Activity, color: 'from-blue-500 to-blue-600' },
              { label: 'Active Events', value: data.portfolio.activeEvents.toString(), change: 15.7, icon: Calendar, color: 'from-green-500 to-green-600' },
              { label: 'Staking Rewards', value: formatCurrency(data.portfolio.stakingRewards), change: 22.1, icon: Award, color: 'from-purple-500 to-purple-600' },
              { label: 'Monthly ROI', value: formatPercentage(data.portfolio.monthlyROI), change: 5.2, icon: TrendingUp, color: 'from-yellow-500 to-yellow-600' },
              { label: 'Attendance Rate', value: '94.2%', change: 2.8, icon: Target, color: 'from-pink-500 to-pink-600' }
            ].map((kpi, index) => (
              <Card key={index} className="bg-[#1A1A1A] border-gray-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${kpi.color} flex items-center justify-center`}>
                      <kpi.icon className="w-4 h-4 text-white" />
                    </div>
                    <div className={`flex items-center gap-1 text-xs ${
                      kpi.change > 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {kpi.change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {formatPercentage(kpi.change)}
                    </div>
                  </div>
                  <p className="text-gray-400 text-xs mb-1">{kpi.label}</p>
                  <p className="text-white font-bold text-lg">{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Portfolio Performance Chart */}
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Portfolio Performance</CardTitle>
              <CardDescription>Your spending and rewards over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.spending.monthly}>
                  <defs>
                    <linearGradient id="colorSpending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d548ec" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#d548ec" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorRewards" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1A1A1A',
                      border: '1px solid #374151',
                      borderRadius: '8px',
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
                    stackId="1"
                    stroke="#d548ec"
                    fillOpacity={1}
                    fill="url(#colorSpending)"
                    name="Spending (PUSH)"
                  />
                  <Area
                    type="monotone"
                    dataKey="rewards"
                    stackId="2"
                    stroke="#10B981"
                    fillOpacity={1}
                    fill="url(#colorRewards)"
                    name="Rewards (PUSH)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Spending Analysis Tab */}
      {activeTab === 'spending' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Distribution */}
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Spending by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={data.spending.byCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="amount"
                  >
                    {data.spending.byCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1A1A1A',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {data.spending.byCategory.map((category) => (
                  <div key={category.category} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm text-gray-400">{category.category}</span>
                    <span className="text-sm font-semibold text-white ml-auto">
                      {category.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tier Distribution */}
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Tickets by Tier</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.spending.byTier}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="tier" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1A1A1A',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Bar dataKey="value" fill="#d548ec" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Monthly Spending Trend */}
          <Card className="bg-[#1A1A1A] border-gray-800 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-white">Monthly Spending Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.spending.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1A1A1A',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="spending" stroke="#d548ec" strokeWidth={3} name="Spending" />
                  <Line type="monotone" dataKey="events" stroke="#8B5CF6" strokeWidth={3} name="Events Attended" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Events Analysis Tab */}
      {activeTab === 'events' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attendance Tracking */}
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Event Attendance</CardTitle>
              <CardDescription>Your attendance history and upcoming events</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.events.attendance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1A1A1A',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="attended" fill="#10B981" name="Attended" />
                  <Bar dataKey="missed" fill="#EF4444" name="Missed" />
                  <Bar dataKey="upcoming" fill="#3B82F6" name="Upcoming" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Satisfaction Ratings */}
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Event Satisfaction</CardTitle>
              <CardDescription>Ratings from events you've attended</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={data.events.satisfaction}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis dataKey="event" stroke="#9CA3AF" />
                  <PolarRadiusAxis angle={30} domain={[0, 5]} stroke="#9CA3AF" />
                  <Radar
                    name="Rating"
                    dataKey="rating"
                    stroke="#d548ec"
                    fill="#d548ec"
                    fillOpacity={0.6}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1A1A1A',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Geography Distribution */}
          <Card className="bg-[#1A1A1A] border-gray-800 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-white">Geographic Distribution</CardTitle>
              <CardDescription>Events attended by location</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {data.events.geography.map((location) => (
                    <div key={location.location} className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg">
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-[#d548ec]" />
                        <span className="text-white font-medium">{location.location}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-semibold">{location.count} events</p>
                        <p className="text-gray-400 text-sm">${location.value.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={data.events.geography}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="count"
                    >
                      {data.events.geography.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`#${Math.floor(Math.random()*16777215).toString(16)}`} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1A1A1A',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Market Analysis Tab */}
      {activeTab === 'market' && (
        <div className="space-y-6">
          {/* Price History */}
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Market Price History</CardTitle>
              <CardDescription>Average ticket prices and market volume</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.market.priceHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1A1A1A',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="avgPrice"
                    stroke="#d548ec"
                    fill="#d548ec"
                    fillOpacity={0.3}
                    name="Avg Price ($)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Events and Market Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-[#1A1A1A] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Top Performing Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.market.topEvents.map((event, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg">
                      <div>
                        <p className="text-white font-medium">{event.name}</p>
                        <p className="text-gray-400 text-sm">${event.totalSales.toLocaleString()} total sales</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-medium">${event.avgPrice.toFixed(2)}</p>
                        <div className={`flex items-center gap-1 text-sm ${
                          event.growth > 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {event.growth > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {formatPercentage(event.growth)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#1A1A1A] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Category Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.market.trends} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" stroke="#9CA3AF" />
                    <YAxis dataKey="category" type="category" stroke="#9CA3AF" width={80} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1A1A1A',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Bar dataKey="growth" fill="#d548ec" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Social Engagement Tab */}
      {activeTab === 'social' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Engagement Metrics */}
          <Card className="bg-[#1A1A1A] border-gray-800 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-white">Social Engagement</CardTitle>
              <CardDescription>Your profile and community engagement metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.social.engagement.map((metric, index) => (
                  <div key={index} className="p-4 bg-[#0A0A0A] rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-white font-medium">{metric.metric}</h3>
                      <div className={`flex items-center gap-1 text-sm ${
                        metric.change > 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {metric.change > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {formatPercentage(metric.change)}
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-white">{metric.value.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Referral Tracking */}
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Referral Program</CardTitle>
              <CardDescription>Track your referrals and rewards</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={data.social.referrals}>
                  <defs>
                    <linearGradient id="colorReferrals" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d548ec" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#d548ec" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorRewards" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1A1A1A',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="referrals"
                    stroke="#d548ec"
                    fillOpacity={1}
                    fill="url(#colorReferrals)"
                    name="Referrals"
                  />
                  <Area
                    type="monotone"
                    dataKey="rewards"
                    stroke="#10B981"
                    fillOpacity={1}
                    fill="url(#colorRewards)"
                    name="Rewards ($)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Achievement Badges */}
          <Card className="bg-[#1A1A1A] border-gray-800 lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-white">Achievement Badges</CardTitle>
              <CardDescription>Your earned badges and progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {data.social.badges.map((badge, index) => (
                  <div key={index} className="p-4 bg-[#0A0A0A] rounded-lg border border-gray-800">
                    <div className="flex items-center justify-between mb-3">
                      <Badge className="bg-[#d548ec] text-white">
                        Lvl {badge.level}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {badge.progress}/{badge.maxLevel * 25} XP
                      </span>
                    </div>
                    <h3 className="text-white font-semibold mb-2">{badge.badge}</h3>
                    <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                      <div
                        className="bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] h-2 rounded-full"
                        style={{ width: `${(badge.progress / (badge.maxLevel * 25)) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-400">
                      {badge.maxLevel - badge.level} levels to go
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Predictions Tab */}
      {activeTab === 'predictions' && (
        <div className="space-y-6">
          {/* Portfolio Growth Prediction */}
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-[#d548ec]" />
                Portfolio Growth Prediction
              </CardTitle>
              <CardDescription>AI-powered forecast based on market trends and your activity</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.predictions.portfolioGrowth}>
                  <defs>
                    <linearGradient id="colorPrediction" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1A1A1A',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="predicted"
                    stroke="#8B5CF6"
                    fillOpacity={1}
                    fill="url(#colorPrediction)"
                    name="Predicted Value"
                  />
                  <Line
                    type="monotone"
                    dataKey="confidence"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="Confidence %"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Market Trend Predictions */}
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Market Trend Predictions</CardTitle>
              <CardDescription>Category-wise market sentiment analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.predictions.marketTrends.map((trend, index) => (
                  <div key={index} className="p-4 bg-[#0A0A0A] border border-gray-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-white font-medium">{trend.category}</h3>
                      <Badge
                        className={
                          trend.prediction === 'bullish' ? 'bg-green-500' :
                          trend.prediction === 'bearish' ? 'bg-red-500' :
                          'bg-gray-500'
                        }
                      >
                        {trend.prediction}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-gray-400 text-sm">Confidence:</span>
                      <div className="flex-1 bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-[#d548ec] h-2 rounded-full"
                          style={{ width: `${trend.confidence}%` }}
                        />
                      </div>
                      <span className="text-white text-sm font-medium">{trend.confidence}%</span>
                    </div>
                    <p className="text-gray-400 text-sm">{trend.reason}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdvancedAnalytics;