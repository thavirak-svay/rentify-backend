# 🏗️ Rentify API Architecture

## Architecture Overview

**ALL API logic lives in this Hono project.** We do NOT use PostgREST for API endpoints.

```
┌─────────────────────────────────────────────────┐
│         Mobile App / Web Frontend               │
└─────────────────┬───────────────────────────────┘
                  │
                  │ ALL API calls
                  ▼
┌─────────────────────────────────────────────────┐
│          HONO API (This Project)                │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ Routes (40+ endpoints)                  │   │
│  │  ├─ /v1/listings                       │   │
│  │  ├─ /v1/bookings                       │   │
│  │  ├─ /v1/search                         │   │
│  │  ├─ /v1/messages                       │   │
│  │  ├─ /v1/reviews                        │   │
│  │  ├─ /v1/users                          │   │
│  │  └─ /v1/categories                     │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ Services (Business Logic)               │   │
│  │  ├─ listing.service.ts                  │   │
│  │  ├─ booking.service.ts                  │   │
│  │  ├─ payment.service.ts (PayWay)         │   │
│  │  ├─ message.service.ts                  │   │
│  │  ├─ review.service.ts                   │   │
│  │  └─ search.service.ts                   │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ Core Libraries                          │   │
│  │  ├─ pricing.ts (Pricing Engine)         │   │
│  │  ├─ booking-machine.ts (State Machine)  │   │
│  │  ├─ validators.ts (Zod schemas)         │   │
│  │  └─ errors.ts (Custom errors)           │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────┬───────────────────────────────┘
                  │
                  │ Supabase JS Client
                  ▼
┌─────────────────────────────────────────────────┐
│            SUPABASE (Backend Services)          │
│                                                 │
│  ┌──────────────┐  ┌──────────────┐            │
│  │  PostgreSQL  │  │    Auth      │            │
│  │  Database    │  │  (JWT tokens)│            │
│  └──────────────┘  └──────────────┘            │
│                                                 │
│  ┌──────────────┐  ┌──────────────┐            │
│  │   Storage    │  │   Realtime   │            │
│  │   (Images)   │  │ (WebSockets) │            │
│  └──────────────┘  └──────────────┘            │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## What We Use from Supabase

### ✅ What We USE

| Feature | Usage | Where |
|---------|-------|-------|
| **Database** | PostgreSQL with PostGIS | `src/services/*.ts` |
| **Auth** | JWT tokens, user management | `src/middleware/auth.ts` |
| **Storage** | Image uploads | `src/services/media.service.ts` |
| **Realtime** | WebSocket subscriptions | Client-side (mobile app) |

### ❌ What We DON'T Use

| Feature | Why Not |
|---------|---------|
| **PostgREST API** | All API logic in Hono |
| **Edge Functions** | Hono API on Railway instead |
| **Auto-generated API** | Custom API with business logic |

---

## API Implementation

### All Endpoints in Hono

**Routes:** `src/routes/*.routes.ts`
- `listings.routes.ts` - Listing CRUD
- `bookings.routes.ts` - Booking management
- `search.routes.ts` - Search functionality
- `messages.routes.ts` - Messaging
- `reviews.routes.ts` - Reviews
- `users.routes.ts` - User profiles
- `categories.routes.ts` - Categories
- `payments.routes.ts` - PayWay webhooks
- `media.routes.ts` - File uploads

**Services:** `src/services/*.service.ts`
- Business logic
- Database operations via Supabase client
- External API integrations (PayWay)

---

## How Database Operations Work

### Using Supabase JS Client

```typescript
// src/services/listing.service.ts
import { supabaseAdmin } from "../config/supabase";

export async function createListing(ownerId: string, input: CreateListingInput) {
  // Use Supabase client, NOT PostgREST API
  const { data, error } = await supabaseAdmin
    .from("listings")
    .insert({
      owner_id: ownerId,
      title: input.title,
      price_daily: input.price_daily,
      // ...
    })
    .select()
    .single();

  return data;
}
```

### NOT Using PostgREST

```typescript
// ❌ We DON'T do this
fetch("https://xxx.supabase.co/rest/v1/listings", {
  headers: {
    apikey: "xxx",
    Authorization: "Bearer xxx",
  },
});

// ✅ We DO this
import { supabaseAdmin } from "../config/supabase";

const { data, error } = await supabaseAdmin
  .from("listings")
  .select();
```

---

## Authentication Flow

### Mobile App Flow

```
1. User signs up/in via Supabase Auth SDK
   ↓
2. Supabase returns JWT token
   ↓
3. Mobile app stores token
   ↓
4. All API calls include token:
   Authorization: Bearer <token>
   ↓
5. Hono middleware validates token:
   - Calls supabase.auth.getUser(token)
   - Sets user context
   ↓
6. Route handler processes request
```

### Implementation

```typescript
// src/middleware/auth.ts
export const requireAuth = createMiddleware(async (c, next) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new AuthenticationError("Invalid token");
  }

  c.set("user", user);
  c.set("userId", user.id);

  await next();
});
```

---

## Realtime (WebSocket) Usage

### Server Side

Server doesn't handle WebSocket connections - Supabase does.

### Client Side (Mobile App)

```typescript
// Mobile app code
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Subscribe to new messages
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
      // New message received
      addMessage(payload.new);
    }
  )
  .subscribe();
```

---

## Storage (Images)

### Upload Flow

```
1. Mobile app requests upload URL from Hono API
   POST /v1/media/upload-url
   ↓
2. Hono generates presigned URL via Supabase client
   ↓
3. Mobile app uploads directly to Supabase Storage
   PUT <presigned_url>
   ↓
4. Mobile app confirms upload
   POST /v1/media/:listingId/confirm
```

### Implementation

```typescript
// src/services/media.service.ts
export async function createUploadUrl(userId: string, fileName: string) {
  const path = `uploads/${userId}/${Date.now()}-${fileName}`;

  const { data, error } = await supabaseAdmin.storage
    .from("listing-media")
    .createSignedUploadUrl(path);

  return {
    upload_url: data.signedUrl,
    public_url: supabaseAdmin.storage.from("listing-media").getPublicUrl(path).data.publicUrl,
  };
}
```

---

## Database with Business Logic

### Example: Booking Creation

```typescript
// src/services/booking.service.ts
export async function createBooking(renterId: string, input: CreateBookingInput) {
  // 1. Get listing
  const { data: listing } = await supabaseAdmin
    .from("listings")
    .select()
    .eq("id", input.listing_id)
    .single();

  // 2. Calculate pricing (pure function)
  const pricing = calculatePricing({
    startTime: new Date(input.start_time),
    endTime: new Date(input.end_time),
    priceDaily: listing.price_daily,
    // ...
  });

  // 3. Create booking
  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .insert({
      renter_id: renterId,
      listing_id: input.listing_id,
      subtotal: pricing.subtotal,
      // ...
    })
    .select()
    .single();

  // 4. Initiate PayWay payment
  const payment = await createPreAuth(booking, pricing);

  return { booking, checkout_url: payment.checkout_url };
}
```

---

## Why This Architecture?

### ✅ Benefits

| Benefit | Description |
|---------|-------------|
| **Full Control** | All business logic in one place |
| **Type Safety** | TypeScript throughout |
| **Testing** | Easy unit testing with TDD |
| **Complex Logic** | Pricing engine, state machine |
| **External APIs** | PayWay integration |
| **Validation** | Zod schemas on all endpoints |
| **Error Handling** | Consistent error responses |
| **Documentation** | Auto-generated OpenAPI |

### ❌ PostgREST Limitations

| Limitation | Solution |
|------------|----------|
| No business logic | Hono services |
| No pricing calculations | pricing.ts |
| No state machine | booking-machine.ts |
| No external APIs | payment.service.ts |
| Limited validation | Zod schemas |
| No custom errors | errors.ts |

---

## Comparison: PostgREST vs Hono API

### PostgREST Approach (NOT Using)

```
Mobile App → PostgREST → Database
                ↓
         Limited to CRUD
         No business logic
         No pricing
         No state machine
```

### Hono API Approach (What We Do)

```
Mobile App → Hono API → Supabase Client → Database
                ↓
         Full business logic
         Pricing engine
         State machine
         External APIs
         Validation
         Custom errors
```

---

## File Structure

```
src/
├── config/
│   ├── env.ts              # Environment variables
│   └── supabase.ts         # Supabase client setup
│
├── middleware/
│   ├── auth.ts             # JWT verification
│   ├── error-handler.ts    # Global error handling
│   └── rate-limit.ts       # Rate limiting
│
├── routes/
│   ├── listings.routes.ts  # Listing endpoints
│   ├── bookings.routes.ts  # Booking endpoints
│   ├── search.routes.ts    # Search endpoints
│   ├── messages.routes.ts  # Message endpoints
│   ├── reviews.routes.ts   # Review endpoints
│   ├── users.routes.ts     # User endpoints
│   ├── payments.routes.ts  # Payment webhooks
│   └── openapi.routes.ts   # API documentation
│
├── services/
│   ├── listing.service.ts  # Listing business logic
│   ├── booking.service.ts  # Booking business logic
│   ├── payment.service.ts  # PayWay integration
│   ├── message.service.ts  # Messaging logic
│   ├── review.service.ts   # Reviews logic
│   ├── search.service.ts   # Search logic
│   ├── user.service.ts     # User profiles
│   ├── media.service.ts    # File uploads
│   └── notification.service.ts # Notifications
│
├── lib/
│   ├── pricing.ts          # Pricing engine (pure functions)
│   ├── booking-machine.ts  # State machine (pure functions)
│   ├── validators.ts       # Zod schemas
│   └── errors.ts           # Custom error classes
│
├── types/
│   ├── database.ts         # Database types
│   └── api.ts              # API types
│
└── index.ts                # Hono app entry point
```

---

## Summary

### Architecture Decision

**We use:**
- ✅ Hono for ALL API endpoints
- ✅ Supabase for database, auth, storage, realtime
- ✅ Supabase JS client for database operations
- ✅ Custom business logic in services

**We DON'T use:**
- ❌ PostgREST API endpoints
- ❌ Auto-generated REST API
- ❌ Supabase Edge Functions

### Result

All API logic lives in this project, providing:
- Full control over business logic
- Complex operations (pricing, state machine)
- External API integrations (PayWay)
- Type-safe implementation
- Comprehensive testing
- Auto-generated documentation

---

**Questions?** Check the code in `src/` - everything is there! 🚀
