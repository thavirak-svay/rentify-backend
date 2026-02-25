# Rentify — System Architecture Overview

> High-level architecture decisions and component design for the Rentify platform.

---

## Architecture Philosophy

| Principle                          | Application                                                                                   |
| ---------------------------------- | --------------------------------------------------------------------------------------------- |
| **Start monolith, extract later**  | Modular monolith at launch. Split into services only when a module needs independent scaling. |
| **Boring technology**              | PostgreSQL, Redis, Elasticsearch. No exotic databases or experimental frameworks.             |
| **API-first**                      | Every feature is an API before it's a UI. Mobile and web consume the same API.                |
| **Event-driven where appropriate** | State transitions emit domain events. Async consumers handle side effects.                    |
| **Observable by default**          | Every request is traceable. Every error is captured. Every metric is graphed.                 |

---

## System Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENTS                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌───────────────┐   │
│  │ iOS App  │  │ Android  │  │ Web App      │  │ Admin Panel   │   │
│  │          │  │ App      │  │ (Next.js)    │  │ (Internal)    │   │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘  └──────┬────────┘   │
│       │              │               │                  │            │
└───────┼──────────────┼───────────────┼──────────────────┼────────────┘
        │              │               │                  │
        ▼              ▼               ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     API GATEWAY / LOAD BALANCER                      │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │ Rate Limiting │ Auth Validation │ Request Routing │ CORS    │     │
│  └─────────────────────────────────────────────────────────────┘     │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    APPLICATION SERVER (Modular Monolith)              │
│                                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │   Auth   │ │ Listings │ │ Bookings │ │ Payments │ │   Mess-  │  │
│  │  Module  │ │  Module  │ │  Module  │ │  Module  │ │  aging   │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │  Users   │ │ Reviews  │ │  Search  │ │  Notif.  │               │
│  │  Module  │ │  Module  │ │  Module  │ │  Module  │               │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘               │
│                                                                      │
└────┬──────────────┬──────────────┬──────────────┬────────────────────┘
     │              │              │              │
     ▼              ▼              ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│PostgreSQL│  │  Redis   │  │  Elastic │  │  Object  │
│          │  │          │  │  search  │  │  Storage │
│• Users   │  │• Sessions│  │• Listings│  │• Media   │
│• Bookings│  │• Cache   │  │• Geo     │  │• ID docs │
│• Payments│  │• Locks   │  │• Search  │  │• Exports │
│• Messages│  │• Queue   │  │          │  │          │
│• Reviews │  │          │  │          │  │          │
└──────────┘  └──────────┘  └──────────┘  └──────────┘

     │
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        EVENT BUS (Kafka / SQS)                       │
│                                                                      │
│  Events: booking.created, booking.approved, listing.updated, ...    │
│                                                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                │
│  │ Search       │ │ Notification │ │ Analytics    │                │
│  │ Indexer      │ │ Dispatcher   │ │ Pipeline     │                │
│  └──────────────┘ └──────────────┘ └──────────────┘                │
│  ┌──────────────┐ ┌──────────────┐                                  │
│  │ Trust Score  │ │ Payout       │                                  │
│  │ Calculator   │ │ Scheduler    │                                  │
│  └──────────────┘ └──────────────┘                                  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │  Stripe  │ │  Onfido  │ │  SendGrid│ │  Firebase│ │  Sentry  │ │
│  │ Payments │ │   KYC    │ │  Email   │ │  Push    │ │  Errors  │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Module Responsibilities

### Auth Module

- User registration (email + password, social OAuth)
- Login / logout / token refresh
- Email and phone verification
- Password reset
- JWT issuance and validation

### Users Module

- Profile CRUD
- Preferences management
- Identity verification (delegates to Onfido)
- Trust score aggregation
- Privacy controls (data export, account deletion)

### Listings Module

- Listing CRUD (items and services)
- Media upload and processing (resize, compress, thumbnail)
- Availability management
- Publishing workflow (draft → review → active)
- Quality scoring

### Search Module

- Elasticsearch query building
- Geo-spatial queries (distance-based ranking)
- Full-text search with fuzzy matching
- Faceted filtering
- Result ranking and personalization
- Search analytics (track queries, zero-result rates)

### Bookings Module

