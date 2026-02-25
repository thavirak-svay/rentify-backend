# Rentify — Risk Register & Mitigation Plan

> Every startup faces risks. The ones that survive are the ones that plan for them. This document maps the most dangerous risks to Rentify and provides concrete mitigation strategies.

---

## Risk Scoring

| Score | Probability    | Impact              |
| ----- | -------------- | ------------------- |
| 1     | Very unlikely  | Minor inconvenience |
| 2     | Unlikely       | Manageable setback  |
| 3     | Possible       | Significant damage  |
| 4     | Likely         | Severe damage       |
| 5     | Almost certain | Existential threat  |

**Risk level = Probability × Impact**

- 1–6: 🟢 Monitor
- 7–12: 🟡 Active mitigation required
- 13–25: 🔴 Critical — address before launch

---

## Marketplace & Business Risks

| #   | Risk                                                                 | Prob | Impact | Level | Mitigation                                                                                                     |
| --- | -------------------------------------------------------------------- | ---- | ------ | ----- | -------------------------------------------------------------------------------------------------------------- |
| B1  | **Cold start failure** — Can't build enough supply to attract demand | 4    | 5      | 🔴 20 | Start hyper-local (one category, one city). Seed supply personally. Don't spend on demand until 100+ listings. |
| B2  | **Low liquidity** — Renters search but don't find what they need     | 4    | 4      | 🔴 16 | Track search-to-result ratio. If <50% of searches return ≥3 results, focus on supply in those categories.      |
| B3  | **Supply churn** — Owners list once and never return                 | 3    | 4      | 🟡 12 | Proactive coaching, earnings celebrations, retention touchpoints. Track 90-day listing survival rate.          |
| B4  | **Wrong market timing** — Target users aren't ready for P2P rental   | 2    | 5      | 🟡 10 | Validate with 50 real bookings before scaling. Survey users on willingness to rent from strangers.             |
| B5  | **Unit economics don't work** — CAC or support cost too high         | 3    | 4      | 🟡 12 | Track cost per booking from Day 1. Kill unprofitable channels fast. Target organic growth over paid.           |
| B6  | **Competitor launches with more funding**                            | 3    | 3      | 🟡 9  | Move fast, build local network effects. Density in one city beats thin coverage in 50 cities.                  |
| B7  | **Can't raise follow-on funding**                                    | 3    | 4      | 🟡 12 | Build toward revenue milestones. Keep burn low. Have 6+ months runway before fundraising.                      |

---

## Trust & Safety Risks

| #   | Risk                                                                         | Prob | Impact | Level | Mitigation                                                                                                 |
| --- | ---------------------------------------------------------------------------- | ---- | ------ | ----- | ---------------------------------------------------------------------------------------------------------- |
| T1  | **Item theft** — Renter doesn't return an item                               | 3    | 4      | 🟡 12 | ID verification, deposit holds, escalation to authorities after 72 hours. Insurance protection plans.      |
| T2  | **Item damage** — Significant damage beyond normal wear                      | 3    | 3      | 🟡 9  | Pre- and post-rental condition documentation (photos). Protection plans. Clear damage policies.            |
| T3  | **Personal safety incident** — Harassment or violence during handoff/service | 1    | 5      | 🟢 5  | Verified identities, public handoff locations, in-app SOS feature (Phase 2), community guidelines.         |
| T4  | **Fraud rings** — Coordinated fake accounts for theft or scams               | 2    | 4      | 🟡 8  | Device fingerprinting, velocity checks on new accounts, manual review queue for high-value first bookings. |
| T5  | **Listing fraud** — Items listed that don't exist or don't match description | 2    | 3      | 🟢 6  | Photo review (automated + manual), first-booking verification, post-booking feedback loop.                 |
| T6  | **Data breach** — User PII or payment data exposed                           | 1    | 5      | 🟢 5  | Never store raw payment data (use Stripe). Encrypt PII at rest. Regular security audits.                   |
| T7  | **Viral safety incident** — One bad event goes viral on social media         | 2    | 5      | 🟡 10 | Rapid response plan (see below). Proactive safety measures. Insurance coverage.                            |

### Incident Response Plan (T7)

```
Hour 0: Incident reported
  → Immediately assign a dedicated responder (founder in Phase 1)
  → Ensure affected user(s) are safe and supported
  → Preserve all evidence (messages, booking data, photos)

Hour 1-4: Assessment
  → Determine facts — what happened, who was involved, what's the exposure
  → If criminal activity → cooperate with law enforcement
  → If media attention → prepare a brief, honest statement

Hour 4-24: Response
  → Contact affected users personally (phone call, not email)
  → If public → issue a transparent statement: what happened, what we're doing
  → Implement immediate safeguards to prevent recurrence

Week 1: Follow-up
  → Internal post-mortem: what failed, what we'll change
  → Communicate changes to the community
  → Update policies, product, or processes as needed
```

