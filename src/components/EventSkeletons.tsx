import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export const EventCardSkeleton = () => (
  <Card className="bg-[#1A1A1A] border-gray-800 animate-pulse">
    <div className="h-56 md:h-64 bg-gray-800 w-full" />
    <CardContent className="p-4">
      <div className="h-6 bg-gray-800 rounded w-2/3 mb-2" />
      <div className="h-4 bg-gray-800 rounded w-1/2 mb-2" />
      <div className="h-4 bg-gray-800 rounded w-1/3 mb-2" />
      <div className="h-4 bg-gray-800 rounded w-1/4" />
    </CardContent>
  </Card>
);

export const BrowseEventsSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
    {[...Array(6)].map((_, i) => (
      <EventCardSkeleton key={i} />
    ))}
  </div>
);

export const EventDetailSkeleton = () => (
  <div className="flex flex-col md:flex-row gap-8 items-start py-12">
    <div className="flex-1">
      <div className="h-72 w-full bg-gray-800 rounded mb-6" />
      <div className="h-8 bg-gray-800 rounded w-2/3 mb-4" />
      <div className="h-4 bg-gray-800 rounded w-1/2 mb-2" />
      <div className="h-4 bg-gray-800 rounded w-1/3 mb-2" />
      <div className="h-4 bg-gray-800 rounded w-1/4 mb-2" />
      <div className="h-4 bg-gray-800 rounded w-1/2 mb-2" />
    </div>
    <div className="w-full md:w-80">
      <div className="h-8 bg-gray-800 rounded w-2/3 mb-4" />
      <div className="h-4 bg-gray-800 rounded w-1/2 mb-2" />
      <div className="h-4 bg-gray-800 rounded w-1/3 mb-2" />
      <div className="h-12 bg-gray-800 rounded w-full mb-2" />
      <div className="h-12 bg-gray-800 rounded w-full" />
    </div>
  </div>
);
