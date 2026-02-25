# Rentify — Founder's Operating Manual

> A practical guide for running Rentify day-to-day as a first-time founder. Covers rituals, decision frameworks, metrics dashboards, and the mental models you need to build a marketplace from scratch.

---

## Daily Routine (Phase 1)

When you're pre-revenue and pre-team, your time is your only resource. Protect it.

### Daily Schedule Template

| Time        | Block        | Activity                                                            |
| ----------- | ------------ | ------------------------------------------------------------------- |
| 8:00–8:30   | ☀️ Dashboard | Check yesterday's metrics (see below). Identify anything broken.    |
| 8:30–9:00   | 📬 Support   | Clear inbox. Respond to all user messages.                          |
| 9:00–12:00  | 🔨 Build     | Product development or content creation. NO meetings in this block. |
| 12:00–13:00 | 🍽️ Break     | Actual break. Walk. Eat. Don't check Slack.                         |
| 13:00–14:00 | 📣 Supply    | Direct outreach to potential listers (10 messages/day).             |
| 14:00–15:00 | 📊 Analysis  | Dig into one metric or user behavior question.                      |
| 15:00–16:00 | 🤝 Meetings  | Any calls, partnerships, investor conversations.                    |
| 16:00–17:00 | 📬 Support   | Second inbox sweep. Close open tickets.                             |
| 17:00–17:30 | 📝 Journal   | Write down what you learned today (see Learning Log).               |

### The Three Numbers to Know Every Morning

```
1. New bookings (yesterday)
2. New listings (yesterday)
3. Open support tickets (right now)
```

If you know nothing else, know these three numbers. They tell you if the marketplace is getting healthier or sicker.

---

## Weekly Rituals

### Monday: Weekly Planning (30 min)

```
Review:
  □ Last week's top 3 priorities — did they get done?
  □ Key metrics vs. targets (see dashboard below)
  □ Biggest user complaint this week
  □ Cash position and burn rate

Set:
  □ This week's top 3 priorities (maximum 3, ruthlessly prioritized)
  □ One thing to stop doing (cut distractions)
  □ One thing to learn (from users, data, or competitors)
```

### Friday: Weekly Review (30 min)

```
Reflect:
  □ What worked well this week?
  □ What didn't work? Why?
  □ Did I spend time on the right things?
  □ Am I building what users actually want, or what I think they want?

Document:
  □ Update key metrics in the tracking spreadsheet
  □ Write a brief weekly update (for investors, advisors, or your future self)
```

### Weekly Update Template (for Investors / Advisors)

```
Subject: Rentify Weekly Update — Week of [Date]

📊 Key Numbers:
  • GBV this week: $[X] (↑/↓ [%] from last week)
  • New bookings: [X]
  • New listings: [X]
  • Active listings: [X]

✅ Wins:
  • [1-2 sentence highlight]

🚧 Challenges:
  • [1-2 sentence challenge]

🎯 Next Week Focus:
  • [Top 3 priorities]

💰 Cash:
  • Runway: [X] months at current burn
  • Monthly burn: $[X]

🙏 Asks:
  • [Any help needed from investors/advisors — introductions, advice, etc.]
```

---

## Monthly Rituals

### Month-End Review (2 hours)

```
1. Financial Review (30 min)
   □ Revenue vs. plan
   □ Burn rate vs. budget
   □ Cash position and runway
   □ Cost per acquisition by channel

2. Metrics Deep Dive (30 min)
   □ Funnel conversion rates (signup → listing or booking)
   □ Retention cohorts (30-day, 60-day, 90-day)
   □ Supply health (new listings, churned listings, quality scores)
   □ Demand health (search volume, conversion, repeat rate)

3. User Research (30 min)
   □ Review all support tickets — pattern recognition
   □ Call 3 users (mix of renters, owners, churned users)
   □ Update user personas if needed

4. Roadmap Check (30 min)
   □ Is the roadmap still the right roadmap?
   □ Re-prioritize backlog based on new learnings
   □ Cut anything that doesn't serve the current phase
```

---

## Decision-Making Frameworks

