'use client';

import { useState } from 'react';
import TickerSearch from '@/components/TickerSearch';
import TimeframeSelector from '@/components/TimeframeSelector';
import TradingViewChart from '@/components/TradingViewChart';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { api } from '@/lib/api';
import type { Timeframe, OHLCVData, KeyZone } from '@/types/api';
import { AlertCircle, TrendingUp, ToggleLeft, ToggleRight } from 'lucide-react';

export default function Home() {
  const [ticker, setTicker] = useState('');
  const [timeframe, setTimeframe] = useState<Timeframe>('1d');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OHLCVData[]>([]);
  const [zones, setZones] = useState<KeyZone[]>([]);
  const [showZones, setShowZones] = useState(true);

  const fetchData = async (searchTicker: string) => {
    setLoading(true);
    setError(null);
    setTicker(searchTicker);

    try {
      // Fetch market data and key levels in parallel
      const [marketData, keyLevelsData] = await Promise.all([
        api.getMarketData(searchTicker, timeframe),
        api.getKeyLevels(searchTicker, timeframe),
      ]);

      setData(marketData.data);
      setZones(keyLevelsData.zones);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(
        err.response?.data?.detail ||
          err.message ||
          'Failed to fetch data. Please check the ticker symbol and try again.'
      );
      setData([]);
      setZones([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeframeChange = async (newTimeframe: Timeframe) => {
    const oldTimeframe = timeframe;
    setTimeframe(newTimeframe);
    if (ticker) {
      // Fetch with new timeframe
      setLoading(true);
      setError(null);

      try {
        const [marketData, keyLevelsData] = await Promise.all([
          api.getMarketData(ticker, newTimeframe),
          api.getKeyLevels(ticker, newTimeframe),
        ]);

        setData(marketData.data);
        setZones(keyLevelsData.zones);
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(
          err.response?.data?.detail ||
            err.message ||
            'Failed to fetch data.'
        );
        setTimeframe(oldTimeframe); // Revert on error
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-gray-900">KeyLevels AI</h1>
          </div>
          <p className="mt-2 text-gray-600">
            Identify key support and resistance levels with AI-powered analysis
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ticker Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stock Ticker
              </label>
              <TickerSearch onSearch={fetchData} loading={loading} />
            </div>

            {/* Timeframe Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timeframe
              </label>
              <TimeframeSelector
                selected={timeframe}
                onChange={handleTimeframeChange}
                disabled={loading}
              />
            </div>
          </div>

          {/* Show/Hide Zones Toggle */}
          {data.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowZones(!showZones)}
                className="flex items-center gap-2 text-gray-700 hover:text-primary transition-colors"
              >
                {showZones ? (
                  <ToggleRight className="w-6 h-6 text-primary" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-gray-400" />
                )}
                <span className="font-medium">
                  {showZones ? 'Hide' : 'Show'} Key Zones
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-red-800 mb-1">Error</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Chart Area */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {loading ? (
            <LoadingSkeleton />
          ) : data.length > 0 ? (
            <>
              <div className="mb-4 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{ticker}</h2>
                  <p className="text-sm text-gray-600">
                    {zones.length} key zones identified
                  </p>
                </div>
                <div className="text-right text-sm text-gray-600">
                  <div>Timeframe: {timeframe}</div>
                  <div>{data.length} candles</div>
                </div>
              </div>

              <TradingViewChart
                data={data}
                zones={zones}
                showZones={showZones}
                ticker={ticker}
                timeframe={timeframe}
              />
            </>
          ) : (
            <div className="text-center py-20">
              <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                No Data Yet
              </h3>
              <p className="text-gray-500">
                Enter a stock ticker above to view key levels analysis
              </p>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Data provided by Yahoo Finance. Key levels computed using
            proprietary algorithm.
          </p>
          <p className="mt-1">
            For educational purposes only. Not financial advice.
          </p>
        </div>
      </main>
    </div>
  );
}
