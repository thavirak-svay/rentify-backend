# Rentify — Architecture Document

> **Version**: 2.0
> **Last Updated**: 2026-03-18
> **Status**: Modular Monolith Architecture

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Flutter App │  │   Web Admin │  │  PayWay API │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
└─────────┼────────────────┼────────────────┼────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CLOUDFLARE WORKERS (Edge)                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    HONO API SERVER                       │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │  Auth    │ │ Routes   │ │ Services │ │  Lib     │   │   │
│  │  │Middleware│ │ (Hono)   │ │(Business)│ │(Utils)   │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
          │                                    │
          ▼                                    ▼
┌─────────────────────┐              ┌─────────────────────┐
│     SUPABASE        │              │    ABA PAYWAY       │
│  ┌───────────────┐  │              │  ┌───────────────┐  │
│  │  PostgreSQL   │  │              │  │   KHQR API    │  │
│  │  + PostGIS    │  │              │  │   Pre-auth    │  │
│  └───────────────┘  │              │  │   Payouts     │  │
│  ┌───────────────┐  │              │  └───────────────┘  │
│  │  Auth (GoTrue)│  │              └─────────────────────┘
│  └───────────────┘  │
│  ┌───────────────┐  │
│  │  Storage      │  │
│  └───────────────┘  │
│  ┌───────────────┐  │
│  │  Realtime     │  │
│  └───────────────┘  │
└─────────────────────┘
```

---

## Architecture Decisions

### ADR-001: Monolithic Backend on Edge

**Decision**: Single Hono application deployed to Cloudflare Workers

**Rationale**:
- Solo developer - microservices overhead unnecessary
- Edge deployment for low latency in Southeast Asia
- Can extract services later if needed

**Consequences**:
- ✅ Simple deployment and monitoring
- ✅ Low cold-start latency
- ⚠️ Must maintain clear module boundaries

### ADR-002: Supabase for Backend Services

**Decision**: Use Supabase for database, auth, storage, realtime

**Rationale**:
- Managed PostgreSQL with RLS built-in
- Auth handled (JWT, OAuth, email verification)
- Storage with CDN and image transforms
- Realtime for future WebSocket features

**Consequences**:
- ✅ Reduced operational complexity
- ✅ RLS provides row-level security
- ⚠️ Vendor lock-in for auth

### ADR-003: ABA PayWay for Payments

**Decision**: Cambodia-specific payment gateway (not Stripe)

**Rationale**:
- Target market is Cambodia
- KHQR support (QR payments)
- Pre-auth for deposits
- Local bank transfers for payouts

**Consequences**:
- ✅ Local payment methods (ABA, ACLEDA, etc.)
- ✅ Lower fees than international gateways
- ⚠️ Limited to Cambodia market

### ADR-004: TDD for Critical Paths

**Decision**: Test-driven development for pricing engine and booking state machine

**Rationale**:
- Money calculations must be correct
- State machine transitions are complex
- Tests serve as documentation

**Consequences**:
- ✅ 46 tests passing, high confidence
- ✅ Regression protection
- ⚠️ Slower initial development

---

## Data Model

### Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   profiles  │       │  listings   │       │  bookings   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │◄──────│ owner_id    │       │ id (PK)     │
│ email       │       │ id (PK)     │◄──────│ listing_id  │
│ display_name│       │ title       │       │ renter_id   │──────┐
│ avatar_url  │       │ category_id │       │ owner_id    │      │
│ rating_avg  │       │ status      │       │ status      │      │
│ created_at  │       │ pricing     │       │ start_time  │      │
└─────────────┘       │ location    │       │ end_time    │      │
      ▲               └─────────────┘       │ total       │      │
      │                     │               └─────────────┘      │
      │                     │                     │              │
      │               ┌─────┴─────┐               │              │
      │               │           │               │              │
┌─────┴─────┐   ┌─────────────┐   │        ┌─────┴─────┐        │
│  reviews  │   │ categories  │   │        │transactions│        │
├───────────┤   ├─────────────┤   │        ├───────────┤        │
│ id (PK)   │   │ id (PK)     │   │        │ id (PK)   │        │
│ booking_id│   │ name        │   │        │ booking_id│        │
│ author_id │   │ slug        │   │        │ type      │        │
│ target_id │   │ icon        │   │        │ amount    │        │
│ rating    │   └─────────────┘   │        │ status    │        │
│ comment   │                     │        └───────────┘        │
└───────────┘                     │                             │
                                  │        ┌─────────────┐       │
                            ┌─────┴─────┐  │  messages   │       │
                            │   media   │  ├─────────────┤       │
                            ├───────────┤  │ id (PK)     │       │
                            │ id (PK)   │  │ thread_id   │       │
                            │ listing_id│  │ sender_id   │───────┘
                            │ url       │  │ content     │
                            │ type      │  │ created_at  │
                            └───────────┘  └─────────────┘
```

