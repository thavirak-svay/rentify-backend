# Rentify — Implementation Plan

> Solo backend dev. Hono + Supabase. Cambodia-first. Ship fast, stay lean.

---

## Stack Decision

| Concern              | Choice                                          | Why                                                                                                         |
| -------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **API Framework**    | [Hono](https://hono.dev) (on Bun)               | Ultra-lightweight, TypeScript-native, middleware-first, runs anywhere (Bun, Node, Cloudflare Workers, Deno) |
| **Database**         | Supabase (managed PostgreSQL)                   | Free tier is generous. Auth, storage, realtime, and RLS built-in. One fewer thing to manage.                |
| **Auth**             | Supabase Auth                                   | Email/password + OAuth (Google, Apple). JWTs, refresh tokens, email verification — all handled.             |
| **Object Storage**   | Supabase Storage                                | Media uploads with automatic CDN. Image transformations built-in.                                           |
| **Realtime**         | Supabase Realtime                               | WebSocket subscriptions for messaging and notifications — zero custom infra.                                |
| **Payments**         | [ABA PayWay](https://developer.payway.com.kh)   | Cambodia's leading payment gateway. KHQR, pre-auth holds, automated payouts, refunds — all via API.         |
| **Payments (intl)**  | Stripe (future)                                 | Add later for international card payments when expanding beyond Cambodia.                                   |
| **Search**           | PostgreSQL full-text + `pg_trgm`                | No Elasticsearch needed at MVP scale. Upgrade later if search quality is insufficient.                      |
| **Geo queries**      | PostGIS (built into Supabase PG)                | Proximity search, distance calculation — SQL-native.                                                        |
| **Email**            | Resend or Supabase's built-in (for auth emails) | Transactional emails: booking confirmations, notifications.                                                 |
| **Hosting**          | Fly.io / Railway / Render                       | $5–20/month. Docker deploy. Auto-HTTPS.                                                                     |
| **Monorepo tooling** | Turborepo (optional)                            | If you add a web frontend later. Not needed for API-only phase.                                             |

### What Supabase Gives You for Free

```
✓ PostgreSQL 15 (with PostGIS, pg_trgm, pgcrypto)
✓ Auth (email, OAuth, magic link, phone OTP)
✓ Row Level Security (RLS) — authorization at the DB level
✓ Storage (with CDN + image transforms)
✓ Realtime (WebSocket subscriptions on DB changes)
✓ Auto-generated REST API (PostgREST) — useful for admin/debug, not your primary API
✓ Dashboard (SQL editor, table viewer, logs, auth management)
✓ Edge Functions (Deno-based serverless — backup option)
```

### What You Still Build

```
→ Hono API server (business logic, validation, orchestration)
→ ABA PayWay integration (pre-auth, capture, payout, QR, refunds)
→ Booking state machine
→ Pricing engine
→ Notification dispatch (email + Telegram bot)
→ Content moderation (basic)
→ Admin endpoints
```

---

## Project Structure

```
rentify/
├── src/
│   ├── index.ts                 # Hono app entry point
│   ├── config/
│   │   ├── env.ts               # Environment variable validation (zod)
│   │   └── supabase.ts          # Supabase client initialization
│   ├── middleware/
│   │   ├── auth.ts              # JWT verification via Supabase
│   │   ├── error-handler.ts     # Global error handling
│   │   ├── logger.ts            # Request logging
│   │   └── rate-limit.ts        # Basic rate limiting
│   ├── routes/
│   │   ├── auth.routes.ts       # /v1/auth/*
│   │   ├── users.routes.ts      # /v1/users/*
│   │   ├── listings.routes.ts   # /v1/listings/*
│   │   ├── bookings.routes.ts   # /v1/bookings/*
│   │   ├── messages.routes.ts   # /v1/messages/*
│   │   ├── reviews.routes.ts    # /v1/reviews/*
│   │   ├── payments.routes.ts   # /v1/payments/* (PayWay integration)
│   │   ├── media.routes.ts      # /v1/media/* (upload presigned URLs)
│   │   └── search.routes.ts     # /v1/search/*
│   ├── services/
│   │   ├── auth.service.ts      # Auth business logic
│   │   ├── listing.service.ts   # Listing CRUD + quality scoring
│   │   ├── booking.service.ts   # Booking state machine + pricing
│   │   ├── payment.service.ts   # ABA PayWay integration
│   │   ├── message.service.ts   # Thread/message logic
│   │   ├── review.service.ts    # Review logic + rating aggregation
│   │   ├── search.service.ts    # Search query building
│   │   ├── notification.service.ts # Email/push dispatch
│   │   └── media.service.ts     # Supabase storage operations
│   ├── lib/
│   │   ├── pricing.ts           # Pricing calculation engine (pure functions)
│   │   ├── booking-machine.ts   # Booking state machine (pure functions)
│   │   ├── validators.ts        # Zod schemas for request validation
│   │   └── errors.ts            # Custom error classes
│   └── types/
│       ├── database.ts          # Generated types from Supabase CLI
│       └── api.ts               # API request/response types
├── supabase/
│   ├── migrations/              # SQL migration files
│   │   ├── 001_create_profiles.sql
│   │   ├── 002_create_categories.sql
│   │   ├── 003_create_listings.sql
│   │   ├── 004_create_bookings.sql
│   │   ├── 005_create_transactions.sql
│   │   ├── 006_create_messages.sql
│   │   ├── 007_create_reviews.sql
│   │   ├── 008_create_notifications.sql
│   │   ├── 009_create_rls_policies.sql
│   │   └── 010_seed_categories.sql
│   ├── seed.sql                 # Development seed data
│   └── config.toml              # Supabase local dev config
├── tests/
│   ├── unit/
│   │   ├── pricing.test.ts
│   │   └── booking-machine.test.ts
│   └── integration/
│       ├── auth.test.ts
│       ├── listings.test.ts
│       └── bookings.test.ts
├── .env.example
├── .env.local
├── Dockerfile
├── package.json
├── tsconfig.json
├── biome.json                   # Linter + formatter (faster than ESLint+Prettier)
└── README.md
```

---

## Phased Implementation

### Phase 0: Foundation (Week 1)

> **Goal**: Project scaffolding, database schema, auth flow working end-to-end.

#### 0.1 — Project Setup

```bash
# Initialize project
mkdir rentify && cd rentify
bun init

# Core dependencies
bun add hono @hono/zod-validator zod
bun add @supabase/supabase-js
bun add dotenv                 # No QR lib needed — PayWay generates QR images server-side

# Dev dependencies
bun add -d typescript @types/bun
bun add -d @biomejs/biome
bun add -d supabase               # Supabase CLI

# Initialize Supabase locally
bunx supabase init
bunx supabase start                # Starts local Supabase (PG, Auth, Storage, etc.)
```

#### 0.2 — Hono App Skeleton

```typescript
// src/index.ts
import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { authRoutes } from "./routes/auth.routes"
import { listingRoutes } from "./routes/listings.routes"
import { bookingRoutes } from "./routes/bookings.routes"
import { searchRoutes } from "./routes/search.routes"
import { errorHandler } from "./middleware/error-handler"

const app = new Hono()

// Global middleware
app.use("*", cors())
app.use("*", logger())
app.onError(errorHandler)

// Health check
app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }))

// API routes
app.route("/v1/auth", authRoutes)
app.route("/v1/listings", listingRoutes)
app.route("/v1/bookings", bookingRoutes)
app.route("/v1/search", searchRoutes)
// ... more routes added per phase

export default {
  port: process.env.PORT || 8080,
  fetch: app.fetch,
}
```

#### 0.3 — Supabase Auth Middleware

```typescript
// src/middleware/auth.ts
import { createMiddleware } from "hono/factory"
import { supabase } from "../config/supabase"

export const requireAuth = createMiddleware(async (c, next) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "")
  if (!token) {
    return c.json({ error: { code: "AUTHENTICATION_REQUIRED", message: "Missing auth token" } }, 401)
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)
  if (error || !user) {
    return c.json({ error: { code: "AUTHENTICATION_REQUIRED", message: "Invalid or expired token" } }, 401)
  }

  c.set("user", user)
  c.set("userId", user.id)
  await next()
})
```

#### 0.4 — Database Schema (Supabase Migrations)

Key adaptation from the schema doc → Supabase conventions:

| Original Design                    | Supabase Adaptation                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `users` table with `password_hash` | Supabase `auth.users` handles passwords. Create a `profiles` table that extends `auth.users` via foreign key. |
| UUID generation                    | Supabase uses `gen_random_uuid()` natively                                                                    |
| PostGIS `geography`                | Enable PostGIS extension in Supabase dashboard, use `geography(POINT, 4326)`                                  |
| Full-text search                   | Enable `pg_trgm` extension, create GIN indexes                                                                |

**Migration 001: Profiles (extends Supabase auth.users)**

```sql
-- supabase/migrations/001_create_profiles.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE identity_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');

CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  VARCHAR(100) NOT NULL,
  avatar_url    TEXT,
  bio           TEXT,
  identity_status identity_status NOT NULL DEFAULT 'unverified',
  location      GEOGRAPHY(POINT, 4326),
  address_city  VARCHAR(100),
  address_country CHAR(2),
  rating_avg    NUMERIC(3,2) DEFAULT 0.00,
  rating_count  INTEGER DEFAULT 0,
  response_time_avg_minutes INTEGER,
  completed_rentals INTEGER DEFAULT 0,
  payway_beneficiary_id VARCHAR(255),  -- PayWay payout beneficiary ID (whitelisted)
  bank_name             VARCHAR(100),  -- Owner's bank name (for display)
  bank_account_masked   VARCHAR(20),   -- Masked account: ***1234 (display only)
  last_active_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Indexes
CREATE INDEX idx_profiles_location ON profiles USING GIST (location);
CREATE INDEX idx_profiles_identity_status ON profiles (identity_status);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
```

**Continue with remaining migrations in order**: categories → listings → listing_media → availability → bookings → transactions → message_threads + messages → reviews → notifications. Each follows the same pattern from `03-DATABASE_SCHEMA.md` adapted with RLS policies.

#### Phase 0 Checklist

```
□ Project initialized with Bun + Hono
□ Supabase local dev running
□ All migration files written and applied
□ Auth middleware working (signup → login → protected route)
□ Profile auto-creation trigger working
□ Health check endpoint returning 200
□ .env.example documented
□ TypeScript types generated from Supabase: bunx supabase gen types typescript
```

---

### Phase 1: Core Listings (Week 2)

> **Goal**: An owner can create a listing with photos and a renter can find it.

#### Endpoints

| Method   | Path                       | Auth     | Description                               |
| -------- | -------------------------- | -------- | ----------------------------------------- |
| `POST`   | `/v1/listings`             | ✅       | Create listing (draft)                    |
| `GET`    | `/v1/listings/:id`         | ❌       | Get listing detail                        |
| `PATCH`  | `/v1/listings/:id`         | ✅ owner | Update listing                            |
| `DELETE` | `/v1/listings/:id`         | ✅ owner | Soft-delete (archive)                     |
| `POST`   | `/v1/listings/:id/publish` | ✅ owner | Move draft → active                       |
| `POST`   | `/v1/media/upload-url`     | ✅       | Get Supabase Storage presigned upload URL |
| `GET`    | `/v1/search`               | ❌       | Search listings (text + geo + filters)    |

#### Search Implementation (PostgreSQL-native)

```sql
-- Search function using full-text + geo + filters
CREATE OR REPLACE FUNCTION search_listings(
  search_query TEXT DEFAULT NULL,
  search_lat FLOAT DEFAULT NULL,
  search_lng FLOAT DEFAULT NULL,
  search_radius_km FLOAT DEFAULT 25,
  category_slug TEXT DEFAULT NULL,
  listing_type TEXT DEFAULT NULL,
  price_min INTEGER DEFAULT NULL,
  price_max INTEGER DEFAULT NULL,
  sort_by TEXT DEFAULT 'relevance',
  result_limit INTEGER DEFAULT 20,
  result_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title VARCHAR,
  description TEXT,
  type listing_type,
  price_daily INTEGER,
  deposit_amount INTEGER,
  currency CHAR(3),
  owner_id UUID,
  owner_display_name VARCHAR,
  owner_avatar_url TEXT,
  owner_rating NUMERIC,
  owner_verified BOOLEAN,
  listing_rating NUMERIC,
  review_count INTEGER,
  distance_km FLOAT,
  first_image_url TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id, l.title, l.description, l.type, l.price_daily,
    l.deposit_amount, l.currency, l.owner_id,
    p.display_name, p.avatar_url, p.rating_avg,
    (p.identity_status = 'verified'),
    l.rating_avg, l.rating_count,
    CASE
      WHEN search_lat IS NOT NULL AND search_lng IS NOT NULL
      THEN ST_Distance(
        l.location,
        ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography
      ) / 1000.0
      ELSE NULL
    END AS distance_km,
    (SELECT url FROM listing_media lm WHERE lm.listing_id = l.id ORDER BY lm.sort_order LIMIT 1),
    l.created_at
  FROM listings l
  JOIN profiles p ON l.owner_id = p.id
  WHERE l.status = 'active'
    AND l.deleted_at IS NULL
    AND (search_query IS NULL OR
         to_tsvector('english', l.title || ' ' || l.description) @@ plainto_tsquery('english', search_query)
         OR l.title ILIKE '%' || search_query || '%')
    AND (search_lat IS NULL OR search_lng IS NULL OR
         ST_DWithin(
           l.location,
           ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography,
           search_radius_km * 1000
         ))
    AND (category_slug IS NULL OR l.category_id IN (SELECT c.id FROM categories c WHERE c.slug = category_slug))
    AND (listing_type IS NULL OR l.type::TEXT = listing_type)
    AND (price_min IS NULL OR l.price_daily >= price_min)
    AND (price_max IS NULL OR l.price_daily <= price_max)
  ORDER BY
    CASE sort_by
      WHEN 'price_asc' THEN l.price_daily
      WHEN 'price_desc' THEN -l.price_daily
      WHEN 'rating' THEN -l.rating_avg
      WHEN 'newest' THEN -EXTRACT(EPOCH FROM l.created_at)
      ELSE -ts_rank(to_tsvector('english', l.title || ' ' || l.description),
                     plainto_tsquery('english', COALESCE(search_query, '')))
    END
  LIMIT result_limit
  OFFSET result_offset;
END;
$$ LANGUAGE plpgsql;
```

#### Media Upload (Supabase Storage)

```typescript
// src/services/media.service.ts
import { supabaseAdmin } from "../config/supabase"

export async function createUploadUrl(userId: string, listingId: string, fileName: string) {
  const path = `listings/${listingId}/${Date.now()}-${fileName}`

  const { data, error } = await supabaseAdmin.storage.from("listing-media").createSignedUploadUrl(path)

  if (error) throw error

  return {
    upload_url: data.signedUrl,
    path,
    public_url: supabaseAdmin.storage.from("listing-media").getPublicUrl(path).data.publicUrl,
  }
}
```

#### Phase 1 Checklist

```
□ Listing CRUD (create draft, update, archive)
□ Publish flow (draft → active)
□ Media upload via presigned URL
□ Search with text + geo + filters
□ Category seeding complete
□ RLS policies: owner can edit own listings; anyone can read active listings
□ Input validation with Zod on all endpoints
□ Integration test: create listing → upload photo → publish → search → find it
```

---

### Phase 2: Booking Engine (Week 3–4)

> **Goal**: A renter can request, an owner can approve, money moves.

#### Booking State Machine

```
                    ┌─────────────┐
        create      │  requested  │
       ────────────▶│             │
                    └──────┬──────┘
                           │
               ┌───────────┼───────────┐
               │           │           │
               ▼           ▼           ▼
        ┌──────────┐ ┌──────────┐ ┌──────────────┐
        │ approved │ │ declined │ │ auto_declined│
        │          │ │          │ │ (24h timeout)│
        └────┬─────┘ └──────────┘ └──────────────┘
             │
             ▼
        ┌──────────┐
        │  active  │  (rental period starts)
        │          │
        └────┬─────┘
             │
        ┌────┴─────┐
        │          │
        ▼          ▼
  ┌──────────┐ ┌──────────┐
  │completed │ │ disputed │
  │          │ │          │
  └──────────┘ └────┬─────┘
                    │
                    ▼
              ┌──────────┐
              │ resolved │
              └──────────┘

  Any state except completed/resolved can transition to → cancelled
```

```typescript
// src/lib/booking-machine.ts

type BookingStatus =
  | "requested"
  | "approved"
  | "declined"
  | "auto_declined"
  | "active"
  | "completed"
  | "cancelled"
  | "disputed"
  | "resolved"

const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  requested: ["approved", "declined", "auto_declined", "cancelled"],
  approved: ["active", "cancelled"],
  declined: [],
  auto_declined: [],
  active: ["completed", "disputed", "cancelled"],
  completed: [],
  cancelled: [],
  disputed: ["resolved"],
  resolved: [],
}

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

export function validateTransition(from: BookingStatus, to: BookingStatus, actorId: string, booking: Booking) {
  if (!canTransition(from, to)) {
    throw new BookingTransitionError(from, to)
  }

  // Role-based guards
  if (to === "approved" || to === "declined") {
    if (actorId !== booking.owner_id) throw new ForbiddenError("Only the owner can approve/decline")
  }
  if (to === "cancelled") {
    if (actorId !== booking.renter_id && actorId !== booking.owner_id) {
      throw new ForbiddenError("Only parties to this booking can cancel")
    }
  }
}
```

#### Pricing Engine

```typescript
// src/lib/pricing.ts
import { z } from "zod"

export const PricingInput = z.object({
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  priceHourly: z.number().int().nullable(),
  priceDaily: z.number().int(),
  priceWeekly: z.number().int().nullable(),
  depositAmount: z.number().int().default(0),
  deliveryMethod: z.enum(["pickup", "delivery"]),
  deliveryFee: z.number().int().default(0),
  protectionPlan: z.enum(["none", "basic", "premium"]),
  serviceFeeRate: z.number().default(0.12), // 12% renter service fee
})

export function calculatePricing(input: z.infer<typeof PricingInput>) {
  const hours = Math.ceil((input.endTime.getTime() - input.startTime.getTime()) / (1000 * 60 * 60))
  const days = Math.ceil(hours / 24)
  const weeks = Math.floor(days / 7)
  const remainingDays = days % 7

  // Find cheapest rate for the renter
  let subtotal: number
  if (hours < 8 && input.priceHourly) {
    subtotal = input.priceHourly * hours
  } else if (input.priceWeekly && days >= 5) {
    // Weekly rate kicks in at 5+ days if cheaper
    const weeklyTotal = weeks * input.priceWeekly + remainingDays * input.priceDaily
    const dailyTotal = days * input.priceDaily
    subtotal = Math.min(weeklyTotal, dailyTotal)
  } else {
    subtotal = days * input.priceDaily
  }

  const serviceFee = Math.round(subtotal * input.serviceFeeRate)
  const deliveryFee = input.deliveryMethod === "delivery" ? input.deliveryFee : 0

  // Protection plan pricing
  const protectionFee =
    input.protectionPlan === "none"
      ? 0
      : input.protectionPlan === "basic"
        ? Math.round(subtotal * 0.05)
        : Math.round(subtotal * 0.1) // premium

  const total = subtotal + serviceFee + deliveryFee + protectionFee

  return {
    subtotal,
    service_fee: serviceFee,
    delivery_fee: deliveryFee,
    protection_fee: protectionFee,
    deposit_amount: input.depositAmount,
    total_renter_pays: total + input.depositAmount, // deposit is auth hold, not charge
    owner_payout: subtotal - Math.round(subtotal * 0.06), // 6% owner commission
    rental_days: days,
    rental_hours: hours,
  }
}
```

#### ABA PayWay Integration

**Why PayWay** (not raw Bakong/KHQR):

- Full payment gateway API with **sandbox for testing**
- **Pre-auth**: Hold funds without charging → perfect for booking approval flow
- **Complete pre-auth with payout**: Capture + split to owner in one API call
- **QR API**: Generates KHQR image server-side (no local QR library needed)
- **Refund API**: Full/partial refunds within 30 days
- **Check Transaction**: Poll payment status by `tran_id`
- **Payout (Funds Route)**: Automated splits to whitelisted beneficiary accounts
- Supports **USD + KHR** natively
- Sandbox: `checkout-sandbox.payway.com.kh` / Production: `checkout.payway.com.kh`

**Payment flow for Rentify (Pre-auth → Capture with Payout):**

```
Renter               Rentify API            ABA PayWay
  │                      │                       │
  │  Book listing        │                       │
  │ ────────────────────▶│                       │
  │                      │  Purchase (pre-auth)  │
  │                      │ ──────────────────────▶│
  │  ◀── Checkout page ──│  ◀── HTML/QR/deeplink │
  │                      │                       │
  │  Pay via bank app    │                       │
  │  or card             │                       │
  │ ─────────────────────┼──────────────────────▶│
  │                      │                       │  Hold funds (pre-auth)
  │                      │  ◀─── callback_url ───│  Status: APPROVED
  │                      │                       │
  │  ◀── Awaiting owner ─│                       │
  │                      │                       │
  ─ ─ ─ Owner approves ──│                       │
  │                      │  Complete pre-auth    │
  │                      │  + payout to owner    │
  │                      │ ──────────────────────▶│
  │                      │                       │  Capture funds
  │                      │                       │  Split to beneficiary
  │                      │  ◀── COMPLETED ────── │
  │  ◀── Confirmed ──────│                       │

  ─ ─ ─ Owner declines ──│                       │
  │                      │  Cancel pre-auth      │
  │                      │ ──────────────────────▶│
  │                      │                       │  Release hold
  │                      │  ◀── CANCELLED ────── │
  │  ◀── Refunded ───────│                       │
```

**PayWay API endpoints used:**

| API                        | Endpoint                                                                           | Purpose                                            |
| -------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------- |
| Purchase (pre-auth)        | `POST /api/payment-gateway/v1/payments/purchase`                                   | Hold funds on booking request (`type: "pre-auth"`) |
| QR API                     | `POST /api/payment-gateway/v1/payments/generate-qr`                                | Generate KHQR for mobile bank payment              |
| Complete pre-auth + payout | `POST /api/merchant-portal/merchant-access/online-transaction/pre-auth-completion` | Capture + split to owner on approval               |
| Cancel pre-auth            | `POST /api/merchant-portal/merchant-access/online-transaction/cancel-pre-purchase` | Release hold on decline                            |
| Check transaction          | `POST /api/payment-gateway/v1/payments/check-transaction-2`                        | Poll payment status                                |
| Refund                     | `POST /api/merchant-portal/merchant-access/online-transaction/refund`              | Full/partial refund (within 30 days)               |
| Payout                     | `POST /api/payment-gateway/v2/direct-payment/merchant/payout`                      | Direct payout to beneficiary accounts              |
| Exchange rate              | `POST /api/payment-gateway/v1/payments/exchange-rate`                              | Live ABA USD↔KHR rate                              |

```typescript
// src/services/payment.service.ts
import { createHash } from "crypto"

// PayWay configuration
const PAYWAY_CONFIG = {
  merchantId: process.env.PAYWAY_MERCHANT_ID!,
  apiKey: process.env.PAYWAY_API_KEY!, // For hash generation
  merchantAuth: process.env.PAYWAY_MERCHANT_AUTH!,
  baseUrl: process.env.PAYWAY_BASE_URL || "https://checkout.payway.com.kh",
  callbackUrl: process.env.PAYWAY_CALLBACK_URL!, // Your server's callback endpoint
}

// Hash generation per PayWay spec (HMAC-SHA512 base64)
function generateHash(data: string): string {
  return createHash("sha512")
    .update(data + PAYWAY_CONFIG.apiKey)
    .digest("base64")
}

function formatReqTime(): string {
  const now = new Date()
  return now
    .toISOString()
    .replace(/[-:T.Z]/g, "")
    .slice(0, 14) // "20250225104500"
}

// ── Step 1: Create pre-auth payment (hold funds) ──────────────────
export async function createPreAuth(booking: Booking, pricing: PricingResult) {
  const tranId = `RNT${booking.id.slice(0, 12)}`
  const reqTime = formatReqTime()

  // Encode items as base64 JSON per PayWay spec
  const items = Buffer.from(
    JSON.stringify([
      {
        name: `Rental: ${booking.listingTitle}`,
        quantity: 1,
        price: pricing.total_renter_pays,
      },
    ]),
  ).toString("base64")

  const callbackUrl = Buffer.from(`${PAYWAY_CONFIG.callbackUrl}/v1/payments/payway-callback`).toString("base64")

  const hashString = reqTime + PAYWAY_CONFIG.merchantId + tranId + pricing.total_renter_pays + items + "pre-auth"

  const body = {
    req_time: reqTime,
    merchant_id: PAYWAY_CONFIG.merchantId,
    tran_id: tranId,
    firstname: booking.renterFirstName,
    lastname: booking.renterLastName,
    email: booking.renterEmail,
    phone: booking.renterPhone,
    amount: pricing.total_renter_pays,
    currency: "USD", // PayWay supports USD natively (Cambodia's dual-currency)
    type: "pre-auth", // ← THIS is the key: holds funds without capturing
    payment_option: "abapay_khqr", // KHQR for bank app payment
    items,
    callback_url: callbackUrl,
    return_url: `${process.env.APP_URL}/bookings/${booking.id}/payment-result`,
    cancel_url: `${process.env.APP_URL}/bookings/${booking.id}`,
    lifetime: 30, // QR expires in 30 minutes
    custom_fields: JSON.stringify({ booking_id: booking.id, owner_id: booking.owner_id }),
    // Include payout config for when pre-auth is completed
    payout: JSON.stringify([
      {
        acc: booking.ownerPaywayBeneficiaryId, // Owner's whitelisted account
        amt: (pricing.owner_payout / 100).toFixed(2), // Owner's share
      },
    ]),
    hash: generateHash(hashString),
  }

  const response = await fetch(`${PAYWAY_CONFIG.baseUrl}/api/payment-gateway/v1/payments/purchase`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  // Store transaction record in our DB
  const { data: txn } = await supabase
    .from("transactions")
    .insert({
      booking_id: booking.id,
      type: "pre_auth",
      amount: pricing.total_renter_pays,
      currency: "USD",
      status: "pending",
      payway_tran_id: tranId,
      metadata: { req_time: reqTime },
    })
    .select()
    .single()

  return { transaction_id: txn.id, payway_tran_id: tranId, checkout: await response.text() }
}

// ── Step 1b: Generate KHQR for mobile payment ─────────────────────
export async function generateQR(booking: Booking, pricing: PricingResult) {
  const tranId = `RNT${booking.id.slice(0, 12)}`
  const reqTime = formatReqTime()

  const items = Buffer.from(
    JSON.stringify([
      {
        name: `Rental: ${booking.listingTitle}`,
        quantity: 1,
        price: pricing.total_renter_pays,
      },
    ]),
  ).toString("base64")

  const callbackUrl = Buffer.from(`${PAYWAY_CONFIG.callbackUrl}/v1/payments/payway-callback`).toString("base64")

  const body = {
    req_time: reqTime,
    merchant_id: PAYWAY_CONFIG.merchantId,
    tran_id: tranId,
    first_name: booking.renterFirstName,
    last_name: booking.renterLastName,
    email: booking.renterEmail,
    phone: booking.renterPhone,
    amount: pricing.total_renter_pays,
    currency: "USD",
    purchase_type: "purchase",
    payment_option: "abapay_khqr",
    items,
    callback_url: callbackUrl,
    lifetime: 30,
    qr_image_template: "template3_color",
    hash: generateHash(reqTime + PAYWAY_CONFIG.merchantId + tranId + pricing.total_renter_pays),
  }

  const response = await fetch(`${PAYWAY_CONFIG.baseUrl}/api/payment-gateway/v1/payments/generate-qr`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  const data = await response.json()

  // PayWay returns: { qrString, qrImage (base64 PNG), abapay_deeplink, status }
  return {
    qr_image: data.qrImage, // Ready-to-display base64 image
    qr_string: data.qrString, // Raw KHQR string
    deeplink: data.abapay_deeplink, // Opens ABA app directly
    app_store: data.app_store, // iOS download link
    play_store: data.play_store, // Android download link
    amount: data.amount,
    currency: data.currency,
    payway_tran_id: tranId,
  }
}

// ── Step 2a: Complete pre-auth + payout (owner approves) ──────────
export async function captureWithPayout(paywayTranId: string) {
  const reqTime = formatReqTime()

  const body = {
    request_time: reqTime,
    merchant_id: PAYWAY_CONFIG.merchantId,
    merchant_auth: PAYWAY_CONFIG.merchantAuth,
    hash: generateHash(reqTime + PAYWAY_CONFIG.merchantId + paywayTranId),
  }

  const response = await fetch(
    `${PAYWAY_CONFIG.baseUrl}/api/merchant-portal/merchant-access/online-transaction/pre-auth-completion`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  )

  const data = await response.json()
  // Response: { grand_total, currency, transaction_status: "COMPLETED", status: { code: "00" } }

  if (data.status?.code !== "00") {
    throw new PaymentError(`Capture failed: ${data.status?.message}`)
  }

  // Update our transaction record
  await supabase
    .from("transactions")
    .update({ status: "completed", metadata: { captured_at: new Date().toISOString() } })
    .eq("payway_tran_id", paywayTranId)

  return data
}

// ── Step 2b: Cancel pre-auth (owner declines) ─────────────────────
export async function cancelPreAuth(paywayTranId: string) {
  const reqTime = formatReqTime()

  const body = {
    request_time: reqTime,
    merchant_id: PAYWAY_CONFIG.merchantId,
    merchant_auth: PAYWAY_CONFIG.merchantAuth,
    hash: generateHash(reqTime + PAYWAY_CONFIG.merchantId + paywayTranId),
  }

  const response = await fetch(
    `${PAYWAY_CONFIG.baseUrl}/api/merchant-portal/merchant-access/online-transaction/cancel-pre-purchase`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  )

  const data = await response.json()

  // Update our transaction record
  await supabase.from("transactions").update({ status: "cancelled" }).eq("payway_tran_id", paywayTranId)

  return data
}

// ── Step 3: Refund (cancellations, disputes) ──────────────────────
export async function refundPayment(paywayTranId: string) {
  const reqTime = formatReqTime()

  const body = {
    request_time: reqTime,
    merchant_id: PAYWAY_CONFIG.merchantId,
    merchant_auth: PAYWAY_CONFIG.merchantAuth,
    hash: generateHash(reqTime + PAYWAY_CONFIG.merchantId + paywayTranId),
  }

  const response = await fetch(
    `${PAYWAY_CONFIG.baseUrl}/api/merchant-portal/merchant-access/online-transaction/refund`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  )

  const data = await response.json()
  // Response: { grand_total, total_refunded, currency, transaction_status: "REFUNDED" }

  await supabase
    .from("transactions")
    .update({ status: "refunded", metadata: { refunded_at: new Date().toISOString() } })
    .eq("payway_tran_id", paywayTranId)

  return data
}

// ── Check transaction status (polling) ────────────────────────────
export async function checkTransaction(paywayTranId: string) {
  const reqTime = formatReqTime()

  const body = {
    req_time: reqTime,
    merchant_id: PAYWAY_CONFIG.merchantId,
    tran_id: paywayTranId,
    hash: generateHash(reqTime + PAYWAY_CONFIG.merchantId + paywayTranId),
  }

  const response = await fetch(`${PAYWAY_CONFIG.baseUrl}/api/payment-gateway/v1/payments/check-transaction-2`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  return response.json()
  // Response: { data: { payment_status: "APPROVED"|"COMPLETED"|"CANCELLED", ... } }
}

// ── PayWay callback handler (route) ───────────────────────────────
// PayWay POSTs to your callback_url when payment status changes
export async function handlePaywayCallback(payload: PaywayCallbackPayload) {
  const { tran_id, status } = payload

  // Update local transaction record
  await supabase
    .from("transactions")
    .update({
      status: status === "APPROVED" ? "authorized" : "failed",
      metadata: { payway_callback: payload },
    })
    .eq("payway_tran_id", tran_id)

  // If pre-auth was approved, update booking status
  if (status === "APPROVED") {
    const { data: txn } = await supabase
      .from("transactions")
      .select("booking_id")
      .eq("payway_tran_id", tran_id)
      .single()

    if (txn) {
      await supabase.from("bookings").update({ status: "requested", payment_authorized: true }).eq("id", txn.booking_id)

      // Notify owner: "New booking request — funds are held, awaiting your approval"
      // ... notification logic
    }
  }
}
```

#### Environment Variables (PayWay)

```bash
# .env — PayWay credentials (from sandbox.payway.com.kh)
PAYWAY_MERCHANT_ID=your_merchant_id
PAYWAY_API_KEY=your_api_key          # Used for hash generation
PAYWAY_MERCHANT_AUTH=your_auth_token # Used for merchant portal APIs
PAYWAY_BASE_URL=https://checkout-sandbox.payway.com.kh  # Switch to production URL when live
PAYWAY_CALLBACK_URL=https://api.rentify.com   # Your server URL for payment callbacks
```

#### Booking × Payment Flow Summary

| Booking Event                        | PayWay API Call                         | Result                                                   |
| ------------------------------------ | --------------------------------------- | -------------------------------------------------------- |
| Renter requests booking              | `Purchase (type: pre-auth)` or `QR API` | Funds held on renter's account                           |
| Owner **approves**                   | `Complete pre-auth with payout`         | Funds captured, owner's share sent to their account      |
| Owner **declines**                   | `Cancel pre-auth`                       | Hold released, renter gets funds back                    |
| Renter **cancels** (before approval) | `Cancel pre-auth`                       | Hold released                                            |
| Post-rental **refund** (dispute)     | `Refund API`                            | Full/partial refund within 30 days                       |
| Status check (polling)               | `Check transaction`                     | Returns `APPROVED`, `COMPLETED`, `CANCELLED`, `REFUNDED` |

#### Endpoints

| Method | Path                           | Auth     | Description                                       |
| ------ | ------------------------------ | -------- | ------------------------------------------------- |
| `POST` | `/v1/bookings`                 | ✅       | Create booking request + initiate PayWay pre-auth |
| `GET`  | `/v1/bookings/:id`             | ✅ party | Get booking details (includes payment status)     |
| `GET`  | `/v1/bookings`                 | ✅       | List user's bookings (as renter or owner)         |
| `POST` | `/v1/bookings/:id/approve`     | ✅ owner | Approve → triggers PayWay capture + payout        |
| `POST` | `/v1/bookings/:id/decline`     | ✅ owner | Decline → triggers PayWay cancel pre-auth         |
| `POST` | `/v1/bookings/:id/cancel`      | ✅ party | Cancel → triggers PayWay cancel or refund         |
| `POST` | `/v1/bookings/:id/complete`    | ✅ party | Mark rental as completed                          |
| `POST` | `/v1/payments/:id/qr`          | ✅       | Generate KHQR via PayWay QR API                   |
| `GET`  | `/v1/payments/:id/status`      | ✅ party | Check payment status via PayWay check-transaction |
| `POST` | `/v1/payments/payway-callback` | PayWay   | PayWay callback on payment status change          |
| `POST` | `/v1/payments/refund/:id`      | ✅ admin | Trigger refund via PayWay Refund API              |

#### Phase 2 Checklist

```
□ Booking creation with pricing calculation (USD)
□ State machine enforced on all transitions
□ PayWay pre-auth on booking creation (funds held)
□ PayWay QR API for KHQR generation
□ PayWay callback handler (payment status updates)
□ Owner approve → PayWay complete pre-auth + payout
□ Owner decline → PayWay cancel pre-auth (release hold)
□ Cancellation → PayWay cancel or refund (depending on state)
□ Owner beneficiary whitelisting via PayWay Payout API
□ Idempotency key on booking creation (tran_id = RNT + booking_id)
□ RLS: only booking parties can view/modify
□ Unit tests: pricing engine (10+ cases)
□ Unit tests: booking state machine (all transitions)
□ Integration test: full booking flow in PayWay sandbox
□ PayWay hash verification on callbacks
```

---

### Phase 3: Messaging (Week 5)

> **Goal**: Renter and owner can message each other about a listing or booking.

#### Approach: Supabase Realtime + Hono API

- **Create thread / send message** → Hono API (validation, authorization, business logic)
- **Real-time delivery** → Supabase Realtime (client subscribes to channel, gets new messages via WebSocket)

```typescript
// src/services/message.service.ts
export async function sendMessage(threadId: string, senderId: string, content: string) {
  // 1. Verify sender is a participant
  const { data: thread } = await supabase.from("message_threads").select("participant_ids").eq("id", threadId).single()

  if (!thread?.participant_ids.includes(senderId)) {
    throw new ForbiddenError("Not a participant in this thread")
  }

  // 2. Insert message (Supabase Realtime will auto-broadcast to subscribers)
  const { data: message, error } = await supabase
    .from("messages")
    .insert({ thread_id: threadId, sender_id: senderId, content })
    .select()
    .single()

  // 3. Update thread last_message_at
  await supabase.from("message_threads").update({ last_message_at: new Date().toISOString() }).eq("id", threadId)

  // 4. Send push/email notification to other participant (async, don't block)
  notifyParticipants(thread.participant_ids, senderId, message).catch(console.error)

  return message
}
```

**Client-side** (the mobile/web app subscribes):

```typescript
// Client-side code (React Native / Next.js)
supabase
  .channel(`thread:${threadId}`)
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "messages",
      filter: `thread_id=eq.${threadId}`,
    },
    (payload) => {
      // New message received — update UI
      addMessage(payload.new)
    },
  )
  .subscribe()
```

#### Endpoints

| Method | Path                       | Auth           | Description                               |
| ------ | -------------------------- | -------------- | ----------------------------------------- |
| `POST` | `/v1/threads`              | ✅             | Create thread (linked to listing/booking) |
| `GET`  | `/v1/threads`              | ✅             | List user's threads                       |
| `GET`  | `/v1/threads/:id/messages` | ✅ participant | Get messages in thread (paginated)        |
| `POST` | `/v1/threads/:id/messages` | ✅ participant | Send message                              |

#### Phase 3 Checklist

```
□ Thread creation (linked to listing or booking)
□ Message sending with participant verification
□ Realtime delivery via Supabase channels
□ Message pagination (cursor-based)
□ Thread list with last message preview
□ RLS: only participants can read/write
□ Notification on new message (email as fallback)
```

---

### Phase 4: Reviews + Notifications (Week 6)

> **Goal**: Post-booking reviews. Email notifications for key events.

#### Reviews

| Method | Path                       | Auth     | Description                           |
| ------ | -------------------------- | -------- | ------------------------------------- |
| `POST` | `/v1/bookings/:id/review`  | ✅ party | Submit review (only after completion) |
| `GET`  | `/v1/listings/:id/reviews` | ❌       | Get reviews for a listing             |
| `GET`  | `/v1/users/:id/reviews`    | ❌       | Get reviews for a user                |

**Rules:**

- Only after booking status is `completed`
- One review per booking per party
- Rating aggregation: database trigger recalculates `rating_avg` and `rating_count` on both `profiles` and `listings` tables

```sql
-- Trigger: update listing + profile ratings on new review
CREATE OR REPLACE FUNCTION recalculate_ratings()
RETURNS TRIGGER AS $$
BEGIN
  -- Update listing rating
  UPDATE listings SET
    rating_avg = (SELECT AVG(rating) FROM reviews WHERE listing_id = NEW.listing_id),
    rating_count = (SELECT COUNT(*) FROM reviews WHERE listing_id = NEW.listing_id)
  WHERE id = NEW.listing_id;

  -- Update target user rating
  UPDATE profiles SET
    rating_avg = (SELECT AVG(rating) FROM reviews WHERE target_id = NEW.target_id),
    rating_count = (SELECT COUNT(*) FROM reviews WHERE target_id = NEW.target_id)
  WHERE id = NEW.target_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_review_inserted
  AFTER INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION recalculate_ratings();
```

#### Notifications (Email via Resend)

```typescript
// src/services/notification.service.ts
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

type NotificationEvent =
  | "booking.requested" // → Owner: "New booking request!"
  | "booking.approved" // → Renter: "Your booking was approved!"
  | "booking.declined" // → Renter: "Booking declined"
  | "booking.cancelled" // → Other party: "Booking cancelled"
  | "booking.completed" // → Both: "How was your rental? Leave a review"
  | "review.received" // → Target: "You received a new review!"
  | "message.new" // → Recipient: "New message from [name]"

export async function notify(event: NotificationEvent, data: Record<string, any>) {
  const template = TEMPLATES[event]
  if (!template) return

  await resend.emails.send({
    from: "Rentify <hello@rentify.com>",
    to: data.recipientEmail,
    subject: template.subject(data),
    html: template.html(data),
  })

  // Also insert into notifications table for in-app
  await supabase.from("notifications").insert({
    user_id: data.recipientId,
    type: event,
    title: template.subject(data),
    body: template.preview(data),
    data: { booking_id: data.bookingId, listing_id: data.listingId },
  })
}
```

#### Phase 4 Checklist

```
□ Review submission (post-completion only)
□ Rating aggregation trigger
□ Review listing (per listing, per user)
□ Email notifications for all key events
□ In-app notification storage + read/unread
□ GET /v1/notifications endpoint
□ PATCH /v1/notifications/:id/read endpoint
```

---

### Phase 5: Polish & Launch Prep (Week 7–8)

> **Goal**: Harden everything. Deploy to production. Ready for first real users.

#### Remaining Endpoints

| Method  | Path                            | Auth     | Description          |
| ------- | ------------------------------- | -------- | -------------------- |
| `GET`   | `/v1/users/me`                  | ✅       | Current user profile |
| `PATCH` | `/v1/users/me`                  | ✅       | Update profile       |
| `GET`   | `/v1/users/:id`                 | ❌       | Public profile       |
| `GET`   | `/v1/categories`                | ❌       | List categories      |
| `GET`   | `/v1/listings/:id/availability` | ❌       | Get availability     |
| `PATCH` | `/v1/listings/:id/availability` | ✅ owner | Update availability  |

#### Production Checklist

```
Infrastructure:
  □ Supabase project created (production)
  □ All migrations applied to production
  □ Environment variables set in hosting provider
  □ Custom domain configured (api.rentify.com)
  □ HTTPS enforced
  □ CORS configured for frontend domain(s)

Security:
  □ RLS policies reviewed on ALL tables
  □ Rate limiting on auth endpoints (5 req/min)
  □ Rate limiting on write endpoints (10 req/min)
  □ PayWay callback hash verification
  □ PayWay merchant_auth secured in env vars
  □ Input validation on ALL endpoints (Zod)
  □ No secrets in code or logs
  □ SQL injection impossible (using Supabase client, never raw string concat)

Monitoring:
  □ Error tracking (Sentry) — Hono middleware
  □ Health check endpoint (uptime monitor: Better Stack or UptimeRobot)
  □ Supabase dashboard for DB monitoring
  □ PayWay merchant portal for payment monitoring + reconciliation

Data:
  □ Categories seeded
  □ Backup strategy confirmed (Supabase handles daily backups)
  □ Test with realistic data (10 listings, 5 bookings, 3 reviews)

Documentation:
  □ API documentation (OpenAPI / simple markdown)
  □ .env.example up to date
  □ README with setup instructions
  □ Deployment instructions
```

---

## Development Workflow

### Daily Routine (Solo Dev)

```
Morning:
  1. Check Supabase dashboard (errors, slow queries)
  2. Check PayWay merchant portal (failed payments, pending pre-auths)
  3. Review any support emails

Build:
  1. Pick one task from current phase checklist
  2. Write the database migration (if needed)
  3. Write the service logic
  4. Write the route handler
  5. Test manually with REST client (Hoppscotch / Insomnia / Bruno)
  6. Write unit test for pure logic (pricing, state machine)
  7. Commit

End of day:
  1. Deploy to staging: git push (auto-deploy)
  2. Smoke test key flows
  3. Update checklist
```

### Key Commands

```bash
# Local development
bun run dev                        # Start Hono server with hot reload
bunx supabase start                # Start local Supabase
bunx supabase db reset             # Reset local DB + re-run migrations
bunx supabase gen types typescript  # Regenerate TypeScript types

# Testing
bun test                           # Run all tests
bun test --watch                   # Watch mode

# Database
bunx supabase migration new <name> # Create new migration file
bunx supabase db push              # Apply migrations to remote Supabase

# Deploy
docker build -t rentify-api .
# or just: git push (if using Railway/Render auto-deploy)
```

### Dockerfile

```dockerfile
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

# Copy source
COPY src ./src
COPY tsconfig.json ./

# Run
EXPOSE 8080
CMD ["bun", "run", "src/index.ts"]
```

---

## Cost Estimate (MVP)

| Service                    | Plan                                               | Monthly Cost    |
| -------------------------- | -------------------------------------------------- | --------------- |
| Supabase                   | Free tier (500MB DB, 1GB storage, 50K auth users)  | **$0**          |
| Hosting (Fly.io / Railway) | Hobby plan                                         | **$5–10**       |
| Resend (email)             | Free tier (100 emails/day)                         | **$0**          |
| ABA PayWay                 | Contact PayWay for merchant pricing                | **TBD**         |
| Domain                     | Free subdomain from host (e.g. `*.up.railway.app`) | **$0**          |
| Sentry                     | Free tier                                          | **$0**          |
| Better Stack (uptime)      | Free tier                                          | **$0**          |
| **Total fixed**            |                                                    | **$5–10/month** |

> **Note**: For an API-only MVP, the free subdomain from your hosting provider is perfectly fine (e.g. `rentify-api.up.railway.app`). Add a custom domain (`api.rentify.com`) later when the frontend launches — typically ~$12/year for `.com`.

When you outgrow Supabase free tier → Pro plan at $25/month. Total: ~$35/month + PayWay fees.

**Payment cost advantage**: PayWay's fees are significantly lower than Stripe (2.9% + $0.30/txn). KHQR transactions via ABA have minimal processing costs, and PayWay's **Funds Route** handles marketplace payouts natively — no need to build your own payout infrastructure.

---

## What NOT to Build (MVP)

These are explicitly deferred to keep scope tight:

| Feature                     | Why Defer                                           | When to Add                           |
| --------------------------- | --------------------------------------------------- | ------------------------------------- |
| Elasticsearch               | PostgreSQL full-text is fine for <10K listings      | When search quality complaints appear |
| WebSocket server            | Supabase Realtime handles it                        | When you need custom real-time logic  |
| Background job queue        | Use Supabase Edge Functions or simple cron          | When async jobs are complex/frequent  |
| Admin panel                 | Use Supabase dashboard + SQL                        | When ops team is >1 person            |
| Push notifications          | Email is fine for MVP                               | When mobile app launches              |
| Identity verification (KYC) | Manual review at low volume                         | When bookings >100/month              |
| Promoted listings           | Need organic search first                           | When >1,000 searches/week             |
| Subscription tiers          | Need organic demand first                           | When >1,000 monthly active renters    |
| Stripe (intl cards)         | PayWay covers Cambodia; cards not common locally    | When expanding beyond Cambodia        |
| Multi-currency              | KHR + USD display is enough for Cambodia            | When expanding internationally        |
| i18n                        | Start in Khmer + English                            | When expanding beyond Cambodia        |
| Rate limiting (Redis)       | In-memory or Hono middleware is fine for one server | When >100 RPS                         |

---

## Timeline Summary

| Week | Phase                   | Deliverable                                      |
| ---- | ----------------------- | ------------------------------------------------ |
| 1    | Foundation              | Auth, DB schema, project structure, health check |
| 2    | Listings                | CRUD, media upload, search, categories           |
| 3–4  | Bookings                | State machine, pricing engine, PayWay payments   |
| 5    | Messaging               | Threads, messages, Supabase Realtime             |
| 6    | Reviews + Notifications | Post-booking reviews, email notifications        |
| 7–8  | Polish + Launch         | Hardening, deploy, monitoring, seed data         |

**Total: 8 weeks to a deployable MVP** with listings, search, bookings, PayWay payments, messaging, reviews, and notifications.
