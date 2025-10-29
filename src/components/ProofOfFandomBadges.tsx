import React, { useState, useMemo, useCallback, memo } from "react";
import { Award, Star, TrendingUp, Zap, Crown, CheckCircle2, Lock, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface NFTBadge {
  id: string;
  name: string;
  description: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  requirement: string;
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  mintDate?: string;
  nftId?: string;
  image: string;
  perks: string[];
}

// Memoized Badge Card Component
const BadgeCard = memo(({
  badge,
  onClick,
  onMint,
  tierColor,
  tierBorderColor
}: {
  badge: NFTBadge;
  onClick: () => void;
  onMint: (e: React.MouseEvent) => void;
  tierColor: string;
  tierBorderColor: string;
}) => {
  return (
    <div
      className={`relative p-6 bg-[#0A0A0A] border-2 ${tierBorderColor} rounded-xl hover:scale-[1.02] transition-all cursor-pointer`}
      onClick={onClick}
    >
      {/* Tier Gradient Background */}
      <div className={`absolute top-0 left-0 right-0 h-24 bg-gradient-to-b ${tierColor} opacity-20 rounded-t-xl`} />

      {/* Badge Content */}
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="text-6xl">{badge.image}</div>
          <CheckCircle2 className="w-6 h-6 text-green-500" />
        </div>

        <h4 className="text-lg font-bold text-white mb-2">{badge.name}</h4>
        <p className="text-gray-400 text-sm mb-3">{badge.description}</p>

        {/* NFT ID Badge */}
        {badge.nftId ? (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-bold rounded-lg mb-3">
            <CheckCircle2 className="w-3 h-3" />
            <span>MINTED</span>
          </div>
        ) : (
          <button
            onClick={onMint}
            className="w-full py-2 bg-[#d548ec] hover:bg-[#c030d6] text-white text-sm font-bold rounded-lg transition-colors mb-3"
          >
            Mint NFT Badge
          </button>
        )}

        {badge.mintDate && (
          <p className="text-gray-500 text-xs">Unlocked: {badge.mintDate}</p>
        )}
      </div>
    </div>
  );
});

BadgeCard.displayName = 'BadgeCard';

// Memoized Locked Badge Card Component
const LockedBadgeCard = memo(({
  badge,
  onClick,
  tierColor
}: {
  badge: NFTBadge;
  onClick: () => void;
  tierColor: string;
}) => {
  const progressPercentage = useMemo(
    () => (badge.progress / badge.maxProgress) * 100,
    [badge.progress, badge.maxProgress]
  );

  return (
    <div
      className="relative p-6 bg-[#0A0A0A] border border-gray-800 rounded-xl opacity-75 hover:opacity-90 transition-all cursor-pointer"
      onClick={onClick}
    >
      {/* Lock Overlay */}
      <div className="absolute top-4 right-4">
        <Lock className="w-5 h-5 text-gray-600" />
      </div>

      <div className="text-5xl mb-4 grayscale opacity-50">{badge.image}</div>

      <h4 className="text-lg font-bold text-gray-300 mb-2">{badge.name}</h4>
      <p className="text-gray-500 text-sm mb-3">{badge.description}</p>

      {/* Progress Bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-gray-400 text-xs">Progress</span>
          <span className="text-gray-400 text-xs font-bold">{badge.progress}/{badge.maxProgress}</span>
        </div>
        <div className="h-2 bg-black/30 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${tierColor}`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      <p className="text-gray-600 text-xs">{badge.requirement}</p>
    </div>
  );
});

LockedBadgeCard.displayName = 'LockedBadgeCard';

const ProofOfFandomBadges = () => {
  const [selectedBadge, setSelectedBadge] = useState<NFTBadge | null>(null);

  // Mock user data - Memoized to prevent re-creation on every render
  const userStats = useMemo(() => ({
    totalEvents: 8,
    totalSpent: 215,
    memberSince: "January 2025",
    nftsMinted: 2
  }), []);

  // Memoized badges data
  const badges: NFTBadge[] = useMemo(() => [
    {
      id: "first-event",
      name: "First Experience",
      description: "Attended your first event on INTIC",
      tier: "bronze",
      requirement: "Attend 1 event",
      progress: 1,
      maxProgress: 1,
      unlocked: true,
      mintDate: "March 15, 2025",
      nftId: "INTIC-POF-#00123",
      image: "🎫",
      perks: ["5% discount on next ticket", "Early access to community events"]
    },
    {
      id: "bronze-fan",
      name: "Bronze Fan",
      description: "True supporter - attended 5 events",
      tier: "bronze",
      requirement: "Attend 5 events",
      progress: 5,
      maxProgress: 5,
      unlocked: true,
      mintDate: "April 20, 2025",
      nftId: "INTIC-POF-#00456",
      image: "🥉",
      perks: ["10% staking boost", "Access to Bronze-only events", "Priority support"]
    },
    {
      id: "silver-enthusiast",
      name: "Silver Enthusiast",
      description: "Dedicated fan - attended 10 events",
      tier: "silver",
      requirement: "Attend 10 events",
      progress: 8,
      maxProgress: 10,
      unlocked: false,
      image: "🥈",
      perks: ["15% staking boost", "VIP lounge access", "Exclusive merchandise", "Early bird tickets"]
    },
    {
      id: "gold-legend",
      name: "Gold Legend",
      description: "Elite supporter - attended 25 events",
      tier: "gold",
      requirement: "Attend 25 events",
      progress: 8,
      maxProgress: 25,
      unlocked: false,
      image: "🥇",
      perks: ["25% staking boost", "Backstage passes", "Meet & greet opportunities", "Free event merchandise"]
    },
    {
      id: "platinum-icon",
      name: "Platinum Icon",
      description: "Legendary status - attended 50+ events",
      tier: "platinum",
      requirement: "Attend 50 events",
      progress: 8,
      maxProgress: 50,
      unlocked: false,
      image: "👑",
      perks: ["40% staking boost", "Lifetime VIP status", "Artist meet & greets", "Exclusive event planning input", "Custom NFT commission"]
    },
    {
      id: "big-spender",
      name: "Big Spender",
      description: "Spent 0.005+ BTC on tickets",
      tier: "gold",
      requirement: "Spend 0.005 BTC",
      progress: 215,
      maxProgress: 500,
      unlocked: false,
      image: "💰",
      perks: ["20% ticket discount", "Premium seating upgrades", "Exclusive lounge access"]
    },
    {
      id: "early-adopter",
      name: "Early Adopter",
      description: "Joined INTIC in the first month",
      tier: "platinum",
      requirement: "Join before Feb 2025",
      progress: 1,
      maxProgress: 1,
      unlocked: true,
      mintDate: "January 10, 2025",
      nftId: "INTIC-POF-#00001",
      image: "⚡",
      perks: ["Founder's badge", "30% permanent discount", "Governance voting power x2", "Exclusive founder events"]
    }
  ], []);

  // Memoized helper functions
  const getTierColor = useCallback((tier: string) => {
    const colors = {
      bronze: "from-[#e7a4fd] to-[#c030d6]",
      silver: "from-gray-400 to-gray-600",
      gold: "from-yellow-400 to-yellow-600",
      platinum: "from-purple-400 to-purple-600"
    };
    return colors[tier as keyof typeof colors] || colors.bronze;
  }, []);

  const getTierBorderColor = useCallback((tier: string) => {
    const colors = {
      bronze: "border-[#e7a4fd]",
      silver: "border-gray-400",
      gold: "border-yellow-400",
      platinum: "border-purple-500"
    };
    return colors[tier as keyof typeof colors] || colors.bronze;
  }, []);

  const handleMintBadge = useCallback((badge: NFTBadge) => {
    if (!badge.unlocked) {
      toast.error("Badge not unlocked yet!", {
        description: `Complete requirement: ${badge.requirement}`
      });
      return;
    }

    if (badge.nftId) {
      toast.info("Already minted!", {
        description: "View your NFT on Stacks Explorer"
      });
      return;
    }

    toast.success("Minting NFT Badge...", {
      description: "Transaction submitted to Stacks blockchain"
    });

    // Simulate minting delay
    setTimeout(() => {
      toast.success("NFT Badge Minted!", {
        description: "Your Proof of Fandom NFT is now in your wallet"
      });
    }, 2000);
  }, []);

  // Memoize filtered badges to prevent recalculation on every render
  const unlockedBadges = useMemo(() => badges.filter(b => b.unlocked), [badges]);
  const lockedBadges = useMemo(() => badges.filter(b => !b.unlocked), [badges]);

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-[#0A0A0A] border-2 border-gray-800 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-[#d548ec]" />
            <p className="text-gray-400 text-sm">Events Attended</p>
          </div>
          <p className="text-2xl font-bold text-white">{userStats.totalEvents}</p>
        </div>

        <div className="p-4 bg-[#0A0A0A] border-2 border-gray-800 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-purple-400" />
            <p className="text-gray-400 text-sm">Badges Unlocked</p>
          </div>
          <p className="text-2xl font-bold text-white">{unlockedBadges.length}/{badges.length}</p>
        </div>

        <div className="p-4 bg-[#0A0A0A] border-2 border-gray-800 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-yellow-400" />
            <p className="text-gray-400 text-sm">NFTs Minted</p>
          </div>
          <p className="text-2xl font-bold text-white">{userStats.nftsMinted}</p>
        </div>

        <div className="p-4 bg-[#0A0A0A] border-2 border-gray-800 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <p className="text-gray-400 text-sm">Total Spent</p>
          </div>
          <div className="flex items-center gap-1">
            <p className="text-2xl font-bold text-white">{userStats.totalSpent.toFixed(2)}</p>
            <span className="text-purple-400 text-sm font-semibold">PC</span>
          </div>
        </div>
      </div>

      {/* Unlocked Badges */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4">Unlocked Badges ({unlockedBadges.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {unlockedBadges.map((badge) => (
            <BadgeCard
              key={badge.id}
              badge={badge}
              onClick={() => setSelectedBadge(badge)}
              onMint={(e) => {
                e.stopPropagation();
                handleMintBadge(badge);
              }}
              tierColor={getTierColor(badge.tier)}
              tierBorderColor={getTierBorderColor(badge.tier)}
            />
          ))}
        </div>
      </div>

      {/* Locked Badges */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4">Locked Badges ({lockedBadges.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lockedBadges.map((badge) => (
            <LockedBadgeCard
              key={badge.id}
              badge={badge}
              onClick={() => setSelectedBadge(badge)}
              tierColor={getTierColor(badge.tier)}
            />
          ))}
        </div>
      </div>

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedBadge(null)}
        >
          <div
            className={`relative max-w-lg w-full bg-[#0A0A0A] border-2 ${getTierBorderColor(selectedBadge.tier)} rounded-2xl p-6`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedBadge(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              ✕
            </button>

            {/* Tier Gradient */}
            <div className={`absolute top-0 left-0 right-0 h-32 bg-gradient-to-b ${getTierColor(selectedBadge.tier)} opacity-20 rounded-t-2xl`} />

            <div className="relative">
              <div className="flex items-start gap-4 mb-6">
                <div className="text-7xl">{selectedBadge.image}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-3 py-1 bg-gradient-to-r ${getTierColor(selectedBadge.tier)} text-white text-xs font-bold rounded-full uppercase`}>
                      {selectedBadge.tier}
                    </span>
                    {selectedBadge.unlocked && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{selectedBadge.name}</h3>
                  <p className="text-gray-400">{selectedBadge.description}</p>
                </div>
              </div>

              {/* Perks */}
              <div className="mb-6">
                <h4 className="text-white font-bold mb-3">Perks & Benefits</h4>
                <ul className="space-y-2">
                  {selectedBadge.perks.map((perk, index) => (
                    <li key={index} className="flex items-start gap-2 text-gray-300 text-sm">
                      <Star className="w-4 h-4 text-[#d548ec] flex-shrink-0 mt-0.5" />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons */}
              {selectedBadge.unlocked ? (
                <div className="space-y-3">
                  {selectedBadge.nftId ? (
                    <>
                      <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <p className="text-green-400 text-sm font-bold mb-1">NFT ID</p>
                        <p className="text-white font-mono text-sm">{selectedBadge.nftId}</p>
                      </div>
                      <button className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                        <ExternalLink className="w-4 h-4" />
                        View on Stacks Explorer
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleMintBadge(selectedBadge)}
                      className="w-full py-3 bg-[#d548ec] hover:bg-[#c030d6] text-white font-bold rounded-lg transition-colors"
                    >
                      Mint NFT Badge
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-yellow-400 text-sm font-bold mb-2">
                    {selectedBadge.progress}/{selectedBadge.maxProgress} - {((selectedBadge.progress / selectedBadge.maxProgress) * 100).toFixed(0)}% Complete
                  </p>
                  <div className="h-3 bg-black/30 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full bg-gradient-to-r ${getTierColor(selectedBadge.tier)}`}
                      style={{ width: `${(selectedBadge.progress / selectedBadge.maxProgress) * 100}%` }}
                    />
                  </div>
                  <p className="text-gray-400 text-xs">{selectedBadge.requirement}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProofOfFandomBadges;
