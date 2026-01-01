"""
API Routes for KeyLevels AI
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import datetime

from app.schemas.market_data import (
    MarketDataResponse,
    KeyLevelsResponse,
    OHLCVData,
    KeyZone,
    AlertRequest,
    AlertResponse
)
from app.services.data_provider import get_data_provider
from app.services.key_levels import KeyLevelsDetector
from app.services.cache import cache
from app.core.config import settings

router = APIRouter()


# Default lookback periods by timeframe
DEFAULT_LOOKBACK = {
    "1d": 365,   # 1 year
    "4h": 90,    # 90 days
    "1h": 30,    # 30 days
    "15m": 30    # 30 days
}


@router.get("/api/data", response_model=MarketDataResponse)
async def get_market_data(
    ticker: str = Query(..., description="Stock ticker symbol", example="TSLA"),
    tf: str = Query(..., alias="timeframe", description="Timeframe", example="4h"),
    lookback: Optional[int] = Query(None, description="Lookback days")
):
    """
    Fetch OHLCV market data for a ticker.

    Returns candlestick data with unix timestamps.
    Results are cached for 5 minutes.
    """
    # Validate timeframe
    if tf not in ["1d", "4h", "1h", "15m"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid timeframe. Must be one of: 1d, 4h, 1h, 15m"
        )

    # Use default lookback if not provided
    lookback = lookback or DEFAULT_LOOKBACK.get(tf, 90)

    # Check cache
    cache_key = cache.make_key("data", ticker.upper(), tf, str(lookback))
    cached_data = cache.get(cache_key)
    if cached_data:
        return MarketDataResponse(**cached_data)

    # Fetch fresh data
    try:
        provider = get_data_provider("yfinance")
        df = provider.get_ohlcv(ticker.upper(), tf, lookback)

        if df.empty:
            raise HTTPException(
                status_code=404,
                detail=f"No data found for ticker: {ticker}"
            )

        # Convert to response format
        ohlcv_list = []
        for timestamp, row in df.iterrows():
            ohlcv_list.append(OHLCVData(
                time=int(timestamp.timestamp()),
                open=float(row['open']),
                high=float(row['high']),
                low=float(row['low']),
                close=float(row['close']),
                volume=float(row['volume'])
            ))

        response = MarketDataResponse(
            ticker=ticker.upper(),
            timeframe=tf,
            data=ohlcv_list,
            fetched_at=datetime.now()
        )

        # Cache the response
        cache.set(cache_key, response.model_dump())

        return response

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching data: {str(e)}")


@router.get("/api/keylevels", response_model=KeyLevelsResponse)
async def get_key_levels(
    ticker: str = Query(..., description="Stock ticker symbol", example="TSLA"),
    tf: str = Query(..., alias="timeframe", description="Timeframe", example="4h"),
    lookback: Optional[int] = Query(None, description="Lookback days"),
    pivot_window: Optional[int] = Query(None, description="Pivot detection window"),
    max_zones: Optional[int] = Query(None, description="Maximum zones to return")
):
    """
    Compute key support/resistance zones for a ticker.

    Algorithm:
    1. Detects swing highs/lows using pivot fractals
    2. Clusters nearby levels into zones using ATR tolerance
    3. Scores zones by touches + reaction + recency
    4. Returns top N strongest zones

    Results are cached for 5 minutes.
    """
    # Validate timeframe
    if tf not in ["1d", "4h", "1h", "15m"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid timeframe. Must be one of: 1d, 4h, 1h, 15m"
        )

    # Use defaults
    lookback = lookback or DEFAULT_LOOKBACK.get(tf, 90)
    pivot_window = pivot_window or settings.PIVOT_WINDOW
    max_zones = max_zones or settings.MAX_ZONES

    # Check cache
    cache_key = cache.make_key(
        "keylevels", ticker.upper(), tf, str(lookback),
        str(pivot_window), str(max_zones)
    )
    cached_data = cache.get(cache_key)
    if cached_data:
        return KeyLevelsResponse(**cached_data)

    # Fetch data and compute levels
    try:
        # Get OHLCV data
        provider = get_data_provider("yfinance")
        df = provider.get_ohlcv(ticker.upper(), tf, lookback)

        if df.empty:
            raise HTTPException(
                status_code=404,
                detail=f"No data found for ticker: {ticker}"
            )

        # Detect key levels
        detector = KeyLevelsDetector(
            pivot_window=pivot_window,
            atr_period=settings.ATR_PERIOD,
            atr_multiplier=settings.ATR_MULTIPLIER,
            max_zones=max_zones
        )

        zones_data = detector.detect_zones(df)

        # Convert to schema
        zones = [KeyZone(**zone) for zone in zones_data]

        response = KeyLevelsResponse(
            ticker=ticker.upper(),
            timeframe=tf,
            lookback=lookback,
            zones=zones,
            computed_at=datetime.now(),
            algorithm_params=detector.get_algorithm_params()
        )

        # Cache the response
        cache.set(cache_key, response.model_dump())

        return response

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error computing key levels: {str(e)}"
        )


@router.post("/api/alerts", response_model=AlertResponse)
async def create_alert(alert: AlertRequest):
    """
    Create a price alert for when price enters/exits a zone.

    Note: This is a placeholder endpoint. Full implementation requires:
    - Background worker to monitor prices
    - Email/webhook notification service
    - Database persistence
    """
    # TODO: Implement alert persistence and monitoring
    # For now, return a mock response

    import uuid

    return AlertResponse(
        alert_id=str(uuid.uuid4()),
        ticker=alert.ticker.upper(),
        zone_id=alert.zone_id,
        status="active",
        created_at=datetime.now()
    )


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }
