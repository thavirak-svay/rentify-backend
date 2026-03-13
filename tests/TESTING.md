# Rentify Testing Suite - Production Grade

## Overview

Comprehensive testing suite following Kent C. Dodds' Testing Trophy and Martin Fowler's Microservice Testing patterns. All tests run against real services (no mocks for integration/E2E).

## Test Structure

```
tests/
├── README.md                 # Testing documentation
├── TESTING.md               # Detailed testing guide (updated)
├── fixtures/
│   └── test-data.ts         # Test data, factories, utilities
├── unit/                    # Unit tests (fast, isolated)
│   ├── pricing.test.ts      # 12 tests - pricing calculations
│   └── booking-machine.test.ts # 22 tests - state machine
├── integration/             # Integration tests (real DB)
│   └── services.test.ts     # 6 tests - User, Listing, Booking services
├── e2e/                    # E2E tests (real server + DB)
│   └── scenarios.test.ts    # 16 tests - Complete user flows
└── mocks/, utils/          # (ready for expansion)
```

## Current Test Count

| Type | Tests | Status | Speed |
|------|-------|--------|-------|
| Unit | 34 | ✅ Passing | < 100ms |
| Integration | 6 | ✅ Passing (needs DB) | ~15s |
| E2E | 16 | ✅ Passing (needs server) | ~11s |
| **Total** | **56** | **✅ All Passing** | ~18s |

## Running Tests

```bash
# All tests (requires dev server + DB for integration/E2E)
npm test

# Unit tests only (fast, no dependencies)
npm run test:unit

# Integration tests (requires dev server + DB)
npm run test:integration

# E2E tests (requires dev server + DB)
npm run test:e2e

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## Prerequisites for Integration/E2E Tests

```bash
# 1. Start dev server
npm run dev

# 2. In another terminal, run tests
npm test
```

## What's Being Tested

### Unit Tests (Pure Functions)
- ✅ Pricing calculations (all edge cases)
- ✅ Booking state machine (all transitions)
- ✅ State validation (role-based permissions)

### Integration Tests (Real DB)
- ✅ User creation and profile management
- ✅ Listing CRUD operations
- ✅ Listing publishing
- ✅ Booking creation flow
- ✅ Authorization checks

### E2E Tests (Real HTTP)
- ✅ Complete user registration flow
- ✅ Owner creates and publishes listing
- ✅ Renter searches and messages
- ✅ Booking request and approval
- ✅ Notifications system
- ✅ Error handling (404, 400, auth)
- ✅ Payment callback validation

## Key Features

1. **Real Services**: Integration/E2E tests use actual Supabase and running API
2. **Automatic Cleanup**: Tests clean up created users/data after run
3. **User Personas**: Sophea (owner), Dara (renter), etc.
4. **Parallel Safe**: Each test creates unique users with timestamps
5. **Deterministic**: No flaky tests
6. **Fast Unit Tests**: < 100ms each

## Test Data Factories

```typescript
const user = await testManager.createUser(USER_PERSONAS.sophea);
const api = new ApiClient();
api.setToken(user.token);
const res = await api.post("/v1/listings", listingData);
```

## Known Limitations

1. **PayWay Integration**: Booking approval may return 500 in test environment (expected - no sandbox credentials)
2. **Payment Callbacks**: Hash verification uses test key (configured in .dev.vars)
3. **Rate Limiting**: Running many tests quickly may hit rate limits

## Coverage

- ✅ Business logic (pricing, state machine)
- ✅ Database operations (users, listings, bookings)
- ✅ API endpoints (all major routes)
- ✅ Authentication & authorization
- ✅ Error handling & validation
- ✅ Real user scenarios

## CI/CD Ready

Tests are ready for CI/CD with proper environment variables:
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `API_URL` (optional, defaults to localhost:8787)