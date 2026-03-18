# Rentify — Product Requirements Document (PRD)

> **Version**: 1.0
> **Last Updated**: 2026-03-18
> **Status**: Implemented (V1 Complete)

---

## Executive Summary

Rentify is a peer-to-peer rental marketplace backend enabling users to rent items and services. This PRD covers the V1 implementation which is now complete, and outlines V2 requirements for the next milestone.

---

## User Stories by Domain

### Authentication & Identity

| ID | Story | Priority | Status |
|----|-------|----------|--------|
| AUTH-001 | As a new user, I can register with email and password | P0 | ✅ Done |
| AUTH-002 | As a returning user, I can login and receive a JWT token | P0 | ✅ Done |
| AUTH-003 | As a logged-in user, I can view and update my profile | P0 | ✅ Done |
| AUTH-004 | As a user, my profile is auto-created on first login | P1 | ✅ Done |

### Listings

| ID | Story | Priority | Status |
|----|-------|----------|--------|
| LIST-001 | As an owner, I can create a draft listing | P0 | ✅ Done |
| LIST-002 | As an owner, I can publish my listing | P0 | ✅ Done |
| LIST-003 | As an owner, I can update my listing | P0 | ✅ Done |
| LIST-004 | As an owner, I can archive my listing | P1 | ✅ Done |
| LIST-005 | As a renter, I can view listing details | P0 | ✅ Done |
| LIST-006 | As a renter, I can search listings by text | P0 | ✅ Done |
| LIST-007 | As a renter, I can filter by category, price, location | P1 | ✅ Done |
| LIST-008 | As an owner, I can upload photos via presigned URL | P0 | ✅ Done |

### Bookings

| ID | Story | Priority | Status |
|----|-------|----------|--------|
| BOOK-001 | As a renter, I can request a booking for dates | P0 | ✅ Done |
| BOOK-002 | As an owner, I can approve a booking request | P0 | ✅ Done |
| BOOK-003 | As an owner, I can decline a booking request | P0 | ✅ Done |
| BOOK-004 | As either party, I can cancel a booking | P0 | ✅ Done |
| BOOK-005 | As an owner, I can mark a booking as active (handoff) | P0 | ✅ Done |
| BOOK-006 | As an owner, I can complete a booking (return) | P0 | ✅ Done |
| BOOK-007 | As a system, I enforce valid state transitions | P0 | ✅ Done |
| BOOK-008 | As a renter, I see total price before confirming | P0 | ✅ Done |

### Payments

| ID | Story | Priority | Status |
|----|-------|----------|--------|
| PAY-001 | As a renter, I can pay via ABA PayWay KHQR | P0 | ✅ Done |
| PAY-002 | As a system, I verify PayWay callback signatures | P0 | ✅ Done |
| PAY-003 | As a system, I handle pre-auth for deposits | P0 | ✅ Done |
| PAY-004 | As a system, I capture payment on booking start | P0 | ✅ Done |
| PAY-005 | As a system, I process refunds on cancellation | P0 | ✅ Done |
| PAY-006 | As an owner, I receive payouts after completion | P1 | ✅ Done |

### Messaging

| ID | Story | Priority | Status |
|----|-------|----------|--------|
| MSG-001 | As a user, I can start a thread about a listing | P0 | ✅ Done |
| MSG-002 | As a user, I can send messages in a thread | P0 | ✅ Done |
| MSG-003 | As a user, I can list my threads | P0 | ✅ Done |
| MSG-004 | As a user, I can paginate through messages | P1 | ✅ Done |

### Reviews

| ID | Story | Priority | Status |
|----|-------|----------|--------|
| REV-001 | As a renter, I can review after completion | P0 | ✅ Done |
| REV-002 | As an owner, I can review the renter | P0 | ✅ Done |
| REV-003 | As a user, I can view reviews for a user | P0 | ✅ Done |
| REV-004 | As a system, I aggregate ratings automatically | P1 | ✅ Done |

### Notifications

| ID | Story | Priority | Status |
|----|-------|----------|--------|
| NOT-001 | As a user, I can view my notifications | P0 | ✅ Done |
| NOT-002 | As a user, I can mark notifications as read | P0 | ✅ Done |
| NOT-003 | As a system, I create notifications for key events | P0 | ✅ Done |

---

## Non-Functional Requirements

### Performance

| Requirement | Target | Status |
|-------------|--------|--------|
| API Response Time (p50) | < 100ms | ✅ |
| API Response Time (p99) | < 500ms | ✅ |
| Search Query Time | < 200ms | ✅ |

### Security

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Authentication | Supabase JWT | ✅ |
| Authorization | Row Level Security (RLS) | ✅ |
| Input Validation | Zod schemas | ✅ |
| Rate Limiting | 100 req/min general, 10 req/min writes | ✅ |
| Payment Security | PayWay hash verification | ✅ |

### Reliability

| Requirement | Target | Status |
|-------------|--------|--------|
| Uptime | 99.9% | ✅ (Cloudflare Workers) |
| Error Handling | All errors caught and logged | ✅ |
| Data Backup | Supabase managed | ✅ |

---

## API Design Standards

### URL Convention

- All endpoints prefixed with `/v1/`
- Resource-oriented: `/v1/listings/{id}`, `/v1/bookings/{id}`
- Nested resources: `/v1/bookings/{id}/transactions`

### Response Format

**Success:**
```json
{
  "data": { ... },
  "meta": { "cursor": "..." }
}
```

**Error:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [...]
  }
}
```

### Pagination

- Cursor-based pagination (no offset)
- `limit` parameter (max 50)
- `cursor` for next page

---

## V2 Requirements (Next Milestone)

### Real-time Features

| ID | Story | Priority |
|----|-------|----------|
| RT-001 | As a user, I receive messages in real-time | P0 |
| RT-002 | As a user, I see typing indicators | P2 |
| RT-003 | As a user, I receive push notifications | P0 |

### Booking Enhancements

| ID | Story | Priority |
|----|-------|----------|
| BOOK-009 | As a renter, I can request a booking extension | P1 |
| BOOK-010 | As a user, I can open a dispute | P1 |
| BOOK-011 | As a user, I can see availability calendar | P1 |

### Admin Features

| ID | Story | Priority |
|----|-------|----------|
| ADM-001 | As an admin, I can view all bookings | P1 |
| ADM-002 | As an admin, I can resolve disputes | P1 |
| ADM-003 | As an admin, I can moderate listings | P2 |

---
*This PRD is the source of truth for feature implementation.*