### Key Tables

#### profiles
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  rating_avg NUMERIC(2,1) DEFAULT 0,
  rating_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### bookings
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id),
  renter_id UUID REFERENCES profiles(id),
  owner_id UUID REFERENCES profiles(id),
  status booking_status DEFAULT 'requested',  -- requested, approved, declined, auto_declined, active, completed, cancelled, disputed, resolved
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  subtotal INT,
  service_fee INT,
  total INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Booking State Machine

```
                              ┌─────────────────────────────────────┐
                              │                                     │
                              ▼                                     │
                        ┌──────────┐                                │
                        │ requested│                                │
                        └────┬─────┘                                │
                             │                                      │
           ┌─────────────────┼─────────────────┐                    │
           ▼                 ▼                 ▼                    │
     ┌──────────┐     ┌──────────┐      ┌──────────┐              │
     │ approved │     │ declined │      │cancelled │              │
     │          │     │          │      │          │              │
     │          │     └──────────┘      └──────────┘              │
     └────┬─────┘     ┌──────────┐                                 │
          │           │auto_     │                                 │
          │           │declined  │                                 │
          │           └──────────┘                                 │
          ▼                                                        │
     ┌──────────┐                                                  │
     │  active  │──────────────────────────────┐                  │
     └────┬─────┘                              │                  │
          │                                    ▼                  │
          │                              ┌──────────┐             │
          │                              │ disputed │             │
          │                              └────┬─────┘             │
          │                                   │                   │
          └───────────────────────────────────┼───────────────────┘
                                              ▼
                                        ┌──────────┐
                                        │completed │
                                        └──────────┘
                                        ┌──────────┐
                                        │ resolved │
                                        └──────────┘
```

### Valid Transitions

| From | To | Allowed By | Trigger |
|------|----|-----------:|---------|
| requested | approved | owner | Manual approve (after payment auth) |
| requested | declined | owner | Manual decline |
| requested | auto_declined | system | Timeout (no response within 24h) |
| requested | cancelled | renter/owner | Cancel before approval |
| approved | active | owner | Handoff confirmed |
| approved | cancelled | either | Cancel before handoff |
| active | completed | owner | Return confirmed |
| active | disputed | either | Report issue |
| active | cancelled | either | Cancel during rental (triggers refund) |
| disputed | resolved | admin | Resolution |

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/auth/register` | Create account |
| POST | `/v1/auth/login` | Get JWT token |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/users/me` | Current user |
| PATCH | `/v1/users/me` | Update profile |
| GET | `/v1/users/:id` | Public profile |

### Listings
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/listings` | Create listing |
| GET | `/v1/listings` | List all (search) |
| GET | `/v1/listings/:id` | Get detail |
| PATCH | `/v1/listings/:id` | Update listing |
| DELETE | `/v1/listings/:id` | Archive listing |
| POST | `/v1/listings/:id/publish` | Publish draft |

### Bookings
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/bookings` | Create booking |
| GET | `/v1/bookings/:id` | Get detail |
| POST | `/v1/bookings/:id/approve` | Approve |
| POST | `/v1/bookings/:id/decline` | Decline |
| POST | `/v1/bookings/:id/cancel` | Cancel |
| POST | `/v1/bookings/:id/complete` | Complete |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/payments/payway-callback` | PayWay payment callback (webhook) |
| GET | `/v1/payments/:id/status` | Get transaction status |
| POST | `/v1/payments/:id/refund` | Refund a transaction |

> **Note**: Payment is initiated automatically when creating a booking via `POST /v1/bookings`. The callback endpoint is called by PayWay after payment completion.

### Messaging
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/threads` | List threads |
| POST | `/v1/threads` | Create thread |
| GET | `/v1/threads/:id/messages` | Get messages |
| POST | `/v1/threads/:id/messages` | Send message |

---

## Security Architecture

### Authentication Flow

```
┌────────┐     ┌──────────┐     ┌──────────┐
│ Client │     │  Hono    │     │ Supabase │
└───┬────┘     │  API     │     │  Auth    │
    │          └────┬─────┘     └────┬─────┘
    │  POST /login  │                │
    │──────────────►│                │
    │               │  verify JWT    │
    │               │───────────────►│
    │               │                │
    │               │  user profile  │
    │               │◄───────────────│
    │  JWT token    │                │
    │◄──────────────│                │
```

