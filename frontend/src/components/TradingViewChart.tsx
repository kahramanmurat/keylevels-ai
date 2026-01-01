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
  const priceLineRefs = useRef<any[]>([]);
  const emaSeriesRefs = useRef<{
    ema10?: ISeriesApi<'Line'>;
    ema20?: ISeriesApi<'Line'>;
    ema50?: ISeriesApi<'Line'>;
    ema200?: ISeriesApi<'Line'>;
  }>({});

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

    // Add EMA series
    emaSeriesRefs.current.ema10 = chart.addLineSeries({
      color: '#3b82f6', // blue
      lineWidth: 2,
      title: 'EMA 10',
    });

    emaSeriesRefs.current.ema20 = chart.addLineSeries({
      color: '#f59e0b', // amber
      lineWidth: 2,
      title: 'EMA 20',
    });

    emaSeriesRefs.current.ema50 = chart.addLineSeries({
      color: '#8b5cf6', // purple
      lineWidth: 2,
      title: 'EMA 50',
    });

    emaSeriesRefs.current.ema200 = chart.addLineSeries({
      color: '#ec4899', // pink
      lineWidth: 2,
      title: 'EMA 200',
    });

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

  // Update candlestick data and EMAs
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

    // Update EMA series
    const ema10Data = data
      .filter((d) => d.ema_10 != null)
      .map((d) => ({ time: d.time as any, value: d.ema_10! }));
    const ema20Data = data
      .filter((d) => d.ema_20 != null)
      .map((d) => ({ time: d.time as any, value: d.ema_20! }));
    const ema50Data = data
      .filter((d) => d.ema_50 != null)
      .map((d) => ({ time: d.time as any, value: d.ema_50! }));
    const ema200Data = data
      .filter((d) => d.ema_200 != null)
      .map((d) => ({ time: d.time as any, value: d.ema_200! }));

    if (emaSeriesRefs.current.ema10) {
      emaSeriesRefs.current.ema10.setData(ema10Data);
    }
    if (emaSeriesRefs.current.ema20) {
      emaSeriesRefs.current.ema20.setData(ema20Data);
    }
    if (emaSeriesRefs.current.ema50) {
      emaSeriesRefs.current.ema50.setData(ema50Data);
    }
    if (emaSeriesRefs.current.ema200) {
      emaSeriesRefs.current.ema200.setData(ema200Data);
    }

    // Fit content
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [data]);

  // Draw zones as price lines (top, middle, bottom)
  useEffect(() => {
    if (!chartRef.current || !candlestickSeriesRef.current) return;

    // Remove all existing price lines
    priceLineRefs.current.forEach((priceLine) => {
      try {
        candlestickSeriesRef.current?.removePriceLine(priceLine);
      } catch (e) {
        // Price line may already be removed
      }
    });
    priceLineRefs.current = [];

    // Only draw zones if showZones is true
    if (!showZones || !zones.length) return;

    // Draw each zone with 3 lines: top, middle, bottom
    zones.forEach((zone) => {
      const color = zone.type === 'support' ? '#22c55e' : '#ef4444';
      const lightColor = zone.type === 'support' ? '#86efac' : '#fca5a5';

      // Top boundary of zone
      const topLine = candlestickSeriesRef.current?.createPriceLine({
        price: zone.price_high,
        color: color,
        lineWidth: 1,
        lineStyle: 0, // Solid
        axisLabelVisible: false,
        title: '',
      });

      // Middle line (dashed, thicker)
      const zoneMid = (zone.price_low + zone.price_high) / 2;
      const confidence = zone.confidence ?? (zone.strength * 100);
      const midLine = candlestickSeriesRef.current?.createPriceLine({
        price: zoneMid,
        color: color,
        lineWidth: 2,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: `${zone.type.toUpperCase()} - ${confidence.toFixed(0)}% (${zone.touches} touches)`,
      });

      // Bottom boundary of zone
      const bottomLine = candlestickSeriesRef.current?.createPriceLine({
        price: zone.price_low,
        color: color,
        lineWidth: 1,
        lineStyle: 0, // Solid
        axisLabelVisible: false,
        title: '',
      });

      if (topLine) priceLineRefs.current.push(topLine);
      if (midLine) priceLineRefs.current.push(midLine);
      if (bottomLine) priceLineRefs.current.push(bottomLine);
    });
  }, [zones, showZones]);

  return (
    <div className="relative w-full">
      {/* EMA Legend */}
      <div className="mb-3 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-blue-500"></div>
          <span className="text-gray-700">EMA 10</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-amber-500"></div>
          <span className="text-gray-700">EMA 20</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-purple-500"></div>
          <span className="text-gray-700">EMA 50</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-pink-500"></div>
          <span className="text-gray-700">EMA 200</span>
        </div>
      </div>

      <div
        ref={chartContainerRef}
        className="w-full border border-gray-200 rounded-lg shadow-sm"
      />

      {/* Key Zones Legend */}
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
