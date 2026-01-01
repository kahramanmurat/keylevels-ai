from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://keylevels:keylevels_dev_password@localhost:5432/keylevels"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Environment
    ENVIRONMENT: str = "development"

    # JWT
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_ID_BASIC: str = ""
    STRIPE_PRICE_ID_PRO: str = ""

    # API
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    CACHE_TTL_SECONDS: int = 300

    # Key Levels Algorithm Parameters
    PIVOT_WINDOW: int = 3
    ATR_PERIOD: int = 14
    ATR_MULTIPLIER: float = 0.3
    MAX_ZONES: int = 6

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
