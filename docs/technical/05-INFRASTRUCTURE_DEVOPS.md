# Rentify — Infrastructure & DevOps Runbook

> Operational guide for deploying, monitoring, and maintaining Rentify's infrastructure.

---

## Infrastructure Overview

### Target Stack

| Component      | Service                                          | Environment    |
| -------------- | ------------------------------------------------ | -------------- |
| Compute        | Docker containers on Kubernetes (EKS/GKE)        | All            |
| Database       | Managed PostgreSQL (RDS/Cloud SQL)               | All            |
| Cache          | Managed Redis (ElastiCache/Memorystore)          | All            |
| Search         | Managed Elasticsearch (OpenSearch/Elastic Cloud) | Staging + Prod |
| Object Storage | S3 / GCS                                         | All            |
| CDN            | CloudFront / Cloudflare                          | Prod           |
| DNS            | Cloudflare or Route53                            | All            |
| CI/CD          | GitHub Actions                                   | All            |
| Monitoring     | Datadog or Grafana Cloud                         | All            |
| Error Tracking | Sentry                                           | All            |
| Secrets        | AWS Secrets Manager / Vault                      | All            |
| IaC            | Terraform                                        | All            |

### Phase 1 (MVP — Simplified)

Don't over-engineer infrastructure at launch. Start simple:

| Component      | MVP Choice                                         | Monthly Cost     |
| -------------- | -------------------------------------------------- | ---------------- |
| Compute        | Single VPS (Hetzner, DigitalOcean) or Railway      | $20–50           |
| Database       | Managed PostgreSQL (Supabase free tier or Neon)    | $0–25            |
| Cache          | Redis via Upstash (free tier)                      | $0               |
| Search         | PostgreSQL full-text search (no Elasticsearch yet) | $0               |
| Object Storage | S3 or Cloudflare R2                                | $5               |
| Email          | SendGrid free tier (100/day)                       | $0               |
| Monitoring     | Better Stack (free tier) + Sentry (free tier)      | $0               |
| **Total**      |                                                    | **$25–80/month** |

---

## Environment Setup

### Environments

| Environment | Purpose                | URL                             |
| ----------- | ---------------------- | ------------------------------- |
| Local       | Development            | http://localhost:8080           |
| Staging     | Pre-production testing | https://api.staging.rentify.com |
| Production  | Live users             | https://api.rentify.com         |

### Environment Variables

```bash
# Application
APP_ENV=production          # local, staging, production
APP_PORT=8080
APP_SECRET_KEY=<random-64-char>

# Database
DATABASE_URL=postgresql://user:pass@host:5432/rentify
DATABASE_POOL_SIZE=20
DATABASE_SSL=true

# Redis
REDIS_URL=redis://host:6379
REDIS_PASSWORD=<secret>

# Storage
S3_BUCKET=rentify-media-prod
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_CLIENT_ID=ca_...

# Auth
JWT_PRIVATE_KEY_PATH=/secrets/jwt-private.pem
JWT_PUBLIC_KEY_PATH=/secrets/jwt-public.pem
JWT_EXPIRY_SECONDS=3600

# KYC
ONFIDO_API_KEY=<key>
ONFIDO_WEBHOOK_SECRET=<secret>

# Email
SENDGRID_API_KEY=<key>
FROM_EMAIL=hello@rentify.com

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
```

**Rules:**

- Never commit secrets to Git
- Use environment-specific `.env` files for local development (add `.env` to `.gitignore`)
- Use a secrets manager for staging/production
- Rotate all secrets quarterly

---

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: rentify_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports: ["5432:5432"]
      redis:
        image: redis:7
        ports: ["6379:6379"]

    steps:
      - uses: actions/checkout@v4
      - name: Setup runtime
        # Language-specific setup
      - name: Install dependencies
        run: # package install
      - name: Run linter
        run: # lint command
      - name: Run unit tests
        run: # test command
      - name: Run integration tests
        run: # integration test command
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/rentify_test

  build:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker image
        run: docker build -t rentify-api:${{ github.sha }} .
      - name: Push to registry
        run: # push to ECR/GCR/GHCR

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to staging
        run: # deploy command (kubectl apply, railway deploy, etc.)
      - name: Run smoke tests
        run: # basic health checks against staging

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production # Requires manual approval
    steps:
      - name: Deploy to production
        run: # deploy command
      - name: Run smoke tests
        run: # health checks against production
      - name: Notify on success
        run: # Slack/Discord notification
```

### Deployment Strategy

| Strategy                    | When to Use                                                          |
| --------------------------- | -------------------------------------------------------------------- |
| **Direct deploy** (Phase 1) | Single server, low traffic, fast rollback via previous Docker image  |
| **Blue-green** (Phase 2)    | Two identical environments; switch traffic after health check passes |
| **Canary** (Phase 3)        | Route 5% of traffic to new version; promote if metrics are stable    |

### Rollback Procedure

```
1. Identify the issue (monitoring alert, user report, smoke test failure)
2. Revert to previous Docker image:
   kubectl set image deployment/api api=rentify-api:<previous-sha>
