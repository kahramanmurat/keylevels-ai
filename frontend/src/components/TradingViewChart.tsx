'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData } from 'lightweight-charts';
import type { OHLCVData, KeyZone } from '@/types/api';
import { formatPrice } from '@/lib/utils';

interface TradingViewChartProps {
  data: OHLCVData[];
  zones: KeyZone[];
  showZones: boolean;
  ticker: string;
  timeframe: string;
}

export default function TradingViewChart({
  data,
  zones,
  showZones,
  ticker,
  timeframe,
}: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 600,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      crosshair: {
        mode: 1, // Normal crosshair
      },
      rightPriceScale: {
        borderColor: '#cccccc',
      },
      timeScale: {
        borderColor: '#cccccc',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    candlestickSeriesRef.current = candlestickSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Update candlestick data
  useEffect(() => {
    if (!candlestickSeriesRef.current || !data.length) return;

    const candlestickData: CandlestickData[] = data.map((d) => ({
      time: d.time as any,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    candlestickSeriesRef.current.setData(candlestickData);

    // Fit content
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [data]);

  // Draw zones as rectangles
  useEffect(() => {
    if (!chartRef.current || !candlestickSeriesRef.current || !showZones) return;

    // Remove existing markers/lines
    candlestickSeriesRef.current.setMarkers([]);

    if (!zones.length) return;

    // Draw each zone as price lines
    zones.forEach((zone) => {
      const color = zone.type === 'support' ? '#22c55e' : '#ef4444';

      // Create price line for zone center
      const zoneMid = (zone.price_low + zone.price_high) / 2;

      candlestickSeriesRef.current?.createPriceLine({
        price: zoneMid,
        color: color,
        lineWidth: 2,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: `${zone.type.toUpperCase()} (${zone.touches} touches)`,
      });
    });
  }, [zones, showZones]);

  return (
    <div className="relative w-full">
      <div
        ref={chartContainerRef}
        className="w-full border border-gray-200 rounded-lg shadow-sm"
      />

      {/* Legend */}
      {showZones && zones.length > 0 && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold mb-3">Key Zones</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {zones.map((zone) => (
              <div
                key={zone.id}
                className={`p-3 rounded border-l-4 bg-white ${
                  zone.type === 'support'
                    ? 'border-green-500'
                    : 'border-red-500'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-medium uppercase text-gray-600">
                    {zone.type}
                  </span>
                  <span className="text-xs text-gray-500">
                    Strength: {(zone.strength * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="text-sm font-semibold">
                  {formatPrice(zone.price_low)} - {formatPrice(zone.price_high)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {zone.touches} touches
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
