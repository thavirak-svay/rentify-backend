# Flutter Integration Guide

API usage guide for the Rentify mobile application, organized by user journey.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [User Journey: Registration](#user-journey-registration)
4. [User Journey: Browse & Search](#user-journey-browse--search)
5. [User Journey: Book an Item](#user-journey-book-an-item)
6. [User Journey: List an Item](#user-journey-list-an-item)
7. [User Journey: Manage Bookings](#user-journey-manage-bookings)
8. [User Journey: Messaging](#user-journey-messaging)
9. [User Journey: Reviews](#user-journey-reviews)
10. [User Journey: Notifications](#user-journey-notifications)
11. [Data Formats](#data-formats)
12. [Error Handling](#error-handling)
13. [API Reference](#api-reference)

---

## Getting Started

### Base URL

```
Development: https://rentify-api.thaavirak.workers.dev
Production: https://api.rentify.com
```

### Authentication

All authenticated endpoints require a Supabase JWT token in the Authorization header:

```
Authorization: Bearer <supabase-jwt-token>
```

### Health Check

```
GET /health

Response:
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "1.0.0"
}
```

---

## Authentication

Authentication is handled by **Supabase Auth**. The mobile app authenticates directly with Supabase, then uses the JWT token for all API calls.

### Supabase Configuration

| Parameter | Value |
|-----------|-------|
| URL | `https://tzvrtygoaelmtyrvnqok.supabase.co` |
| Anon Key | Get from Supabase Dashboard |

### Auth Flows

| Flow | Description |
|------|-------------|
| Email/Password | Sign up and sign in with email |
| Google OAuth | Sign in with Google account |
| Password Reset | Send reset email |
| Session Refresh | Auto-refresh tokens |

After authentication, include the access token in all API requests.

---

## User Journey: Registration

### Flow

```
┌─────────────────┐
│  Open App       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Sign Up        │
│  (Supabase Auth)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Verify Email   │
│  (if enabled)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Complete       │
│  Profile        │
│  PATCH /v1/users/me
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Ready to use   │
└─────────────────┘
```

### Step 1: Get Current User Profile

After authentication, fetch the user profile to check if it's complete.

```
GET /v1/users/me
Authorization: Bearer <token>

Response:
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "display_name": "John Doe",
    "avatar_url": null,
    "bio": null,
    "identity_status": "unverified",
    "address_city": null,
    "address_country": null,
    "rating_avg": 0,
    "rating_count": 0,
    "completed_rentals": 0,
    "last_active_at": "2024-01-01T00:00:00Z",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### Step 2: Complete Profile

Update profile with required information.

```
PATCH /v1/users/me
Authorization: Bearer <token>

Request:
{
  "display_name": "John Doe",
  "bio": "Photography enthusiast based in Phnom Penh",
  "address_city": "Phnom Penh",
  "address_country": "KH"
}

Response:
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "display_name": "John Doe",
    "bio": "Photography enthusiast based in Phnom Penh",
    "address_city": "Phnom Penh",
    "address_country": "KH",
    ...
  }
}
```

### Profile Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `display_name` | string | Yes | User's display name (1-100 chars) |
| `avatar_url` | string | No | URL to avatar image |
| `bio` | string | No | User bio (max 500 chars) |
| `address_city` | string | No | City name |
| `address_country` | string | No | ISO 3166-1 alpha-2 country code (e.g., "KH") |
| `bank_name` | string | No | Bank name for payouts |
| `bank_account_masked` | string | No | Masked bank account number |

---

## User Journey: Browse & Search

### Flow

```
┌─────────────────┐
│  Home Screen    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Load           │
│  Categories     │
│  GET /v1/categories
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Browse/Search  │
│  Listings       │
│  GET /v1/search │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  View Listing   │
│  Details        │
│  GET /v1/listings/:id
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  View Owner     │
│  Profile        │
│  GET /v1/users/:id
└────────┬────────┘
```

### Step 1: Get Categories

Load all categories for browsing.

```
GET /v1/categories

Response:
{
  "data": [
    {
      "id": "5ddd12ac-ce99-4838-a666-51a8d44006fb",
      "name": "Electronics",
      "slug": "electronics",
      "description": "Cameras, drones, audio equipment, and more",
      "icon": "laptop",
      "parent_id": null,
      "sort_order": 1,
      "created_at": "2024-01-01T00:00:00Z"
    },
    {
      "id": "fb4b811f-5014-49f9-9514-9d51fc725a99",
      "name": "Tools & Equipment",
      "slug": "tools-equipment",
      "description": "Power tools, hand tools, construction equipment",
      "icon": "wrench",
      "parent_id": null,
      "sort_order": 2,
      "created_at": "2024-01-01T00:00:00Z"
    }
    ...
  ]
}
```

### Step 2: Get Category by Slug

Get a specific category.

```
GET /v1/categories/electronics

Response:
{
  "data": {
    "id": "5ddd12ac-ce99-4838-a666-51a8d44006fb",
    "name": "Electronics",
    "slug": "electronics",
    "description": "Cameras, drones, audio equipment, and more",
    "icon": "laptop",
    "parent_id": null,
    "sort_order": 1,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### Step 3: Search Listings

Search with various filters.

```
GET /v1/search?q=camera&category=electronics&sort=price_asc&limit=10

Query Parameters:
┌─────────────┬────────┬─────────┬─────────────────────────────────┐
│ Parameter   │ Type   │ Default │ Description                     │
├─────────────┼────────┼─────────┼─────────────────────────────────┤
│ q           │ string │ -       │ Search query                    │
│ lat         │ number │ -       │ Latitude for location search    │
│ lng         │ number │ -       │ Longitude for location search   │
│ radius      │ number │ 25      │ Search radius in km             │
│ category    │ string │ -       │ Category slug                   │
│ type        │ string │ -       │ "offer" or "request"            │
│ min_price   │ number │ -       │ Minimum price in cents          │
│ max_price   │ number │ -       │ Maximum price in cents          │
│ sort        │ string │ relevance │ relevance, price_asc,         │
│             │        │         │ price_desc, rating, newest      │
│ limit       │ number │ 20      │ Results per page                │
│ offset      │ number │ 0       │ Pagination offset               │
└─────────────┴────────┴─────────┴─────────────────────────────────┘

Response:
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Canon EOS R5 Camera",
      "description": "Professional camera kit",
      "type": "offer",
      "price_daily": 5000,
      "deposit_amount": 10000,
      "currency": "USD",
      "owner_id": "uuid",
      "owner_display_name": "John Doe",
      "owner_avatar_url": "https://...",
      "owner_rating": 4.8,
      "owner_verified": true,
      "listing_rating": 4.5,
      "review_count": 12,
      "distance_km": 2.5,
      "first_image_url": "https://...",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Step 4: Get Listing Details

View full listing information.

```
GET /v1/listings/550e8400-e29b-41d4-a716-446655440000

Response:
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "owner_id": "uuid",
    "category_id": "uuid",
    "title": "Canon EOS R5 Camera Kit",
    "description": "Professional camera with 24-70mm lens",
    "type": "offer",
    "status": "active",
    "price_hourly": null,
    "price_daily": 5000,
    "price_weekly": 30000,
    "deposit_amount": 10000,
    "currency": "USD",
    "address_text": "123 Main St, Phnom Penh",
    "address_city": "Phnom Penh",
    "address_country": "KH",
    "availability_type": "flexible",
    "min_rental_hours": 4,
    "max_rental_days": 14,
    "delivery_available": true,
    "delivery_fee": 500,
    "pickup_available": true,
    "view_count": 150,
    "rating_avg": 4.5,
    "rating_count": 12,
    "published_at": "2024-01-01T00:00:00Z",
    "created_at": "2024-01-01T00:00:00Z",
    "media": [
      {
        "id": "uuid",
        "listing_id": "uuid",
        "url": "https://...",
        "thumbnail_url": "https://...",
        "sort_order": 0,
        "is_primary": true,
        "created_at": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

### Step 5: Get Owner's Public Profile

```
GET /v1/users/550e8400-e29b-41d4-a716-446655440000

Response:
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "display_name": "John Doe",
    "avatar_url": "https://...",
    "bio": "Photography enthusiast",
    "rating_avg": 4.8,
    "rating_count": 25,
    "completed_rentals": 42,
    "identity_status": "verified",
    "created_at": "2023-01-01T00:00:00Z"
  }
}
```

---

## User Journey: Book an Item

### Flow

```
┌─────────────────┐
│  Listing Detail │
└────────┬────────┘
         │ User taps "Book Now"
         ▼
┌─────────────────┐
│  Select Dates   │
│  + Options      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Create Booking │
│  POST /v1/bookings
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Payment        │
│  (PayWay)       │
│  Open checkout_url
└────────┬────────┘
         │ Payment complete
         ▼
┌─────────────────┐
│  Booking        │
│  Requested      │
└────────┬────────┘
         │ Owner reviews
         ▼
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│Approved│ │Declined│
└───┬───┘ └───────┘
    │
    ▼
┌─────────────────┐
│  Rental Period  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Complete       │
│  Rental         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Leave Review   │
└─────────────────┘
```

### Step 1: Create Booking

Submit a booking request with dates and options.

```
POST /v1/bookings
Authorization: Bearer <token>

Request:
{
  "listing_id": "550e8400-e29b-41d4-a716-446655440000",
  "start_time": "2024-03-01T10:00:00Z",
  "end_time": "2024-03-03T10:00:00Z",
  "delivery_method": "pickup",
  "delivery_address": null,
  "protection_plan": "basic"
}

Request Fields:
┌───────────────────┬────────┬─────────┬─────────────────────────┐
│ Field             │ Type   │ Required│ Description             │
├───────────────────┼────────┼─────────┼─────────────────────────┤
│ listing_id        │ uuid   │ Yes     │ Listing to book         │
│ start_time        │ ISO8601│ Yes     │ Rental start datetime   │
│ end_time          │ ISO8601│ Yes     │ Rental end datetime     │
│ delivery_method   │ string │ No      │ "pickup" or "delivery"  │
│ delivery_address  │ string │ No      │ Required if delivery    │
│ protection_plan   │ string │ No      │ "none", "basic",        │
│                   │        │         │ "premium"               │
└───────────────────┴────────┴─────────┴─────────────────────────┘

Response: 201 Created
{
  "data": {
    "booking": {
      "id": "booking-uuid",
      "listing_id": "550e8400-e29b-41d4-a716-446655440000",
      "renter_id": "renter-uuid",
      "owner_id": "owner-uuid",
      "start_time": "2024-03-01T10:00:00Z",
      "end_time": "2024-03-03T10:00:00Z",
      "status": "requested",
      "payment_authorized": false,
      "subtotal": 10000,
      "service_fee": 1200,
      "delivery_fee": 0,
      "protection_fee": 500,
      "deposit_amount": 10000,
      "total_amount": 21700,
      "owner_payout": 9400,
      "currency": "USD",
      "delivery_method": "pickup",
      "delivery_address": null,
      "protection_plan": "basic",
      "created_at": "2024-01-01T00:00:00Z"
    },
    "checkout_url": "https://checkout.payway.com.kh/api/payment/..."
  }
}
```

### Step 2: Complete Payment

Open the `checkout_url` in a webview/browser for PayWay payment.

After successful payment, PayWay redirects to your callback URL. The booking status remains `requested` until the owner approves.

### Step 3: Check Booking Status

```
GET /v1/bookings/booking-uuid
Authorization: Bearer <token>

Response:
{
  "data": {
    "id": "booking-uuid",
    "listing_id": "...",
    "renter_id": "...",
    "owner_id": "...",
    "status": "requested",
    "payment_authorized": true,
    ...
  }
}
```

### Pricing Breakdown

| Component | Calculation | Example |
|-----------|-------------|---------|
| Subtotal | Daily rate × days (or weekly rate) | $50 × 2 = $100 |
| Service Fee | 12% of subtotal | $12 |
| Delivery Fee | If delivery selected | $5 |
| Protection Fee | 5% (basic) or 10% (premium) | $5 |
| Deposit | Set by listing owner | $100 |
| **Total** | Subtotal + Fees + Deposit | $222 |
| Owner Payout | Subtotal - 6% | $94 |

### Booking Statuses

| Status | Description |
|--------|-------------|
| `requested` | Booking created, awaiting owner approval |
| `approved` | Owner approved, ready for rental |
| `declined` | Owner declined the request |
| `auto_declined` | No response within 24 hours |
| `active` | Rental period in progress |
| `completed` | Rental finished successfully |
| `cancelled` | Cancelled by renter or owner |
| `disputed` | Issue reported |
| `resolved` | Dispute resolved |

---

## User Journey: List an Item

### Flow

```
┌─────────────────┐
│  Tap "Create"   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Enter Details  │
│  - Title        │
│  - Description  │
│  - Pricing      │
│  - Location     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Create Draft   │
│  POST /v1/listings
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Upload Photos  │
│  (Multiple)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Publish        │
│  POST /v1/listings/:id/publish
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Listing Live   │
│  status: active │
└─────────────────┘
```

### Step 1: Create Draft Listing

```
POST /v1/listings
Authorization: Bearer <token>

Request:
{
  "title": "Canon EOS R5 Camera Kit",
  "description": "Professional camera with 24-70mm lens",
  "category_id": "5ddd12ac-ce99-4838-a666-51a8d44006fb",
  "type": "offer",
  "price_daily": 5000,
  "price_weekly": 30000,
  "deposit_amount": 10000,
  "currency": "USD",
  "address_text": "123 Main St, Chamkar Mon",
  "address_city": "Phnom Penh",
  "address_country": "KH",
  "location": {
    "lat": 11.5564,
    "lng": 104.9282
  },
  "availability_type": "flexible",
  "min_rental_hours": 4,
  "max_rental_days": 14,
  "delivery_available": true,
  "delivery_fee": 500,
  "pickup_available": true
}

Request Fields:
┌────────────────────┬────────┬─────────┬─────────────────────────┐
│ Field              │ Type   │ Required│ Description             │
├────────────────────┼────────┼─────────┼─────────────────────────┤
│ title              │ string │ Yes     │ 5-200 characters        │
│ description        │ string │ No      │ Max 2000 characters     │
│ category_id        │ uuid   │ No      │ Category UUID           │
│ type               │ string │ No      │ "offer" or "request"    │
│ price_hourly       │ int    │ No      │ Price per hour (cents)  │
│ price_daily        │ int    │ Yes     │ Price per day (cents)   │
│ price_weekly       │ int    │ No      │ Price per week (cents)  │
│ deposit_amount     │ int    │ No      │ Deposit in cents        │
│ currency           │ string │ No      │ ISO 4217 code (default: USD) │
│ address_text       │ string │ No      │ Full address            │
│ address_city       │ string │ No      │ City name               │
│ address_country    │ string │ No      │ ISO country code (2 chars) │
│ location.lat       │ number │ No      │ Latitude (-90 to 90)    │
│ location.lng       │ number │ No      │ Longitude (-180 to 180) │
│ availability_type  │ string │ No      │ "flexible" or "specific_dates" │
│ min_rental_hours   │ int    │ No      │ Minimum rental (default: 1) │
│ max_rental_days    │ int    │ No      │ Maximum rental days     │
│ delivery_available │ bool   │ No      │ Offer delivery          │
│ delivery_fee       │ int    │ No      │ Delivery fee (cents)    │
│ pickup_available   │ bool   │ No      │ Offer pickup            │
└────────────────────┴────────┴─────────┴─────────────────────────┘

Response: 201 Created
{
  "data": {
    "id": "listing-uuid",
    "owner_id": "user-uuid",
    "title": "Canon EOS R5 Camera Kit",
    "status": "draft",
    ...
  }
}
```

### Step 2: Upload Images

For each image:

**2a. Get Upload URL**

```
POST /v1/media/upload-url
Authorization: Bearer <token>

Request:
{
  "file_name": "photo.jpg",
  "content_type": "image/jpeg"
}

Response:
{
  "data": {
    "upload_url": "https://storage.googleapis.com/...",
    "path": "uploads/user-id/123456-photo.jpg",
    "public_url": "https://storage.supabase.co/..."
  }
}
```

**2b. Upload to Storage**

```
PUT <upload_url>
Content-Type: image/jpeg

<image binary data>
```

**2c. Confirm Upload**

```
POST /v1/media/listing-uuid/confirm
Authorization: Bearer <token>

Request:
{
  "path": "uploads/user-id/123456-photo.jpg",
  "is_primary": true
}

Response:
{
  "data": {
    "id": "media-uuid",
    "listing_id": "listing-uuid",
    "url": "https://storage.supabase.co/...",
    "thumbnail_url": "https://storage.supabase.co/...",
    "is_primary": true
  }
}
```

### Step 3: Publish Listing

```
POST /v1/listings/listing-uuid/publish
Authorization: Bearer <token>

Response:
{
  "data": {
    "id": "listing-uuid",
    "status": "active",
    "published_at": "2024-01-01T00:00:00Z"
  }
}
```

### Manage Listings

**Get your listings:**

```
GET /v1/listings/my/listings?status=active
Authorization: Bearer <token>

Query Parameters:
- status: Filter by status (draft, active, paused, archived)
```

**Update listing:**

```
PATCH /v1/listings/listing-uuid
Authorization: Bearer <token>

Request:
{
  "title": "Updated Title",
  "price_daily": 6000
}
```

**Delete listing:**

```
DELETE /v1/listings/listing-uuid
Authorization: Bearer <token>

Response:
{
  "success": true
}
```

---

## User Journey: Manage Bookings

### Flow - As Renter

```
┌─────────────────┐
│  View Bookings  │
│  GET /v1/bookings?role=renter
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  View Details   │
│  GET /v1/bookings/:id
└────────┬────────┘
         │
         ▼
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│Cancel │ │Message│
│Booking│ │Owner  │
└───────┘ └───────┘
```

### Flow - As Owner

```
┌─────────────────┐
│  View Bookings  │
│  GET /v1/bookings?role=owner
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  New Request    │
│  status:        │
│  requested      │
└────────┬────────┘
         │
         ▼
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│Approve│ │Decline│
└───┬───┘ └───────┘
    │
    ▼
┌─────────────────┐
│  Rental Active  │
│  status: active │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Mark Complete  │
│  POST /v1/bookings/:id/complete
└─────────────────┘
```

### Get Bookings

```
GET /v1/bookings?role=renter
Authorization: Bearer <token>

Query Parameters:
- role: "renter" or "owner"

Response:
{
  "data": [
    {
      "id": "booking-uuid",
      "listing_id": "listing-uuid",
      "renter_id": "renter-uuid",
      "owner_id": "owner-uuid",
      "start_time": "2024-03-01T10:00:00Z",
      "end_time": "2024-03-03T10:00:00Z",
      "status": "approved",
      "total_amount": 21700,
      "currency": "USD",
      ...
    }
  ]
}
```

### Approve Booking (Owner)

```
POST /v1/bookings/booking-uuid/approve
Authorization: Bearer <token>

Response:
{
  "data": {
    "id": "booking-uuid",
    "status": "approved",
    "approved_at": "2024-01-01T00:00:00Z"
  }
}
```

### Decline Booking (Owner)

```
POST /v1/bookings/booking-uuid/decline
Authorization: Bearer <token>

Response:
{
  "data": {
    "id": "booking-uuid",
    "status": "declined",
    "declined_at": "2024-01-01T00:00:00Z"
  }
}
```

### Cancel Booking

```
POST /v1/bookings/booking-uuid/cancel
Authorization: Bearer <token>

Request:
{
  "reason": "Emergency, cannot fulfill rental"
}

Response:
{
  "data": {
    "id": "booking-uuid",
    "status": "cancelled",
    "cancelled_at": "2024-01-01T00:00:00Z",
    "cancelled_by": "user-uuid",
    "cancellation_reason": "Emergency, cannot fulfill rental"
  }
}
```

### Complete Booking

```
POST /v1/bookings/booking-uuid/complete
Authorization: Bearer <token>

Response:
{
  "data": {
    "id": "booking-uuid",
    "status": "completed",
    "completed_at": "2024-01-01T00:00:00Z"
  }
}
```

---

## User Journey: Messaging

### Flow

```
┌─────────────────┐
│  View Threads   │
│  GET /v1/threads
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Open Thread    │
│  GET /v1/threads/:id/messages
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Send Message   │
│  POST /v1/threads/:id/messages
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Mark Read      │
│  POST /v1/threads/:id/read
└─────────────────┘
```

### Get All Threads

```
GET /v1/threads
Authorization: Bearer <token>

Response:
{
  "data": [
    {
      "id": "thread-uuid",
      "listing_id": "listing-uuid",
      "booking_id": null,
      "participant_ids": ["user1-uuid", "user2-uuid"],
      "last_message_at": "2024-01-01T00:00:00Z",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Create Thread

Start a conversation about a listing.

```
POST /v1/threads
Authorization: Bearer <token>

Request:
{
  "listing_id": "listing-uuid",
  "booking_id": null,
  "participant_ids": ["current-user-uuid", "other-user-uuid"]
}

Response: 201 Created
{
  "data": {
    "id": "thread-uuid",
    "listing_id": "listing-uuid",
    "participant_ids": ["user1-uuid", "user2-uuid"],
    ...
  }
}
```

### Get Messages

```
GET /v1/threads/thread-uuid/messages?limit=50
Authorization: Bearer <token>

Query Parameters:
- limit: Number of messages (default: 50)
- before: Timestamp for pagination

Response:
{
  "data": [
    {
      "id": "message-uuid",
      "thread_id": "thread-uuid",
      "sender_id": "user-uuid",
      "content": "Is this still available?",
      "read_at": null,
      "created_at": "2024-01-01T00:00:00Z"
    },
    {
      "id": "message-uuid-2",
      "thread_id": "thread-uuid",
      "sender_id": "other-user-uuid",
      "content": "Yes, it's available!",
      "read_at": "2024-01-01T00:00:00Z",
      "created_at": "2024-01-01T00:00:05Z"
    }
  ]
}
```

### Send Message

```
POST /v1/threads/thread-uuid/messages
Authorization: Bearer <token>

Request:
{
  "content": "Great! Can I rent it this weekend?"
}

Response: 201 Created
{
  "data": {
    "id": "message-uuid",
    "thread_id": "thread-uuid",
    "sender_id": "user-uuid",
    "content": "Great! Can I rent it this weekend?",
    "read_at": null,
    "created_at": "2024-01-01T00:00:10Z"
  }
}
```

### Mark Messages as Read

```
POST /v1/threads/thread-uuid/read
Authorization: Bearer <token>

Response:
{
  "success": true
}
```

---

## User Journey: Reviews

### Flow

```
┌─────────────────┐
│  Booking        │
│  Completed      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Leave Review   │
│  POST /v1/reviews
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  View Reviews   │
│  GET /v1/reviews/listings/:id
│  GET /v1/reviews/users/:id
└─────────────────┘
```

### Create Review

Submit a review after completing a booking.

```
POST /v1/reviews
Authorization: Bearer <token>

Request:
{
  "booking_id": "booking-uuid",
  "rating": 5,
  "comment": "Great experience! Item was exactly as described and owner was very responsive."
}

Request Fields:
┌────────────┬────────┬─────────┬─────────────────────────┐
│ Field      │ Type   │ Required│ Description             │
├────────────┼────────┼─────────┼─────────────────────────┤
│ booking_id │ uuid   │ Yes     │ Completed booking ID    │
│ rating     │ int    │ Yes     │ 1-5 stars               │
│ comment    │ string │ No      │ Max 1000 characters     │
└────────────┴────────┴─────────┴─────────────────────────┘

Response: 201 Created
{
  "data": {
    "id": "review-uuid",
    "booking_id": "booking-uuid",
    "listing_id": "listing-uuid",
    "reviewer_id": "reviewer-uuid",
    "target_id": "target-uuid",
    "rating": 5,
    "comment": "Great experience!",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### Get Listing Reviews

```
GET /v1/reviews/listings/listing-uuid

Response:
{
  "data": [
    {
      "id": "review-uuid",
      "booking_id": "booking-uuid",
      "listing_id": "listing-uuid",
      "reviewer_id": "reviewer-uuid",
      "target_id": "owner-uuid",
      "rating": 5,
      "comment": "Great experience!",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Get User Reviews

```
GET /v1/reviews/users/user-uuid

Response:
{
  "data": [
    {
      "id": "review-uuid",
      "rating": 5,
      "comment": "Great renter!",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

## User Journey: Notifications

### Flow

```
┌─────────────────┐
│  Get Badge      │
│  Count          │
│  GET /v1/notifications/unread-count
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  View           │
│  Notifications  │
│  GET /v1/notifications
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Mark Read      │
│  POST /v1/notifications/:id/read
│  POST /v1/notifications/mark-all-read
└─────────────────┘
```

### Get Unread Count

```
GET /v1/notifications/unread-count
Authorization: Bearer <token>

Response:
{
  "data": {
    "count": 5
  }
}
```

### Get Notifications

```
GET /v1/notifications?limit=50&unread=true
Authorization: Bearer <token>

Query Parameters:
- limit: Number of notifications (default: 50)
- unread: Only unread if "true"

Response:
{
  "data": [
    {
      "id": "notification-uuid",
      "user_id": "user-uuid",
      "type": "booking_approved",
      "title": "Booking Approved",
      "body": "Your booking for 'Canon EOS R5 Camera' has been approved!",
      "data": {
        "booking_id": "booking-uuid",
        "listing_id": "listing-uuid"
      },
      "read_at": null,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Notification Types

| Type | Description |
|------|-------------|
| `booking_requested` | New booking request received |
| `booking_approved` | Your booking was approved |
| `booking_declined` | Your booking was declined |
| `booking_cancelled` | Booking was cancelled |
| `booking_completed` | Rental completed |
| `new_message` | New message received |
| `new_review` | You received a review |
| `payment_received` | Payment processed |

### Mark as Read

**Single notification:**

```
POST /v1/notifications/notification-uuid/read
Authorization: Bearer <token>

Response:
{
  "success": true
}
```

**All notifications:**

```
POST /v1/notifications/mark-all-read
Authorization: Bearer <token>

Response:
{
  "success": true
}
```

---

## Data Formats

### Prices

All prices are in **cents** (smallest currency unit):

| Display | API Value |
|---------|-----------|
| $50.00 | 5000 |
| $6.00 | 600 |
| $56.00 | 5600 |
| ៛50,000 | 50000000 |

### Dates

All dates in **ISO 8601** format:

```
"2024-03-01T10:00:00Z"
```

### IDs

All IDs are **UUIDs**:

```
"550e8400-e29b-41d4-a716-446655440000"
```

### Location

Coordinates as object:

```json
{
  "lat": 11.5564,
  "lng": 104.9282
}
```

---

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Rating must be between 1 and 5"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTHENTICATION_REQUIRED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | No permission for this action |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `CONFLICT` | 409 | Resource conflict (e.g., double booking) |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |

### Common Scenarios

**Unauthorized (401):**
- Token expired → Refresh token via Supabase
- Invalid token → Re-authenticate

**Forbidden (403):**
- Trying to modify another user's listing
- Trying to approve booking as renter (not owner)

**Not Found (404):**
- Listing doesn't exist
- Booking doesn't exist

**Conflict (409):**
- Dates already booked
- Booking already approved

---

## API Reference

### Endpoint Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| **Health** ||||
| GET | `/health` | No | Server health check |
| **Categories** ||||
| GET | `/v1/categories` | No | List all categories |
| GET | `/v1/categories/{slug}` | No | Get category by slug |
| **Search** ||||
| GET | `/v1/search` | No | Search listings |
| **Listings** ||||
| POST | `/v1/listings` | Yes | Create listing |
| GET | `/v1/listings/{id}` | No | Get listing details |
| PATCH | `/v1/listings/{id}` | Yes | Update listing |
| DELETE | `/v1/listings/{id}` | Yes | Delete listing |
| POST | `/v1/listings/{id}/publish` | Yes | Publish listing |
| GET | `/v1/listings/my/listings` | Yes | Get user's listings |
| **Bookings** ||||
| GET | `/v1/bookings` | Yes | Get user bookings |
| POST | `/v1/bookings` | Yes | Create booking |
| GET | `/v1/bookings/{id}` | Yes | Get booking details |
| POST | `/v1/bookings/{id}/approve` | Yes | Approve booking |
| POST | `/v1/bookings/{id}/decline` | Yes | Decline booking |
| POST | `/v1/bookings/{id}/cancel` | Yes | Cancel booking |
| POST | `/v1/bookings/{id}/complete` | Yes | Complete booking |
| **Users** ||||
| GET | `/v1/users/me` | Yes | Get current user |
| PATCH | `/v1/users/me` | Yes | Update profile |
| GET | `/v1/users/{id}` | No | Get public profile |
| **Media** ||||
| POST | `/v1/media/upload-url` | Yes | Get upload URL |
| POST | `/v1/media/{listingId}/confirm` | Yes | Confirm upload |
| DELETE | `/v1/media/{id}` | Yes | Delete media |
| **Threads** ||||
| GET | `/v1/threads` | Yes | Get user threads |
| POST | `/v1/threads` | Yes | Create thread |
| GET | `/v1/threads/{id}` | Yes | Get thread |
| GET | `/v1/threads/{id}/messages` | Yes | Get messages |
| POST | `/v1/threads/{id}/messages` | Yes | Send message |
| POST | `/v1/threads/{id}/read` | Yes | Mark as read |
| **Reviews** ||||
| POST | `/v1/reviews` | Yes | Create review |
| GET | `/v1/reviews/listings/{listingId}` | No | Get listing reviews |
| GET | `/v1/reviews/users/{userId}` | No | Get user reviews |
| **Notifications** ||||
| GET | `/v1/notifications` | Yes | Get notifications |
| GET | `/v1/notifications/unread-count` | Yes | Get unread count |
| POST | `/v1/notifications/{id}/read` | Yes | Mark as read |
| POST | `/v1/notifications/mark-all-read` | Yes | Mark all read |

### Rate Limits

- **General API**: 100 requests/minute
- **Write operations**: 10 requests/minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1709251200
```

---

## Support

- **API Base URL**: https://rentify-api.thaavirak.workers.dev
- **OpenAPI Spec**: https://rentify-api.thaavirak.workers.dev/openapi.json
- **Backend Team**: backend@rentify.com