3. Verify health checks pass
4. Investigate root cause
5. Fix, test, and redeploy through normal pipeline
```

---

## Monitoring & Alerting

### Key Dashboards

#### System Health

| Metric               | Source            | Normal       | Alert Threshold |
| -------------------- | ----------------- | ------------ | --------------- |
| CPU utilization      | Container metrics | <60%         | >80% for 5 min  |
| Memory utilization   | Container metrics | <70%         | >85% for 5 min  |
| Disk usage           | Server metrics    | <70%         | >85%            |
| Database connections | PostgreSQL        | <80% of pool | >90% of pool    |
| Redis memory         | Redis INFO        | <70% of max  | >85% of max     |

#### API Performance

| Metric             | Source         | Normal         | Alert Threshold       |
| ------------------ | -------------- | -------------- | --------------------- |
| Request rate (RPS) | API logs / APM | Baseline ± 50% | >2x or <0.5x baseline |
| p50 latency        | APM            | <100ms         | >200ms                |
| p99 latency        | APM            | <500ms         | >1000ms               |
| Error rate (5xx)   | API logs       | <0.1%          | >1%                   |
| Error rate (4xx)   | API logs       | <5%            | >15%                  |

#### Business Health

| Metric                  | Source           | Alert Condition                              |
| ----------------------- | ---------------- | -------------------------------------------- |
| Bookings per hour       | Database         | Drop to 0 for >2 hours during business hours |
| Payment success rate    | Stripe dashboard | <95%                                         |
| Search zero-result rate | App logs         | >30%                                         |
| Signup rate             | Database         | Drop to 0 for >4 hours                       |

### Alerting Rules

| Severity        | Notification             | Response                 |
| --------------- | ------------------------ | ------------------------ |
| Critical (SEV1) | Phone call + SMS + Slack | Acknowledge in 15 min    |
| High (SEV2)     | Slack + email            | Acknowledge in 1 hour    |
| Warning (SEV3)  | Slack                    | Review next business day |
| Info            | Dashboard only           | Weekly review            |

### Structured Logging

```json
{
  "timestamp": "2026-02-25T09:00:00.000Z",
  "level": "INFO",
  "message": "Booking created",
  "trace_id": "abc123",
  "span_id": "def456",
  "user_id": "usr_789",
  "booking_id": "bkg_012",
  "listing_id": "lst_345",
  "duration_ms": 145,
  "http_method": "POST",
  "http_path": "/v1/bookings",
  "http_status": 201
}
```

**Rules:**

- Always include `trace_id` for request correlation
- Always include relevant entity IDs
- Never log PII (email, phone, addresses) — log user_id instead
- Log at appropriate levels: DEBUG for development, INFO for normal operations, WARN for recoverable issues, ERROR for failures

---

## Database Operations

### Backup Strategy

| Type                   | Frequency         | Retention | Method                |
| ---------------------- | ----------------- | --------- | --------------------- |
| Automated snapshots    | Daily             | 30 days   | Managed service (RDS) |
| Point-in-time recovery | Continuous        | 7 days    | WAL archiving         |
| Manual backup          | Before migrations | 90 days   | pg_dump to S3         |

### Backup Verification

- **Monthly**: Restore a backup to a test environment and run read queries
- **Quarterly**: Full disaster recovery drill (restore from backup, verify data integrity)

### Database Maintenance

```
Weekly:
  □ Check slow query log — optimize any query >500ms
  □ Review connection pool usage
  □ Check disk usage trends

Monthly:
  □ Run VACUUM ANALYZE on high-write tables (bookings, messages, transactions)
  □ Review index usage — drop unused indexes
  □ Check for table bloat
  □ Review and update query performance baselines

Before migrations:
  □ Take manual backup
  □ Test migration on staging with production-like data
  □ Schedule maintenance window if migration requires locks
  □ Prepare rollback script
```

---

## Disaster Recovery

### Recovery Targets

| Metric                         | Target                      |
| ------------------------------ | --------------------------- |
| Recovery Point Objective (RPO) | 0 (synchronous replication) |
| Recovery Time Objective (RTO)  | <15 minutes                 |

### Failure Scenarios

| Scenario                 | Recovery                                                               |
| ------------------------ | ---------------------------------------------------------------------- |
| Application server crash | Auto-restart via Kubernetes; load balancer routes to healthy instances |
| Database failover        | Managed service handles automatic failover to replica (<30s)           |
| Cache failure            | Application falls back to database (slower but functional)             |
| Search engine down       | Degrade to PostgreSQL full-text search                                 |
| Payment provider outage  | Queue payment operations; retry when Stripe recovers                   |
| DNS failure              | Cloudflare provides resilience; secondary DNS provider as backup       |
| Full region outage       | Cross-region database replica; DNS failover to backup region           |

### Runbook: Complete Outage Recovery

```
1. Identify scope (which services are affected?)
2. Check status pages: AWS/GCP, Stripe, Cloudflare, Sentry
3. If infrastructure issue:
   a. Failover database to replica
   b. Scale up/restart application servers
   c. Verify health checks
4. If code issue:
   a. Rollback to last known good deployment
   b. Verify health checks
5. Communicate status to users (status page, Twitter, email for active bookings)
6. Post-incident:
   a. Timeline of events
   b. Root cause analysis
   c. Action items to prevent recurrence
```
