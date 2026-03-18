# Rentify — V2 Epics & Stories

> **Version**: 1.0
> **Last Updated**: 2026-03-18
> **Status**: Planning

---

## Epic 1: Real-time Messaging

**Goal**: Enable real-time message delivery without polling

### Stories

| ID | Story | Points | Status |
|----|-------|--------|--------|
| RT-001 | Set up WebSocket connection handler | 3 | Pending |
| RT-002 | Implement message broadcast to thread participants | 2 | Pending |
| RT-003 | Add connection presence tracking | 2 | Pending |
| RT-004 | Handle reconnection and message sync | 3 | Pending |
| RT-005 | Add typing indicator events | 1 | Pending |

### Technical Notes

- Use Supabase Realtime channels for WebSocket
- Fallback to polling if WebSocket unavailable
- Store messages in PostgreSQL, broadcast via Realtime

---

## Epic 2: Push Notifications

**Goal**: Notify users of important events via push

### Stories

| ID | Story | Points | Status |
|----|-------|--------|--------|
| PUSH-001 | Set up FCM/APNs integration | 3 | Pending |
| PUSH-002 | Store device tokens in database | 1 | Pending |
| PUSH-003 | Send notification on new message | 2 | Pending |
| PUSH-004 | Send notification on booking events | 2 | Pending |
| PUSH-005 | Implement notification preferences | 2 | Pending |

### Technical Notes

- Use Firebase Cloud Messaging for cross-platform
- Background handlers for iOS/Android
- Rate limit notifications per user

---

## Epic 3: Booking Enhancements

**Goal**: Improve booking flexibility and dispute handling

### Stories

| ID | Story | Points | Status |
|----|-------|--------|--------|
| BOOK-009 | Implement booking extension request flow | 3 | Pending |
| BOOK-010 | Add dispute creation and resolution | 5 | Pending |
| BOOK-011 | Build availability calendar view | 3 | Pending |
| BOOK-012 | Add booking reminders (24h before) | 2 | Pending |

### Technical Notes

- Extension creates child booking linked to original
- Dispute triggers admin notification
- Calendar stored as availability blocks in DB

---

## Epic 4: Admin Dashboard API

**Goal**: Enable admin operations via API

### Stories

| ID | Story | Points | Status |
|----|-------|--------|--------|
| ADM-001 | Create admin role and middleware | 2 | Pending |
| ADM-002 | Build admin booking list endpoint | 2 | Pending |
| ADM-003 | Build dispute resolution endpoints | 3 | Pending |
| ADM-004 | Add listing moderation endpoints | 3 | Pending |
| ADM-005 | Create admin analytics endpoints | 3 | Pending |

### Technical Notes

- Admin role stored in profiles table
- Separate middleware checks admin status
- All admin actions logged for audit

---

## Epic 5: Performance & Observability

**Goal**: Improve system reliability and monitoring

### Stories

| ID | Story | Points | Status |
|----|-------|--------|--------|
| PERF-001 | Add OpenTelemetry tracing | 3 | Pending |
| PERF-002 | Implement request correlation IDs | 2 | Pending |
| PERF-003 | Add business metrics endpoints | 2 | Pending |
| PERF-004 | Set up alerting for error rates | 2 | Pending |
| PERF-005 | Optimize slow queries with indexes | 3 | Pending |

### Technical Notes

- Use Sentry for error tracking (already integrated)
- Custom metrics via Cloudflare Analytics
- Query performance from Supabase dashboard

---

## Sprint Planning

### Sprint 1 (Week 1-2)
- RT-001, RT-002, RT-003 (Real-time messaging foundation)

### Sprint 2 (Week 3-4)
- PUSH-001, PUSH-002, PUSH-003 (Push notifications)

### Sprint 3 (Week 5-6)
- BOOK-009, BOOK-011 (Booking enhancements)

### Sprint 4 (Week 7-8)
- ADM-001, ADM-002, ADM-003 (Admin API)

---
*Stories follow BMAD story template with acceptance criteria.*