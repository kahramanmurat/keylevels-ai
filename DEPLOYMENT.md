# KeyLevels AI - Deployment Guide

Complete guide for deploying KeyLevels AI to production.

## Architecture Overview

```
┌─────────────┐
│   Vercel    │ ← Frontend (Next.js)
│  (Frontend) │
└──────┬──────┘
       │
       │ API Calls
       │
┌──────▼──────┐
│   Render    │ ← Backend (FastAPI)
│  (Backend)  │
└──────┬──────┘
       │
       ├─────► PostgreSQL (Managed DB)
       │
       └─────► Redis (Managed Cache)
```

## Prerequisites

- GitHub account (for code hosting)
- Vercel account (for frontend)
- Render/Fly.io account (for backend)
- Stripe account (for payments)
- Domain name (optional)

## 1. Database Setup

### Option A: Render Managed PostgreSQL

1. Go to Render Dashboard → New → PostgreSQL
2. Create database:
   - Name: `keylevels-db`
   - Plan: Choose appropriate tier
3. Copy the **Internal Database URL** (starts with `postgresql://`)
4. Save for later use

### Option B: Railway PostgreSQL

1. Go to Railway → New Project → Provision PostgreSQL
2. Copy connection string from Variables tab
3. Save for later use

### Option C: Supabase

1. Create project at supabase.com
2. Go to Settings → Database
3. Copy connection string (Transaction mode)
4. Save for later use

## 2. Redis Setup

### Option A: Upstash (Recommended - Free tier available)

