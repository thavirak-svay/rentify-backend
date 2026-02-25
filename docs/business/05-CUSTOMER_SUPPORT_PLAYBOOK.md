# Rentify — Customer Support Playbook

> How to deliver outstanding support with minimal resources, from Day 1 through scale.

---

## Support Philosophy

1. **Every support ticket is a product bug.** If a user needs to contact support, something in the product failed them. Fix the root cause, not just the ticket.
2. **Speed matters more than perfection.** A fast, honest "I'm looking into this" beats a slow, perfect resolution.
3. **Both sides are your customer.** Never bias toward renters or owners. Fairness builds trust.
4. **Tone = brand.** Support is where users form their deepest opinions about Rentify. Be warm, clear, and human.

---

## Phase 1: Founder-Led Support (0–500 bookings/month)

**You** are customer support. This is not a delegation problem to solve — this is a learning opportunity.

### Setup

- **Email**: support@rentify.com (use a shared inbox like Missive or Front)
- **In-app chat**: Simple form that sends to the same inbox
- **Phone**: Your personal number (optional, but powerful for trust)
- **Hours**: Respond within 4 hours during 8am–10pm local time

### What You'll Learn

- Which parts of the flow confuse users
- What questions repeat (→ build FAQ)
- Where trust breaks down
- What disputes look like
- How users actually describe their problems (→ use their language in the product)

### Daily Routine

```
Morning (9am):
  1. Check inbox — respond to anything from last night
  2. Check for active bookings with issues (late returns, pending disputes)
  3. Scan new listings for quality issues

Midday (1pm):
  4. Follow up on open tickets
  5. Log patterns in a simple spreadsheet

Evening (7pm):
  6. Final inbox check
  7. Respond to urgent issues
```

---

## Phase 2: Structured Support (500–5,000 bookings/month)

### Team

- Hire first support agent (part-time or contractor)
- Founder reviews escalations and writes macros

### Tool Stack

| Tool          | Purpose                              | Budget Option                                   |
| ------------- | ------------------------------------ | ----------------------------------------------- |
| Help desk     | Ticket management, macros, reporting | Freshdesk Free / Zendesk Starter ($19/agent/mo) |
| Help center   | Self-serve FAQ / knowledge base      | Notion (free) or help desk's built-in           |
| Chat          | In-app messaging                     | Intercom (startup plan) or Crisp (free tier)    |
| Internal docs | Runbooks, escalation procedures      | Notion or Google Docs                           |

### Ticket Categories & SLAs

