'use client';

import React from 'react';
import { TIMEFRAMES, TIMEFRAME_LABELS, Timeframe } from '@/types/api';
import { cn } from '@/lib/utils';

interface TimeframeSelectorProps {
  selected: Timeframe;
  onChange: (timeframe: Timeframe) => void;
  disabled?: boolean;
}

export default function TimeframeSelector({
  selected,
  onChange,
  disabled = false,
}: TimeframeSelectorProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf}
          onClick={() => onChange(tf)}
          disabled={disabled}
          className={cn(
            'px-4 py-2 rounded-lg font-medium transition-colors',
            'disabled:cursor-not-allowed disabled:opacity-50',
            selected === tf
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
        >
          {TIMEFRAME_LABELS[tf]}
        </button>
      ))}
    </div>
  );
}
