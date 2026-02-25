# Rentify — API Design Guidelines

> Consistent, predictable, developer-friendly API conventions for the Rentify platform.

---

## General Conventions

### Base URL

```
Production:  https://api.rentify.com/v1
Staging:     https://api.staging.rentify.com/v1
Local:       http://localhost:8080/v1
```

### Request Format

- Content-Type: `application/json`
- Authentication: `Authorization: Bearer <access_token>`
- Idempotency: `Idempotency-Key: <uuid>` (required on all POST/PATCH/DELETE)
- Request ID: `X-Request-Id: <uuid>` (for tracing — auto-generated if not provided)

### Response Format

**Success:**

```json
{
  "data": { ... },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2026-02-25T09:00:00Z"
  }
}
```

**Paginated list:**

```json
{
  "data": [ ... ],
  "pagination": {
    "has_more": true,
    "next_cursor": "eyJpZCI6Ij...",
    "total_count": 147
  },
  "meta": {
    "request_id": "req_abc123"
  }
}
```

**Error:**

```json
{
  "error": {
    "code": "LISTING_NOT_FOUND",
    "message": "The requested listing does not exist or has been archived.",
    "details": [
      {
        "field": "listing_id",
        "issue": "No listing found with ID 'abc123'"
      }
    ],
    "request_id": "req_abc123"
  }
}
```

---

## HTTP Status Code Usage

| Code | Meaning               | When to Use                                                                     |
| ---- | --------------------- | ------------------------------------------------------------------------------- |
| 200  | OK                    | Successful GET, PATCH, or action endpoint                                       |
| 201  | Created               | Successful POST that creates a resource                                         |
| 204  | No Content            | Successful DELETE                                                               |
| 400  | Bad Request           | Malformed request body, missing required fields, validation errors              |
| 401  | Unauthorized          | Missing or invalid authentication token                                         |
| 403  | Forbidden             | Authenticated but not authorized for this resource                              |
| 404  | Not Found             | Resource doesn't exist                                                          |
| 409  | Conflict              | State conflict (e.g., booking already approved, availability overlap)           |
| 422  | Unprocessable Entity  | Request is valid JSON but semantically wrong (e.g., end_date before start_date) |
| 429  | Too Many Requests     | Rate limit exceeded                                                             |
| 500  | Internal Server Error | Unexpected server error (always log, always alert)                              |

---

## Naming Conventions

### URL Patterns

```
# Collection
GET    /v1/listings              → List all (with filters)
POST   /v1/listings              → Create new

# Resource
GET    /v1/listings/{id}         → Get one
PATCH  /v1/listings/{id}         → Update
DELETE /v1/listings/{id}         → Archive (soft delete)

# Sub-resources
GET    /v1/listings/{id}/reviews → Reviews for a listing
POST   /v1/listings/{id}/reviews → Add review

# Actions (verbs as sub-resource)
POST   /v1/listings/{id}/publish → Publish a draft listing
POST   /v1/bookings/{id}/approve → Approve a booking
POST   /v1/bookings/{id}/cancel  → Cancel a booking
```

### Field Naming

- Use `snake_case` for all JSON fields
- Use `_id` suffix for identifiers: `listing_id`, `owner_id`
- Use `_at` suffix for timestamps: `created_at`, `updated_at`
- Use `_url` suffix for URLs: `avatar_url`, `media_url`
- Use `is_` prefix for booleans: `is_verified`, `is_instant_book`

### ID Format

- UUIDs (v4) for all resource IDs
- Prefixed IDs for external-facing identifiers (optional but useful for debugging):
  - `usr_` for users
  - `lst_` for listings
  - `bkg_` for bookings
  - `txn_` for transactions
  - `thr_` for message threads

---

## Pagination

### Cursor-Based (Required)

```
GET /v1/listings?limit=20&cursor=eyJpZCI6IjEyMyJ9
```

**Why cursor, not offset:**

- Offset pagination breaks when items are inserted/deleted between pages
- Cursor pagination is stable and performant at any page depth
- Cursor is opaque to the client (base64-encoded internal state)

**Implementation:**

```
cursor = base64_encode({ "id": last_item_id, "sort_value": last_sort_value })
```

### Response

```json
{
  "data": [...],
  "pagination": {
    "has_more": true,
    "next_cursor": "eyJpZCI6...",
    "total_count": 147
  }
}
```

- `total_count` is optional — expensive to compute on large datasets. Omit if unnecessary.
- Default `limit`: 20. Maximum: 50.

---

## Filtering & Sorting

### Filter Pattern

```
GET /v1/listings?type=item&category=cameras&price_min=1000&price_max=5000&verified_only=true
```

- Filters are query parameters
- Use `_min` / `_max` suffixes for range filters
- Boolean filters use `true` / `false` strings
- Multiple values for same field use comma separation: `category=cameras,tools`

### Sorting

```
GET /v1/listings?sort=price_asc
GET /v1/listings?sort=-created_at  (minus prefix = descending)
```

Supported sort values are documented per endpoint.

---

## Authentication & Authorization

### Token Flow

