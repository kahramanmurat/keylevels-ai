'use client';

import React from 'react';
import { Loader2, TrendingUp } from 'lucide-react';

export default function LoadingSkeleton() {
  return (
    <div className="relative">
      {/* Loading Overlay with Spinner */}
      <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/80 backdrop-blur-sm rounded-lg">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-700">Loading chart data...</p>
          <p className="text-sm text-gray-500 mt-1">Analyzing key levels and indicators</p>
        </div>
      </div>

      {/* Skeleton Background */}
      <div className="animate-pulse">
        <div className="h-[600px] bg-gray-200 rounded-lg mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
