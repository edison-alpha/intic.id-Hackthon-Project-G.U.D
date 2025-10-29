import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const StatsCardsSkeleton = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i} className="bg-[#1A1A1A] border-gray-800 animate-pulse">
          <CardContent className="p-4 text-center">
            <div className="h-8 bg-gray-800 rounded w-16 mx-auto mb-2" />
            <div className="h-4 bg-gray-800 rounded w-20 mx-auto" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export const ContractCardSkeleton = () => {
  return (
    <Card className="bg-[#0A0A0A] border-gray-800 animate-pulse">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="h-7 bg-gray-800 rounded w-48 mb-2" />
            <div className="h-6 bg-gray-800 rounded w-24" />
          </div>
          <div className="h-9 bg-gray-800 rounded w-24" />
        </div>

        {/* Grid Information */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4 mb-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 bg-gray-800 rounded w-20" />
              <div className="h-4 bg-gray-800 rounded w-32" />
            </div>
          ))}
        </div>

        {/* Timestamps */}
        <div className="flex items-center gap-6 mb-4">
          <div className="h-3 bg-gray-800 rounded w-32" />
          <div className="h-3 bg-gray-800 rounded w-32" />
        </div>

        {/* Contract Address Box */}
        <div className="bg-[#0D2818] border border-green-900/30 rounded-lg p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="h-3 bg-gray-800 rounded w-28 mb-2" />
              <div className="h-4 bg-gray-800 rounded w-full" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 bg-gray-800 rounded" />
              <div className="h-9 w-9 bg-gray-800 rounded" />
              <div className="h-9 w-9 bg-gray-800 rounded" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const ContractListSkeleton = () => {
  return (
    <Card className="bg-[#1A1A1A] border-gray-800">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <div className="h-7 bg-gray-800 rounded w-56 animate-pulse" />
              <div className="h-6 bg-gray-800 rounded w-32 animate-pulse" />
            </div>
            <div className="h-4 bg-gray-800 rounded w-72 animate-pulse" />
          </div>
          <div className="h-9 bg-gray-800 rounded w-32 animate-pulse" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <ContractCardSkeleton key={i} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export const ContractManagementFullSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="h-9 bg-gray-800 rounded w-64 mb-2 animate-pulse" />
          <div className="h-5 bg-gray-800 rounded w-96 animate-pulse" />
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCardsSkeleton />

      {/* Contract List */}
      <ContractListSkeleton />
    </div>
  );
};
