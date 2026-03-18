# Rentify — Product Brief

> **Version**: 1.0
> **Last Updated**: 2026-03-18
> **Status**: Validated

---

## Vision

**Make trust the default for peer-to-peer rentals in Cambodia and Southeast Asia.**

Rentify enables anyone to rent items they need or monetize items they own, with the safety and convenience of a trusted platform handling identity, payments, and disputes.

---

## Problem Statement

### For Renters

- **Ownership is expensive**: Buying a camera for one trip, a drill for one project, or a bike for a week doesn't make financial sense
- **No trust infrastructure**: Renting from strangers feels risky—scams, hidden fees, no recourse if something goes wrong
- **Fragmented market**: Finding rentals means searching Facebook groups, asking friends, or going without

### For Owners

- **Idle assets**: Cameras, tools, bikes sit unused 90% of the time
- **No easy way to monetize**: Listing on Facebook is manual, payments are awkward, scheduling is chaotic
- **Fear of damage**: "What if they break it?" prevents lending

---

## Target Users

### Primary: Cambodia Urban Renters (25-40)

- Tech-savvy, smartphone-first
- Value access over ownership
- Comfortable with digital payments (KHQR)
- Need: Cameras, bikes, event equipment, tools

### Secondary: Asset Owners (Side Income)

- Have items sitting idle
- Want passive income without hassle
- Semi-professional service providers (photographers, movers)

---

## Success Metrics

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Monthly Active Renters | 5,000 by month 6 | Demand-side health |
| Active Listings | 2,000 by month 6 | Supply-side health |
| Gross Booking Value | $50K/month by month 6 | Revenue potential |
| Booking Completion Rate | >95% | Trust metric |
| Net Promoter Score | >50 | User satisfaction |

---

## Core Value Propositions

### For Renters

1. **Access over ownership** — Use anything without the commitment
2. **Instant trust** — Verified identities, reviews, protection plans
3. **One-stop shop** — Items AND services in one place
4. **Fair pricing** — Total cost upfront, no hidden fees

### For Owners

1. **Passive income** — Idle assets earn money
2. **Zero customer acquisition cost** — Platform brings renters
3. **Trust infrastructure** — Verification, payments, insurance handled
4. **Professional tools** — Analytics, booking management, payouts

---

## Feature Scope

### V1 (Current - Complete)

| Feature | Status |
|---------|--------|
| Auth (Supabase) | ✅ Complete |
| Listing CRUD | ✅ Complete |
| Search (full-text + geo) | ✅ Complete |
| Media upload | ✅ Complete |
| Booking state machine | ✅ Complete |
| Pricing engine | ✅ Complete |
| ABA PayWay integration | ✅ Complete |
| Messaging (threads) | ✅ Complete |
| Reviews & ratings | ✅ Complete |
| Notifications | ✅ Complete |
| API Documentation | ✅ Complete |

### V2 (Next Milestone)

| Feature | Priority |
|---------|----------|
| Real-time messaging (WebSocket) | High |
| Push notifications | High |
| Availability calendar | Medium |
| Booking extensions | Medium |
| Dispute resolution flow | Medium |
| Admin dashboard | Low |

### V3 (Future)

| Feature | Priority |
|---------|----------|
| Stripe integration (international) | Medium |
| Delivery partner integration | Medium |
| Insurance/protection plans | High |
| Promoted listings | Low |
| Subscription tiers | Low |

---

## Out of Scope

- **Web frontend** — Mobile app only (Flutter)
- **International payments** — ABA PayWay only for V1
- **Logistics/delivery** — Peer-to-peer pickup/delivery only
- **B2B rentals** — Consumer marketplace only

---

## Revenue Model

| Stream | Take Rate | % of Revenue |
|--------|-----------|--------------|
| Renter service fee | 10-15% | ~60% |
| Owner commission | 5-8% | ~25% |
| Protection plans | 5-10% of rental | ~8% |
| Promoted listings | $2-50/day | ~5% |

**Blended take rate**: 15-23% of Gross Booking Value

---

## Competitive Landscape

| Competitor | Positioning | Rentify Advantage |
|------------|-------------|-------------------|
| Facebook Groups | Unorganized, no trust | Verified users, secure payments |
| OLX/Khmer24 | Classifieds, no booking | Full booking flow, payments |
| Traditional rental shops | Offline, limited selection | Digital, broader selection |
| Airbnb Experiences | Services only | Items + services unified |

---

## Go-to-Market Strategy

### Phase 1: Supply Seeding (Month 1-2)

- Partner with photography clubs, maker spaces
- Onboard 50 quality listers manually
- Focus on cameras and tools categories

### Phase 2: Demand Generation (Month 2-4)

- Google Ads for "rent camera", "hire photographer" queries
- Instagram/TikTok content showcasing listings
- Referral program: $10 credit both parties

### Phase 3: Marketplace Growth (Month 4-6)

- Expand categories based on demand signals
- Community partnerships (co-working spaces, events)
- User-generated content campaigns

---

## Key Assumptions to Validate

1. People will rent from strangers if trust infrastructure is strong
2. Protection plans will achieve 20%+ attach rate
3. Average order value will exceed $45
4. Owners will maintain active listings beyond month 1
5. One category can seed a marketplace

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Cold-start problem | High | Supply-first GTM, manual onboarding |
| Trust incidents | Critical | Verification, insurance, dispute process |
| Payment fraud | High | PayWay pre-auth, hold periods |
| Low retention | Medium | Re-engagement campaigns, notifications |
| Regulatory | Medium | Legal counsel, clear terms |

---
*This brief informs all PRD and architecture decisions.*