# KeyLevels AI - Quick Start Guide

Get up and running in 5 minutes!

## Option 1: Docker (Recommended)

### Prerequisites
- Docker and Docker Compose installed

### Steps

1. **Start all services**
```bash
docker-compose up -d
```

2. **Wait for services to be healthy** (about 30 seconds)
```bash
docker-compose ps
```

3. **Initialize the database**
```bash
# Install Node.js dependencies (one-time setup)
cd frontend
npm install

# Generate Prisma client and push schema
npx prisma generate
npx prisma db push
cd ..
```

4. **Open the app**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

5. **Try it out**
- Enter a ticker: `TSLA`
- Select timeframe: `1d`
- Click Search or press Enter
- View the chart with key support/resistance zones!

### Troubleshooting

**Port already in use?**
```bash
# Stop services
docker-compose down

# Edit docker-compose.yml to change ports
# Then restart
docker-compose up -d
```

**Database connection error?**
```bash
# Check if PostgreSQL is ready
docker-compose logs postgres

# Restart services
docker-compose restart
```

## Option 2: Manual Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL running on localhost:5432
- Redis running on localhost:6379

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Start server
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Set up database
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```

## Testing the API

### Using curl

**Get market data:**
```bash
curl "http://localhost:8000/api/data?ticker=AAPL&timeframe=1d"
```

**Get key levels:**
```bash
curl "http://localhost:8000/api/keylevels?ticker=AAPL&timeframe=1d"
```

### Using the API docs

Open http://localhost:8000/docs in your browser to use the interactive Swagger UI.

## Sample Tickers to Try

- **Tech**: AAPL, MSFT, GOOGL, TSLA, NVDA, AMD
- **Finance**: JPM, BAC, GS, V, MA
- **ETFs**: SPY, QQQ, IWM, VTI
- **Volatile**: GME, AMC, PLTR

## Next Steps

1. **Authentication**: Set up NextAuth credentials in `.env`
2. **Stripe**: Add your Stripe keys for subscription features
3. **Production**: Follow deployment guides in README.md
4. **Customize**: Adjust algorithm parameters in `backend/app/core/config.py`

## Common Issues

### "No data found for ticker"
- Check if the ticker symbol is correct
- Try a different timeframe (some tickers have limited intraday data)
- Verify backend is running and accessible

### Chart not rendering
- Check browser console for errors
- Ensure frontend can connect to backend API
- Verify NEXT_PUBLIC_API_URL is set correctly

### Database errors
- Ensure PostgreSQL is running
- Check DATABASE_URL is correct in both backend and frontend .env
- Run `npx prisma db push` to sync schema

## Development Tips

### Hot Reload
Both frontend and backend support hot reload:
- Frontend: Changes to .tsx files reload automatically
- Backend: Changes to .py files reload with `--reload` flag

### Viewing Logs
```bash
# Docker logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Or view all
docker-compose logs -f
```

### Database GUI
```bash
cd frontend
npx prisma studio
```
Opens Prisma Studio at http://localhost:5555

### Stopping Services
```bash
# Docker
docker-compose down

# Manual: Press Ctrl+C in each terminal
```

## Need Help?

- Check the main README.md for detailed documentation
- Review backend/app/services/key_levels.py for algorithm details
- Open an issue on GitHub

Happy trading! 📈
