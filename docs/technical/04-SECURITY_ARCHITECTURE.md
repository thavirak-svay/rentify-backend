# Rentify — Security & Trust Architecture

> How Rentify protects its users, their data, and their money.

---

## Security Principles

1. **Zero trust**: Every request is authenticated and authorized, even internal service calls
2. **Defense in depth**: Multiple layers of protection; no single point of failure
3. **Least privilege**: Every component has the minimum permissions needed
4. **Fail closed**: If a security check fails or is unavailable, deny access
5. **Log everything**: Every authentication attempt, permission check, and data access is logged
6. **Encrypt by default**: Data encrypted in transit (TLS 1.3) and at rest (AES-256)

---

## Authentication Architecture

### User Authentication Flow

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│  Client  │────▶│  API Gateway │────▶│  Auth Module │
│  (App)   │     │  (validates  │     │  (issues     │
│          │◀────│   JWT)       │◀────│   tokens)    │
└──────────┘     └──────────────┘     └──────────────┘
                                             │
                                             ▼
                                      ┌──────────────┐
                                      │  PostgreSQL  │
                                      │  (users,     │
                                      │   sessions)  │
                                      └──────────────┘
```

### Password Security

| Aspect         | Implementation                                                          |
| -------------- | ----------------------------------------------------------------------- |
| Hashing        | bcrypt with cost factor 12 (or Argon2id)                                |
| Minimum length | 8 characters                                                            |
| Complexity     | At least one uppercase, one lowercase, one digit                        |
| Breach check   | Check against Have I Been Pwned API on registration and password change |
| Rate limiting  | 5 failed login attempts → 15-minute lockout                             |
| Reset flow     | Time-limited token (1 hour) sent to verified email, single-use          |

### Token Security

| Token              | Type                        | TTL        | Storage                                     |
| ------------------ | --------------------------- | ---------- | ------------------------------------------- |
| Access token       | JWT (signed, not encrypted) | 1 hour     | Client memory only (never localStorage)     |
| Refresh token      | Opaque (random string)      | 30 days    | HttpOnly secure cookie + server-side record |
| Email verification | Opaque                      | 24 hours   | Database                                    |
| Password reset     | Opaque                      | 1 hour     | Database                                    |
| Phone OTP          | 6-digit numeric             | 10 minutes | Redis                                       |

### JWT Best Practices

```json
// Header
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "key-2026-02"  // Key rotation support
}

// Payload
{
  "sub": "usr_abc123",
  "roles": ["renter", "owner"],
  "iss": "https://api.rentify.com",
  "aud": "https://api.rentify.com",
  "iat": 1740000000,
  "exp": 1740003600,
  "jti": "unique-token-id"  // Revocation support
}
```

- **Sign with RS256** (asymmetric) — private key for signing, public key for verification
- **Rotate keys quarterly** — support multiple active `kid` values during rotation
- **Short expiry** — 1 hour max; use refresh tokens for extended sessions
- **Revocation** — maintain a small Redis set of revoked `jti` values (for forced logout)

---

## Authorization Model

### Role-Based Access Control (RBAC)

```
Roles:
  renter  → Can search, book, message, review
  owner   → All renter permissions + can list items/services
  admin   → All permissions + moderation + user management

Additional checks:
  Resource ownership → Only the owner of a listing can edit/delete it
  Booking party      → Only renter or owner of a booking can view/modify it
  Thread participant → Only thread participants can read/send messages
```

### Authorization Middleware

```
For every protected endpoint:
  1. Extract JWT from Authorization header
  2. Verify signature and expiry
  3. Check role matches endpoint requirement
  4. Check resource ownership (if applicable)
  5. Log the access attempt (success or failure)
  → If any step fails: return 401/403 and log
```

---

## Identity Verification (KYC)

### Flow

```
User                    Rentify                  KYC Provider (Onfido)
  │                        │                           │
  │  Submit ID doc + selfie│                           │
  │ ──────────────────────▶│                           │
  │                        │  Create check ───────────▶│
  │                        │                           │
  │                        │  Webhook: check.complete ◀│
  │                        │                           │
  │                        │  Update identity_status   │
  │ ◀──────────────────────│  Notify user              │
  │  "Verified!" / "Needs  │                           │
  │   more info"           │                           │
