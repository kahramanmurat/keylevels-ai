/**
 * API client for KeyLevels AI backend
 */

import axios from 'axios';
import type {
  MarketDataResponse,
  KeyLevelsResponse,
  AlertRequest,
  AlertResponse,
  Timeframe,
} from '@/types/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  /**
   * Fetch OHLCV market data
   */
  getMarketData: async (
    ticker: string,
    timeframe: Timeframe,
    lookback?: number
  ): Promise<MarketDataResponse> => {
    const params: any = { ticker, timeframe };
    if (lookback) params.lookback = lookback;

    const { data } = await apiClient.get<MarketDataResponse>('/api/data', {
      params,
    });
    return data;
  },

  /**
   * Fetch key support/resistance levels
   */
  getKeyLevels: async (
    ticker: string,
    timeframe: Timeframe,
    lookback?: number,
    pivotWindow?: number,
    maxZones?: number
  ): Promise<KeyLevelsResponse> => {
    const params: any = { ticker, timeframe };
    if (lookback) params.lookback = lookback;
    if (pivotWindow) params.pivot_window = pivotWindow;
    if (maxZones) params.max_zones = maxZones;

    const { data } = await apiClient.get<KeyLevelsResponse>('/api/keylevels', {
      params,
    });
    return data;
  },

  /**
   * Create a price alert
   */
  createAlert: async (alert: AlertRequest): Promise<AlertResponse> => {
    const { data } = await apiClient.post<AlertResponse>('/api/alerts', alert);
    return data;
  },

  /**
   * Health check
   */
  healthCheck: async (): Promise<any> => {
    const { data } = await apiClient.get('/health');
    return data;
  },
};