### Row Level Security (RLS)

Every table has RLS policies:

```sql
-- Profiles: users can read all, update own
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Bookings: only parties can view
CREATE POLICY "bookings_select" ON bookings FOR SELECT
  USING (auth.uid() IN (renter_id, owner_id));

-- Listings: owners can modify, anyone can read active
CREATE POLICY "listings_select" ON listings FOR SELECT
  USING (status = 'active' OR auth.uid() = owner_id);
CREATE POLICY "listings_insert" ON listings FOR INSERT
  WITH CHECK (auth.uid() = owner_id);
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     PRODUCTION                               │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              CLOUDFLARE WORKERS                       │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐        │   │
│  │  │  Worker 1 │  │  Worker 2 │  │  Worker N │        │   │
│  │  │  (Asia)   │  │  (US)     │  │  (EU)     │        │   │
│  │  └───────────┘  └───────────┘  └───────────┘        │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  SUPABASE (AWS)                       │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐        │   │
│  │  │ PostgreSQL│  │  Storage  │  │   Auth    │        │   │
│  │  │ (Primary) │  │   (S3)    │  │ (GoTrue)  │        │   │
│  │  └───────────┘  └───────────┘  └───────────┘        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                MONITORING                             │   │
│  │  ┌───────────┐  ┌───────────┐                        │   │
│  │  │  Sentry   │  │  Scalar   │                        │   │
│  │  │ (Errors)  │  │  (API Docs)│                       │   │
│  │  └───────────┘  └───────────┘                        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Modular Monolith Architecture (v2.0)

### Project Structure

```
src/
├── constants/           # Centralized constants
│   ├── index.ts         # Re-exports all constants
│   ├── pricing.ts       # MAX_RENTAL_DAYS, PROTECTION_RATES, FEE_RATES
│   ├── booking.ts       # BOOKING_STATUS, VALID_TRANSITIONS
│   ├── payment.ts       # PAYWAY_ENDPOINTS, MERCHANT_ENDPOINTS
│   └── compensation.ts  # COMPENSATION_TYPES, COMPENSATION_STATUS
│
├── modules/             # Self-contained business modules
│   ├── pricing/         # Strategy pattern for pricing calculations
│   │   ├── index.ts
│   │   ├── pricing-calculator.ts
│   │   └── pricing.validation.ts
│   ├── payment/         # Factory pattern for payment gateways
│   │   ├── index.ts
│   │   ├── payment-gateway.interface.ts
│   │   ├── payment-factory.ts
│   │   └── payway-gateway.ts
│   ├── booking/         # Repository pattern for data access
│   │   ├── index.ts
│   │   └── booking.repository.ts
│   └── compensation/     # Compensation queue module
│       └── index.ts
│
├── shared/              # Shared utilities
│   ├── lib/
│   │   ├── index.ts
│   │   └── errors.ts    # Centralized error classes
│   └── repositories/
│       ├── index.ts
│       └── base.repository.ts
│
├── lib/                 # Legacy (re-exports from modules)
├── services/            # Business logic services
├── routes/              # API route handlers
├── middleware/          # Hono middleware
├── config/              # Configuration
└── types/               # TypeScript types
```

### Design Patterns Applied

| Pattern | Module | Implementation |
|---------|--------|----------------|
| **Strategy** | Pricing | `PricingStrategy` interface with `HourlyPricingStrategy`, `DailyPricingStrategy`, `WeeklyPricingStrategy` |
| **Factory** | Payment | `PaymentGatewayFactory.create("payway")` for gateway instantiation |
| **Repository** | Booking | `BookingRepository` with CRUD operations and domain-specific queries |

### Import Aliases

```typescript
// Constants
import { MAX_RENTAL_DAYS, BOOKING_STATUS } from "@/constants";

// Modules (new pattern)
import { calculatePricing } from "@/modules/pricing";
import { getPaymentGateway } from "@/modules/payment";
import { BookingRepository } from "@/modules/booking";

// Shared (new pattern)
import { AppError, ValidationError } from "@/shared/lib/errors";

// Legacy (still works, re-exports from modules)
import { calculatePricing } from "@/lib/pricing";
import { AppError } from "@/lib/errors";
```

### Migration Strategy

1. **Phase 1** ✅ Complete: Create new modular structure with patterns
2. **Phase 2** ✅ Complete: Update legacy files to re-export from modules
3. **Phase 3**: Gradually migrate all imports to use new module paths
4. **Phase 4**: Remove legacy re-export files once migration complete

---
*This architecture document guides all technical decisions.*