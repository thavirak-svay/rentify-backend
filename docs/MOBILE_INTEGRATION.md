# Mobile Team Integration Guide

## API Documentation

### 🎨 Interactive API Reference

Visit the beautiful Scalar UI for interactive documentation:

**Development:** http://localhost:8080/docs
**Production:** https://api.rentify.com/docs

Features:
- ✅ Browse all endpoints
- ✅ Try API calls directly in browser
- ✅ See request/response schemas
- ✅ Code examples in multiple languages
- ✅ Authentication with Bearer token

### 📋 OpenAPI Specification

Download the OpenAPI 3.1 spec:

**Development:** http://localhost:8080/openapi.json
**Production:** https://api.rentify.com/openapi.json

---

## Getting Started

### 1. Authentication

All authenticated endpoints require a Supabase JWT token:

```swift
// Swift
var request = URLRequest(url: url)
request.addValue("Bearer \(supabaseToken)", forHTTPHeaderField: "Authorization")
```

```kotlin
// Kotlin
val request = Request.Builder()
    .url(url)
    .header("Authorization", "Bearer $supabaseToken")
    .build()
```

### 2. Base URL

```
Development: http://localhost:8080
Production: https://api.rentify.com
```

### 3. API Versioning

All endpoints are prefixed with `/v1`:

```
GET /v1/listings
POST /v1/bookings
GET /v1/users/me
```

---

## Generating Client SDKs

### Swift (iOS)

Using OpenAPI Generator:

```bash
# Install OpenAPI Generator
brew install openapi-generator

# Generate Swift client
openapi-generator generate \
  -i http://localhost:8080/openapi.json \
  -g swift5 \
  -o ./RentifyClient
```

### Kotlin (Android)

Using OpenAPI Generator:

```bash
# Generate Kotlin client
openapi-generator generate \
  -i http://localhost:8080/openapi.json \
  -g kotlin \
  -o ./rentify-client
```

### Other Languages

OpenAPI Generator supports many languages:
- Swift (iOS)
- Kotlin (Android)
- TypeScript/JavaScript
- Dart (Flutter)
- And more

See: https://openapi-generator.tech/docs/generators

---

## Key Endpoints

### Authentication

**Supabase handles authentication.** Use Supabase SDK for:
- Sign up / Sign in
- OAuth (Google, Apple)
- Password reset
- Session management

After auth, use the JWT token for API calls.

### Listings

#### Get Listings

```
GET /v1/listings/:id
```

#### Search Listings

```
GET /v1/search?q=camera&lat=11.5564&lng=104.9282&radius=25
```

Query params:
- `q` - Search query
- `lat`, `lng` - Location (optional)
- `radius` - Radius in km (default: 25)
- `category` - Category slug
- `type` - "offer" or "request"
- `min_price`, `max_price` - Price range
- `sort` - "relevance", "price_asc", "price_desc", "rating", "newest"
- `limit` - Results per page (default: 20)
- `offset` - Pagination offset

#### Create Listing

```
POST /v1/listings
Authorization: Bearer <token>

{
  "title": "Professional Camera Kit",
  "description": "Canon EOS R5 with lenses",
  "price_daily": 5000,  // in cents ($50.00)
  "currency": "USD"
}
```

#### Publish Listing

```
POST /v1/listings/:id/publish
```

### Bookings

#### Create Booking

```
POST /v1/bookings
Authorization: Bearer <token>

{
  "listing_id": "uuid",
  "start_time": "2024-03-01T10:00:00Z",
  "end_time": "2024-03-03T10:00:00Z",
  "delivery_method": "pickup",
  "protection_plan": "basic"
}
```

Response includes:
- Booking details
- Payment checkout URL (PayWay)

#### Get Booking

```
GET /v1/bookings/:id
```

#### Approve Booking (Owner only)

```
POST /v1/bookings/:id/approve
```

#### Cancel Booking

```
POST /v1/bookings/:id/cancel

{
  "reason": "Optional reason"
}
```

### Messages

