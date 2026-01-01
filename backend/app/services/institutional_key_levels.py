"""
Institutional-Grade Key Level Detection System

Philosophy: "If institutions wouldn't care about the level, don't draw it."

Key Principles:
- Detect major support/resistance zones, not noise
- Require multiple confirmations (min 2-3 strong reactions)
- Higher timeframe levels weighted more heavily
- Ignore minor fluctuations and weak touches
- Clean zones, not cluttered lines
- Maximum 3-7 key levels per chart
"""

import pandas as pd
import numpy as np
from typing import List, Dict, Tuple
from datetime import datetime
import hashlib


class InstitutionalKeyLevels:
    """
    Professional key level detection for institutional trading.

    Detection Criteria:
    1. High-volume nodes (institutional accumulation/distribution)
    2. Strong impulsive moves away from level (rejection strength)
    3. Market structure breaks (BOS/CHoCH)
    4. Consolidation → expansion zones
    5. Multiple confirmations over time
    """

    def __init__(
        self,
        min_touches: int = 2,
        min_reaction_atr: float = 1.5,
        volume_threshold_percentile: float = 70,
        max_levels: int = 7,
        merge_tolerance_atr: float = 0.5,
        broken_level_invalidation: bool = True
    ):
        """
        Args:
            min_touches: Minimum rejections to qualify as key level (2-3)
            min_reaction_atr: Minimum reaction size in ATR multiples (1.5+)
            volume_threshold_percentile: Volume percentile for high-volume nodes
            max_levels: Maximum levels to return (3-7)
            merge_tolerance_atr: Merge nearby levels within this ATR multiple
            broken_level_invalidation: Remove cleanly broken levels
        """
        self.min_touches = min_touches
        self.min_reaction_atr = min_reaction_atr
        self.volume_threshold_percentile = volume_threshold_percentile
        self.max_levels = max_levels
        self.merge_tolerance_atr = merge_tolerance_atr
        self.broken_level_invalidation = broken_level_invalidation

    def detect_levels(self, df: pd.DataFrame, timeframe: str = '1d') -> List[Dict]:
        """
        Detect institutional key levels.

        Returns list of dicts with:
        - type: 'support', 'resistance', 'equilibrium'
        - price_low, price_high: Zone boundaries
        - confidence: 0-100% confidence score
        - touches: Number of confirmations
        - strength: Normalized strength score
        - volume_profile: Average volume at level
        - last_touch_time: Most recent interaction
        """
        if len(df) < 50:
            return []

        # Calculate ATR for dynamic zone sizing
        atr = self._calculate_atr(df, period=14)

        # Get timeframe weight (daily > 4h > 1h > 15m)
        tf_weight = self._get_timeframe_weight(timeframe)

        # Step 1: Detect high-volume nodes (institutional zones)
        volume_zones = self._detect_volume_nodes(df, atr)

        # Step 2: Detect strong rejection zones
        rejection_zones = self._detect_rejection_zones(df, atr)

        # Step 3: Detect consolidation → expansion zones
        consolidation_zones = self._detect_consolidation_expansion(df, atr)

        # Step 4: Detect market structure breaks
        structure_zones = self._detect_structure_breaks(df, atr)

        # Merge all candidate zones
        all_zones = volume_zones + rejection_zones + consolidation_zones + structure_zones

        # Filter: Remove weak zones (< min_touches)
        filtered_zones = [z for z in all_zones if z['touches'] >= self.min_touches]

        # Filter: Remove cleanly broken levels
        if self.broken_level_invalidation:
            filtered_zones = self._remove_broken_levels(filtered_zones, df)

        # Merge nearby zones into clean levels
        merged_zones = self._merge_nearby_zones(filtered_zones, atr)

        # Score and rank zones
        scored_zones = self._score_zones(merged_zones, df, atr, tf_weight)

        # Return top N levels
        top_zones = sorted(scored_zones, key=lambda x: x['confidence'], reverse=True)[:self.max_levels]

        # Classify as support/resistance/equilibrium
        classified_zones = self._classify_zones(top_zones, df)

        return classified_zones

    def _calculate_atr(self, df: pd.DataFrame, period: int = 14) -> float:
        """Calculate Average True Range"""
        high = df['high']
        low = df['low']
        close = df['close'].shift(1)

        tr1 = high - low
        tr2 = abs(high - close)
        tr3 = abs(low - close)

        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr = tr.rolling(window=period).mean().iloc[-1]

        return atr if not pd.isna(atr) else (df['high'].mean() - df['low'].mean()) * 0.02

    def _get_timeframe_weight(self, timeframe: str) -> float:
        """Higher timeframes get higher weight"""
        weights = {
            '1d': 1.0,
            '4h': 0.8,
            '1h': 0.6,
            '15m': 0.4
        }
        return weights.get(timeframe, 0.7)

    def _detect_volume_nodes(self, df: pd.DataFrame, atr: float) -> List[Dict]:
        """
        Detect high-volume nodes where institutions accumulate/distribute.
        These are price levels with sustained high volume.
        """
        zones = []
        volume_threshold = df['volume'].quantile(self.volume_threshold_percentile / 100)

        # Find price levels with high volume
        high_vol_bars = df[df['volume'] >= volume_threshold].copy()

        if len(high_vol_bars) < 2:
            return zones

        # Group by price clusters
        tolerance = atr * self.merge_tolerance_atr
        price_clusters = []

        for idx, row in high_vol_bars.iterrows():
            price = (row['high'] + row['low']) / 2

            # Find or create cluster
            found_cluster = False
            for cluster in price_clusters:
                if abs(price - cluster['price']) <= tolerance:
                    cluster['prices'].append(price)
                    cluster['volumes'].append(row['volume'])
                    cluster['times'].append(idx)
                    found_cluster = True
                    break

            if not found_cluster:
                price_clusters.append({
                    'price': price,
                    'prices': [price],
                    'volumes': [row['volume']],
                    'times': [idx]
                })

        # Convert clusters to zones
        for cluster in price_clusters:
            if len(cluster['prices']) >= self.min_touches:
                avg_price = np.mean(cluster['prices'])
                avg_volume = np.mean(cluster['volumes'])

                zones.append({
                    'price_low': avg_price - atr * 0.3,
                    'price_high': avg_price + atr * 0.3,
                    'touches': len(cluster['prices']),
                    'avg_volume': avg_volume,
                    'last_touch_time': max(cluster['times']),
                    'source': 'volume_node'
                })

        return zones

    def _detect_rejection_zones(self, df: pd.DataFrame, atr: float) -> List[Dict]:
        """
        Detect zones with strong price rejections (impulsive moves away).
        Institutions leave footprints via sharp reversals.
        """
        zones = []

        # Find swing highs and lows with strong reactions
        for i in range(5, len(df) - 5):
            # Check for swing high (resistance)
            if df['high'].iloc[i] == df['high'].iloc[i-5:i+6].max():
                # Measure reaction strength (move away from high)
                reaction = df['high'].iloc[i] - df['low'].iloc[i:min(i+10, len(df))].min()

                if reaction >= self.min_reaction_atr * atr:
                    zones.append({
                        'price_low': df['high'].iloc[i] - atr * 0.3,
                        'price_high': df['high'].iloc[i] + atr * 0.3,
                        'touches': 1,
                        'reaction_strength': reaction / atr,
                        'last_touch_time': df.index[i],
                        'source': 'rejection_high'
                    })

            # Check for swing low (support)
            if df['low'].iloc[i] == df['low'].iloc[i-5:i+6].min():
                # Measure reaction strength (move away from low)
                reaction = df['high'].iloc[i:min(i+10, len(df))].max() - df['low'].iloc[i]

                if reaction >= self.min_reaction_atr * atr:
                    zones.append({
                        'price_low': df['low'].iloc[i] - atr * 0.3,
                        'price_high': df['low'].iloc[i] + atr * 0.3,
                        'touches': 1,
                        'reaction_strength': reaction / atr,
                        'last_touch_time': df.index[i],
                        'source': 'rejection_low'
                    })

        return zones

    def _detect_consolidation_expansion(self, df: pd.DataFrame, atr: float) -> List[Dict]:
        """
        Detect consolidation zones followed by expansion.
        Institutions accumulate in tight ranges before moving price.
        """
        zones = []
        window = 20

        for i in range(window, len(df) - window):
            # Check for consolidation
            range_pct = (df['high'].iloc[i-window:i].max() - df['low'].iloc[i-window:i].min()) / df['close'].iloc[i]

            # Tight consolidation (< 5% range)
            if range_pct < 0.05:
                # Check for subsequent expansion
                future_range = (df['high'].iloc[i:i+window].max() - df['low'].iloc[i:i+window].min()) / df['close'].iloc[i]

                # Expansion (> 10% range)
                if future_range > 0.10:
                    consolidation_mid = (df['high'].iloc[i-window:i].max() + df['low'].iloc[i-window:i].min()) / 2

                    zones.append({
                        'price_low': consolidation_mid - atr * 0.4,
                        'price_high': consolidation_mid + atr * 0.4,
                        'touches': 2,
                        'consolidation_strength': future_range / range_pct,
                        'last_touch_time': df.index[i],
                        'source': 'consolidation_expansion'
                    })

        return zones

    def _detect_structure_breaks(self, df: pd.DataFrame, atr: float) -> List[Dict]:
        """
        Detect Break of Structure (BOS) and Change of Character (CHoCH).
        Institutions create structure breaks at key levels.
        """
        zones = []
        lookback = 20

        for i in range(lookback, len(df) - 5):
            recent_high = df['high'].iloc[i-lookback:i].max()
            recent_low = df['low'].iloc[i-lookback:i].min()

            # Bullish BOS (break above recent high with strength)
            if df['close'].iloc[i] > recent_high:
                move_size = df['close'].iloc[i] - df['open'].iloc[i]
                if move_size > atr * 0.5:  # Strong break
                    zones.append({
                        'price_low': recent_high - atr * 0.3,
                        'price_high': recent_high + atr * 0.3,
                        'touches': 1,
                        'structure_type': 'bullish_bos',
                        'last_touch_time': df.index[i],
                        'source': 'structure_break'
                    })

            # Bearish BOS (break below recent low with strength)
            if df['close'].iloc[i] < recent_low:
                move_size = df['open'].iloc[i] - df['close'].iloc[i]
                if move_size > atr * 0.5:  # Strong break
                    zones.append({
                        'price_low': recent_low - atr * 0.3,
                        'price_high': recent_low + atr * 0.3,
                        'touches': 1,
                        'structure_type': 'bearish_bos',
                        'last_touch_time': df.index[i],
                        'source': 'structure_break'
                    })

        return zones

    def _remove_broken_levels(self, zones: List[Dict], df: pd.DataFrame) -> List[Dict]:
        """Remove levels that were broken cleanly and never respected again"""
        valid_zones = []
        current_price = df['close'].iloc[-1]

        for zone in zones:
            zone_mid = (zone['price_low'] + zone['price_high']) / 2

            # Find if price broke through this level
            broke_through = False
            respected_after_break = False

            for i in range(len(df)):
                if df['low'].iloc[i] < zone['price_low'] and df['high'].iloc[i] > zone['price_high']:
                    broke_through = True

                    # Check if price respected it after breaking
                    if i < len(df) - 10:
                        future_touches = 0
                        for j in range(i+1, min(i+20, len(df))):
                            if abs(df['close'].iloc[j] - zone_mid) < (zone['price_high'] - zone['price_low']):
                                future_touches += 1

                        if future_touches >= 1:
                            respected_after_break = True
                    break

            # Keep level if not broken, or if respected after break
            if not broke_through or respected_after_break:
                valid_zones.append(zone)

        return valid_zones

    def _merge_nearby_zones(self, zones: List[Dict], atr: float) -> List[Dict]:
        """Merge zones that are too close together into clean levels"""
        if not zones:
            return []

        merged = []
        tolerance = atr * self.merge_tolerance_atr

        # Sort zones by price
        sorted_zones = sorted(zones, key=lambda x: (x['price_low'] + x['price_high']) / 2)

        current_cluster = [sorted_zones[0]]

        for zone in sorted_zones[1:]:
            zone_mid = (zone['price_low'] + zone['price_high']) / 2
            cluster_mid = sum((z['price_low'] + z['price_high']) / 2 for z in current_cluster) / len(current_cluster)

            if abs(zone_mid - cluster_mid) <= tolerance:
                current_cluster.append(zone)
            else:
                # Merge current cluster
                merged.append(self._merge_cluster(current_cluster))
                current_cluster = [zone]

        # Merge last cluster
        if current_cluster:
            merged.append(self._merge_cluster(current_cluster))

        return merged

    def _merge_cluster(self, cluster: List[Dict]) -> Dict:
        """Merge multiple zones into one representative zone"""
        avg_low = np.mean([z['price_low'] for z in cluster])
        avg_high = np.mean([z['price_high'] for z in cluster])
        total_touches = sum(z['touches'] for z in cluster)

        # Aggregate metadata
        merged = {
            'price_low': avg_low,
            'price_high': avg_high,
            'touches': total_touches,
            'last_touch_time': max(z['last_touch_time'] for z in cluster),
            'sources': list(set(z['source'] for z in cluster))
        }

        # Carry over special attributes
        if any('reaction_strength' in z for z in cluster):
            merged['reaction_strength'] = np.mean([z.get('reaction_strength', 0) for z in cluster if 'reaction_strength' in z])
        if any('avg_volume' in z for z in cluster):
            merged['avg_volume'] = np.mean([z.get('avg_volume', 0) for z in cluster if 'avg_volume' in z])

        return merged

    def _score_zones(self, zones: List[Dict], df: pd.DataFrame, atr: float, tf_weight: float) -> List[Dict]:
        """
        Score zones based on institutional importance.

        Factors:
        - Number of touches (more = stronger)
        - Reaction strength (sharp moves = institutional)
        - Volume profile (high volume = institutional)
        - Recency (recent levels more relevant)
        - Multiple confirmation sources
        """
        scored_zones = []
        latest_time = df.index[-1]

        for zone in zones:
            score = 0

            # Touch count (0-30 points)
            touch_score = min(zone['touches'] * 5, 30)
            score += touch_score

            # Reaction strength (0-25 points)
            if 'reaction_strength' in zone:
                reaction_score = min(zone['reaction_strength'] * 5, 25)
                score += reaction_score

            # Volume profile (0-20 points)
            if 'avg_volume' in zone:
                vol_percentile = (zone['avg_volume'] / df['volume'].mean()) * 100
                vol_score = min(vol_percentile / 5, 20)
                score += vol_score

            # Recency (0-15 points)
            time_diff = (latest_time - zone['last_touch_time']).days if hasattr(latest_time - zone['last_touch_time'], 'days') else 0
            recency_score = max(15 - (time_diff / 10), 0)
            score += recency_score

            # Multiple sources (0-10 points)
            if 'sources' in zone and len(zone['sources']) > 1:
                score += 10

            # Apply timeframe weight
            score *= tf_weight

            # Normalize to 0-100 confidence
            confidence = min(score, 100)

            zone['confidence'] = round(confidence, 1)
            zone['strength'] = confidence / 100.0

            scored_zones.append(zone)

        return scored_zones

    def _classify_zones(self, zones: List[Dict], df: pd.DataFrame) -> List[Dict]:
        """
        Classify zones as Support, Resistance, or Equilibrium.

        Support: Price is above the zone
        Resistance: Price is below the zone
        Equilibrium: Price is oscillating around the zone
        """
        current_price = df['close'].iloc[-1]
        classified = []

        for zone in zones:
            zone_mid = (zone['price_low'] + zone['price_high']) / 2

            # Calculate how many times price was above vs below
            touches_above = 0
            touches_below = 0

            for i in range(max(0, len(df) - 50), len(df)):
                if abs(df['close'].iloc[i] - zone_mid) < (zone['price_high'] - zone['price_low']):
                    if df['close'].iloc[i] > zone_mid:
                        touches_above += 1
                    else:
                        touches_below += 1

            # Classify
            if current_price > zone['price_high']:
                zone_type = 'support'
            elif current_price < zone['price_low']:
                zone_type = 'resistance'
            elif touches_above > 0 and touches_below > 0:
                zone_type = 'equilibrium'
            else:
                zone_type = 'support' if current_price > zone_mid else 'resistance'

            zone['type'] = zone_type
            zone['id'] = hashlib.md5(f"{zone_type}_{zone_mid:.2f}".encode()).hexdigest()[:16]

            # Convert timestamp to int (unix timestamp)
            if 'last_touch_time' in zone and zone['last_touch_time'] is not None:
                if hasattr(zone['last_touch_time'], 'timestamp'):
                    zone['last_touch_time'] = int(zone['last_touch_time'].timestamp())
                elif isinstance(zone['last_touch_time'], (int, float)):
                    zone['last_touch_time'] = int(zone['last_touch_time'])

            # Clean up internal fields
            zone.pop('sources', None)
            zone.pop('source', None)

            classified.append(zone)

        return classified

    def get_algorithm_params(self) -> Dict:
        """Return algorithm configuration"""
        return {
            'min_touches': self.min_touches,
            'min_reaction_atr': self.min_reaction_atr,
            'volume_threshold_percentile': self.volume_threshold_percentile,
            'max_levels': self.max_levels,
            'merge_tolerance_atr': self.merge_tolerance_atr,
            'broken_level_invalidation': self.broken_level_invalidation,
            'algorithm': 'institutional_key_levels_v1'
        }
