# Supabase Production Setup Guide

This guide covers setting up Supabase for production deployment.

---

## Initial Project Setup

### 1. Create New Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization and set project name: `rentify-production`
4. Set a strong database password (save this!)
5. Choose region closest to Cambodia (Singapore recommended)
6. Click "Create new project"

### 2. Initial Configuration Prompts

During project creation, you'll be asked two important questions:

#### A. Enable PostgREST API

**Question: "Autogenerate a RESTful API for your public schema"**

✅ **YES - Enable it (Optional - We don't use it for primary API)**

**Why enable PostgREST:**
- Useful for quick database debugging
- Admin data inspection
- Testing RLS policies
- **NOT used for mobile app API** (Hono handles all API logic)

**Your architecture:**
```
Mobile App → Hono API → Supabase Client → Database
                              ↓
                    Business Logic Here

PostgREST (optional, for debugging only):
Admin Panel → PostgREST → Database
```

#### B. Enable Auto-RLS Trigger

**Question: "Create an event trigger that automatically enables Row Level Security on all new tables"**

✅ **YES - Enable it (Strongly Recommended)**

**Why enable Auto-RLS:**
- Safety net for future tables
- Ensures RLS is ALWAYS enabled by default
- Catches tables created outside migrations
- Prevents accidental security gaps
- Defense in depth security practice
- Zero performance impact
- No downside - can still disable manually if needed

**How it works:**
```sql
-- Automatically runs when table is created:
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;
```

**Protection example:**
```sql
-- Without Auto-RLS:
CREATE TABLE admin_settings (...);  -- ❌ NO protection!

-- With Auto-RLS:
CREATE TABLE admin_settings (...);  -- ✅ RLS enabled automatically!
-- Still need to add policies, but table is protected
```

**Your current tables:**
All your migration tables already have RLS enabled manually. This trigger provides additional protection for:
- Future tables you create
- Manual debugging tables
- Third-party integration tables

### 3. Get API Keys

After project creation, go to **Settings → API Keys**:

**Save these values:**
```
Project URL: https://xxxxx.supabase.co
Publishable Key: sb_publishable_xxxxx
Secret Key: sb_secret_xxxxx
```

**API Key Types:**

| Type | Format | Use | Security |
|------|--------|-----|----------|
| Publishable | `sb_publishable_...` | Client-side | ✅ Safe to expose |
| Secret | `sb_secret_...` | Backend only | ⚠️ Never expose! |

**Old vs New Format:**
- Old: `anon` JWT → New: `sb_publishable_...`
- Old: `service_role` JWT → New: `sb_secret_...`

**Update your .env:**
```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx
SUPABASE_SECRET_KEY=sb_secret_xxxxx
```

⚠️ **Security Notes:**
- **Publishable key**: Safe to use in frontend code, mobile apps
- **Secret key**: NEVER expose publicly, only use in backend
- Secret key bypasses RLS - treat like admin password

---

## Database Migrations

### Option A: Using Supabase CLI (Recommended)

1. Link to production project:
```bash
bunx supabase link --project-ref your-project-ref
```

2. Push migrations:
```bash
bunx supabase db push
```

### Option B: Manual SQL Execution

1. Go to **SQL Editor** in Supabase dashboard
2. Run each migration file in order:
   - `20250225000001_create_profiles.sql`
   - `20250225000002_create_categories.sql`
   - `20250225000003_create_listings.sql`
   - `20250225000004_create_bookings.sql`
   - `20250225000005_create_transactions.sql`
   - `20250225000006_create_messages.sql`
   - `20250225000007_create_reviews.sql`
   - `20250225000008_create_notifications.sql`
   - `20250225000009_create_search_function.sql`

---

## Storage Setup

### Create Storage Buckets

1. Go to **Storage** in dashboard
2. Create new bucket: `listing-media`
3. Set to **Public bucket** (for listing photos)
4. Configure CORS for your frontend domain

### Storage Policies

Add policies for `listing-media` bucket:

```sql
-- Allow public read
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'listing-media');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'listing-media'
  AND auth.role() = 'authenticated'
);

-- Allow users to delete own uploads
CREATE POLICY "Users can delete own uploads"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'listing-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

---

## Authentication Setup

### Enable Email Auth

1. Go to **Authentication → Providers**
2. Enable **Email** provider
3. Configure settings:
   - Enable email confirmations: ON (recommended)
   - Secure email change: ON
   - Secure password change: ON

### Email Templates

Customize email templates in **Authentication → Email Templates**:
- Confirmation email
- Password reset
- Magic link (optional)

### OAuth Providers (Optional)

Enable social login:
1. Go to **Authentication → Providers**
2. Enable **Google** or other providers
3. Configure OAuth credentials

---

## Row Level Security (RLS)

**IMPORTANT**: Your migrations already include RLS policies!

### Verify RLS is Enabled

Run this in SQL Editor:

```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

All tables should show `rowsecurity = true`.

### Test RLS Policies

1. Create test user via Auth
2. Try accessing data via PostgREST API
3. Verify user can only see their own data

---

## Database Extensions

Your migrations already enable these, but verify:

1. Go to **Database → Extensions**
2. Ensure these are enabled:
   - `postgis` - Geo queries
   - `pg_trgm` - Full-text search
   - `pgcrypto` - UUID generation

---

## API Settings

### Configure API URL

1. Go to **Settings → API**
2. Note your API URL: `https://xxxxx.supabase.co`
3. Update `APP_URL` in your `.env`

### CORS Configuration

For your Hono API:

```typescript
app.use('*', cors({
  origin: [
    'https://your-frontend.com',
    'http://localhost:3000', // development
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
```

---

## Monitoring

### Enable Logging

1. Go to **Logs** in dashboard
2. Monitor:
   - API logs
   - Auth logs
   - Database logs
   - Realtime logs

### Set Up Alerts

Configure alerts for:
- High error rates
- Database connection issues
- Auth failures

---

## Backup Strategy

### Automatic Backups

Supabase provides automatic daily backups on paid plans.

### Manual Backup

```bash
# Using pg_dump
pg_dump "postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres" > backup.sql

# Via Supabase CLI
bunx supabase db dump -f backup.sql
```

---

## Security Checklist

- [x] RLS policies enabled on all tables
- [x] Auto-RLS trigger enabled (safety net)
- [x] Storage bucket policies configured
- [x] API keys stored securely (not in code)
- [x] CORS configured for frontend domain
- [x] Email confirmation enabled
- [x] Strong database password set
- [x] Service role key protected (never expose to frontend)
- [ ] Rate limiting configured (via your Hono API)
- [ ] PayWay webhook URL configured

---

## Environment Variables

Update `.env` for production:

```bash
# Supabase Production
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-production-publishable-key
SUPABASE_SECRET_KEY=your-production-secret-key

# App
APP_URL=https://your-frontend.com
NODE_ENV=production

# PayWay Production
PAYWAY_MERCHANT_ID=your-production-merchant-id
PAYWAY_API_KEY=your-production-api-key
PAYWAY_MERCHANT_AUTH=your-production-merchant-auth
PAYWAY_BASE_URL=https://checkout.payway.com.kh
PAYWAY_CALLBACK_URL=https://api.your-domain.com

# Optional
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
RESEND_API_KEY=re_xxxxx
```

---

## PostgREST API (Optional - Debug Only)

### What is PostgREST?

PostgREST is an auto-generated REST API for your database. **We DON'T use it for our mobile app API.**

### Why We Use Hono Instead

| Feature | PostgREST | Hono API |
|---------|-----------|----------|
| Business Logic | ❌ None | ✅ Full control |
| Pricing Calculations | ❌ No | ✅ pricing.ts |
| State Machine | ❌ No | ✅ booking-machine.ts |
| External APIs | ❌ No | ✅ PayWay integration |
| Validation | ❌ Basic | ✅ Zod schemas |
| Error Handling | ❌ Generic | ✅ Custom errors |

### When to Use PostgREST

PostgREST is useful for:
- ✅ Quick database debugging
- ✅ Admin data inspection
- ✅ Testing RLS policies
- ✅ One-off queries

### When NOT to Use PostgREST

Don't use PostgREST for:
- ❌ Mobile app API calls
- ❌ Complex business logic
- ❌ External API integrations
- ❌ Custom validation

### Direct Database Queries (Debug Only)

Your PostgREST API is available at:
```
https://xxxxx.supabase.co/rest/v1/
```

### Examples

```bash
# Get all active listings (RLS applies)
curl "https://xxxxx.supabase.co/rest/v1/listings?status=eq.active" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Get specific booking (RLS: only parties can view)
curl "https://xxxxx.supabase.co/rest/v1/bookings?id=eq.uuid" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer USER_JWT_TOKEN"

# Create listing (authenticated)
curl -X POST "https://xxxxx.supabase.co/rest/v1/listings" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer USER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Camera","price_daily":5000}'
```

### When to Use PostgREST

✅ **Good for:**
- Admin panels
- Debugging during development
- Quick data inspection
- Simple CRUD operations
- Testing RLS policies

❌ **Avoid for:**
- Complex business logic (use Hono API)
- Payment processing
- Pricing calculations
- State machine transitions
- Multi-step operations

---

## Next Steps

1. ✅ Create Supabase project
2. ✅ Enable PostgREST API
3. ✅ Enable Auto-RLS trigger
4. ⏳ Run migrations
5. ⏳ Configure storage
6. ⏳ Set up authentication
7. ⏳ Update environment variables
8. ⏳ Deploy Hono API
9. ⏳ Test end-to-end

---

## Support

- [Supabase Docs](https://supabase.com/docs)
- [PostgREST Docs](https://postgrest.org)
- [Supabase Discord](https://discord.supabase.com)