| Category                                                | Priority | First Response | Resolution Target |
| ------------------------------------------------------- | -------- | -------------- | ----------------- |
| **Booking issue** (can't book, payment failing)         | High     | 1 hour         | 4 hours           |
| **Active rental problem** (late return, damage, safety) | Urgent   | 30 min         | 2 hours           |
| **Dispute / claim**                                     | High     | 2 hours        | 48 hours          |
| **Account issue** (login, verification, settings)       | Medium   | 4 hours        | 24 hours          |
| **General question** (how-to, pricing, policies)        | Low      | 8 hours        | 24 hours          |
| **Feature request / feedback**                          | Low      | 24 hours       | Acknowledged only |

### Response Templates (Macros)

**Booking confirmation issue:**

```
Hi [Name],

Thanks for reaching out! I can see the issue with your booking for [listing].

[Specific resolution or next step]

If you have any questions, just reply here — I'm happy to help.

Best,
[Agent name] / Rentify Support
```

**Dispute opened:**

```
Hi [Name],

I've received your report about [issue] with your [booking/rental] of [listing].

Here's what happens next:
1. I've notified the other party and asked them to respond within 48 hours
2. Both of you can submit photos and details via this thread
3. I'll review everything and work toward a fair resolution

In the meantime, [any immediate action — e.g., "your deposit is being held securely"].

I know this is frustrating — I'll keep you updated every step of the way.

Best,
[Agent name]
```

**Late return (to renter):**

```
Hi [Name],

I noticed that [item] from your rental with [owner] was due back at [time] and hasn't been returned yet.

Please return the item as soon as possible. Per our late return policy:
• 1–4 hours late: [hourly rate × 1.5]
• 4–24 hours late: Additional day charged
• 24+ hours: Daily rate + $25/day late fee

If there's an issue preventing return, please let me know immediately so I can help coordinate.

Best,
[Agent name]
```

---

## Self-Serve Resources (Build Early)

### FAQ Topics (Top 10 — These Will Cover 60% of Tickets)

| #   | Question                                          | Who Asks |
| --- | ------------------------------------------------- | -------- |
| 1   | How does payment work? When am I charged?         | Renters  |
| 2   | What if the item is damaged?                      | Both     |
| 3   | How do I cancel a booking? What's the refund?     | Renters  |
| 4   | How do I get paid? When do payouts arrive?        | Owners   |
| 5   | What is the protection plan and should I buy it?  | Renters  |
| 6   | How do deposits work?                             | Both     |
| 7   | What if the renter doesn't return my item?        | Owners   |
| 8   | How do I verify my identity?                      | Both     |
| 9   | Can I extend my rental?                           | Renters  |
| 10  | How do I improve my listing to get more bookings? | Owners   |

**Rule**: Every time you answer the same question 3 times, write an FAQ article and add it to the help center.

---

## Dispute Resolution Framework

### Principles

- **Neutral**: Rentify is an impartial mediator, not an advocate for either side
- **Evidence-based**: Decisions based on photos, timestamps, messages, and policies — not emotions
- **Fast**: Aim for resolution within 48 hours
- **Fair**: Apply policies consistently — no special treatment

### Dispute Types & Resolution Paths

#### Item Returned Damaged

```
1. Renter or owner reports damage within 24 hours of return
2. Both parties asked to submit:
   - Photos of the item (before + after if available)
   - Description of the damage
   - Estimated repair/replacement cost
3. Rentify reviews:
   - Does the listing mention pre-existing wear?
   - Was there a checkout condition check?
   - Does the protection plan cover this?
4. Resolution options:
   a. Protection plan covers it → process insurance claim
   b. No protection plan → deduct from deposit
   c. Damage exceeds deposit → owner can request additional payment
   d. Dispute over fault → Rentify makes a judgment call, erring on the side of the most documented party
```

#### Item Not As Described

```
1. Renter reports within 4 hours of receiving item
2. Ask for photos comparing listing vs. actual item
3. If clearly misrepresented:
   a. Full refund to renter
   b. Warning to owner (first offense)
   c. Listing suspension (repeat offense)
4. If ambiguous:
   a. Partial refund (50%) or offer alternative resolution
```

#### No-Show (Either Party)

```
Owner no-show (item not available at agreed time):
  → Full refund to renter
  → Strike on owner's account
  → $25 compensation credit to renter (after 30 min wait)

Renter no-show (doesn't pick up / isn't available for delivery):
  → Owner keeps 50% of rental fee
  → Renter charged cancellation per policy
```

### Escalation Path

```
Level 1: Automated (reminder emails, policy-based auto-resolution)
    ↓ (if unresolved after 24 hours)
Level 2: Support agent (manual review, mediation)
    ↓ (if disputed by either party)
Level 3: Founder review (final decision)
    ↓ (if legal threat or safety concern)
Level 4: Legal counsel
```

---

## Quality Metrics to Track

| Metric                          | Target    | How to Measure                      |
| ------------------------------- | --------- | ----------------------------------- |
| First response time             | <2 hours  | Help desk analytics                 |
| Resolution time                 | <24 hours | Help desk analytics                 |
| Customer satisfaction (CSAT)    | >4.5/5    | Post-resolution survey              |
| Tickets per 100 bookings        | <8        | Ticket count / booking count        |
| Self-serve deflection rate      | >50%      | Help center views / total tickets   |
| Dispute resolution satisfaction | >80% fair | Post-dispute survey                 |
| Repeat contact rate             | <15%      | Same user, same issue within 7 days |

---

## When to Hire Support Help

| Signal                                            | Action                                   |
| ------------------------------------------------- | ---------------------------------------- |
| Consistently missing 4-hour SLA                   | Hire part-time agent                     |
| >50 tickets/week                                  | Hire full-time agent                     |
| Disputes taking >48 hours                         | Hire dedicated trust & safety person     |
| Same questions repeated 10+ times/week            | Build better self-serve, improve product |
| Support is preventing you from working on product | You waited too long — hire now           |
