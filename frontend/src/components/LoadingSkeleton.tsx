'use client';

import React from 'react';

export default function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-[600px] bg-gray-200 rounded-lg mb-4"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-24 bg-gray-200 rounded"></div>
        ))}
      </div>
    </div>
  );
}