1. Go to upstash.com → Create Redis Database
2. Name: `keylevels-cache`
3. Region: Same as your backend
4. Copy **REST URL** (we'll use Redis URL format)
5. Convert to: `redis://default:<password>@<host>:<port>`

### Option B: Render Redis

1. Render Dashboard → New → Redis
2. Name: `keylevels-redis`
3. Copy connection URL

## 3. Backend Deployment (Render)

### Step 1: Prepare Repository

```bash
# Commit all changes
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### Step 2: Create Web Service

1. Go to Render Dashboard → New → Web Service
2. Connect your GitHub repository
3. Configure:
   - **Name**: `keylevels-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Step 3: Environment Variables

Add these environment variables in Render:

```env
DATABASE_URL=<your-postgres-url>
REDIS_URL=<your-redis-url>
ENVIRONMENT=production

# JWT
SECRET_KEY=<generate-random-string>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Stripe
STRIPE_SECRET_KEY=<your-stripe-secret-key>
STRIPE_WEBHOOK_SECRET=<your-stripe-webhook-secret>
STRIPE_PRICE_ID_BASIC=<your-basic-plan-price-id>
STRIPE_PRICE_ID_PRO=<your-pro-plan-price-id>

# CORS - Update after deploying frontend
CORS_ORIGINS=["https://your-frontend-url.vercel.app"]

# Cache
CACHE_TTL_SECONDS=300

# Algorithm (optional - uses defaults if not set)
PIVOT_WINDOW=3
ATR_PERIOD=14
ATR_MULTIPLIER=0.3
MAX_ZONES=6
```

### Step 4: Deploy

1. Click "Create Web Service"
2. Wait for deployment (2-5 minutes)
3. Copy your backend URL: `https://keylevels-backend.onrender.com`
4. Test: Visit `https://keylevels-backend.onrender.com/health`

## 4. Frontend Deployment (Vercel)

### Step 1: Push to GitHub

Ensure all code is committed:
```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### Step 2: Import to Vercel

1. Go to vercel.com → New Project
2. Import your GitHub repository
3. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: Leave default
   - **Output Directory**: Leave default

### Step 3: Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

```env
# API
NEXT_PUBLIC_API_URL=https://keylevels-backend.onrender.com

# NextAuth
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=<generate-random-string-different-from-backend>

# Database (same as backend)
DATABASE_URL=<your-postgres-url>

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<your-stripe-publishable-key>
STRIPE_SECRET_KEY=<your-stripe-secret-key>
STRIPE_WEBHOOK_SECRET=<your-stripe-webhook-secret>

# Email (for magic links - optional)
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=<your-email>
EMAIL_SERVER_PASSWORD=<your-app-password>
EMAIL_FROM=noreply@keylevels.ai
```

### Step 4: Deploy

1. Click "Deploy"
2. Wait for build (2-5 minutes)
3. Your app will be live at `https://your-project.vercel.app`

### Step 5: Set Up Database

After first deployment:

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project
cd frontend
vercel link

# Push database schema
npx prisma db push

# Generate Prisma client
npx prisma generate
```

## 5. Update CORS

Now that frontend is deployed, update backend CORS:

1. Go to Render Dashboard → Your Backend Service
2. Environment Variables
3. Update `CORS_ORIGINS`:
```env
CORS_ORIGINS=["https://your-project.vercel.app","https://your-custom-domain.com"]
```
4. Save (will trigger redeploy)

## 6. Stripe Configuration

### Step 1: Create Products

1. Go to Stripe Dashboard → Products
2. Create two products:
   - **Basic Plan**: $9.99/month (or your pricing)
   - **Pro Plan**: $29.99/month (or your pricing)
3. Copy the **Price IDs** (starts with `price_`)

### Step 2: Update Environment Variables

Add price IDs to both backend (Render) and frontend (Vercel):
```env
STRIPE_PRICE_ID_BASIC=price_xxx
STRIPE_PRICE_ID_PRO=price_xxx
```

### Step 3: Configure Webhooks

1. Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-frontend.vercel.app/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy **Signing Secret**
5. Add to both backend and frontend as `STRIPE_WEBHOOK_SECRET`

## 7. Custom Domain (Optional)

### Vercel

1. Vercel Dashboard → Your Project → Settings → Domains
2. Add your domain: `keylevels.ai`
3. Follow DNS configuration instructions
4. Update `NEXTAUTH_URL` in Vercel env vars

### Render

1. Render Dashboard → Your Service → Settings → Custom Domain
2. Add domain for API: `api.keylevels.ai`
3. Update DNS records as instructed
4. Update `NEXT_PUBLIC_API_URL` in Vercel

## 8. Alternative: Backend on Fly.io

### Step 1: Install Fly CLI

```bash
# macOS
brew install flyctl

# Linux
curl -L https://fly.io/install.sh | sh
```

### Step 2: Login and Launch

```bash
fly auth login
cd backend
fly launch
```

### Step 3: Configure

Edit `fly.toml`:
```toml
app = "keylevels-backend"

[build]
  builder = "paketobuildpacks/builder:base"

[env]
  PORT = "8000"

[[services]]
  http_checks = []
  internal_port = 8000
  processes = ["app"]
  protocol = "tcp"

  [[services.ports]]
    force_https = true
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443
```

### Step 4: Set Secrets

```bash
fly secrets set DATABASE_URL="postgresql://..."
fly secrets set REDIS_URL="redis://..."
fly secrets set SECRET_KEY="..."
fly secrets set STRIPE_SECRET_KEY="..."
# ... etc
```

### Step 5: Deploy

```bash
fly deploy
```

## 9. Monitoring & Logging

### Vercel

- Dashboard → Your Project → Analytics
- View function logs in Deployments tab

### Render

- Dashboard → Your Service → Logs
- Set up log drains for external monitoring

### Error Tracking (Recommended)

Add Sentry:

**Backend:**
```bash
pip install sentry-sdk[fastapi]
```

**Frontend:**
```bash
npm install @sentry/nextjs
```

Configure with your Sentry DSN.

## 10. Performance Optimization

### Frontend

1. **Enable Vercel Analytics**
   ```bash
   npm install @vercel/analytics
   ```
   Add to `app/layout.tsx`

2. **Image Optimization**
   - Already handled by Next.js
   - Use `next/image` for any custom images

3. **Caching**
   - API responses already cached in Redis
   - Configure Vercel Edge Cache if needed

### Backend

1. **Connection Pooling**
   - PostgreSQL: Already handled by connection string
   - Redis: Configure max connections

2. **CDN for Static Assets**
   - Vercel handles this automatically

## 11. Security Checklist

- [ ] All secrets in environment variables (not in code)
- [ ] HTTPS enabled (automatic on Vercel/Render)
- [ ] CORS configured correctly
- [ ] Stripe webhook signatures verified
- [ ] Database connection over SSL
- [ ] Rate limiting (add middleware if needed)
- [ ] Input validation (already in place)
- [ ] SQL injection protection (Prisma handles this)

## 12. Backup Strategy

### Database Backups

**Render:**
- Automatic daily backups on paid plans
- Manual: `pg_dump` from local machine

**Railway/Supabase:**
- Check their backup policies
- Set up automated backups

### Application Code

- Already backed up in GitHub
- Tag releases: `git tag v1.0.0 && git push --tags`

## 13. Post-Deployment Testing

Test all functionality:

1. **Core Features**
   ```bash
   # Test API
   curl https://api.keylevels.ai/health
   curl "https://api.keylevels.ai/api/data?ticker=TSLA&timeframe=1d"
   ```

2. **Frontend**
   - Visit `https://keylevels.ai`
   - Search for ticker
   - Verify chart loads
   - Check zones display

3. **Authentication**
   - Sign up flow
   - Login flow
   - Email verification

4. **Payments**
   - Use Stripe test cards
   - Verify webhook receives events
   - Check subscription status in database

## 14. Troubleshooting

### Frontend can't connect to backend

- Check `NEXT_PUBLIC_API_URL` is correct
- Verify CORS settings on backend
- Check backend is running: visit `/health`

### Database connection errors

- Verify `DATABASE_URL` is correct
- Check if database allows external connections
- Run `npx prisma db push` after schema changes

### Stripe webhooks not working

- Verify webhook URL is correct
- Check `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
- View webhook logs in Stripe dashboard

### Build failures

- Check Node.js version (18+)
- Check Python version (3.11+)
- Review build logs for missing dependencies

## 15. Scaling

### When to scale

- Response times > 2 seconds
- Error rates increase
- User base grows significantly

### Scaling options

**Render:**
- Upgrade to higher tier
- Enable autoscaling
- Add more instances

**Vercel:**
- Automatically scales
- Consider Pro plan for more

**Database:**
- Upgrade to larger instance
- Enable read replicas
- Consider connection pooling (PgBouncer)

## Support

For deployment issues:
- Vercel: https://vercel.com/support
- Render: https://render.com/docs
- Stripe: https://support.stripe.com

## Cost Estimate

**Hobby/MVP:**
- Vercel: Free
- Render Backend: $7/month
- Render PostgreSQL: $7/month
- Render Redis: $3/month
- **Total: ~$17/month**

**Production:**
- Vercel Pro: $20/month
- Render Standard: $25/month
- PostgreSQL Standard: $20/month
- Redis Standard: $10/month
- **Total: ~$75/month**

Plus Stripe fees (2.9% + 30¢ per transaction)

---

Congratulations! Your KeyLevels AI app is now live in production! 🚀
