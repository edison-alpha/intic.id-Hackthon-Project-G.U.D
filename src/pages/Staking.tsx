import React, { useState } from "react";
import AppLayout from "@/components/AppLayout";
import STXIcon from "@/components/STXIcon";
import { 
  TrendingUp, 
  Clock, 
  Award, 
  Lock, 
  Unlock,
  Info,
  Calculator,
  ChevronRight,
  Zap,
  Trophy,
  Gift,
  Flame,
  Star,
  ArrowRight,
  BarChart3,
  Sparkles
} from "lucide-react";

const Staking = () => {
  const [activeTab, setActiveTab] = useState<"stake" | "unstake">("stake");
  const [selectedPool, setSelectedPool] = useState<string>("fixed-30");
  const [stakeAmount, setStakeAmount] = useState<string>("");

  // Mock data - replace with actual PushChain blockchain data
  const userStats = {
    totalStaked: 2500,
    currentTier: "Silver",
    rewards: 125.50,
    apy: 18.5,
    walletBalance: 5000
  };

  const stakingPools = [
    {
      id: "flexible",
      name: "Flexible",
      apy: "10%",
      lockPeriod: "No Lock",
      minStake: 10,
      description: "Withdraw anytime with no penalties on PushChain",
      features: ["Instant withdrawal", "Daily rewards", "No commitment"],
      icon: Unlock,
      gradient: "from-blue-500 via-blue-600 to-cyan-500",
      badge: "Safe"
    },
    {
      id: "fixed-30",
      name: "30 Days",
      apy: "18%",
      lockPeriod: "30 Days",
      minStake: 50,
      description: "Balanced rewards with medium lock period",
      features: ["18% APY", "Priority support", "Bonus rewards"],
      icon: Lock,
      gradient: "from-purple-500 via-purple-600 to-pink-500",
      popular: true,
      badge: "Most Popular"
    },
    {
      id: "fixed-90",
      name: "90 Days",
      apy: "30%",
      lockPeriod: "90 Days",
      minStake: 100,
      description: "Maximum returns for long-term holders",
      features: ["30% APY", "NFT Badge", "Governance rights"],
      icon: Trophy,
      gradient: "from-[#e7a4fd] via-red-500 to-pink-500",
      badge: "Max Rewards"
    }
  ];

  const tiers = [
    {
      name: "Bronze",
      range: "10-50 PC",
      discount: "5%",
      earlyAccess: "Basic",
      color: "from-amber-700 to-amber-500",
      icon: "🥉"
    },
    {
      name: "Silver",
      range: "50-200 PC",
      discount: "10%",
      earlyAccess: "24 hours",
      color: "from-gray-400 to-gray-300",
      icon: "🥈",
      current: true
    },
    {
      name: "Gold",
      range: "200-500 PC",
      discount: "15%",
      earlyAccess: "48 hours",
      color: "from-yellow-500 to-yellow-300",
      icon: "🥇"
    },
    {
      name: "Platinum",
      range: "500+ PC",
      discount: "20%",
      earlyAccess: "72 hours",
      color: "from-cyan-400 to-blue-300",
      icon: "💎"
    }
  ];

  const calculateRewards = () => {
    if (!stakeAmount || isNaN(Number(stakeAmount))) return "0.00";
    const amount = Number(stakeAmount);
    const pool = stakingPools.find(p => p.id === selectedPool);
    const apy = parseFloat(pool?.apy || "0") / 100;
    return (amount * apy / 12).toFixed(2); // Monthly estimate in PC
  };

  const handleStake = () => {
    // Add actual staking logic here
  };

  return (
    <AppLayout>
      <div className="px-4 pb-6 md:px-6 md:pb-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d548ec] to-purple-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-bold text-white">Staking</h1>
                <span className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/40 rounded-full text-yellow-400 text-xs font-bold">
                  COMING SOON
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-0.5">Earn rewards by staking your tokens</p>
            </div>
          </div>
        </div>

        {/* Stats Overview - Modern Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          <div className="bg-[#0A0A0A] border-2 border-gray-800 rounded-xl p-4 hover:border-[#d548ec]/50 transition-all group">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Lock className="w-4 h-4 group-hover:text-[#d548ec] transition-colors" />
              <span className="text-xs font-medium">Total Staked</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-2xl md:text-3xl font-bold text-white">{userStats.totalStaked.toFixed(2)}</p>
              <STXIcon size="md" />
            </div>
            <p className="text-xs text-gray-500">≈ ${(userStats.totalStaked * 0.15).toFixed(2)} USD</p>
          </div>

          <div className="bg-[#0A0A0A] border-2 border-gray-800 rounded-xl p-4 hover:border-[#d548ec]/50 transition-all group">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Award className="w-4 h-4 group-hover:text-purple-500 transition-colors" />
              <span className="text-xs font-medium">Your Tier</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🥈</span>
              <p className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-300 to-gray-500 bg-clip-text text-transparent">
                {userStats.currentTier}
              </p>
            </div>
            <p className="text-xs text-green-500 font-medium">10% discount active</p>
          </div>

          <div className="bg-[#0A0A0A] border-2 border-gray-800 rounded-xl p-4 hover:border-green-500/50 transition-all group">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Gift className="w-4 h-4 group-hover:text-[#d548ec] transition-colors" />
              <span className="text-xs font-medium">Rewards</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-2xl md:text-3xl font-bold text-[#d548ec]">{userStats.rewards.toFixed(2)}</p>
              <STXIcon size="md" />
            </div>
            <button className="text-xs text-[#d548ec] hover:text-white font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
              Claim Now <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="bg-[#0A0A0A] border-2 border-gray-800 rounded-xl p-4 hover:border-[#d548ec]/50 transition-all group">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <BarChart3 className="w-4 h-4 group-hover:text-green-500 transition-colors" />
              <span className="text-xs font-medium">Average APY</span>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-green-500 mb-1">{userStats.apy}%</p>
            <p className="text-xs text-gray-500">Annual Percentage Yield</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Staking Pools - Modern Grid */}
            <div className="bg-[#0A0A0A] border-2 border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Select Pool</h2>
                  <p className="text-sm text-gray-400">Choose the best option for your strategy</p>
                </div>
                <Sparkles className="w-6 h-6 text-[#d548ec]" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stakingPools.map((pool) => {
                  const Icon = pool.icon;
                  const isSelected = selectedPool === pool.id;
                  return (
                    <div
                      key={pool.id}
                      onClick={() => setSelectedPool(pool.id)}
                      className={`relative bg-gradient-to-br ${pool.gradient} p-[1px] rounded-2xl cursor-pointer transition-all hover:scale-105 ${
                        isSelected ? "ring-2 ring-[#d548ec] ring-offset-2 ring-offset-[#0A0A0A]" : ""
                      }`}
                    >
                      <div className="bg-[#0A0A0A] rounded-2xl p-5 h-full">
                        {/* Badge */}
                        {pool.popular ? (
                          <div className="flex items-center gap-1 mb-3">
                            <Flame className="w-3 h-3 text-[#d548ec]" />
                            <span className="text-xs font-bold text-[#d548ec]">{pool.badge}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 mb-3">
                            <span className="text-xs font-medium text-gray-500">{pool.badge}</span>
                          </div>
                        )}
                        
                        {/* Icon */}
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${pool.gradient} flex items-center justify-center mb-4`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        
                        {/* Pool Name */}
                        <h3 className="text-xl font-bold text-white mb-2">{pool.name}</h3>
                        
                        {/* APY - Large */}
                        <div className="mb-3">
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-bold bg-gradient-to-r ${pool.gradient} bg-clip-text text-transparent">
                              {pool.apy}
                            </span>
                            <span className="text-sm text-gray-400 font-medium">APY</span>
                          </div>
                        </div>
                        
                        {/* Description */}
                        <p className="text-xs text-gray-400 mb-4 min-h-[32px]">{pool.description}</p>
                        
                        {/* Details */}
                        <div className="space-y-2 pt-3 border-t border-gray-800">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">Lock Period</span>
                            <span className="text-white font-semibold">{pool.lockPeriod}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">Min Stake</span>
                            <div className="flex items-center gap-1">
                              <span className="text-white font-semibold">{pool.minStake}</span>
                              <STXIcon size="sm" />
                            </div>
                          </div>
                        </div>
                        
                        {/* Selected Indicator */}
                        {isSelected && (
                          <div className="mt-4 flex items-center gap-2 text-xs font-medium text-[#d548ec]">
                            <div className="w-2 h-2 rounded-full bg-[#d548ec] animate-pulse"></div>
                            Selected
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stake/Unstake Interface - Modern Design */}
            <div className="bg-[#0A0A0A] border-2 border-gray-800 rounded-xl p-6">
              {/* Tabs */}
              <div className="flex gap-2 mb-6 p-1 bg-black/50 rounded-lg border border-gray-800">
                <button
                  onClick={() => setActiveTab("stake")}
                  className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-all ${
                    activeTab === "stake"
                      ? "bg-[#d548ec] text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Stake Tokens
                </button>
                <button
                  onClick={() => setActiveTab("unstake")}
                  className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-all ${
                    activeTab === "unstake"
                      ? "bg-[#d548ec] text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Unstake Tokens
                </button>
              </div>

              <div className="space-y-5">
                {/* Amount Input */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-300">Amount</label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-500">Balance: {userStats.walletBalance.toFixed(2)}</span>
                      <STXIcon size="sm" />
                    </div>
                  </div>
                  <div className="relative bg-[#0A0A0A] border-2 border-gray-800 rounded-xl p-4 focus-within:border-[#d548ec] transition-colors">
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={stakeAmount}
                        onChange={(e) => setStakeAmount(e.target.value)}
                        placeholder="0.00"
                        className="flex-1 bg-transparent text-3xl font-bold text-white focus:outline-none"
                      />
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                        <STXIcon size="sm" />
                        <span className="text-sm font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">PUSH</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-sm text-gray-500">≈ ${(Number(stakeAmount) * 0.15 || 0).toFixed(2)} USD</span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setStakeAmount((userStats.walletBalance * 0.25).toFixed(2))}
                          className="px-3 py-1 text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                        >
                          25%
                        </button>
                        <button 
                          onClick={() => setStakeAmount((userStats.walletBalance * 0.5).toFixed(2))}
                          className="px-3 py-1 text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                        >
                          50%
                        </button>
                        <button 
                          onClick={() => setStakeAmount(userStats.walletBalance.toFixed(2))}
                          className="px-3 py-1 text-xs font-medium bg-[#d548ec] hover:bg-[#c030d6] text-white rounded-lg transition-colors"
                        >
                          MAX
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Estimated Rewards - Enhanced */}
                <div className="bg-gradient-to-br from-purple-500/10 to-[#d548ec]/10 border border-purple-500/20 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-purple-400" />
                      <span className="text-sm font-medium text-gray-300">Estimated Rewards</span>
                    </div>
                    <Info className="w-4 h-4 text-gray-500" />
                  </div>
                  
                                    <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-[#d548ec] bg-clip-text text-transparent">
                        {calculateRewards()}
                      </span>
                      <STXIcon size="md" />
                      <span className="text-sm text-gray-400">/ month</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 pt-3 border-t border-purple-500/20">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Daily</p>
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-semibold text-white">{(Number(calculateRewards()) / 30).toFixed(2)}</p>
                          <STXIcon size="sm" />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Yearly</p>
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-semibold text-white">{(Number(calculateRewards()) * 12).toFixed(2)}</p>
                          <STXIcon size="sm" />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">USD Value</p>
                        <p className="text-sm font-semibold text-green-500">${(Number(calculateRewards()) * 0.15).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Button - Enhanced */}
                <button
                  onClick={handleStake}
                  disabled={!stakeAmount || Number(stakeAmount) <= 0}
                  className="w-full bg-[#d548ec] hover:bg-[#c030d6] disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold py-5 rounded-xl transition-all group"
                >
                  <span className="flex items-center justify-center gap-2">
                    {activeTab === "stake" ? "Stake Tokens" : "Unstake Tokens"}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>

                {/* Info Text */}
                <p className="text-xs text-center text-gray-500">
                  By staking, you agree to the lock period. Early withdrawal may incur penalties.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Tier System & Benefits */}
          <div className="space-y-6">
            {/* Current Tier - Enhanced */}
            <div className="bg-[#0A0A0A] border-2 border-gray-800 rounded-xl p-6 overflow-hidden relative">
              {/* Decorative Background */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-500/10 to-transparent rounded-full blur-3xl"></div>
              
              <h2 className="text-xl font-bold text-white mb-6 relative">Your Tier Status</h2>
              
              <div className="bg-gradient-to-br from-gray-400 via-gray-300 to-gray-500 rounded-xl p-6 mb-6 relative overflow-hidden">
                {/* Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12"></div>
                
                <div className="text-center relative z-10">
                  <span className="text-7xl mb-3 block drop-shadow-lg">🥈</span>
                  <h3 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">Silver</h3>
                  <p className="text-sm text-white/90 font-medium">501-2,000 tokens staked</p>
                </div>
              </div>

              {/* Benefits List */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3 p-3 bg-black/30 rounded-lg border border-gray-800">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">💰</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400">Ticket Discount</p>
                    <p className="text-lg font-bold text-white">10% OFF</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-black/30 rounded-lg border border-gray-800">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">⚡</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400">Early Access</p>
                    <p className="text-lg font-bold text-white">24 Hours</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-black/30 rounded-lg border border-gray-800">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">🎫</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400">Priority Support</p>
                    <p className="text-lg font-bold text-white">Enabled</p>
                  </div>
                </div>
              </div>

              {/* Progress to Next Tier */}
              <div className="p-4 bg-[#d548ec]/10 border-2 border-[#d548ec]/20 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-300">Next: Gold Tier</span>
                  <span className="text-xs text-yellow-500 font-bold">UNLOCKED! 🎉</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-yellow-500 to-[#e7a4fd] h-2.5 rounded-full animate-pulse" style={{ width: "100%" }}></div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  <span className="text-white font-semibold">{userStats.totalStaked}</span> / 2,001 tokens
                </p>
              </div>
            </div>

            {/* All Tiers - Compact */}
            <div className="bg-[#0A0A0A] border-2 border-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">All Tiers</h2>
              
              <div className="space-y-3">
                {tiers.map((tier) => (
                  <div
                    key={tier.name}
                    className={`bg-black/30 border-2 rounded-lg p-4 transition-all hover:scale-[1.02] ${
                      tier.current ? "border-[#d548ec]" : "border-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tier.color} flex items-center justify-center text-2xl shadow-lg`}>
                        {tier.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-lg">{tier.name}</h3>
                          {tier.current && (
                            <span className="text-xs bg-[#d548ec] text-white px-2 py-0.5 rounded-full font-bold">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 font-medium">{tier.range} tokens</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 text-xs">
                      <div className="flex items-center gap-1.5 text-green-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                        <span className="font-semibold">{tier.discount}</span> discount
                      </div>
                      <div className="flex items-center gap-1.5 text-blue-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                        <span className="font-semibold">{tier.earlyAccess}</span> early
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Info Card - Modern */}
            <div className="bg-[#d548ec]/5 border-2 border-[#d548ec]/20 rounded-xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#d548ec]/20 flex items-center justify-center flex-shrink-0">
                  <Info className="w-5 h-5 text-[#d548ec]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Why Stake?</h3>
                  <p className="text-xs text-gray-400">Unlock exclusive benefits and earn passive rewards</p>
                </div>
              </div>
              
              <ul className="space-y-2.5 text-xs text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Earn up to <strong className="text-white">30% APY</strong> rewards</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Get <strong className="text-white">exclusive discounts</strong> on tickets</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span><strong className="text-white">Early access</strong> to hot events</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Participate in <strong className="text-white">governance</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Build <strong className="text-white">Proof of Fandom</strong> NFTs</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Staking;
