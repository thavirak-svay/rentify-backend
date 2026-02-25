# Rentify Backend

Cambodia-first rental marketplace backend built with Hono + Supabase.

## Stack

- **API Framework**: Hono (on Bun)
- **Database**: Supabase (PostgreSQL with PostGIS, RLS)
- **Auth**: Supabase Auth
- **Payments**: ABA PayWay (Cambodia)
- **Validation**: Zod

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- [Docker](https://docker.com) (for Supabase local)
- [Supabase CLI](https://supabase.com/docs/guides/local-development)

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd rentify
```

2. Install dependencies:
```bash
bun install
```

3. Copy environment variables:
```bash
cp .env.example .env.local
```

4. Start Supabase locally:
```bash
bun run db:start
```

5. Run database migrations:
```bash
bun run db:reset
```

6. Start the development server:
```bash
bun run dev
```

The API will be available at http://localhost:8080

## Development

### Commands

- `bun run dev` - Start development server with hot reload
- `bun run test` - Run tests
- `bun run lint` - Check code with Biome
- `bun run format` - Format code with Biome
- `bun run db:start` - Start Supabase locally
- `bun run db:reset` - Reset database and run migrations
- `bun run db:gen-types` - Generate TypeScript types from database

### Project Structure

```
src/
├── config/          # Configuration (env, supabase client)
├── middleware/      # Hono middleware (auth, error handling)
├── routes/          # API route handlers
├── services/        # Business logic
├── lib/             # Utilities (pricing, validators, errors)
└── types/           # TypeScript types
```

## API Documentation

### Interactive API Reference (Scalar)

Beautiful, interactive API documentation available at:

```
http://localhost:8080/docs
```

Features:
- ✅ Interactive API explorer
- ✅ Request/response examples
- ✅ Try it out functionality
- ✅ Code samples for multiple languages
- ✅ Authentication support

### OpenAPI Specification

Raw OpenAPI 3.1 spec available at:

```
http://localhost:8080/openapi.json
```

Use this to:
- Generate client SDKs
- Import into Postman/Insomnia
- Share with mobile/frontend teams

### For Mobile Team

The mobile team can:
1. Visit `/docs` for interactive documentation
2. Download OpenAPI spec from `/openapi.json`
3. Generate client SDKs using OpenAPI generators

### Endpoints

All endpoints require authentication via Bearer token (Supabase JWT):

```
Authorization: Bearer <token>
```

## Testing

Run tests:
```bash
bun test
```

Watch mode:
```bash
bun run test:watch
```

## Database

### Migrations

Create a new migration:
```bash
bun run db:migration <migration_name>
```

Apply migrations:
```bash
bun run db:push
```

Reset database (apply all migrations + seed):
```bash
bun run db:reset
```

### Production Setup

See [SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md) for:
- Creating production project
- Enabling PostgREST API
- Running migrations
- Storage configuration
- Security setup

## Deployment

### Railway Deployment

See [RAILWAY_DEPLOYMENT.md](docs/RAILWAY_DEPLOYMENT.md) for complete deployment guide.

**Quick Deploy:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up
```

Your API will be live at: `https://your-app.up.railway.app`

### Production Checklist

- [ ] Environment variables set in Railway
- [ ] Database migrations run on Supabase
- [ ] CORS configured for production frontend
- [ ] PayWay callback URL updated
- [ ] Custom domain configured (optional)

## License

Private - All rights reserved
