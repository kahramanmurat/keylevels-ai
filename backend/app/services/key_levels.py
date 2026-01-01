"""
Key Levels Detection Algorithm

Deterministic algorithm to detect support/resistance zones:
1. Detect swing highs/lows using pivot fractals
2. Cluster nearby levels into zones using ATR-based tolerance
3. Score zones by touches + reaction magnitude + recency
4. Return top N zones
"""

import pandas as pd
import numpy as np
from typing import List, Tuple, Dict
from datetime import datetime
import hashlib


class KeyLevelsDetector:
    """
    Detects key support and resistance zones from OHLCV data.

    Algorithm:
    1. Calculate ATR (Average True Range) for zone sizing
    2. Find pivot highs and lows using configurable window
    3. Cluster nearby pivots into zones (within ATR tolerance)
    4. Score zones based on:
       - Number of touches
       - Reaction magnitude (how far price moved away)
       - Recency (more recent = higher score)
    5. Return top N zones
    """

    def __init__(
        self,
        pivot_window: int = 3,
        atr_period: int = 14,
        atr_multiplier: float = 0.3,
        max_zones: int = 6
    ):
        """
        Args:
            pivot_window: Number of bars on each side for pivot detection
            atr_period: Period for ATR calculation
            atr_multiplier: Multiplier for ATR to determine zone tolerance
            max_zones: Maximum number of zones to return
        """
        self.pivot_window = pivot_window
        self.atr_period = atr_period
        self.atr_multiplier = atr_multiplier
        self.max_zones = max_zones

    def detect_zones(self, df: pd.DataFrame) -> List[Dict]:
        """
        Main function to detect key levels.

        Args:
            df: DataFrame with OHLCV data (datetime index)

        Returns:
            List of zone dictionaries with structure:
            {
                'id': str,
                'type': 'support' | 'resistance' | 'pivot',
                'price_low': float,
                'price_high': float,
                'strength': float,  # 0-1 normalized score
                'touches': int,
                'last_touch_time': int  # Unix timestamp
            }
        """
        if len(df) < self.pivot_window * 2 + self.atr_period:
            raise ValueError(
                f"Not enough data. Need at least "
                f"{self.pivot_window * 2 + self.atr_period} bars"
            )

        # Calculate ATR for zone sizing
        atr = self._calculate_atr(df)
        tolerance = atr * self.atr_multiplier

        # Find pivot points
        pivot_highs = self._find_pivot_highs(df)
        pivot_lows = self._find_pivot_lows(df)

        # Cluster pivots into zones
        resistance_zones = self._cluster_levels(
            pivot_highs, tolerance, df, zone_type="resistance"
        )
        support_zones = self._cluster_levels(
            pivot_lows, tolerance, df, zone_type="support"
        )

        # Combine and score all zones
        all_zones = resistance_zones + support_zones
        scored_zones = self._score_zones(all_zones, df)

        # Sort by strength and return top N
        top_zones = sorted(
            scored_zones,
            key=lambda x: x['strength'],
            reverse=True
        )[:self.max_zones]

        return top_zones

    def _calculate_atr(self, df: pd.DataFrame) -> float:
        """Calculate Average True Range"""
        high = df['high']
        low = df['low']
        close = df['close'].shift(1)

        tr1 = high - low
        tr2 = abs(high - close)
        tr3 = abs(low - close)

        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr = tr.rolling(window=self.atr_period).mean().iloc[-1]

        return atr if not pd.isna(atr) else (df['high'] - df['low']).mean()

    def _find_pivot_highs(self, df: pd.DataFrame) -> List[Tuple[int, float]]:
        """
        Find pivot high points.
        A pivot high is a bar where high is greater than N bars before and after.

        Returns:
            List of (timestamp, price) tuples
        """
        pivots = []
        highs = df['high'].values
        times = df.index

        for i in range(self.pivot_window, len(df) - self.pivot_window):
            is_pivot = True

            # Check if current high is greater than surrounding bars
            for j in range(1, self.pivot_window + 1):
                if highs[i] <= highs[i - j] or highs[i] <= highs[i + j]:
                    is_pivot = False
                    break

            if is_pivot:
                pivots.append((int(times[i].timestamp()), highs[i]))

        return pivots

    def _find_pivot_lows(self, df: pd.DataFrame) -> List[Tuple[int, float]]:
        """
        Find pivot low points.
        A pivot low is a bar where low is less than N bars before and after.

        Returns:
            List of (timestamp, price) tuples
        """
        pivots = []
        lows = df['low'].values
        times = df.index

        for i in range(self.pivot_window, len(df) - self.pivot_window):
            is_pivot = True

            # Check if current low is less than surrounding bars
            for j in range(1, self.pivot_window + 1):
                if lows[i] >= lows[i - j] or lows[i] >= lows[i + j]:
                    is_pivot = False
                    break

            if is_pivot:
                pivots.append((int(times[i].timestamp()), lows[i]))

        return pivots

    def _cluster_levels(
        self,
        pivots: List[Tuple[int, float]],
        tolerance: float,
        df: pd.DataFrame,
        zone_type: str
    ) -> List[Dict]:
        """
        Cluster nearby pivot levels into zones.

        Args:
            pivots: List of (timestamp, price) tuples
            tolerance: Price tolerance for clustering
            df: Original OHLCV DataFrame
            zone_type: "support" or "resistance"

        Returns:
            List of zone dictionaries
        """
        if not pivots:
            return []

        # Sort by price
        sorted_pivots = sorted(pivots, key=lambda x: x[1])
        zones = []
        current_cluster = [sorted_pivots[0]]

        for i in range(1, len(sorted_pivots)):
            prev_price = sorted_pivots[i - 1][1]
            curr_price = sorted_pivots[i][1]

            # If within tolerance, add to current cluster
            if abs(curr_price - prev_price) <= tolerance:
                current_cluster.append(sorted_pivots[i])
            else:
                # Finalize current cluster and start new one
                if current_cluster:
                    zones.append(self._create_zone(current_cluster, tolerance, zone_type))
                current_cluster = [sorted_pivots[i]]

        # Don't forget the last cluster
        if current_cluster:
            zones.append(self._create_zone(current_cluster, tolerance, zone_type))

        return zones

    def _create_zone(
        self,
        cluster: List[Tuple[int, float]],
        tolerance: float,
        zone_type: str
    ) -> Dict:
        """Create a zone dictionary from a cluster of pivots"""
        prices = [p[1] for p in cluster]
        times = [p[0] for p in cluster]

        # Zone bounds: center ± tolerance
        center = np.mean(prices)
        price_low = center - tolerance / 2
        price_high = center + tolerance / 2

        # Generate deterministic ID
        zone_id = hashlib.md5(
            f"{zone_type}_{center:.2f}_{len(cluster)}".encode()
        ).hexdigest()[:12]

        return {
            'id': zone_id,
            'type': zone_type,
            'price_low': float(price_low),
            'price_high': float(price_high),
            'touches': len(cluster),
            'last_touch_time': max(times),
            'touch_times': times,
            'raw_strength': 0.0  # Will be calculated in scoring
        }

    def _score_zones(self, zones: List[Dict], df: pd.DataFrame) -> List[Dict]:
        """
        Score zones based on touches, reaction magnitude, and recency.

        Scoring formula:
        - Touch score: normalized by max touches (0-1)
        - Reaction score: measure of price movement away from zone (0-1)
        - Recency score: exponential decay based on time (0-1)
        - Final: weighted average
        """
        if not zones:
            return []

        max_touches = max(z['touches'] for z in zones)
        current_time = int(df.index[-1].timestamp())
        time_range = current_time - int(df.index[0].timestamp())

        for zone in zones:
            # Touch score (0-1)
            touch_score = zone['touches'] / max_touches if max_touches > 0 else 0

            # Recency score (exponential decay)
            time_diff = current_time - zone['last_touch_time']
            recency_score = np.exp(-time_diff / (time_range / 2)) if time_range > 0 else 0.5

            # Reaction score: measure how strongly price reacted to this zone
            reaction_score = self._calculate_reaction_strength(zone, df)

            # Weighted combination
            strength = (
                0.4 * touch_score +
                0.3 * reaction_score +
                0.3 * recency_score
            )

            zone['strength'] = float(min(1.0, max(0.0, strength)))
            zone['raw_strength'] = strength

            # Clean up temporary fields
            zone.pop('touch_times', None)

        return zones

    def _calculate_reaction_strength(self, zone: Dict, df: pd.DataFrame) -> float:
        """
        Calculate how strongly price reacted when touching this zone.
        Higher reactions indicate stronger levels.
        """
        zone_center = (zone['price_low'] + zone['price_high']) / 2
        reactions = []

        # Find bars where price touched this zone
        for idx in range(len(df)):
            row = df.iloc[idx]
            if zone['price_low'] <= row['low'] <= zone['price_high'] or \
               zone['price_low'] <= row['high'] <= zone['price_high']:

                # Measure the reaction in next few bars
                look_ahead = min(5, len(df) - idx - 1)
                if look_ahead > 0:
                    future_slice = df.iloc[idx + 1:idx + 1 + look_ahead]
                    if zone['type'] == 'support':
                        # For support, measure upward reaction
                        reaction = (future_slice['high'].max() - zone_center) / zone_center
                    else:
                        # For resistance, measure downward reaction
                        reaction = (zone_center - future_slice['low'].min()) / zone_center

                    reactions.append(abs(reaction))

        if reactions:
            avg_reaction = np.mean(reactions)
            # Normalize to 0-1 range (assuming 5% reaction is very strong)
            return float(min(1.0, avg_reaction / 0.05))
        else:
            return 0.0

    def get_algorithm_params(self) -> Dict:
        """Return current algorithm parameters"""
        return {
            'pivot_window': self.pivot_window,
            'atr_period': self.atr_period,
            'atr_multiplier': self.atr_multiplier,
            'max_zones': self.max_zones
        }
