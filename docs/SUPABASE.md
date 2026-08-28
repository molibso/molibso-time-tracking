# Supabase setup — molibso Internal

## 1. Create a Supabase project

1. Go to [https://supabase.com](https://supabase.com) → New project  
2. Wait until the database is ready  

## 2. Copy connection strings

**Project Settings → Database → Connection string**

You need **two** URLs:

| Env var | Use | Typical port |
|---------|-----|--------------|
| `DATABASE_URL` | App runtime (pooler / transaction mode) | `6543` |
| `DIRECT_URL` | Prisma migrations | `5432` |

Example:

```env
DATABASE_URL="postgresql://postgres.abcdefgh:YOUR_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.abcdefgh:YOUR_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
USE_MOCK_DATA=false
AUTH_SECRET="any-long-random-string"
NEXTAUTH_URL="http://localhost:3000"
```

Paste these into `.env` (see `.env.example`).

> Tip: If connections fail, append `&sslmode=require` (or `?sslmode=require` if no query string yet).

## 3. Install & migrate

```bash
npm install
npx prisma generate
npm run db:setup
```

`db:setup` runs migrations against Supabase, then seeds demo accounts.

## 4. Run

```bash
npm run dev
```

- UI: http://localhost:3000  
- Health: http://localhost:3000/api/v1/health  
- API docs: [docs/API.md](./docs/API.md)

## 5. Create your first admin

With an empty database, call bootstrap (Postman or curl):

`POST http://localhost:3000/api/v1/auth/bootstrap`

```json
{
  "email": "admin@company.com",
  "password": "ChooseAStrongPassword1",
  "firstName": "Lars",
  "lastName": "Hollenbacher",
  "position": "Founder"
}
```

Then create more people with `POST /api/v1/employees` using the Bearer token. Full examples: [API.md](./API.md).

## Architecture

```
Browser UI ──► Next.js Server Actions (src/actions/)
API clients ──► REST /api/v1/*  (Bearer JWT)
                      │
                      ▼
                 Prisma ORM
                      │
                      ▼
              Supabase PostgreSQL
```

Both the UI and REST APIs share the same Prisma models and business rules.
