'use client';

import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData } from 'lightweight-charts';
import type { OHLCVData, KeyZone } from '@/types/api';
import { formatPrice } from '@/lib/utils';

interface TradingViewChartProps {
  data: OHLCVData[];
  zones: KeyZone[];
  showZones: boolean;
  showEmas: boolean;
  darkMode: boolean;
  ticker: string;
  timeframe: string;
}

export default function TradingViewChart({
  data,
  zones,
  showZones,
  showEmas,
  darkMode,
  ticker,
  timeframe,
}: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const macdContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const macdChartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLineRefs = useRef<any[]>([]);
  const emaSeriesRefs = useRef<{
    ema10?: ISeriesApi<'Line'>;
    ema20?: ISeriesApi<'Line'>;
    ema50?: ISeriesApi<'Line'>;
    ema200?: ISeriesApi<'Line'>;
  }>({});
  const macdSeriesRefs = useRef<{
    macd?: ISeriesApi<'Line'>;
    signal?: ISeriesApi<'Line'>;
    histogram?: ISeriesApi<'Histogram'>;
  }>({});
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  // Initialize charts
  useEffect(() => {
    if (!chartContainerRef.current || !macdContainerRef.current || !rsiContainerRef.current) return;

    const bgColor = darkMode ? '#1e1e1e' : '#ffffff';
    const textColor = darkMode ? '#d1d5db' : '#333';
    const gridColor = darkMode ? '#2d2d2d' : '#f0f0f0';

    const chartWidth = chartContainerRef.current.clientWidth;

    // Create main price chart
    const chart = createChart(chartContainerRef.current, {
      width: chartWidth,
      height: 400,
      layout: {
        background: { color: bgColor },
        textColor: textColor,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: darkMode ? '#4b5563' : '#cccccc',
      },
      timeScale: {
        borderColor: darkMode ? '#4b5563' : '#cccccc',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Create MACD chart
    const macdChart = createChart(macdContainerRef.current, {
      width: chartWidth,
      height: 150,
      layout: {
        background: { color: bgColor },
        textColor: textColor,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: darkMode ? '#4b5563' : '#cccccc',
      },
      timeScale: {
        borderColor: darkMode ? '#4b5563' : '#cccccc',
        timeVisible: false,
        visible: false,
      },
    });

    macdChartRef.current = macdChart;

    // Create RSI chart
    const rsiChart = createChart(rsiContainerRef.current, {
      width: chartWidth,
      height: 150,
      layout: {
        background: { color: bgColor },
        textColor: textColor,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: darkMode ? '#4b5563' : '#cccccc',
      },
      timeScale: {
        borderColor: darkMode ? '#4b5563' : '#cccccc',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    rsiChartRef.current = rsiChart;

    // Synchronize crosshairs across all charts
    chart.timeScale().subscribeVisibleLogicalRangeChange(timeRange => {
      macdChart.timeScale().setVisibleLogicalRange(timeRange as any);
      rsiChart.timeScale().setVisibleLogicalRange(timeRange as any);
    });

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
      color: '#3b82f6',
      lineWidth: 2,
      title: 'EMA 10',
      visible: showEmas,
    });

    emaSeriesRefs.current.ema20 = chart.addLineSeries({
      color: '#f59e0b',
      lineWidth: 2,
      title: 'EMA 20',
      visible: showEmas,
    });

    emaSeriesRefs.current.ema50 = chart.addLineSeries({
      color: '#8b5cf6',
      lineWidth: 2,
      title: 'EMA 50',
      visible: showEmas,
    });

    emaSeriesRefs.current.ema200 = chart.addLineSeries({
      color: '#ec4899',
      lineWidth: 2,
      title: 'EMA 200',
      visible: showEmas,
    });

    // Add MACD series
    macdSeriesRefs.current.histogram = macdChart.addHistogramSeries({
      color: '#3b82f6',
      priceFormat: {
        type: 'price',
        precision: 4,
        minMove: 0.0001,
      },
    });

    macdSeriesRefs.current.macd = macdChart.addLineSeries({
      color: '#3b82f6',
      lineWidth: 2,
      title: 'MACD',
    });

    macdSeriesRefs.current.signal = macdChart.addLineSeries({
      color: '#ef4444',
      lineWidth: 2,
      title: 'Signal',
    });

    // Add RSI series
    const rsiSeries = rsiChart.addLineSeries({
      color: '#8b5cf6',
      lineWidth: 2,
      title: 'RSI',
    });
    rsiSeriesRef.current = rsiSeries;

    // Add RSI reference lines (70 and 30)
    rsiSeries.createPriceLine({
      price: 70,
      color: '#ef4444',
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: 'Overbought',
    });

    rsiSeries.createPriceLine({
      price: 30,
      color: '#22c55e',
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: 'Oversold',
    });

    // Populate data if available
    if (data.length > 0) {
      const candlestickData: CandlestickData[] = data.map((d) => ({
        time: d.time as any,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }));

      candlestickSeries.setData(candlestickData);

      // Set EMA data
      const ema10Data = data.filter(d => d.ema_10 != null).map(d => ({ time: d.time as any, value: d.ema_10! }));
      const ema20Data = data.filter(d => d.ema_20 != null).map(d => ({ time: d.time as any, value: d.ema_20! }));
      const ema50Data = data.filter(d => d.ema_50 != null).map(d => ({ time: d.time as any, value: d.ema_50! }));
      const ema200Data = data.filter(d => d.ema_200 != null).map(d => ({ time: d.time as any, value: d.ema_200! }));

      if (emaSeriesRefs.current.ema10) emaSeriesRefs.current.ema10.setData(ema10Data);
      if (emaSeriesRefs.current.ema20) emaSeriesRefs.current.ema20.setData(ema20Data);
      if (emaSeriesRefs.current.ema50) emaSeriesRefs.current.ema50.setData(ema50Data);
      if (emaSeriesRefs.current.ema200) emaSeriesRefs.current.ema200.setData(ema200Data);

      // Set MACD data
      const macdData = data.filter(d => d.macd != null).map(d => ({ time: d.time as any, value: d.macd! }));
      const macdSignalData = data.filter(d => d.macd_signal != null).map(d => ({ time: d.time as any, value: d.macd_signal! }));
      const macdHistogramData = data.filter(d => d.macd_histogram != null).map(d => ({
        time: d.time as any,
        value: d.macd_histogram!,
        color: d.macd_histogram! >= 0 ? '#22c55e' : '#ef4444'
      }));

      if (macdSeriesRefs.current.macd) macdSeriesRefs.current.macd.setData(macdData);
      if (macdSeriesRefs.current.signal) macdSeriesRefs.current.signal.setData(macdSignalData);
      if (macdSeriesRefs.current.histogram) macdSeriesRefs.current.histogram.setData(macdHistogramData);

      // Set RSI data
      const rsiData = data.filter(d => d.rsi != null).map(d => ({ time: d.time as any, value: d.rsi! }));
      if (rsiSeriesRef.current) rsiSeriesRef.current.setData(rsiData);

      chart.timeScale().fitContent();
      macdChart.timeScale().fitContent();
      rsiChart.timeScale().fitContent();
    }

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        const width = chartContainerRef.current.clientWidth;
        chartRef.current.applyOptions({ width });
        if (macdChartRef.current) macdChartRef.current.applyOptions({ width });
        if (rsiChartRef.current) rsiChartRef.current.applyOptions({ width });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      macdChart.remove();
      rsiChart.remove();
    };
  }, [darkMode, showEmas]);

  // Update data when it changes (but chart already exists)
  useEffect(() => {
    if (!candlestickSeriesRef.current || !data.length || !chartRef.current) return;

    const candlestickData: CandlestickData[] = data.map((d) => ({
      time: d.time as any,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    candlestickSeriesRef.current.setData(candlestickData);

    // Update EMA series
    const ema10Data = data.filter(d => d.ema_10 != null).map(d => ({ time: d.time as any, value: d.ema_10! }));
    const ema20Data = data.filter(d => d.ema_20 != null).map(d => ({ time: d.time as any, value: d.ema_20! }));
    const ema50Data = data.filter(d => d.ema_50 != null).map(d => ({ time: d.time as any, value: d.ema_50! }));
    const ema200Data = data.filter(d => d.ema_200 != null).map(d => ({ time: d.time as any, value: d.ema_200! }));

    if (emaSeriesRefs.current.ema10) emaSeriesRefs.current.ema10.setData(ema10Data);
    if (emaSeriesRefs.current.ema20) emaSeriesRefs.current.ema20.setData(ema20Data);
    if (emaSeriesRefs.current.ema50) emaSeriesRefs.current.ema50.setData(ema50Data);
    if (emaSeriesRefs.current.ema200) emaSeriesRefs.current.ema200.setData(ema200Data);

    // Update MACD series
    const macdData = data.filter(d => d.macd != null).map(d => ({ time: d.time as any, value: d.macd! }));
    const macdSignalData = data.filter(d => d.macd_signal != null).map(d => ({ time: d.time as any, value: d.macd_signal! }));
    const macdHistogramData = data.filter(d => d.macd_histogram != null).map(d => ({
      time: d.time as any,
      value: d.macd_histogram!,
      color: d.macd_histogram! >= 0 ? '#22c55e' : '#ef4444'
    }));

    if (macdSeriesRefs.current.macd) macdSeriesRefs.current.macd.setData(macdData);
    if (macdSeriesRefs.current.signal) macdSeriesRefs.current.signal.setData(macdSignalData);
    if (macdSeriesRefs.current.histogram) macdSeriesRefs.current.histogram.setData(macdHistogramData);

    // Update RSI series
    const rsiData = data.filter(d => d.rsi != null).map(d => ({ time: d.time as any, value: d.rsi! }));
    if (rsiSeriesRef.current) rsiSeriesRef.current.setData(rsiData);

    chartRef.current.timeScale().fitContent();
    if (macdChartRef.current) macdChartRef.current.timeScale().fitContent();
    if (rsiChartRef.current) rsiChartRef.current.timeScale().fitContent();
  }, [data, ticker, timeframe]);

  // Update EMA visibility
  useEffect(() => {
    if (emaSeriesRefs.current.ema10) {
      emaSeriesRefs.current.ema10.applyOptions({ visible: showEmas });
    }
    if (emaSeriesRefs.current.ema20) {
      emaSeriesRefs.current.ema20.applyOptions({ visible: showEmas });
    }
    if (emaSeriesRefs.current.ema50) {
      emaSeriesRefs.current.ema50.applyOptions({ visible: showEmas });
    }
    if (emaSeriesRefs.current.ema200) {
      emaSeriesRefs.current.ema200.applyOptions({ visible: showEmas });
    }
  }, [showEmas]);

  // Draw zones as price lines
  useEffect(() => {
    if (!chartRef.current || !candlestickSeriesRef.current) return;

    // Remove all existing price lines
    priceLineRefs.current.forEach((priceLine) => {
      try {
        candlestickSeriesRef.current?.removePriceLine(priceLine);
      } catch (e) {}
    });
    priceLineRefs.current = [];

    if (!showZones || !zones.length) return;

    // Draw each zone
    zones.forEach((zone) => {
      const color = zone.type === 'support' ? '#22c55e' : '#ef4444';

      const topLine = candlestickSeriesRef.current?.createPriceLine({
        price: zone.price_high,
        color: color,
        lineWidth: 1,
        lineStyle: 0,
        axisLabelVisible: false,
        title: '',
      });

      const zoneMid = (zone.price_low + zone.price_high) / 2;
      const confidence = zone.confidence ?? (zone.strength * 100);
      const midLine = candlestickSeriesRef.current?.createPriceLine({
        price: zoneMid,
        color: color,
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `${zone.type.toUpperCase()} - ${confidence.toFixed(0)}% (${zone.touches} touches)`,
      });

      const bottomLine = candlestickSeriesRef.current?.createPriceLine({
        price: zone.price_low,
        color: color,
        lineWidth: 1,
        lineStyle: 0,
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
      {showEmas && (
        <div className={`mb-3 flex flex-wrap gap-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-blue-500"></div>
            <span>EMA 10</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-amber-500"></div>
            <span>EMA 20</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-purple-500"></div>
            <span>EMA 50</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-pink-500"></div>
            <span>EMA 200</span>
          </div>
        </div>
      )}

      <div
        ref={chartContainerRef}
        className={`relative w-full border rounded-t-lg shadow-sm ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}
      />

      {/* MACD Indicator */}
      <div className={`mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        <div className="flex items-center gap-3 mb-1 text-xs">
          <span className="font-semibold">MACD</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-blue-500"></div>
            <span>MACD</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-red-500"></div>
            <span>Signal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-2 bg-gradient-to-r from-red-500 to-green-500"></div>
            <span>Histogram</span>
          </div>
        </div>
        <div
          ref={macdContainerRef}
          className={`relative w-full border-x border-b shadow-sm ${
            darkMode ? 'border-gray-700' : 'border-gray-200'
          }`}
        />
      </div>

      {/* RSI Indicator */}
      <div className={`mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        <div className="flex items-center gap-3 mb-1 text-xs">
          <span className="font-semibold">RSI (14)</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-purple-500"></div>
            <span>RSI</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-red-500" style={{borderTop: '1px dashed'}}></div>
            <span>Overbought (70)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-green-500" style={{borderTop: '1px dashed'}}></div>
            <span>Oversold (30)</span>
          </div>
        </div>
        <div
          ref={rsiContainerRef}
          className={`relative w-full border rounded-b-lg shadow-sm ${
            darkMode ? 'border-gray-700' : 'border-gray-200'
          }`}
        />
      </div>

      {/* Key Zones Legend */}
      {showZones && zones.length > 0 && (
        <div className={`mt-4 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <h3 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
            Key Zones
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {zones.map((zone) => (
              <div
                key={zone.id}
                className={`p-3 rounded border-l-4 ${
                  darkMode ? 'bg-gray-700' : 'bg-white'
                } ${
                  zone.type === 'support'
                    ? 'border-green-500'
                    : 'border-red-500'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-xs font-medium uppercase ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {zone.type}
                  </span>
                  <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    Strength: {(zone.strength * 100).toFixed(0)}%
                  </span>
                </div>
                <div className={`text-sm font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                  {formatPrice(zone.price_low)} - {formatPrice(zone.price_high)}
                </div>
                <div className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
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
