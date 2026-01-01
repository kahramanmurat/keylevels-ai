"""
Mock data provider for demonstration purposes.
Generates realistic OHLCV data for testing the application.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta


class MockDataProvider:
    """Generates realistic mock stock data for testing"""

    @staticmethod
    def generate_ohlcv(ticker: str, timeframe: str, lookback_days: int) -> pd.DataFrame:
        """
        Generate realistic OHLCV data.

        Creates a realistic price series with:
        - Trending behavior
        - Volatility
        - Support/resistance levels
        """
        # Determine number of candles based on timeframe
        if timeframe == "1d":
            num_candles = min(lookback_days, 365)
            freq = "1D"
        elif timeframe == "4h":
            num_candles = min(lookback_days * 6, 540)  # 6 candles per day
            freq = "4H"
        elif timeframe == "1h":
            num_candles = min(lookback_days * 24, 720)
            freq = "1H"
        else:  # 15m
            num_candles = min(lookback_days * 96, 2880)
            freq = "15T"

        # Generate date range
        end_date = datetime.now()
        dates = pd.date_range(end=end_date, periods=num_candles, freq=freq)

        # Base price depends on ticker
        base_prices = {
            "TSLA": 250.0,
            "AAPL": 180.0,
            "MSFT": 380.0,
            "SPY": 480.0,
            "QQQ": 400.0,
            "NVDA": 500.0,
            "DEMO": 150.0,
        }
        base_price = base_prices.get(ticker.upper(), 150.0)

        # Generate trending price with noise
        trend = np.linspace(0, 20, num_candles)  # Upward trend
        noise = np.random.randn(num_candles) * 3  # Random walk
        cyclical = 10 * np.sin(np.linspace(0, 4 * np.pi, num_candles))  # Cyclical pattern

        close_prices = base_price + trend + noise + cyclical

        # Generate OHLC from close prices
        data = []
        for i, close in enumerate(close_prices):
            # Add some intrabar volatility
            volatility = abs(close * 0.015)  # 1.5% average range

            high = close + np.random.uniform(0, volatility)
            low = close - np.random.uniform(0, volatility)
            open_price = np.random.uniform(low, high)

            # Ensure OHLC relationships are valid
            high = max(high, open_price, close)
            low = min(low, open_price, close)

            # Generate volume (higher volume = more activity)
            avg_volume = 50_000_000
            volume = avg_volume + np.random.randint(-20_000_000, 30_000_000)

            data.append({
                "open": round(open_price, 2),
                "high": round(high, 2),
                "low": round(low, 2),
                "close": round(close, 2),
                "volume": max(volume, 1_000_000)
            })

        # Create DataFrame
        df = pd.DataFrame(data, index=dates)

        return df
