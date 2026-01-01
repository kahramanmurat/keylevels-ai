# KeyLevels AI

A production-ready SaaS web application for identifying key support and resistance levels in stock price charts using AI-powered analysis.

![KeyLevels AI](https://img.shields.io/badge/Status-Production%20Ready-green)
![License](https://img.shields.io/badge/License-MIT-blue)

## Features

- **Interactive Charts**: TradingView Lightweight Charts with zoom, pan, and crosshair functionality
- **Key Level Detection**: Proprietary algorithm to identify support/resistance zones using:
  - Swing high/low detection with pivot fractals
  - ATR-based clustering for zone creation
  - Multi-factor scoring (touches + reaction + recency)
- **Multiple Timeframes**: 1D, 4H, 1H, 15m analysis
- **Real-time Data**: Yahoo Finance integration with caching layer
- **Authentication**: NextAuth with email/password and magic link support
- **Subscription Management**: Stripe integration for Basic and Pro plans
- **Responsive UI**: Clean, modern interface built with Next.js 14 and Tailwind CSS

## Tech Stack

### Frontend
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **TradingView Lightweight Charts**
- **NextAuth** for authentication
- **Prisma** ORM

### Backend
- **FastAPI** (Python)
- **yfinance** for market data (with abstraction layer for easy provider swapping)
- **Redis** for caching
- **PostgreSQL** for data persistence
- **Stripe** for payments

### Infrastructure
- **Docker** & **Docker Compose** for local development
- **Vercel** ready for frontend deployment
- **Render/Fly.io** compatible for backend deployment

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes.py          # API endpoints
│   │   ├── core/
│   │   │   └── config.py          # Configuration
│   │   ├── schemas/
│   │   │   └── market_data.py     # Pydantic models
│   │   ├── services/
│   │   │   ├── data_provider.py   # Data source abstraction
│   │   │   ├── key_levels.py      # Key levels algorithm
│   │   │   └── cache.py           # Redis caching
│   │   └── main.py                # FastAPI app
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── auth/          # NextAuth routes
│   │   │   │   └── stripe/        # Stripe webhooks
│   │   │   ├── page.tsx           # Main dashboard
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── TradingViewChart.tsx
│   │   │   ├── TickerSearch.tsx
│   │   │   ├── TimeframeSelector.tsx
│   │   │   └── LoadingSkeleton.tsx
│   │   ├── lib/
│   │   │   ├── api.ts             # API client
│   │   │   ├── prisma.ts          # Prisma client
│   │   │   └── utils.ts
│   │   └── types/
│   │       └── api.ts             # TypeScript types
│   ├── prisma/
│   │   └── schema.prisma          # Database schema
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   └── .env.example
│
└── docker-compose.yml
```

## Getting Started

### Prerequisites

- **Docker** and **Docker Compose** installed
- **Node.js 18+** (if running without Docker)
- **Python 3.11+** (if running without Docker)

### Quick Start with Docker

1. **Clone the repository**

```bash
cd /path/to/stock
```

2. **Copy environment files**

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

3. **Start all services**

```bash
docker-compose up --build
```

This will start:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`
- Backend API on `http://localhost:8000`
- Frontend on `http://localhost:3000`

4. **Initialize the database**

```bash
# In a new terminal
cd frontend
npm install
npx prisma generate
npx prisma db push
```

5. **Access the application**

Open your browser to `http://localhost:3000`

### Manual Setup (Without Docker)

#### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at `http://localhost:8000`

API docs at `http://localhost:8000/docs`

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```

Frontend will be available at `http://localhost:3000`

## API Endpoints

### Market Data

```http
GET /api/data?ticker=TSLA&timeframe=4h&lookback=180
```

Returns OHLCV candlestick data.

**Response:**
```json
{
  "ticker": "TSLA",
  "timeframe": "4h",
  "data": [
    {
      "time": 1703001600,
      "open": 242.50,
      "high": 245.30,
      "low": 240.10,
      "close": 243.80,
      "volume": 125000000
    }
  ],
  "fetched_at": "2024-01-15T10:30:00"
}
```

### Key Levels

```http
GET /api/keylevels?ticker=TSLA&timeframe=4h&lookback=180
```

Returns computed support/resistance zones.

**Response:**
```json
{
  "ticker": "TSLA",
  "timeframe": "4h",
  "lookback": 180,
  "zones": [
    {
      "id": "a1b2c3d4e5f6",
      "type": "resistance",
      "price_low": 248.50,
      "price_high": 252.30,
      "strength": 0.87,
      "touches": 5,
      "last_touch_time": 1703001600
    }
  ],
  "computed_at": "2024-01-15T10:30:00",
  "algorithm_params": {
    "pivot_window": 3,
    "atr_period": 14,
    "atr_multiplier": 0.3,
    "max_zones": 6
  }
}
```

### Alerts

```http
POST /api/alerts
Content-Type: application/json

{
  "ticker": "TSLA",
  "timeframe": "4h",
  "zone_id": "a1b2c3d4e5f6",
  "direction": "enter",
  "notify_email": true
}
```

## Algorithm Details

The key levels detection algorithm is **deterministic** and follows these steps:

### 1. Pivot Detection
- Identifies swing highs where the high is greater than N bars before and after
- Identifies swing lows where the low is less than N bars before and after
- Configurable window (default: 3 bars)

### 2. Zone Clustering
- Calculates ATR (Average True Range) for dynamic zone sizing
- Clusters nearby pivots within `ATR * multiplier` distance (default: 0.3 * ATR)
- Creates zones with price_low and price_high boundaries

### 3. Zone Scoring
- **Touch Score** (40%): Number of times price touched the zone
- **Reaction Score** (30%): Magnitude of price reaction after touching zone
- **Recency Score** (30%): How recently the zone was touched (exponential decay)
- Final strength normalized to 0-1 range

### 4. Zone Selection
- Sorts zones by strength score
- Returns top N zones (default: 6)

## Configuration

### Backend Configuration

Edit `backend/.env`:

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/keylevels
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
CACHE_TTL_SECONDS=300

# Algorithm parameters
PIVOT_WINDOW=3
ATR_PERIOD=14
ATR_MULTIPLIER=0.3
MAX_ZONES=6
```

### Frontend Configuration

Edit `frontend/.env`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
DATABASE_URL=postgresql://user:pass@localhost:5432/keylevels
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

## Swapping Data Providers

The backend uses an abstraction layer for data sources. To switch from yfinance to Polygon or Alpaca:

1. Install the provider library:
```bash
# For Polygon
pip install polygon-api-client

# For Alpaca
pip install alpaca-trade-api
```

2. Implement the provider in `backend/app/services/data_provider.py`

3. Update the factory function:
```python
# In your code
provider = get_data_provider("polygon", api_key="YOUR_KEY")
# or
provider = get_data_provider("alpaca", api_key="KEY", secret_key="SECRET")
```

## Deployment

### Frontend (Vercel)

1. Push your code to GitHub
2. Import project in Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

### Backend (Render)

1. Create a new Web Service in Render
2. Connect your repository
3. Set build command: `pip install -r backend/requirements.txt`
4. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables
6. Deploy

### Backend (Fly.io)

```bash
cd backend
fly launch
fly secrets set DATABASE_URL=...
fly secrets set REDIS_URL=...
fly deploy
```

## Subscription Plans

- **Basic Plan**: 1 watchlist, core features
- **Pro Plan**: Unlimited watchlists, price alerts, priority support

Configure pricing in Stripe Dashboard and update environment variables with price IDs.

## Development

### Run Tests

```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm test
```

### Database Migrations

```bash
cd frontend
npx prisma migrate dev --name your_migration_name
```

### View Database

```bash
cd frontend
npx prisma studio
```

## Performance

- **Caching**: All API responses cached for 5 minutes in Redis
- **Server-side fetching**: Initial data loaded on server for faster page loads
- **Optimized queries**: Efficient database queries with Prisma
- **CDN ready**: Static assets can be served from CDN

## Security

- ✅ Environment variables for secrets
- ✅ CORS configuration
- ✅ Rate limiting ready (add middleware as needed)
- ✅ Stripe webhook signature verification
- ✅ SQL injection protection via Prisma
- ✅ XSS protection via React

## License

MIT License - feel free to use for your projects

## Support

For issues and questions:
- Open an issue on GitHub
- Email: support@keylevels.ai (placeholder)

## Roadmap

- [ ] Real-time price monitoring for alerts
- [ ] Email notifications
- [ ] Webhook integrations
- [ ] Advanced charting features
- [ ] Mobile app
- [ ] Historical backtesting
- [ ] Multiple asset classes (Crypto, Forex)

---

Built with ❤️ for traders and developers
