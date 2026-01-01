'use client';

import React from 'react';
import { TIMEFRAMES, TIMEFRAME_LABELS, Timeframe } from '@/types/api';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

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
            'px-4 py-2 rounded-lg font-medium transition-colors relative',
            'disabled:cursor-not-allowed disabled:opacity-50',
            selected === tf
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
        >
          <span className={cn(disabled && selected === tf && 'opacity-0')}>
            {TIMEFRAME_LABELS[tf]}
          </span>
          {disabled && selected === tf && (
            <Loader2 className="w-4 h-4 animate-spin absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
          )}
        </button>
      ))}
    </div>
  );
}
