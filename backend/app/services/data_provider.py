"""
Data Provider - Abstraction layer for market data sources.
Current implementation uses yfinance, but designed for easy swapping to Polygon/Alpaca.
"""

import yfinance as yf
import pandas as pd
from typing import List, Optional
from datetime import datetime, timedelta
from abc import ABC, abstractmethod


class DataProviderInterface(ABC):
    """Abstract interface for market data providers"""

    @abstractmethod
    def get_ohlcv(
        self,
        ticker: str,
        timeframe: str,
        lookback_days: int
    ) -> pd.DataFrame:
        """
        Fetch OHLCV data.

        Args:
            ticker: Stock symbol (e.g., "TSLA")
            timeframe: Timeframe string ("1d", "4h", "1h", "15m")
            lookback_days: Number of days to look back

        Returns:
            DataFrame with columns: open, high, low, close, volume, and datetime index
        """
        pass


class YFinanceProvider(DataProviderInterface):
    """yfinance implementation of data provider"""

    # Map our timeframe format to yfinance intervals
    TIMEFRAME_MAP = {
        "1d": "1d",
        "4h": "1h",  # yfinance doesn't have 4h, we'll resample
        "1h": "1h",
        "15m": "15m",
    }

    def get_ohlcv(
        self,
        ticker: str,
        timeframe: str,
        lookback_days: int
    ) -> pd.DataFrame:
        """
        Fetch OHLCV data from yfinance.

        Note: yfinance has limitations on historical data for intraday timeframes:
        - 1m, 5m, 15m, 30m: max 60 days
        - 1h: max 730 days
        """
        yf_interval = self.TIMEFRAME_MAP.get(timeframe)
        if not yf_interval:
            raise ValueError(f"Unsupported timeframe: {timeframe}")

        # Adjust lookback for intraday data limitations
        if timeframe in ["15m"] and lookback_days > 60:
            lookback_days = 60
        elif timeframe in ["1h", "4h"] and lookback_days > 730:
            lookback_days = 730

        end_date = datetime.now()
        start_date = end_date - timedelta(days=lookback_days)

        try:
            ticker_obj = yf.Ticker(ticker)
            df = ticker_obj.history(
                start=start_date,
                end=end_date,
                interval=yf_interval,
                auto_adjust=True  # Adjust for splits/dividends
            )

            if df.empty:
                raise ValueError(f"No data found for ticker: {ticker}")

            # Rename columns to lowercase
            df.columns = [col.lower() for col in df.columns]

            # Keep only OHLCV columns
            df = df[['open', 'high', 'low', 'close', 'volume']]

            # Resample to 4h if needed
            if timeframe == "4h":
                df = self._resample_to_4h(df)

            return df

        except Exception as e:
            raise Exception(f"Error fetching data for {ticker}: {str(e)}")

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


class PolygonProvider(DataProviderInterface):
    """
    Placeholder for Polygon.io implementation.
    To implement: use polygon-api-client library
    """

    def __init__(self, api_key: str):
        self.api_key = api_key

    def get_ohlcv(
        self,
        ticker: str,
        timeframe: str,
        lookback_days: int
    ) -> pd.DataFrame:
        raise NotImplementedError(
            "Polygon provider not implemented. "
            "Install polygon-api-client and implement this method."
        )


class AlpacaProvider(DataProviderInterface):
    """
    Placeholder for Alpaca implementation.
    To implement: use alpaca-trade-api library
    """

    def __init__(self, api_key: str, secret_key: str):
        self.api_key = api_key
        self.secret_key = secret_key

    def get_ohlcv(
        self,
        ticker: str,
        timeframe: str,
        lookback_days: int
    ) -> pd.DataFrame:
        raise NotImplementedError(
            "Alpaca provider not implemented. "
            "Install alpaca-trade-api and implement this method."
        )


# Factory function to get the active provider
def get_data_provider(provider: str = "yfinance", **kwargs) -> DataProviderInterface:
    """
    Factory function to instantiate data providers.

    Args:
        provider: Provider name ("yfinance", "polygon", "alpaca")
        **kwargs: Provider-specific configuration (e.g., API keys)

    Returns:
        DataProviderInterface instance
    """
    if provider == "yfinance":
        return YFinanceProvider()
    elif provider == "polygon":
        api_key = kwargs.get("api_key")
        if not api_key:
            raise ValueError("Polygon provider requires 'api_key'")
        return PolygonProvider(api_key=api_key)
    elif provider == "alpaca":
        api_key = kwargs.get("api_key")
        secret_key = kwargs.get("secret_key")
        if not api_key or not secret_key:
            raise ValueError("Alpaca provider requires 'api_key' and 'secret_key'")
        return AlpacaProvider(api_key=api_key, secret_key=secret_key)
    else:
        raise ValueError(f"Unknown provider: {provider}")
