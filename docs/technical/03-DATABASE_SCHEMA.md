# Rentify — Database Schema & Data Model

> Complete schema design for Rentify's core domain, including indexes, constraints, and migration strategy.

---

## Schema Conventions

| Convention   | Rule                                                                    |
| ------------ | ----------------------------------------------------------------------- |
| Primary keys | UUID v4, column name `id`                                               |
| Foreign keys | `{entity}_id` naming, e.g., `owner_id`, `listing_id`                    |
| Timestamps   | `timestamptz`, always UTC, columns: `created_at`, `updated_at`          |
| Soft delete  | `deleted_at` column (nullable timestamptz), never hard delete user data |
| Enums        | PostgreSQL `CREATE TYPE ... AS ENUM`, not plain strings                 |
| Money        | `integer` in minor units (cents), with `currency` as `char(3)` ISO 4217 |
| JSON         | `jsonb` for semi-structured data; design for query patterns             |
| Naming       | `snake_case` for everything; plural table names                         |

---

## Entity-Relationship Diagram

```
┌──────────┐       ┌──────────────┐       ┌──────────┐
│  users   │───1:N──│  listings    │───1:N──│  media   │
│          │       │              │       │          │
└────┬─────┘       └──────┬───────┘       └──────────┘
     │                    │
     │               1:N  │
     │                    ▼
     │             ┌──────────────┐
     │        1:N  │ availability │
     │             └──────────────┘
     │                    │
     │                    │ 1:1
     │                    ▼
     ├───────1:N──┌──────────────┐───1:N──┌──────────────┐
     │            │  bookings    │        │ transactions │
     │            └──────┬───────┘        └──────────────┘
     │                   │
     │              1:N  │
     │                   ▼
     │            ┌──────────────┐
     ├───────1:N──│   reviews    │
     │            └──────────────┘
     │
     ├───────N:M──┌──────────────┐───1:N──┌──────────────┐
     │            │   threads    │        │  messages    │
     │            └──────────────┘        └──────────────┘
     │
     └───────1:N──┌──────────────┐
                  │notifications │
                  └──────────────┘
```

---

## Table Definitions

### users

```sql
CREATE TYPE identity_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
CREATE TYPE user_role AS ENUM ('renter', 'owner', 'admin');

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    phone           VARCHAR(20),
    phone_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    password_hash   VARCHAR(255) NOT NULL,
    display_name    VARCHAR(100) NOT NULL,
    avatar_url      TEXT,
    bio             TEXT,
    identity_status identity_status NOT NULL DEFAULT 'unverified',
    roles           user_role[] NOT NULL DEFAULT '{renter}',
    location        GEOGRAPHY(POINT, 4326),  -- PostGIS
    address_city    VARCHAR(100),
    address_country CHAR(2),                 -- ISO 3166-1 alpha-2
    preferences     JSONB NOT NULL DEFAULT '{}',
    rating_avg      NUMERIC(3,2) DEFAULT 0.00,
    rating_count    INTEGER DEFAULT 0,
    response_time_avg INTERVAL,
    completed_rentals INTEGER DEFAULT 0,
    stripe_customer_id  VARCHAR(255),
    stripe_connect_id   VARCHAR(255),        -- For owner payouts
    last_active_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_location ON users USING GIST (location);
CREATE INDEX idx_users_identity_status ON users (identity_status);
CREATE INDEX idx_users_created_at ON users (created_at);
```

### categories

```sql
CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    slug        VARCHAR(100) NOT NULL UNIQUE,
    parent_id   UUID REFERENCES categories(id),
    icon_url    TEXT,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_parent ON categories (parent_id);
CREATE INDEX idx_categories_slug ON categories (slug);
```

### listings

