# Rentify — Claude Code Instructions

> **Framework**: BMAD Method + Superpowers
> **Last Updated**: 2026-03-18

---

## Project Overview

Rentify is a Cambodia-first peer-to-peer rental marketplace backend. Built with Hono + Supabase on Cloudflare Workers.

**Key documents:**
- [Project Context](_bmad-output/planning-artifacts/project-context.md)
- [Product Brief](_bmad-output/planning-artifacts/product-brief.md)
- [PRD](_bmad-output/planning-artifacts/prd.md)
- [Architecture](_bmad-output/planning-artifacts/architecture.md)

---

## Development Workflow

### For New Features

Use BMAD agents for product thinking, Superpowers for implementation:

```
1. bmad-pm          → Define requirements, answer product questions
2. bmad-architect   → Design technical approach
3. bmad-create-prd  → Document requirements formally
4. Superpowers      → TDD implementation (auto-triggers)
```

### For Quick Tasks

Use BMAD quick-dev which integrates Superpowers TDD:

```
bmad-quick-dev <task description>
```

### For Debugging

Superpowers systematic-debugging auto-triggers when issues arise.

---

## BMAD Skills Available

| Skill | Purpose | When to Use |
|-------|---------|-------------|
| `bmad-pm` | Product Manager persona | New features, requirements |
| `bmad-architect` | Technical Architect persona | Design, architecture decisions |
| `bmad-create-prd` | Write PRD | Document requirements |
| `bmad-create-architecture` | Architecture docs | Technical design |
| `bmad-quick-dev` | Fast development with TDD | Quick implementation |
| `bmad-code-review` | Review code | Before commits |
| `bmad-help` | Get guidance | Anytime |

## Superpowers Skills Available

| Skill | Purpose | Auto-trigger? |
|-------|---------|---------------|
| `brainstorming` | Design before coding | Yes, for new features |
| `test-driven-development` | RED-GREEN-REFACTOR | Yes, during implementation |
| `systematic-debugging` | Root cause analysis | Yes, when errors occur |
| `verification-before-completion` | Ensure it works | Yes, before claiming done |
| `writing-plans` | Implementation plans | After design approval |
| `executing-plans` | Run implementation | After plan creation |

---

## Code Conventions

### API Design
- RESTful with `/v1/` prefix
- Resource-oriented URLs
- Cursor-based pagination
- Zod validation on all inputs

### Error Handling
- Use custom error classes from `src/shared/lib/errors.ts`
- Never throw generic `Error`
- All errors logged via middleware

### Testing
- TDD for critical paths (pricing, state machine)
- Unit tests in `tests/unit/`
- Integration tests in `tests/integration/`
- Run: `bun test`

### Database
- Migrations in `supabase/migrations/`
- Types generated via `bun run db:gen`
- RLS policies on all tables

---

## Commands

```bash
# Development
bun run dev          # Start dev server
bun test             # Run tests
bun run test:watch   # Watch mode

# Database
bun run db:start     # Start Supabase local
bun run db:reset     # Reset database
bun run db:gen       # Generate types

# Deployment
bun run deploy       # Deploy to production
bun run deploy:staging  # Deploy to staging

# Code Quality
bun run lint         # Check with Biome
bun run format       # Format with Biome
```

---

## Architecture Decisions

See [Architecture Document](_bmad-output/planning-artifacts/architecture.md) for:
- System overview diagram
- Data model and ERD
- Booking state machine
- Security architecture
- API endpoint reference

---

## V2 Roadmap

See [Epics V2](_bmad-output/implementation-artifacts/epics-v2.md) for:
- Real-time messaging
- Push notifications
- Booking enhancements
- Admin dashboard API
- Performance improvements

---

## Important Files

| File | Purpose |
|------|---------|
| `src/index.ts` | App entry point |
| `src/lib/pricing.ts` | Pricing calculation (TDD) |
| `src/lib/booking-machine.ts` | State machine (TDD) |
| `src/middleware/auth.ts` | JWT verification |
| `src/services/` | Business logic |
| `src/routes/` | API endpoints |

---

## Notes for Claude

- **Always use BMAD skills** for product/architecture questions
- **Always follow TDD** for implementation (Superpowers enforces)
- **Always read existing code** before proposing changes
- **Never skip design phase** - use brainstorming skill first
- **Trust the frameworks** - they prevent common mistakes