```

### Verification Levels

| Level                 | Requirements                             | Unlocks                                |
| --------------------- | ---------------------------------------- | -------------------------------------- |
| Level 0 (Unverified)  | Email confirmed                          | Browse, search, message                |
| Level 1 (Basic)       | Phone verified                           | Book items < $100/day                  |
| Level 2 (ID Verified) | Government ID + selfie                   | Book any item, list items              |
| Level 3 (Enhanced)    | ID + address verification + bank account | List high-value items, instant payouts |

### Data Handling for KYC

- **Never store** raw identity documents — only verification status and provider reference ID
- KYC provider retains documents per their policy; Rentify stores: `{ provider: "onfido", check_id: "...", status: "verified", verified_at: "..." }`
- Comply with data retention regulations (delete provider data after 5 years or as required by law)

---

## Payment Security

### PCI DSS Compliance

```
Rentify's approach: SAQ-A (fully outsourced)

  Card data NEVER touches Rentify's servers.
  All card handling is done via Stripe Elements (client-side tokenization).

  Flow:
  1. Client renders Stripe Elements card form
  2. Card data goes directly to Stripe (not our server)
  3. Stripe returns a payment_method_id token
  4. Our server uses the token to create charges via Stripe API
  5. We ONLY store: last 4 digits, card brand, expiry month/year