```sql
CREATE TYPE listing_type AS ENUM ('item', 'service');
CREATE TYPE listing_status AS ENUM ('draft', 'pending_review', 'active', 'paused', 'archived');
CREATE TYPE item_condition AS ENUM ('new', 'like_new', 'good', 'fair');

CREATE TABLE listings (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id          UUID NOT NULL REFERENCES users(id),
    type              listing_type NOT NULL,
    title             VARCHAR(200) NOT NULL,
    description       TEXT NOT NULL,
    category_id       UUID NOT NULL REFERENCES categories(id),
    location          GEOGRAPHY(POINT, 4326) NOT NULL,
    address_text      VARCHAR(255),  -- Human-readable, approximate

    -- Pricing (all in minor units)
    price_hourly      INTEGER,
    price_daily       INTEGER,
    price_weekly      INTEGER,
    deposit_amount    INTEGER DEFAULT 0,
    currency          CHAR(3) NOT NULL DEFAULT 'USD',

    -- Item-specific
    condition         item_condition,
    included_items    TEXT[],

    -- Service-specific
    service_scope     TEXT,
    service_packages  JSONB,  -- [{ name, price, description, duration }]

    -- Delivery
    offers_pickup     BOOLEAN NOT NULL DEFAULT TRUE,
    offers_delivery   BOOLEAN NOT NULL DEFAULT FALSE,
    delivery_fee      INTEGER DEFAULT 0,
    delivery_radius_km NUMERIC(5,1),

    -- Policies
    cancellation_policy VARCHAR(20) NOT NULL DEFAULT 'moderate',
    damage_policy       TEXT,
    late_return_policy  TEXT,

    -- Settings
    instant_book    BOOLEAN NOT NULL DEFAULT FALSE,
    status          listing_status NOT NULL DEFAULT 'draft',
    quality_score   NUMERIC(5,2) DEFAULT 0,

    -- Stats
    view_count      INTEGER DEFAULT 0,
    booking_count   INTEGER DEFAULT 0,
    rating_avg      NUMERIC(3,2) DEFAULT 0.00,
    rating_count    INTEGER DEFAULT 0,

    -- Version for optimistic locking
    version         INTEGER NOT NULL DEFAULT 1,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_listings_owner ON listings (owner_id);
CREATE INDEX idx_listings_category ON listings (category_id);
CREATE INDEX idx_listings_status ON listings (status);
CREATE INDEX idx_listings_type ON listings (type);
CREATE INDEX idx_listings_location ON listings USING GIST (location);
CREATE INDEX idx_listings_price_daily ON listings (price_daily);
CREATE INDEX idx_listings_created_at ON listings (created_at);
CREATE INDEX idx_listings_search ON listings USING GIN (to_tsvector('english', title || ' ' || description));
```

### listing_media

```sql
CREATE TYPE media_type AS ENUM ('image', 'video');

CREATE TABLE listing_media (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    type        media_type NOT NULL DEFAULT 'image',
    url         TEXT NOT NULL,
    thumbnail_url TEXT,
    alt_text    VARCHAR(255),
    sort_order  INTEGER NOT NULL DEFAULT 0,
    width       INTEGER,
    height      INTEGER,
    size_bytes  INTEGER,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_listing_media_listing ON listing_media (listing_id, sort_order);
```

### availability

```sql
CREATE TYPE availability_status AS ENUM ('available', 'blocked', 'booked');

CREATE TABLE availability (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    start_time  TIMESTAMPTZ NOT NULL,
    end_time    TIMESTAMPTZ NOT NULL,
    status      availability_status NOT NULL DEFAULT 'available',
    booking_id  UUID REFERENCES bookings(id),
    version     INTEGER NOT NULL DEFAULT 1,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent overlapping bookings for same listing
    EXCLUDE USING GIST (
        listing_id WITH =,
        tstzrange(start_time, end_time) WITH &&
    ) WHERE (status = 'booked')
);

CREATE INDEX idx_availability_listing ON availability (listing_id, start_time, end_time);
CREATE INDEX idx_availability_booking ON availability (booking_id);
```

### bookings

```sql
CREATE TYPE booking_status AS ENUM (
    'requested', 'approved', 'declined',
    'active', 'completed', 'cancelled',
    'disputed', 'resolved', 'extended'
);
CREATE TYPE delivery_method AS ENUM ('pickup', 'delivery');
CREATE TYPE protection_plan AS ENUM ('none', 'basic', 'premium');

CREATE TABLE bookings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id          UUID NOT NULL REFERENCES listings(id),
    renter_id           UUID NOT NULL REFERENCES users(id),
    owner_id            UUID NOT NULL REFERENCES users(id),  -- Denormalized
    status              booking_status NOT NULL DEFAULT 'requested',
    start_time          TIMESTAMPTZ NOT NULL,
    end_time            TIMESTAMPTZ NOT NULL,

    -- Delivery
    delivery_method     delivery_method NOT NULL DEFAULT 'pickup',
    delivery_address    JSONB,

    -- Pricing snapshot (immutable at booking time)
    pricing_snapshot    JSONB NOT NULL,  -- Copy of listing pricing at time of booking
    subtotal            INTEGER NOT NULL,  -- Rental amount in minor units
    service_fee         INTEGER NOT NULL,  -- Renter service fee
    delivery_fee        INTEGER NOT NULL DEFAULT 0,
    insurance_fee       INTEGER NOT NULL DEFAULT 0,
    deposit_amount      INTEGER NOT NULL DEFAULT 0,
    total               INTEGER NOT NULL,  -- subtotal + all fees

    -- Protection
    protection_plan     protection_plan NOT NULL DEFAULT 'none',

    -- Idempotency
    idempotency_key     VARCHAR(255) NOT NULL UNIQUE,

    -- Extension
    parent_booking_id   UUID REFERENCES bookings(id),  -- For extensions
    original_end_time   TIMESTAMPTZ,  -- Pre-extension end time

    -- Cancellation
    cancelled_by        UUID REFERENCES users(id),
    cancellation_reason TEXT,
    refund_amount       INTEGER,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_bookings_listing ON bookings (listing_id);
CREATE INDEX idx_bookings_renter ON bookings (renter_id);
CREATE INDEX idx_bookings_owner ON bookings (owner_id);
CREATE INDEX idx_bookings_status ON bookings (status);
CREATE INDEX idx_bookings_dates ON bookings (start_time, end_time);
CREATE INDEX idx_bookings_created_at ON bookings (created_at);
```

