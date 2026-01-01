"""
Redis-based caching service for API responses.
"""

import redis
import json
from typing import Optional, Any
from app.core.config import settings


class CacheService:
    """Redis cache wrapper with JSON serialization"""

    def __init__(self):
        self.redis_client = redis.from_url(
            settings.REDIS_URL,
            decode_responses=True
        )
        self.default_ttl = settings.CACHE_TTL_SECONDS

    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache.

        Args:
            key: Cache key

        Returns:
            Cached value (deserialized from JSON) or None
        """
        try:
            value = self.redis_client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            print(f"Cache get error: {e}")
            return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """
        Set value in cache.

        Args:
            key: Cache key
            value: Value to cache (will be JSON serialized)
            ttl: Time to live in seconds (default: CACHE_TTL_SECONDS)

        Returns:
            Success boolean
        """
        try:
            ttl = ttl or self.default_ttl
            serialized = json.dumps(value, default=str)
            self.redis_client.setex(key, ttl, serialized)
            return True
        except Exception as e:
            print(f"Cache set error: {e}")
            return False

    def delete(self, key: str) -> bool:
        """Delete key from cache"""
        try:
            self.redis_client.delete(key)
            return True
        except Exception as e:
            print(f"Cache delete error: {e}")
            return False

    def clear_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching pattern.

        Args:
            pattern: Redis pattern (e.g., "ticker:TSLA:*")

        Returns:
            Number of keys deleted
        """
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                return self.redis_client.delete(*keys)
            return 0
        except Exception as e:
            print(f"Cache clear pattern error: {e}")
            return 0

    def make_key(self, *parts: str) -> str:
        """Create a cache key from parts"""
        return ":".join(str(p) for p in parts)


# Singleton instance
cache = CacheService()
