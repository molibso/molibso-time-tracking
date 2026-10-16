# Local setup — molibso (full stack)

This app is a **Next.js full-stack** project:

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React, Tailwind |
| Backend API | Next.js **Server Actions** (`src/actions/`) + **Route Handlers** (`src/app/api/`) |
| ORM | **Prisma** |
| Database | **PostgreSQL** |
| Auth | Auth.js (NextAuth v5) at `/api/auth/*` |

There is no separate backend server — the Next.js app on `localhost:3000` serves both UI and data APIs.

---

## 1. Prerequisites

- **Node.js 20+** — [https://nodejs.org](https://nodejs.org)
- **PostgreSQL 15+** — install locally (see below)

Verify Node:

```bash
node -v
npm -v
```

---

## 2. Install PostgreSQL on Windows (no Docker)

### Option A — Official installer (recommended)

1. Download from [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)
2. Run the installer (EDB installer is fine)
3. Remember the **postgres user password** you set during install
4. Keep default port **5432**
5. Install **pgAdmin** if offered (optional GUI)

### Option B — winget

```powershell
winget install PostgreSQL.PostgreSQL
```

### Create the database and app user

Open **SQL Shell (psql)** from the Start menu (log in as `postgres` with the password
you chose during install), or pgAdmin, and run:

```sql
-- Matches docker-compose.yml / .env.example defaults
CREATE ROLE molibso LOGIN PASSWORD 'molibso' CREATEDB;  -- skip if role exists; or ALTER ROLE … PASSWORD 'molibso'
CREATE DATABASE molibso OWNER molibso;                  -- skip if database exists
```

Or from PowerShell (prompts for the `postgres` password; adjust the version folder if needed):

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -f scripts\setup-local-db.sql
```
---

## 3. Project setup

```bash
# Clone / open the project, then:
cd workforce-app

npm install

# Copy env — defaults already point at local molibso/molibso
copy .env.example .env
```

`.env` should look like:

```env
DATABASE_URL="postgresql://molibso:molibso@localhost:5432/molibso?schema=public"
DIRECT_URL="postgresql://molibso:molibso@localhost:5432/molibso?schema=public"
USE_MOCK_DATA=false
AUTH_SECRET="any-long-random-string-for-dev"
NEXTAUTH_URL="http://localhost:3000"
```

> Prefer Docker when available: see [docs/POSTGRES.md](./docs/POSTGRES.md) (`npm run db:up`).
> Same credentials either way — no PgBouncer / Supabase required.
Generate a secret (optional):

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 4. Database schema & demo data

```bash
# Apply migrations (creates all tables)
npm run db:setup

# Or step by step:
npm run db:migrate    # interactive — use when developing schema changes
npm run db:seed       # company settings only (no demo users)
```

Create the first admin with `POST /api/v1/auth/bootstrap`, then add users via `POST /api/v1/employees`. See [docs/API.md](./docs/API.md).

---

## 5. Run the app

```bash
npm run dev
```

- App: [http://localhost:3000](http://localhost:3000)
- Health check: [http://localhost:3000/api/health](http://localhost:3000/api/health)
- Auth API: [http://localhost:3000/api/auth](http://localhost:3000/api/auth)
- DB GUI: `npm run db:studio` → [http://localhost:5555](http://localhost:5555)

A healthy backend returns:

```json
{ "status": "ok", "database": "postgresql", "userCount": 6 }
```

---

## 6. Useful commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server (frontend + backend) |
| `npm run db:migrate` | Create/apply migrations (dev) |
| `npm run db:deploy` | Apply migrations (production) |
| `npm run db:seed` | Re-run demo seed data |
| `npm run db:reset` | Drop DB, re-migrate, re-seed |
| `npm run db:studio` | Open Prisma Studio |

---

## 7. Backend architecture (where the APIs live)

```
src/
  actions/           ← Server Actions (mutations: clock in, leave, employees…)
  app/api/
    auth/[...nextauth]  ← Login/session API
    health/             ← DB connectivity check
  lib/
    prisma.ts        ← Prisma client (PostgreSQL)
    auth.ts          ← Auth.js config
    rbac.ts          ← Role permissions
```

Server Actions are called directly from React components — no separate REST layer needed for most features.

---

## 8. Fallback: mock data (no PostgreSQL)

If PostgreSQL is not installed yet, set in `.env`:

```env
USE_MOCK_DATA=true
```

Then `npm run dev` works with in-memory demo data. Switch to `USE_MOCK_DATA=false` once PostgreSQL is ready.

---

## Troubleshooting

**`Can't reach database server`** — PostgreSQL service not running. Start it:

- Windows Services → **postgresql-x64-16** → Start  
- Or: `pg_ctl` / restart from pgAdmin

**`database "molibso" does not exist`** — Run `CREATE DATABASE molibso;`

**`Authentication failed`** — Wrong password in `DATABASE_URL`

**Login fails after seed** — Run `npm run db:seed` again; users need `isActive: true`

**Port 3000 in use** — Next.js will use 3001, or stop the other process
