# KeyLevels AI - Project Structure

Complete file tree and architecture overview.

## Directory Tree

```
stock/
├── README.md                      # Main documentation
├── QUICKSTART.md                  # Quick setup guide
├── DEPLOYMENT.md                  # Production deployment guide
├── PROJECT_STRUCTURE.md           # This file
├── Makefile                       # Development commands
├── .gitignore                     # Git ignore rules
│
├── docker-compose.yml             # Multi-container orchestration
│
├── backend/                       # FastAPI Python backend
│   ├── Dockerfile                 # Production Docker image
│   ├── requirements.txt           # Python dependencies
│   ├── .env.example              # Environment template
│   │
│   └── app/
│       ├── __init__.py
│       ├── main.py               # FastAPI app entry point
│       │
│       ├── core/                 # Core configuration
│       │   ├── __init__.py
│       │   └── config.py         # Settings & environment vars
│       │
│       ├── api/                  # API routes
│       │   ├── __init__.py
│       │   └── routes.py         # REST endpoints
│       │
│       ├── schemas/              # Pydantic models
│       │   ├── __init__.py
│       │   └── market_data.py    # Request/response schemas
│       │
│       └── services/             # Business logic
│           ├── __init__.py
│           ├── data_provider.py  # Market data abstraction
│           ├── key_levels.py     # Algorithm implementation
│           └── cache.py          # Redis caching
│
└── frontend/                     # Next.js 14 React frontend
    ├── Dockerfile.dev            # Development Docker image
    ├── package.json              # Node dependencies
    ├── tsconfig.json             # TypeScript config
    ├── next.config.js            # Next.js config
    ├── tailwind.config.ts        # Tailwind CSS config
    ├── postcss.config.js         # PostCSS config
    ├── .env.example              # Environment template
    │
    ├── prisma/
    │   └── schema.prisma         # Database schema
    │
    └── src/
        ├── app/                  # Next.js 14 App Router
        │   ├── layout.tsx        # Root layout
        │   ├── page.tsx          # Dashboard (main page)
        │   ├── globals.css       # Global styles
        │   │
        │   └── api/              # API routes
        │       ├── auth/
        │       │   └── [...nextauth]/
        │       │       └── route.ts    # NextAuth handler
        │       │
        │       └── stripe/
        │           ├── create-checkout/
        │           │   └── route.ts    # Stripe checkout
        │           └── webhook/
        │               └── route.ts    # Stripe webhooks
        │
        ├── components/           # React components
        │   ├── TradingViewChart.tsx   # Main chart component
        │   ├── TickerSearch.tsx       # Search input
        │   ├── TimeframeSelector.tsx  # TF buttons
        │   └── LoadingSkeleton.tsx    # Loading state
        │
        ├── lib/                  # Utility libraries
        │   ├── api.ts            # API client
        │   ├── prisma.ts         # Prisma client
        │   └── utils.ts          # Helper functions
        │
        └── types/                # TypeScript types
            ├── api.ts            # API response types
            └── next-auth.d.ts    # NextAuth types
```

## Architecture Layers

### Backend (FastAPI)

```
┌─────────────────────────────────────────────┐
│              API Layer (routes.py)          │
│  GET /api/data                              │
│  GET /api/keylevels                         │
│  POST /api/alerts                           │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│           Services Layer                    │
│  ┌──────────────┐  ┌─────────────────┐     │
│  │ DataProvider │  │  KeyLevels      │     │
│  │  - yfinance  │  │  - Algorithm    │     │
│  │  - polygon   │  │  - Zone scoring │     │
│  │  - alpaca    │  │                 │     │
│  └──────────────┘  └─────────────────┘     │
│                                             │
│  ┌──────────────┐                          │
│  │    Cache     │                          │
│  │    Redis     │                          │
│  └──────────────┘                          │
└─────────────────────────────────────────────┘
```

### Frontend (Next.js)

```
┌─────────────────────────────────────────────┐
│            Pages Layer (App Router)         │
│  /            - Dashboard                   │
│  /api/auth    - Authentication              │
│  /api/stripe  - Payment webhooks            │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│           Components Layer                  │
│  - TradingViewChart                         │
│  - TickerSearch                             │
│  - TimeframeSelector                        │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│            Services Layer                   │
│  ┌──────────┐  ┌────────────┐              │
│  │   API    │  │   Prisma   │              │
│  │  Client  │  │    ORM     │              │
│  └──────────┘  └────────────┘              │
└─────────────────────────────────────────────┘
```

## Data Flow

### Market Data Request Flow

```
User Input (Ticker + TF)
    │
    ▼
TickerSearch Component
    │
    ▼
API Client (lib/api.ts)
    │
    ├─► GET /api/data
    │   └─► Backend: routes.py
    │       └─► data_provider.py
    │           └─► yfinance
    │               └─► Returns OHLCV
    │
    └─► GET /api/keylevels
        └─► Backend: routes.py
            └─► key_levels.py
                ├─► Detect pivots
                ├─► Cluster zones
                ├─► Score zones
                └─► Returns top N zones
    │
    ▼
TradingViewChart Component
    │
    ▼
Render Chart + Zones
```

