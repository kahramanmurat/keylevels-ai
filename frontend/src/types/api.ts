/**
 * TypeScript types for API responses
 */

export interface OHLCVData {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface KeyZone {
  id: string;
  type: 'support' | 'resistance' | 'pivot';
  price_low: number;
  price_high: number;
  strength: number; // 0-1 normalized score
  touches: number;
  last_touch_time?: number; // Unix timestamp
}

export interface MarketDataResponse {
  ticker: string;
  timeframe: string;
  data: OHLCVData[];
  fetched_at: string;
}

export interface KeyLevelsResponse {
  ticker: string;
  timeframe: string;
  lookback: number;
  zones: KeyZone[];
  computed_at: string;
  algorithm_params: {
    pivot_window: number;
    atr_period: number;
    atr_multiplier: number;
    max_zones: number;
  };
}

export interface AlertRequest {
  ticker: string;
  timeframe: string;
  zone_id: string;
  direction: 'enter' | 'exit';
  notify_email: boolean;
  notify_webhook: boolean;
  webhook_url?: string;
}

export interface AlertResponse {
  alert_id: string;
  ticker: string;
  zone_id: string;
  status: 'active' | 'triggered' | 'cancelled';
  created_at: string;
}

export type Timeframe = '1d' | '4h' | '1h' | '15m';

export const TIMEFRAMES: Timeframe[] = ['1d', '4h', '1h', '15m'];

export const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  '1d': '1 Day',
  '4h': '4 Hours',
  '1h': '1 Hour',
  '15m': '15 Minutes',
};