### transactions

```sql
CREATE TYPE transaction_type AS ENUM (
    'charge', 'refund', 'deposit_hold',
    'deposit_release', 'payout', 'insurance_claim'
);
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed');

CREATE TABLE transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id      UUID NOT NULL REFERENCES bookings(id),
    type            transaction_type NOT NULL,
    amount          INTEGER NOT NULL,  -- Minor units (always positive)
    currency        CHAR(3) NOT NULL DEFAULT 'USD',
    status          transaction_status NOT NULL DEFAULT 'pending',
    stripe_payment_intent_id VARCHAR(255),
    stripe_transfer_id       VARCHAR(255),
    description     TEXT,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    -- NOTE: No updated_at — transactions are append-only
);

CREATE INDEX idx_transactions_booking ON transactions (booking_id);
CREATE INDEX idx_transactions_type ON transactions (type);
CREATE INDEX idx_transactions_status ON transactions (status);
CREATE INDEX idx_transactions_created_at ON transactions (created_at);
```

### message_threads & messages

```sql
CREATE TABLE message_threads (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id      UUID REFERENCES listings(id),
    booking_id      UUID REFERENCES bookings(id),
    participant_ids UUID[] NOT NULL,  -- Array of user IDs
    last_message_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_threads_participants ON message_threads USING GIN (participant_ids);
CREATE INDEX idx_threads_listing ON message_threads (listing_id);
CREATE INDEX idx_threads_booking ON message_threads (booking_id);
CREATE INDEX idx_threads_last_message ON message_threads (last_message_at DESC);

CREATE TABLE messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id   UUID NOT NULL REFERENCES message_threads(id),
    sender_id   UUID NOT NULL REFERENCES users(id),
    content     TEXT NOT NULL,  -- Encrypted at rest
    attachments JSONB DEFAULT '[]',  -- [{ url, type, name, size }]
    metadata    JSONB DEFAULT '{}',  -- Quick actions, structured data
    read_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_thread ON messages (thread_id, created_at);
CREATE INDEX idx_messages_sender ON messages (sender_id);
```

### reviews

```sql
CREATE TABLE reviews (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id  UUID NOT NULL REFERENCES bookings(id),
    author_id   UUID NOT NULL REFERENCES users(id),
    target_id   UUID NOT NULL REFERENCES users(id),
    listing_id  UUID NOT NULL REFERENCES listings(id),
    rating      SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment     TEXT,
    is_edited   BOOLEAN NOT NULL DEFAULT FALSE,
    edit_deadline TIMESTAMPTZ,  -- 48 hours after creation
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One review per booking per author
    UNIQUE (booking_id, author_id)
);

CREATE INDEX idx_reviews_target ON reviews (target_id);
CREATE INDEX idx_reviews_listing ON reviews (listing_id);
CREATE INDEX idx_reviews_rating ON reviews (rating);
```

### notifications

```sql
CREATE TYPE notification_channel AS ENUM ('in_app', 'push', 'email', 'sms');

CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id),
    type        VARCHAR(50) NOT NULL,  -- e.g., 'booking.approved', 'review.received'
    title       VARCHAR(200) NOT NULL,
    body        TEXT NOT NULL,
    data        JSONB DEFAULT '{}',    -- Deep link data, entity references
    channels    notification_channel[] NOT NULL DEFAULT '{in_app}',
    read_at     TIMESTAMPTZ,
    sent_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications (user_id) WHERE read_at IS NULL;
```

---

## Migration Strategy

### Tools

- **Flyway** or **golang-migrate** for schema migrations
- Versioned migration files: `V001__create_users.sql`, `V002__create_categories.sql`

### Rules

1. **Never delete columns in production.** Add new columns, deprecate old ones, clean up later.
2. **Always add columns as nullable** or with a default value. Otherwise, the migration locks the table.
3. **Create indexes concurrently** in production: `CREATE INDEX CONCURRENTLY ...`
4. **Test migrations** against a copy of production data before applying.
5. **Rollback scripts** for every migration: `V001__create_users.sql` has a matching `U001__drop_users.sql`.

### Seed Data

```sql
-- Categories (seed on first migration)
INSERT INTO categories (name, slug, sort_order) VALUES
    ('Cameras & Photography', 'cameras', 1),
    ('Power Tools', 'tools', 2),
    ('Outdoor & Sports', 'outdoor', 3),
    ('Electronics', 'electronics', 4),
    ('Party & Events', 'events', 5),
    ('Vehicles', 'vehicles', 6),
    ('Music & Audio', 'music', 7),
    ('Photography Services', 'photo-services', 8),
    ('Moving & Delivery', 'moving', 9),
    ('Home Services', 'home-services', 10);
```
