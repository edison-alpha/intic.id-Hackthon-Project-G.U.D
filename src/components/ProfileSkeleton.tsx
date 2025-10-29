import React from "react";

export const WalletCardSkeleton = () => {
  return (
    <div className="bg-[#1A1A1A] border border-gray-800 rounded-3xl md:rounded-2xl p-5 md:p-6 mb-6 md:mb-8 animate-pulse">
      <div className="flex items-start justify-between mb-5 md:mb-6">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gray-800" />
          <div>
            <div className="h-6 bg-gray-800 rounded w-32 mb-2" />
            <div className="h-4 bg-gray-800 rounded w-24" />
          </div>
        </div>
      </div>

      {/* Wallet Info Skeleton */}
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl md:rounded-xl p-4 md:p-6 mb-4">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gray-800 rounded" />
            <div className="h-4 bg-gray-800 rounded w-24" />
          </div>
          <div className="h-8 bg-gray-800 rounded w-20" />
        </div>
        <div className="h-4 bg-gray-800 rounded w-full" />
      </div>

      {/* Balance Skeleton */}
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl md:rounded-xl p-5 md:p-6">
        <div className="h-4 bg-gray-800 rounded w-32 mb-2" />
        <div className="h-10 bg-gray-800 rounded w-40 mb-1" />
        <div className="h-4 bg-gray-800 rounded w-24" />
      </div>
    </div>
  );
};

export const StatsCardsSkeleton = () => {
  return (
    <div className="grid grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-8">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-[#1A1A1A] border border-gray-800 rounded-3xl md:rounded-2xl p-4 md:p-6 animate-pulse"
        >
          <div className="h-4 bg-gray-800 rounded w-20 mb-2" />
          <div className="h-8 bg-gray-800 rounded w-12" />
        </div>
      ))}
    </div>
  );
};

export const SettingsCardSkeleton = () => {
  return (
    <div className="bg-[#1A1A1A] border border-gray-800 rounded-3xl md:rounded-2xl p-5 md:p-6 mb-4 md:mb-8 animate-pulse">
      <div className="h-6 bg-gray-800 rounded w-24 mb-5 md:mb-6" />
      <div className="space-y-5 md:space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-9 h-9 bg-gray-800 rounded-xl" />
              <div className="flex-1">
                <div className="h-4 bg-gray-800 rounded w-32 mb-2" />
                <div className="h-3 bg-gray-800 rounded w-48" />
              </div>
            </div>
            <div className="w-12 h-6 bg-gray-800 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const BadgesSkeleton = () => {
  return (
    <div className="bg-[#1A1A1A] border border-gray-800 rounded-3xl md:rounded-2xl p-5 md:p-6 animate-pulse">
      <div className="h-8 bg-gray-800 rounded w-48 mb-6" />

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 bg-[#0A0A0A] border-2 border-gray-800 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 bg-gray-800 rounded" />
              <div className="h-3 bg-gray-800 rounded w-20" />
            </div>
            <div className="h-8 bg-gray-800 rounded w-16" />
          </div>
        ))}
      </div>

      {/* Badges Grid Skeleton */}
      <div className="mb-8">
        <div className="h-6 bg-gray-800 rounded w-40 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-6 bg-[#0A0A0A] border-2 border-gray-800 rounded-xl"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-16 h-16 bg-gray-800 rounded-xl" />
                <div className="w-6 h-6 bg-gray-800 rounded-full" />
              </div>
              <div className="h-5 bg-gray-800 rounded w-32 mb-2" />
              <div className="h-4 bg-gray-800 rounded w-full mb-3" />
              <div className="h-8 bg-gray-800 rounded w-full mb-3" />
              <div className="h-3 bg-gray-800 rounded w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* Locked Badges Skeleton */}
      <div>
        <div className="h-6 bg-gray-800 rounded w-40 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="p-6 bg-[#0A0A0A] border border-gray-800 rounded-xl"
            >
              <div className="w-16 h-16 bg-gray-800 rounded-xl mb-4" />
              <div className="h-5 bg-gray-800 rounded w-32 mb-2" />
              <div className="h-4 bg-gray-800 rounded w-full mb-3" />
              <div className="h-2 bg-gray-800 rounded w-full mb-2" />
              <div className="h-3 bg-gray-800 rounded w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
