# Cloudflare Workers Deployment Guide

Complete guide to deploy Rentify API to Cloudflare Workers.

---

## Prerequisites

- ✅ Cloudflare account (sign up at [cloudflare.com](https://cloudflare.com))
- ✅ Wrangler CLI installed (`bun add -d wrangler`)
- ✅ Supabase project set up
- ✅ PayWay credentials

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│           Cloudflare Workers (Edge)                 │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │  Hono API                                     │ │
│  │  - 40+ endpoints                              │ │
│  │  - Auto-scaling                               │ │
│  │  - Global distribution                        │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  Environment Variables (Secrets)                   │
│  - SUPABASE_URL                                    │
│  - SUPABASE_PUBLISHABLE_KEY                        │
│  - SUPABASE_SECRET_KEY                             │
│  - PAYWAY_*                                        │
└─────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│               Supabase (Backend)                    │
│  - PostgreSQL Database                              │
│  - Authentication                                   │
│  - Storage                                          │
│  - Realtime                                         │
└─────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Local Development

Create `.dev.vars` file:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx
SUPABASE_SECRET_KEY=sb_secret_xxxxx

# PayWay Configuration
PAYWAY_MERCHANT_ID=your-merchant-id
PAYWAY_API_KEY=your-api-key
PAYWAY_MERCHANT_AUTH=your-merchant-auth
PAYWAY_BASE_URL=https://checkout-sandbox.payway.com.kh
PAYWAY_CALLBACK_URL=http://localhost:8787

# App Configuration
APP_URL=http://localhost:3000
NODE_ENV=development
```

### 3. Run Locally

```bash
bun run dev
```

Your API will be available at: `http://localhost:8787`

---

## Deploy to Production

### Option A: GitHub Actions (Recommended)

1. **Get Cloudflare API Token**
   - Go to [User API Tokens](https://dash.cloudflare.com/profile/api-tokens)
   - Select "Edit Cloudflare Workers" template
   - Copy the token

2. **Add Secret to GitHub**
   - Go to your repo: Settings → Secrets and variables → Actions
   - Add `CLOUDFLARE_API_TOKEN` with your token

3. **Push to main branch**
   ```bash
   git push origin main
   ```

4. **Automatic deployment** happens on every push to `main`

### Option B: Manual Deploy

```bash
# Login to Cloudflare
bunx wrangler login

# Deploy
bun run deploy
```

---

## Environment Variables

### Set Secrets in Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to Workers & Pages → rentify-api
3. Go to Settings → Variables
4. Add the following secrets:

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_...`) |
| `SUPABASE_SECRET_KEY` | Secret key (`sb_secret_...`) |
| `PAYWAY_MERCHANT_ID` | PayWay merchant ID |
| `PAYWAY_API_KEY` | PayWay API key |
| `PAYWAY_MERCHANT_AUTH` | PayWay auth token |
| `PAYWAY_BASE_URL` | `https://checkout.payway.com.kh` (production) |
| `PAYWAY_CALLBACK_URL` | Your Worker URL |
| `APP_URL` | Your frontend URL |
| `NODE_ENV` | `production` |

### Or Use Wrangler CLI

```bash
bunx wrangler secret put SUPABASE_URL
# Enter value when prompted

bunx wrangler secret put SUPABASE_PUBLISHABLE_KEY
# ... repeat for each variable
```

---

## Configuration

### wrangler.jsonc

```json
{
  "name": "rentify-api",
  "main": "src/index.ts",
  "compatibility_date": "2024-12-01",
  "compatibility_flags": ["nodejs_compat"],
  "minify": true
}
```

---

## Custom Domain

### Add Custom Domain

1. Go to Workers & Pages → rentify-api
2. Click Settings → Domains & Routes
3. Add Custom Domain: `api.rentify.com`
4. Add DNS record (auto-configured)

### Update Environment Variables

```bash
bunx wrangler secret put PAYWAY_CALLBACK_URL
# Enter: https://api.rentify.com
```

---

## Monitoring

### View Logs

```bash
# Real-time logs
bunx wrangler tail

# Or view in dashboard
# Workers & Pages → rentify-api → Logs
```

### Metrics

View in Cloudflare Dashboard:
- Request count
- Error rate
- CPU time
- Bandwidth

---

## Testing

### Local Testing

```bash
# Run tests
bun test

# Test specific endpoint
curl http://localhost:8787/health
```

### Production Testing

```bash
# Health check
curl https://your-worker.your-subdomain.workers.dev/health

# API docs
open https://your-worker.your-subdomain.workers.dev/docs
```

---

## Troubleshooting

### Common Issues

#### 1. Build Fails

```bash
# Check TypeScript errors
bun run cf:typegen

# Validate wrangler.jsonc
bunx wrangler deploy --dry-run
```

#### 2. Environment Variables Not Working

- Verify secrets are set in Cloudflare dashboard
- Check variable names match exactly (case-sensitive)
- Redeploy after adding secrets

#### 3. CORS Errors

Update CORS in `src/index.ts`:

```typescript
app.use("*", cors({
  origin: [
    "https://your-frontend.com",
    "http://localhost:3000",
  ],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));
```

---

## Cost

### Cloudflare Workers Pricing

| Tier | Requests/month | Cost |
|------|---------------|------|
| **Free** | 100,000 | $0 |
| **Paid** | Unlimited | $5/mo + $0.50 per million requests |

**For MVP**: Free tier is sufficient (~100K requests/month)

---

## Comparison: Cloudflare Workers vs Railway

| Feature | Cloudflare Workers | Railway |
|---------|-------------------|---------|
| **Cold Start** | ~0ms | ~1-5s |
| **Edge Locations** | 300+ | 1 region |
| **Auto-scaling** | ✅ Instant | ✅ Gradual |
| **Free Tier** | 100K requests | $5 credit |
| **Global Latency** | <50ms | Varies |
| **WebSocket** | ✅ Durable Objects | ✅ Native |
| **Node.js APIs** | Subset | Full |

---

## Quick Commands

```bash
# Development
bun run dev           # Start local dev server

# Deployment
bun run deploy        # Deploy to production
bunx wrangler tail    # View real-time logs

# Database
bun run db:push       # Push migrations to Supabase

# Type generation
bun run cf:typegen    # Generate Cloudflare types
```

---

## Support

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Hono Documentation](https://hono.dev)
- [Cloudflare Discord](https://discord.gg/cloudflaredev)

---

## Deployment Checklist

Before going live:

- [ ] All secrets configured in Cloudflare dashboard
- [ ] Custom domain configured
- [ ] CORS settings updated for production frontend
- [ ] Database migrations run on Supabase
- [ ] PayWay callback URL updated
- [ ] Health check endpoint verified
- [ ] API documentation accessible at `/docs`
- [ ] Rate limiting tested
- [ ] Error tracking configured (Sentry)

---

**Ready to deploy!** 🚀

Push to `main` branch and your API will be live globally in seconds.
