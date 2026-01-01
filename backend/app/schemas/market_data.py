from pydantic import BaseModel, Field
from typing import List, Literal, Optional
from datetime import datetime


class OHLCVData(BaseModel):
    """Single OHLCV candlestick"""
    time: int  # Unix timestamp in seconds
    open: float
    high: float
    low: float
    close: float
    volume: float


class KeyZone(BaseModel):
    """Support/Resistance zone"""
    id: str
    type: Literal["support", "resistance", "pivot"]
    price_low: float = Field(..., description="Bottom of the zone")
    price_high: float = Field(..., description="Top of the zone")
    strength: float = Field(..., ge=0, le=1, description="Zone strength score 0-1")
    touches: int = Field(..., description="Number of price touches")
    last_touch_time: Optional[int] = None  # Unix timestamp


class MarketDataResponse(BaseModel):
    """Response for /api/data endpoint"""
    ticker: str
    timeframe: str
    data: List[OHLCVData]
    fetched_at: datetime


class KeyLevelsResponse(BaseModel):
    """Response for /api/keylevels endpoint"""
    ticker: str
    timeframe: str
    lookback: int
    zones: List[KeyZone]
    computed_at: datetime
    algorithm_params: dict = Field(
        ...,
        description="Parameters used for computation",
        example={
            "pivot_window": 3,
            "atr_period": 14,
            "atr_multiplier": 0.3,
            "max_zones": 6
        }
    )


class AlertRequest(BaseModel):
    """Request body for creating price alerts"""
    ticker: str
    timeframe: str
    zone_id: str
    direction: Literal["enter", "exit"]
    notify_email: bool = True
    notify_webhook: bool = False
    webhook_url: Optional[str] = None


class AlertResponse(BaseModel):
    """Response for alert creation"""
    alert_id: str
    ticker: str
    zone_id: str
    status: Literal["active", "triggered", "cancelled"]
    created_at: datetime
