# Using Real Stock Data with Alpha Vantage

Your app now supports **real market data** via Alpha Vantage API!

## Current Status

- **Without API key**: Mock data (realistic but fake) ⚠️
- **With free API key**: Real live market data for all tickers! ✓

## Quick Setup (2 minutes)

### Step 1: Get Your Free API Key

1. Visit: https://www.alphavantage.co/support/#api-key
2. Enter your email (no signup required)
3. Check your email - API key arrives instantly
4. Copy the key (looks like: `ABC123XYZ456`)

### Step 2: Add API Key

Create a `.env` file in your project root:

```bash
# In /Users/muratkahraman/Downloads/stock/.env
ALPHA_VANTAGE_API_KEY=paste_your_key_here
```

### Step 3: Restart Backend

```bash
docker compose restart backend
```

**Done!** Now test with any ticker: AAPL, TSLA, MSFT, NVDA, etc.

## Test Real Data

Once your API key is configured:

1. Go to http://localhost:3000
2. Search for any ticker: AAPL, TSLA, MSFT, NVDA, etc.
3. You'll see real market data!

## Free Tier Limits

- **25 API requests per day**
- **5 API requests per minute**

If you exceed limits, the app automatically falls back to mock data.

## Check Backend Logs

To see which data source is being used:
```bash
docker compose logs -f backend
```

You'll see messages like:
- `"yfinance failed for AAPL..."` - Yahoo blocked (expected)
- `"Trying Alpha Vantage API..."` - Attempting real data
- `"✓ Successfully fetched real data from Alpha Vantage for AAPL"` - Real data loaded!
- `"Alpha Vantage also failed..."` - API limit hit, using mock data

## Upgrade for More Requests

Alpha Vantage paid plans start at $50/month for 300 requests/day.

For production, consider:
- **Polygon.io**: $200/month for unlimited stocks
- **Alpaca Markets**: Free for paper trading, $99/month for live
- **IEX Cloud**: Pay-as-you-go pricing

The app is designed to easily swap providers - just implement the interface!