### Framework 1: The One-Way / Two-Way Door

> From Jeff Bezos. Determines how much deliberation a decision deserves.

| Door Type        | Definition                             | How to Decide                         | Examples                                           |
| ---------------- | -------------------------------------- | ------------------------------------- | -------------------------------------------------- |
| **One-way door** | Irreversible or very expensive to undo | Deliberate. Gather data. Sleep on it. | Choosing a market, pricing model, legal structure  |
| **Two-way door** | Easily reversible                      | Decide fast. Try it. Fix it if wrong. | UI changes, marketing copy, new feature experiment |

**Default**: Treat most decisions as two-way doors. Marketplace speed matters more than perfection.

### Framework 2: ICE Scoring for Feature Prioritization

| Factor         | Score 1-10                            | Ask Yourself                                                    |
| -------------- | ------------------------------------- | --------------------------------------------------------------- |
| **Impact**     | How much will this move the needle?   | Will this measurably improve a key metric?                      |
| **Confidence** | How confident am I that it will work? | Is there evidence (data, user feedback, competitor validation)? |
| **Ease**       | How easy/fast is this to implement?   | Can I ship it this week?                                        |

**ICE Score = (Impact + Confidence + Ease) / 3**

Sort by ICE score. Do the highest first.

### Framework 3: The 5 Whys (Root Cause Analysis)

When something goes wrong, ask "Why?" five times:

```
Problem: Bookings dropped 30% this week
  Why? → Fewer searches
  Why? → Fewer users visiting the app
  Why? → Google Ads budget ran out mid-week
  Why? → Budget wasn't monitored
  Why? → No automated alert set up

Root cause: No monitoring on marketing spend
Fix: Set up budget alerts + daily spend check
```

### Framework 4: Focus Questions for Each Phase

**Phase 1 (0–100 bookings): Ask yourself daily:**

- "Am I talking to users enough?" (Target: 3+ conversations/week)
- "Is supply growing?" (Target: 5+ new listings/week)
- "Can someone complete a booking without my help?"

**Phase 2 (100–1,000 bookings): Ask yourself weekly:**

- "Are users coming back?" (Repeat rate trend)
- "Is the marketplace balancing?" (Supply/demand ratio)
- "What's the #1 reason I'm losing users?"

**Phase 3 (1,000+ bookings): Ask yourself monthly:**

- "Are unit economics improving with scale?"
- "What's my strongest acquisition channel?"
- "When should I raise the next round?"

---

## Metrics Dashboard

### Dashboard 1: Daily Pulse (Check Every Morning)

| Metric                   | Source                  | How to Calculate              |
| ------------------------ | ----------------------- | ----------------------------- |
| New bookings (yesterday) | Database / Stripe       | Count of bookings created     |
| New listings (yesterday) | Database                | Count of listings published   |
| GBV (yesterday)          | Stripe                  | Sum of booking totals         |
| Open support tickets     | Help desk               | Ticket count with status=open |
| App crashes / errors     | Sentry / error tracking | Error count                   |

### Dashboard 2: Weekly Health (Check Every Monday)

| Metric                          | Target      | Warning                    |
| ------------------------------- | ----------- | -------------------------- |
| Search-to-book conversion       | >5%         | <3%                        |
| Listing-to-first-booking time   | <14 days    | >30 days                   |
| Owner response rate (within 4h) | >80%        | <60%                       |
| Booking cancellation rate       | <10%        | >15%                       |
| New signups                     | Growing WoW | Declining 2 weeks in a row |
| Tickets per 100 bookings        | <8          | >12                        |

### Dashboard 3: Monthly Strategic (Check Month-End)

| Metric                       | Target     | Warning   |
| ---------------------------- | ---------- | --------- |
| GBV growth (MoM)             | >15%       | <5%       |
| Repeat booking rate (30-day) | >25%       | <15%      |
| Supply retention (90-day)    | >60%       | <40%      |
| CAC (blended)                | <$15       | >$25      |
| Average order value          | >$40       | <$25      |
| NPS                          | >40        | <20       |
| Cash runway                  | >12 months | <6 months |

---