#### Get Threads

```
GET /v1/threads
```

#### Get Messages

```
GET /v1/threads/:id/messages?limit=50&before=timestamp
```

#### Send Message

```
POST /v1/threads/:id/messages

{
  "content": "Is this still available?"
}
```

### Reviews

#### Create Review

```
POST /v1/reviews

{
  "booking_id": "uuid",
  "rating": 5,
  "comment": "Great experience!"
}
```

#### Get Reviews

```
GET /v1/reviews/listings/:listingId
GET /v1/reviews/users/:userId
```

### User Profile

#### Get Current User

```
GET /v1/users/me
```

#### Update Profile

```
PATCH /v1/users/me

{
  "display_name": "John Doe",
  "bio": "Photography enthusiast"
}
```

---

## Data Formats

### Prices

All prices are in **cents** (smallest currency unit):

```json
{
  "price_daily": 5000,  // $50.00
  "service_fee": 600,    // $6.00
  "total_amount": 5600   // $56.00
}
```

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

---

## Pricing Calculations

### Pricing Example

```
Listing: $50/day, $300/week
Rental: 7 days

Calculation:
- Subtotal: $300 (weekly rate)
- Service fee: $36 (12%)
- Total: $336
- Owner payout: $282 ($300 - 6%)
```

### Protection Plans

- **none**: $0
- **basic**: 5% of subtotal
- **premium**: 10% of subtotal

---

## Booking States

```
requested → approved → active → completed
    ↓          ↓         ↓
declined   cancelled  disputed
    ↓                    ↓
auto_declined         resolved
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

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTHENTICATION_REQUIRED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | No permission for this action |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `CONFLICT` | 409 | Resource conflict (e.g., double booking) |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |

---

## Rate Limits

- **General API**: 100 requests/minute
- **Write operations**: 10 requests/minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1709251200
```

---

## Image Uploads

### 1. Get Upload URL

```
POST /v1/media/upload-url

{
  "file_name": "photo.jpg",
  "content_type": "image/jpeg"
}
```

Response:
```json
{
  "data": {
    "upload_url": "https://...",
    "path": "uploads/user_id/123456-photo.jpg",
    "public_url": "https://..."
  }
}
```

### 2. Upload Image

Upload directly to `upload_url` (Supabase Storage):

```swift
// Swift
let imageData = image.jpegData(compressionQuality: 0.8)
var request = URLRequest(url: URL(string: uploadUrl)!)
request.httpMethod = "PUT"
request.httpBody = imageData
request.addValue("image/jpeg", forHTTPHeaderField: "Content-Type")
```

### 3. Confirm Upload

```
POST /v1/media/:listingId/confirm

{
  "path": "uploads/user_id/123456-photo.jpg",
  "is_primary": true
}
```

---

## Testing

### Test Environment

```
Base URL: http://localhost:8080
Docs: http://localhost:8080/docs
OpenAPI: http://localhost:8080/openapi.json
```

### Test Credentials

Get test tokens from Supabase:
1. Create test account in Supabase Dashboard
2. Use Supabase Auth SDK to get JWT token
3. Use token in API calls

---

## Support

- **API Docs**: http://localhost:8080/docs
- **OpenAPI Spec**: http://localhost:8080/openapi.json
- **Backend Team**: backend@rentify.com

---

## Quick Reference

### Required Headers

```
Content-Type: application/json
Authorization: Bearer <supabase-jwt-token>
```

### Common Patterns

#### Pagination
```
GET /v1/listings?limit=20&offset=40
```

#### Filtering
```
GET /v1/search?category=electronics&min_price=1000&max_price=10000
```

#### Sorting
```
GET /v1/search?sort=price_asc
```

---

## Next Steps

1. ✅ Download OpenAPI spec
2. ✅ Generate client SDK for your platform
3. ✅ Set up Supabase Auth in your app
4. ✅ Integrate API calls
5. ✅ Test with development server

---

**Questions?** Contact backend team or check the interactive docs at `/docs` 🚀