- Booking creation with availability check
- State machine (requested → approved → active → completed)
- Pricing calculation (rental + fees + deposit)
- Extension and cancellation handling
- Booking history queries

### Payments Module

- Payment method management (via Stripe)
- Charge creation (authorization hold → capture)
- Refund processing
- Deposit hold and release
- Payout calculation and disbursement
- Transaction ledger (append-only)

### Messaging Module

- Thread creation (linked to listing/booking)
- Message sending (text + attachments)
- WebSocket connections for real-time delivery
- Quick action chips for structured interactions
- Read receipts

### Reviews Module

- Review submission (post-booking only)
- Rating aggregation (async via event consumer)
- Moderation (profanity filter, flag for manual review)

### Notifications Module

- Multi-channel dispatch (push, email, SMS, in-app)
- Notification preference management
- Template rendering
- Delivery tracking and retry

---

## Data Flow: Booking Lifecycle

```
Renter                    API Server                     External
  │                          │                              │
  │  POST /v1/bookings       │                              │
  │ ─────────────────────>   │                              │
  │                          │  1. Validate availability    │
  │                          │  2. Calculate pricing        │
  │                          │  3. Check idempotency key    │
  │                          │  4. Create booking (status=  │
  │                          │     requested)               │
  │                          │  5. Hold deposit via ─────────> Stripe
  │                          │                              │  (auth hold)
  │                          │  6. Emit booking.requested ──> Event Bus
  │  201 Created             │                              │
  │ <─────────────────────   │                              │
  │                          │                              │
  │                    Event Bus                            │
  │                          │  → Notify owner (push/email) │
  │                          │  → Start 24h approval timer  │
  │                          │  → Log to analytics          │
  │                          │                              │
Owner                        │                              │
  │  POST /v1/bookings/      │                              │
  │       {id}/approve       │                              │
  │ ─────────────────────>   │                              │
  │                          │  1. Validate transition      │
  │                          │  2. Update status=approved   │
  │                          │  3. Lock availability slot   │
  │                          │  4. Charge renter ────────────> Stripe
  │                          │                              │  (capture)
  │                          │  5. Emit booking.approved ───> Event Bus
  │  200 OK                  │                              │
  │ <─────────────────────   │                              │
```

---

## Technology Selection Rationale

| Choice            | Why                                                                                           | Alternatives Considered                                                       |
| ----------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **PostgreSQL**    | ACID compliance for financial data, JSON support, excellent tooling, well-understood at scale | MySQL (lacks JSONB, weaker constraints), MongoDB (no ACID for multi-document) |
| **Redis**         | Sub-ms reads for caching, native locking primitives, pub/sub for real-time                    | Memcached (no persistence, no pub/sub)                                        |
| **Elasticsearch** | Purpose-built for search + geo queries, fast faceted filtering                                | PostgreSQL full-text (adequate initially but won't scale for advanced search) |
| **Kafka**         | Durable event streaming, replay capability, scales horizontally                               | RabbitMQ (simpler but no replay), AWS SQS (vendor lock-in)                    |
| **S3**            | Industry standard object storage, cheap, unlimited scale                                      | GCS (equivalent, locks to GCP)                                                |
| **Stripe**        | Best-in-class payments API, Connect for marketplace payouts, fraud detection                  | PayPal (worse DX), Adyen (more complex)                                       |

---

## Scaling Strategy

### Phase 1: Single Server (0–1,000 bookings/month)

- One application server (4 CPU, 16GB RAM)
- Managed PostgreSQL (RDS or equivalent)
- Redis (managed)
- Elasticsearch can wait — use PostgreSQL LIKE/trigram search initially
- Kafka can wait — use an in-process event emitter or simple queue

### Phase 2: Horizontal Scaling (1,000–10,000 bookings/month)

- 2–3 application servers behind load balancer
- PostgreSQL read replicas for search/read-heavy queries
- Introduce Elasticsearch for search
- Redis cluster for caching and locking
- Introduce Kafka for async event processing

### Phase 3: Service Extraction (10,000+ bookings/month)

- Extract messaging into independent service (different scaling profile)
- Extract search into independent service (CPU-heavy reindexing)
- Extract payments into independent service (compliance boundary)
- Keep core booking/listing/user logic as monolith (shared domain model)