## Financial Management for First-Time Founders

### Startup Banking Setup

```
1. Business checking account (Mercury, Brex, or local bank)
2. Separate savings account for tax reserves (set aside 25% of revenue)
3. Business credit card for expenses (earn points on ad spend)
4. Stripe account for payments (connect to business checking)
5. Bookkeeping tool (Wave — free, or QuickBooks Online)
```

### Monthly Financial Checklist

```
□ Categorize all transactions in bookkeeping tool
□ Reconcile Stripe payouts with bank deposits
□ Review burn rate vs. budget
□ Update runway projection
□ Check for unusual charges or fraud
□ Set aside tax reserves (if applicable)
□ Update investor-ready financial summary
```

### Cash Management Rules

1. **Never let runway drop below 6 months.** Start fundraising when you have 9+ months.
2. **Separate operating funds from reserves.** Don't touch tax reserves or emergency fund.
3. **Track burn rate weekly.** A surprise $5K expense is painful at $15K/month burn.
4. **Delay non-essential expenses.** You don't need a fancy office, design agency, or premium tools yet.
5. **Pay yourself.** A sustainable salary (even modest) prevents burnout and demonstrates to investors that you're in it for the long haul.

---

## Common First-Time Founder Mistakes (and How to Avoid Them)

| Mistake                         | Why It Happens                               | What to Do Instead                                                               |
| ------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------- |
| Building too many features      | "If I add one more thing, users will come"   | Ship the minimum lovable product. Iterate based on feedback.                     |
| Not talking to users            | Afraid of rejection or negative feedback     | Schedule 3 user calls every week. Ask open-ended questions. Listen.              |
| Scaling too early               | "Growth solves everything"                   | Product-market fit first. Growth without retention = leaky bucket.               |
| Ignoring unit economics         | "We'll figure out pricing later"             | Know your CAC, AOV, and LTV from Day 1.                                          |
| Doing everything yourself       | "Nobody can do it as well as me"             | You're right — but you'll burn out. Hire for weaknesses early.                   |
| Comparing to funded competitors | "They have 50 engineers and I have a laptop" | They also have 50 engineers' salaries to pay. Your advantage is speed and focus. |
| Perfecting before shipping      | "It's not ready yet"                         | It's never ready. Ship. Learn. Iterate.                                          |
| Not keeping investors updated   | "I'll update them when I have good news"     | Weekly updates — good or bad — build trust and keep the relationship warm.       |

---

## Learning Log Template

Keep a daily note (even one sentence) about what you learned. Over 3 months, this becomes your most valuable document.

```markdown
## [Date]

**What I learned today:**
[One observation about users, the market, or the product]

**What surprised me:**
[Something unexpected]

**What I'd do differently:**
[One thing I'd change about today's approach]
```

Example:

```markdown
## 2026-02-25

**What I learned today:**
Three different users asked if we have delivery. We don't yet. This is a
bigger need than I thought.

**What surprised me:**
One owner listed their item at 2x the category average and still got a
booking within 3 days. Price sensitivity may be lower than assumed.

**What I'd do differently:**
I spent 2 hours on marketing copy that could have waited. Should have
used that time to call the two users who churned this week.
```

---

## Recommended Reading for First-Time Marketplace Founders

| Book / Resource                                       | Why                                                |
| ----------------------------------------------------- | -------------------------------------------------- |
| _The Cold Start Problem_ — Andrew Chen                | The definitive book on marketplace network effects |
| _Blitzscaling_ — Reid Hoffman                         | When and how to scale aggressively                 |
| _The Lean Startup_ — Eric Ries                        | Build-measure-learn loop fundamentals              |
| _Platform Revolution_ — Parker, Van Alstyne, Choudary | Platform economics and strategy                    |
| _Zero to One_ — Peter Thiel                           | Contrarian thinking about startup differentiation  |
| Lenny's Newsletter (lennysnewsletter.com)             | Weekly marketplace strategy insights               |
| NFX essays (nfx.com/post)                             | Network effects frameworks                         |
| Stratechery — Ben Thompson                            | Business strategy analysis                         |
