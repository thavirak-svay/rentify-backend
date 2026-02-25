# Rentify API Documentation

Complete API reference for the Rentify rental marketplace backend.

## Base URL

```
Development: http://localhost:8080
Production: https://api.rentify.com
```

## Authentication

Most endpoints require Bearer token authentication:

```
Authorization: Bearer <supabase_jwt_token>
```

## Rate Limits

- General API: 100 requests/minute
- Write operations: 10 requests/minute
- Rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## Endpoints

### Health Check

#### GET /health

Public health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-25T00:00:00.000Z",
  "version": "1.0.0"
}
```

---

### Users

#### GET /v1/users/me

Get current user's profile.

**Auth:** Required

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "display_name": "John Doe",
    "avatar_url": "https://...",
    "bio": "string",
    "rating_avg": 4.5,
    "rating_count": 10,
    "identity_status": "verified",
    "created_at": "2026-01-01T00:00:00Z"
  }
}
```

#### PATCH /v1/users/me

Update current user's profile.

**Auth:** Required

**Body:**
```json
{
  "display_name": "John Doe",
  "bio": "Updated bio",
  "avatar_url": "https://..."
}
```

#### GET /v1/users/:id

Get public profile by ID.

**Auth:** Not required

---

### Categories

#### GET /v1/categories

Get all categories.

**Auth:** Not required

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Electronics",
      "slug": "electronics",
      "description": "Cameras, drones, audio equipment",
      "icon": "laptop"
    }
  ]
}
```

---

### Listings

#### POST /v1/listings

Create a new listing (draft).

**Auth:** Required

**Body:**
```json
{
  "title": "Professional Camera Kit",
  "description": "Canon EOS R5 with lenses",
  "category_id": "uuid",
  "type": "offer",
  "price_daily": 5000,
  "price_weekly": 30000,
  "deposit_amount": 10000,
  "address_city": "Phnom Penh",
  "address_country": "KH",
  "location": {
    "lat": 11.5564,
    "lng": 104.9282
  },
  "delivery_available": true,
  "delivery_fee": 500
}
```

#### GET /v1/listings/:id

Get listing details.

**Auth:** Not required

#### PATCH /v1/listings/:id

Update listing (owner only).

**Auth:** Required

#### DELETE /v1/listings/:id

Soft-delete listing (owner only).

**Auth:** Required

#### POST /v1/listings/:id/publish

Publish draft listing (owner only).

**Auth:** Required

#### GET /v1/listings/my/listings

Get current user's listings.

**Auth:** Required

---

### Search

#### GET /v1/search

Search listings with filters.

**Auth:** Not required

**Query Parameters:**
- `q` - Search query
- `lat` - Latitude for geo search
- `lng` - Longitude for geo search
- `radius` - Search radius in km (default: 25)
- `category` - Category slug
- `type` - "offer" or "request"
- `min_price` - Minimum daily price
- `max_price` - Maximum daily price
- `sort` - "relevance", "price_asc", "price_desc", "rating", "newest"
- `limit` - Results per page (default: 20)
- `offset` - Pagination offset

---

### Media

#### POST /v1/media/upload-url

Get presigned upload URL.

**Auth:** Required

**Body:**
```json
{
  "file_name": "image.jpg",
  "content_type": "image/jpeg"
}
```

**Response:**
```json
{
  "data": {
    "upload_url": "https://...",
    "path": "uploads/user_id/123456-image.jpg",
    "public_url": "https://..."
  }
}
```

#### POST /v1/media/:listingId/confirm

Confirm upload and add to listing.

**Auth:** Required

---

### Bookings

#### POST /v1/bookings

Create booking request.

**Auth:** Required

**Body:**
```json
{
  "listing_id": "uuid",
  "start_time": "2026-03-01T10:00:00Z",
  "end_time": "2026-03-03T10:00:00Z",
  "delivery_method": "pickup",
  "protection_plan": "basic"
}
```

**Response:**
```json
{
  "data": {
    "booking": { ... },
    "checkout_url": "PayWay checkout HTML"
  }
}
```

#### GET /v1/bookings/:id

Get booking details (parties only).

**Auth:** Required

#### GET /v1/bookings

Get user's bookings.

**Auth:** Required

**Query:** `role` - "renter" or "owner"

#### POST /v1/bookings/:id/approve

Approve booking (owner only).

**Auth:** Required

#### POST /v1/bookings/:id/decline

Decline booking (owner only).

**Auth:** Required

#### POST /v1/bookings/:id/cancel

Cancel booking (parties only).

**Auth:** Required

---

### Payments

#### POST /v1/payments/payway-callback

PayWay payment callback webhook.

**Auth:** PayWay internal

#### GET /v1/payments/:id/status

Check payment status.

**Auth:** Required

#### POST /v1/payments/:id/refund

Trigger refund.

**Auth:** Admin

---

### Messages

#### POST /v1/threads

Create message thread.

**Auth:** Required

**Body:**
```json
{
  "listing_id": "uuid",
  "participant_ids": ["uuid1", "uuid2"]
}
```

#### GET /v1/threads

Get user's threads.

**Auth:** Required

#### GET /v1/threads/:id/messages

Get messages in thread.

**Auth:** Required (participants only)

**Query:** `limit`, `before` (cursor)

#### POST /v1/threads/:id/messages

Send message.

**Auth:** Required (participants only)

**Body:**
```json
{
  "content": "Is this still available?"
}
```

---

### Reviews

#### POST /v1/reviews

Create review (post-completion only).

**Auth:** Required

**Body:**
```json
{
  "booking_id": "uuid",
  "rating": 5,
  "comment": "Great experience!"
}
```

#### GET /v1/reviews/listings/:listingId

Get reviews for listing.

**Auth:** Not required

#### GET /v1/reviews/users/:userId

Get reviews for user.

**Auth:** Not required

---

### Notifications

#### GET /v1/notifications

Get user's notifications.

**Auth:** Required

**Query:** `unread=true` - Only unread

#### GET /v1/notifications/unread-count

Get unread notification count.

**Auth:** Required

#### POST /v1/notifications/:id/read

Mark notification as read.

**Auth:** Required

#### POST /v1/notifications/mark-all-read

Mark all notifications as read.

**Auth:** Required

---

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

### Common Error Codes

- `AUTHENTICATION_REQUIRED` - 401
- `FORBIDDEN` - 403
- `NOT_FOUND` - 404
- `VALIDATION_ERROR` - 400
- `CONFLICT` - 409
- `RATE_LIMIT_EXCEEDED` - 429
- `INTERNAL_ERROR` - 500

---

## Pricing Example

### Request
```
Listing: $50/day, $300/week
Rental: 7 days
Delivery: $5
Protection: Premium (10%)
```

### Calculation
```
Subtotal: $300 (weekly rate)
Service Fee: $36 (12%)
Delivery: $5
Protection: $30 (10%)
Total: $371
Owner Payout: $282 ($300 - 6%)
```

---

## Booking State Machine

```
requested → approved → active → completed
    ↓          ↓         ↓
declined   cancelled  disputed
    ↓                    ↓
auto_declined         resolved
```

---

## Development Setup

1. Clone repository
2. `bun install`
3. `cp .env.example .env.local`
4. `bun run db:start`
5. `bun run db:reset`
6. `bun run dev`

Server runs at http://localhost:8080

---

## Testing

```bash
bun test                # Run all tests
bun test --watch        # Watch mode
```

Current coverage: 46 tests passing
