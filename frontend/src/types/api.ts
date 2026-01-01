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
  ema_10?: number;
  ema_20?: number;
  ema_50?: number;
  ema_200?: number;
  macd?: number;
  macd_signal?: number;
  macd_histogram?: number;
  rsi?: number;
}

export interface KeyZone {
  id: string;
  type: 'support' | 'resistance' | 'pivot' | 'equilibrium';
  price_low: number;
  price_high: number;
  strength: number; // 0-1 normalized score
  confidence?: number; // 0-100% confidence score
  touches: number;
  last_touch_time?: number; // Unix timestamp
  reaction_strength?: number;
  avg_volume?: number;
  consolidation_strength?: number;
  structure_type?: string;
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