---

## Operational Risks

| #   | Risk                                                              | Prob | Impact | Level | Mitigation                                                                                           |
| --- | ----------------------------------------------------------------- | ---- | ------ | ----- | ---------------------------------------------------------------------------------------------------- |
| O1  | **Payment provider issues** (frozen account, compliance flag)     | 2    | 4      | 🟡 8  | Maintain relationship with Stripe. Keep a backup payment processor option identified.                |
| O2  | **Support overwhelm** — Volume exceeds capacity                   | 3    | 3      | 🟡 9  | Build self-serve resources early. Track tickets/booking ratio. Hire when consistently missing SLAs.  |
| O3  | **Key person risk** — Founder incapacitated or burns out          | 3    | 5      | 🔴 15 | Document everything. Co-founder or key hire who can take over core operations. Take breaks.          |
| O4  | **Insurance partner drops Rentify**                               | 2    | 3      | 🟢 6  | Maintain relationships with 2+ potential insurance partners. Negotiated contract with notice period. |
| O5  | **Platform dependency** (App Store rejection, Google API changes) | 2    | 3      | 🟢 6  | Follow App Store guidelines strictly. Progressive web app as a backup distribution channel.          |

---

## Legal & Regulatory Risks

| #   | Risk                                                                      | Prob | Impact | Level | Mitigation                                                                                                                  |
| --- | ------------------------------------------------------------------------- | ---- | ------ | ----- | --------------------------------------------------------------------------------------------------------------------------- |
| L1  | **Liability lawsuit** — User sues Rentify for injury/damage during rental | 2    | 4      | 🟡 8  | Strong TOS with liability limitations. General liability insurance for the business. Marketplace (not party) positioning.   |
| L2  | **Tax compliance** — Sales tax / GST collection obligations               | 3    | 3      | 🟡 9  | Research tax obligations per jurisdiction BEFORE launching there. Use Stripe Tax or similar automated solution.             |
| L3  | **Rental licensing laws** — Some cities require rental business licenses  | 2    | 3      | 🟢 6  | Research local regulations for each city pre-launch. Consult local legal counsel.                                           |
| L4  | **Privacy regulation violation** (GDPR, CCPA)                             | 2    | 4      | 🟡 8  | Privacy-by-design from Day 1. Privacy policy reviewed by counsel. Data minimization.                                        |
| L5  | **Worker classification** — Service providers classified as employees     | 2    | 4      | 🟡 8  | Ensure providers set own prices, hours, and methods. Mirror Uber/TaskRabbit independent contractor structure. Legal review. |
| L6  | **Intellectual property claim** — Brand/name conflict                     | 2    | 2      | 🟢 4  | Trademark search before launch. Register trademark early.                                                                   |

---

## Financial Risks

| #   | Risk                                                                             | Prob | Impact | Level | Mitigation                                                                                                        |
| --- | -------------------------------------------------------------------------------- | ---- | ------ | ----- | ----------------------------------------------------------------------------------------------------------------- |
| F1  | **Cash flow crunch** — Revenue doesn't cover burn                                | 4    | 4      | 🔴 16 | Keep monthly burn below $15K pre-seed. 18-month runway minimum after raising. Weekly cash burn tracking.          |
| F2  | **Fraud losses** — Chargebacks and fraudulent transactions                       | 2    | 3      | 🟢 6  | Stripe Radar for fraud detection. Hold deposits in escrow. Manual review for >$500 first transactions.            |
| F3  | **Insurance claims exceed reserves**                                             | 2    | 3      | 🟢 6  | Set aside 40% of protection plan revenue as claims reserve. Reinsurance from Day 1 of insurance offering.         |
| F4  | **Pricing wrong** — Take rate too high (kills supply) or too low (can't sustain) | 3    | 3      | 🟡 9  | Start at 18% blended, monitor supply growth and booking volume. Adjust quarterly. A/B test pricing in new cities. |

---

## Risk Review Cadence

| Frequency              | Action                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| **Weekly**             | Review open incidents and disputes. Check critical metrics (conversion, support volume). |
| **Monthly**            | Update risk scores based on new data. Review financial runway.                           |
| **Quarterly**          | Full risk register review. Add new risks. Archive resolved risks.                        |
| **After any incident** | Immediate post-mortem. Update mitigation for affected risks.                             |