```
1. User logs in → POST /v1/auth/login
   Response: { access_token, refresh_token, expires_in }

2. Client includes token on every request:
   Authorization: Bearer eyJhbGciOi...

3. Token expired → POST /v1/auth/refresh
   Body: { refresh_token: "..." }
   Response: New { access_token, refresh_token }

4. Logout → POST /v1/auth/logout
   Revokes refresh token
```

### JWT Claims (Access Token)

```json
{
  "sub": "usr_abc123",
  "email": "user@example.com",
  "roles": ["renter", "owner"],
  "iat": 1740000000,
  "exp": 1740003600
}
```

- Access token TTL: 1 hour
- Refresh token TTL: 30 days
- Refresh token rotation: New refresh token on every refresh

### Authorization Matrix

| Endpoint                    | renter   | owner          | admin |
| --------------------------- | -------- | -------------- | ----- |
| GET /v1/listings            | ✅       | ✅             | ✅    |
| POST /v1/listings           | ❌       | ✅             | ✅    |
| POST /v1/bookings           | ✅       | ❌ own listing | ✅    |
| POST /bookings/{id}/approve | ❌       | ✅ own listing | ✅    |
| GET /v1/users/{id}          | Own only | Own only       | ✅    |
| DELETE /v1/listings/{id}    | ❌       | ✅ own only    | ✅    |

---

## Rate Limiting

### Tiers

| Client Type        | Rate Limit   | Window     |
| ------------------ | ------------ | ---------- |
| Authenticated user | 100 requests | per minute |
| Unauthenticated    | 20 requests  | per minute |
| Search endpoint    | 30 requests  | per minute |
| Write endpoints    | 10 requests  | per minute |

### Response Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1740003600
Retry-After: 30  (only on 429 responses)
```

---

## Versioning

### Strategy

- URL-based versioning: `/v1/`, `/v2/`
- Breaking changes get a new version
- Non-breaking changes (additive fields, new endpoints) stay in current version
- Old versions supported for 12 months after new version launches
- Deprecation communicated via `Sunset` header:
  ```
  Sunset: Sat, 01 Mar 2027 00:00:00 GMT
  Deprecation: true
  ```

### What Counts as Breaking

- Removing a field from a response
- Changing a field's type
- Requiring a new field in a request body
- Changing the meaning of a status code
- Removing an endpoint

### What Is NOT Breaking

- Adding a new field to a response
- Adding a new optional query parameter
- Adding a new endpoint
- Adding a new enum value (if clients handle unknown values gracefully)

---

## Error Codes

### Standard Error Codes

| Code                      | HTTP Status | Description                    |
| ------------------------- | ----------- | ------------------------------ |
| `VALIDATION_ERROR`        | 400         | Request body validation failed |
| `AUTHENTICATION_REQUIRED` | 401         | No valid token provided        |
| `FORBIDDEN`               | 403         | Insufficient permissions       |
| `NOT_FOUND`               | 404         | Resource not found             |
| `CONFLICT`                | 409         | State conflict                 |
| `RATE_LIMITED`            | 429         | Too many requests              |
| `INTERNAL_ERROR`          | 500         | Unexpected error               |

### Domain-Specific Error Codes

| Code                             | HTTP Status | Description                                  |
| -------------------------------- | ----------- | -------------------------------------------- |
| `LISTING_NOT_FOUND`              | 404         | Listing doesn't exist or is archived         |
| `LISTING_UNAVAILABLE`            | 409         | Requested time slot is not available         |
| `BOOKING_INVALID_TRANSITION`     | 409         | Cannot transition booking to requested state |
| `BOOKING_ALREADY_EXISTS`         | 409         | Duplicate idempotency key                    |
| `PAYMENT_FAILED`                 | 402         | Payment charge was declined                  |
| `PAYMENT_METHOD_REQUIRED`        | 402         | No payment method on file                    |
| `IDENTITY_VERIFICATION_REQUIRED` | 403         | Action requires identity verification        |
| `INSUFFICIENT_FUNDS`             | 402         | Cannot hold deposit amount                   |

---

## Webhook Design (Outgoing)

For integrators and future third-party developers:

### Webhook Payload

```json
{
  "id": "evt_abc123",
  "type": "booking.approved",
  "created_at": "2026-02-25T09:00:00Z",
  "data": {
    "booking_id": "bkg_xyz789",
    "listing_id": "lst_456",
    "renter_id": "usr_111",
    "owner_id": "usr_222",
    "total": 7500
  }
}
```

### Webhook Events

| Event               | When                   |
| ------------------- | ---------------------- |
| `booking.requested` | New booking created    |
| `booking.approved`  | Owner approved         |
| `booking.declined`  | Owner declined         |
| `booking.cancelled` | Either party cancelled |
| `booking.completed` | Rental finished        |
| `payment.completed` | Charge captured        |
| `payment.refunded`  | Refund processed       |
| `review.created`    | New review submitted   |

### Webhook Security

- Signed with HMAC-SHA256 (`X-Rentify-Signature` header)
- Retry schedule: 1min, 5min, 30min, 2h, 6h (then give up)
- Endpoint must return 2xx within 5 seconds