### Key Levels Algorithm Flow

```
OHLCV Data Input
    │
    ▼
1. Calculate ATR (14-period)
    │
    ▼
2. Find Pivot Points
    ├─► Pivot Highs (window=3)
    └─► Pivot Lows (window=3)
    │
    ▼
3. Cluster into Zones (tolerance = 0.3 * ATR)
    ├─► Resistance zones
    └─► Support zones
    │
    ▼
4. Score Each Zone
    ├─► Touch Score (40%)
    ├─► Reaction Score (30%)
    └─► Recency Score (30%)
    │
    ▼
5. Sort by Strength
    │
    ▼
Return Top 6 Zones
```

## Database Schema

### Users & Authentication

```sql
User
├── id (PK)
├── email
├── name
├── createdAt
├── subscription (1:1)
├── watchlists (1:N)
└── alerts (1:N)

Account (NextAuth)
├── id (PK)
├── userId (FK)
├── provider
└── ...

Session (NextAuth)
├── id (PK)
├── userId (FK)
└── ...
```

### Subscriptions

```sql
Subscription
├── id (PK)
├── userId (FK)
├── stripeCustomerId
├── stripeSubscriptionId
├── plan ("basic" | "pro")
└── status
```

### Watchlists & Alerts

```sql
Watchlist
├── id (PK)
├── userId (FK)
├── name
└── tickers[]

Alert
├── id (PK)
├── userId (FK)
├── ticker
├── zoneId
├── direction
└── status
```

## Environment Variables

### Backend (.env)
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `SECRET_KEY` - JWT signing key
- `STRIPE_SECRET_KEY` - Stripe API key
- `STRIPE_WEBHOOK_SECRET` - Webhook verification
- `CORS_ORIGINS` - Allowed origins
- `CACHE_TTL_SECONDS` - Cache duration

### Frontend (.env)
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXTAUTH_URL` - App URL
- `NEXTAUTH_SECRET` - Auth signing key
- `DATABASE_URL` - PostgreSQL connection
- `STRIPE_SECRET_KEY` - Stripe API key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe public key

## API Endpoints

### Market Data
- `GET /api/data` - Fetch OHLCV candlesticks
- `GET /api/keylevels` - Compute key zones
- `POST /api/alerts` - Create price alert
- `GET /health` - Health check

### Authentication (NextAuth)
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signout` - Sign out
- `GET /api/auth/session` - Get session

### Payments (Stripe)
- `POST /api/stripe/create-checkout` - Start checkout
- `POST /api/stripe/webhook` - Handle webhooks

## Key Technologies

### Backend Stack
| Technology | Purpose | Version |
|------------|---------|---------|
| FastAPI | Web framework | 0.104 |
| Pydantic | Data validation | 2.5 |
| yfinance | Market data | 0.2.32 |
| Redis | Caching | 5.0 |
| PostgreSQL | Database | 15 |
| Stripe | Payments | 7.8 |

### Frontend Stack
| Technology | Purpose | Version |
|------------|---------|---------|
| Next.js | React framework | 14.0 |
| TypeScript | Type safety | 5.3 |
| Tailwind CSS | Styling | 3.3 |
| Lightweight Charts | TradingView charts | 4.1 |
| NextAuth | Authentication | 4.24 |
| Prisma | ORM | 5.7 |

## Development Commands

```bash
# Start all services
make dev
# or
docker-compose up

# Backend only
make backend
# or
cd backend && uvicorn app.main:app --reload

# Frontend only
make frontend
# or
cd frontend && npm run dev

# Database operations
make db-push        # Push schema
make db-migrate     # Create migration
make db-studio      # Open Prisma Studio

# Cleanup
make clean          # Remove containers & volumes
```

## File Purposes

### Configuration Files
- `docker-compose.yml` - Multi-container setup
- `tsconfig.json` - TypeScript compiler options
- `tailwind.config.ts` - Tailwind CSS customization
- `next.config.js` - Next.js build config
- `prisma/schema.prisma` - Database models

### Core Backend Files
- `app/main.py` - FastAPI app & middleware
- `app/core/config.py` - Settings management
- `app/api/routes.py` - HTTP endpoints
- `app/services/key_levels.py` - Algorithm (350+ lines)
- `app/services/data_provider.py` - Data abstraction
- `app/services/cache.py` - Redis operations

### Core Frontend Files
- `app/page.tsx` - Main dashboard UI
- `components/TradingViewChart.tsx` - Chart visualization
- `lib/api.ts` - Backend API client
- `app/api/auth/[...nextauth]/route.ts` - Auth handler
- `app/api/stripe/webhook/route.ts` - Payment webhooks

## Next Steps

1. **Development**: See QUICKSTART.md
2. **Deployment**: See DEPLOYMENT.md
3. **Documentation**: See README.md
4. **Customization**: Edit algorithm params in `backend/app/core/config.py`

---

Total LOC: ~2,500+ lines of production-ready code
Files: 40+ source files + configuration
