"""
Alpha Vantage data provider - Free alternative to Yahoo Finance.
Get your free API key at: https://www.alphavantage.co/support/#api-key
"""

import pandas as pd
import requests
import time
from typing import Optional
from datetime import datetime, timedelta


class AlphaVantageProvider:
    """Alpha Vantage implementation - 25 requests/day free tier"""

    BASE_URL = "https://www.alphavantage.co/query"
    _last_request_time = 0  # Class variable to track last API call

    def __init__(self, api_key: str = "demo"):
        """
        Initialize with API key.
        Default 'demo' key works for limited testing with symbol IBM only.
        Get free key at: https://www.alphavantage.co/support/#api-key
        """
        self.api_key = api_key

    def get_ohlcv(
        self,
        ticker: str,
        timeframe: str,
        lookback_days: int
    ) -> pd.DataFrame:
        """
        Fetch OHLCV data from Alpha Vantage.

        Note: Free tier allows 25 requests/day, 5 requests/minute
        """
        # Map timeframes to Alpha Vantage functions
        if timeframe == "1d":
            function = "TIME_SERIES_DAILY"
            # Note: Free API key only supports 'compact' (100 days)
            # 'full' requires premium subscription
            outputsize = "compact"
        elif timeframe == "1h":
            function = "TIME_SERIES_INTRADAY"
            interval = "60min"
        elif timeframe == "15m":
            function = "TIME_SERIES_INTRADAY"
            interval = "15min"
        elif timeframe == "4h":
            # Alpha Vantage doesn't have 4h, we'll get 1h and resample
            function = "TIME_SERIES_INTRADAY"
            interval = "60min"
        else:
            raise ValueError(f"Unsupported timeframe: {timeframe}")

        params = {
            "function": function,
            "symbol": ticker,
            "apikey": self.api_key,
        }

        if timeframe != "1d":
            params["interval"] = interval
            # For intraday, compact is enough (last 100 data points)
            params["outputsize"] = "compact"
        else:
            params["outputsize"] = outputsize

        try:
            # Rate limiting: Alpha Vantage free tier allows 5 requests/minute
            # Wait at least 12 seconds between requests
            current_time = time.time()
            time_since_last_request = current_time - AlphaVantageProvider._last_request_time
            if time_since_last_request < 12:
                wait_time = 12 - time_since_last_request
                print(f"Rate limiting: waiting {wait_time:.1f}s before Alpha Vantage request...")
                time.sleep(wait_time)

            response = requests.get(self.BASE_URL, params=params, timeout=10)
            AlphaVantageProvider._last_request_time = time.time()
            response.raise_for_status()
            data = response.json()

            # Check for API errors
            if "Error Message" in data:
                raise ValueError(f"Alpha Vantage API error: {data['Error Message']}")
            if "Note" in data:
                raise ValueError(f"Alpha Vantage rate limit: {data['Note']}")
            if "Information" in data:
                print(f"Alpha Vantage Info: {data['Information']}")
                raise ValueError(f"Alpha Vantage: {data['Information']}")

            # Extract time series data
            if timeframe == "1d":
                time_series_key = "Time Series (Daily)"
            else:
                time_series_key = f"Time Series ({interval})"

            # Debug: print available keys
            print(f"Alpha Vantage response keys for {ticker}: {list(data.keys())}")

            if time_series_key not in data:
                print(f"Expected key '{time_series_key}' not found in response")
                raise ValueError(f"No data found for {ticker}")

            time_series = data[time_series_key]

            # Convert to DataFrame
            df = pd.DataFrame.from_dict(time_series, orient='index')
            df.index = pd.to_datetime(df.index)
            df = df.sort_index()

            # Rename columns
            df.columns = ['open', 'high', 'low', 'close', 'volume']

            # Convert to numeric
            for col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')

            # Filter by lookback period
            cutoff_date = datetime.now() - timedelta(days=lookback_days)
            df = df[df.index >= cutoff_date]

            # Resample to 4h if needed
            if timeframe == "4h":
                df = self._resample_to_4h(df)

            return df

        except Exception as e:
            raise ValueError(f"Failed to fetch data from Alpha Vantage: {str(e)}")

    def _resample_to_4h(self, df: pd.DataFrame) -> pd.DataFrame:
        """Resample 1h data to 4h candles"""
        resampled = df.resample('4H').agg({
            'open': 'first',
            'high': 'max',
            'low': 'min',
            'close': 'last',
            'volume': 'sum'
        }).dropna()
        return resampled