```

### Payment Flow Security

| Step                    | Security Measure                                                               |
| ----------------------- | ------------------------------------------------------------------------------ |
| Payment method creation | Client-side tokenization via Stripe Elements                                   |
| Charge creation         | Idempotency key required; prevents double charges                              |
| Authorization hold      | Hold amount on card at booking creation; capture on rental start               |
| Refund                  | Policy-based calculation as pure function; dual-approval for refunds > $500    |
| Payout                  | Only to verified Stripe Connect accounts; 48-hour hold after rental completion |
| Dispute                 | Chargeback evidence auto-assembled from booking data, messages, photos         |

### Fraud Detection

| Signal                             | Detection                                            | Action                             |
| ---------------------------------- | ---------------------------------------------------- | ---------------------------------- |
| Multiple accounts from same device | Device fingerprint tracking                          | Flag for manual review             |
| High-value first booking           | New account + booking > $200                         | Manual review + phone verification |
| Unusual velocity                   | >5 bookings in 24 hours from same account            | Rate limit + review                |
| Mismatched locations               | Booking location far from user's registered location | Soft warning, not block            |
| Chargeback pattern                 | >1 chargeback from same user                         | Suspend account, investigation     |
| Stolen card testing                | Multiple small charges in quick succession           | Block payment method               |

---

## Data Protection

### Encryption

| Data State               | Method                                                          |
| ------------------------ | --------------------------------------------------------------- |
| In transit               | TLS 1.3 (enforce HTTPS everywhere, HSTS headers)                |
| At rest (database)       | PostgreSQL TDE or AWS RDS encryption (AES-256)                  |
| At rest (object storage) | S3 server-side encryption (SSE-S3 or SSE-KMS)                   |
| Sensitive fields         | Application-level encryption for: messages, KYC data, addresses |

### PII Handling

| PII Field     | Storage                              | Access Control                                           |
| ------------- | ------------------------------------ | -------------------------------------------------------- |
| Email         | Plain (needed for login)             | User + admin only                                        |
| Phone         | Encrypted at rest                    | User + admin only                                        |
| Full name     | Plain                                | User + admin only; display_name for public               |
| Address       | Encrypted at rest                    | Shown only to booking counterparty during active booking |
| Government ID | NOT STORED (provider reference only) | Provider only                                            |
| Payment cards | NOT STORED (Stripe tokens)           | User sees last 4 via Stripe                              |
| Messages      | Encrypted at rest                    | Thread participants + admin (with audit log)             |

### Data Retention

| Data Type         | Retention Period             | Deletion Method                             |
| ----------------- | ---------------------------- | ------------------------------------------- |
| User accounts     | Until deletion request       | Anonymize (don't hard delete — audit trail) |
| Bookings          | 7 years (financial records)  | Anonymize after retention period            |
| Messages          | 2 years after thread closure | Hard delete                                 |
| Server logs       | 90 days                      | Auto-purge                                  |
| Analytics events  | 3 years                      | Anonymize after 1 year                      |
| KYC provider data | Per provider policy          | Request deletion via provider API           |

### GDPR / CCPA Compliance

| Right                  | Implementation                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| Right to access        | `GET /v1/users/me/data-export` → generates downloadable JSON of all user data within 48 hours        |
| Right to deletion      | `DELETE /v1/users/me` → anonymizes profile, cancels active bookings, triggers provider data deletion |
| Right to portability   | Data export in machine-readable JSON format                                                          |
| Right to rectification | `PATCH /v1/users/me` → update any personal information                                               |
| Consent management     | Granular opt-in for: marketing emails, push notifications, analytics tracking, data sharing          |
| Cookie consent         | Only essential cookies without consent; analytics/marketing cookies require opt-in                   |

---

## API Security

### Input Validation

```
Every endpoint validates:
  1. Content-Type header (reject anything that isn't application/json for JSON endpoints)
  2. Request body size (max 1MB for standard endpoints, 10MB for file uploads)
  3. Field types (strict schema validation — reject extra fields)
  4. String lengths (max lengths on all string fields)
  5. Number ranges (price >= 0, rating 1-5, etc.)
  6. SQL injection prevention (parameterized queries — NEVER string concatenation)
  7. XSS prevention (HTML sanitization on user-generated text fields)
```

### Rate Limiting & Abuse Prevention

| Tier             | Limit      | Window     | Scope          |
| ---------------- | ---------- | ---------- | -------------- |
| Global           | 1,000 req  | per minute | Per IP         |
| Authenticated    | 100 req    | per minute | Per user       |
| Login attempts   | 5 attempts | per 15 min | Per email + IP |
| Registration     | 3 accounts | per hour   | Per IP         |
| Search           | 30 req     | per minute | Per user       |
| Booking creation | 5 req      | per minute | Per user       |
| Message sending  | 20 req     | per minute | Per user       |

### Security Headers

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; script-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0  (rely on CSP instead)
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(self)
```

---

## Incident Response

### Severity Levels

| Level | Definition                  | Response Time     | Examples                                  |
| ----- | --------------------------- | ----------------- | ----------------------------------------- |
| SEV1  | Service down or data breach | 15 min            | API unreachable, database compromised     |
| SEV2  | Major feature broken        | 1 hour            | Payments failing, bookings not processing |
| SEV3  | Minor feature degraded      | 4 hours           | Search slow, notifications delayed        |
| SEV4  | Cosmetic or non-urgent      | Next business day | Minor UI bug, documentation error         |

### Security Incident Playbook

```
1. DETECT   → Alerting systems, user reports, security scanning
2. CONTAIN  → Isolate affected systems, revoke compromised credentials
3. ASSESS   → Determine scope: what data was accessed, who is affected
4. NOTIFY   → Affected users within 72 hours (GDPR requirement)
                Regulatory bodies if required
5. REMEDIATE → Fix the vulnerability, patch systems, rotate keys
6. REVIEW   → Post-incident review within 5 business days
                Document lessons learned, update procedures
```

---

## Security Audit Checklist (Quarterly)

```
□ Review and rotate all API keys and secrets
□ Audit user access permissions (remove stale admin accounts)
□ Review dependency vulnerabilities (npm audit, Snyk, Dependabot)
□ Test backup restoration procedure
□ Review rate limiting effectiveness
□ Scan for exposed secrets in codebase (truffleHog, git-secrets)
□ Review access logs for anomalies
□ Update TLS certificates if expiring within 90 days
□ Verify GDPR data deletion requests are processing correctly
□ Review and update security documentation
```
