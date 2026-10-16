# Local PostgreSQL setup — molibso Internal

The app uses **Prisma + PostgreSQL**. For local and office-VM hosting, run Postgres
on the same machine (or via Docker). Supabase is not required.

## Option A — Docker (recommended)

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
npm install
copy .env.example .env          # PowerShell: Copy-Item .env.example .env
npm run db:up                   # starts Postgres on localhost:5432
npm run db:setup                # migrate + seed
npm run dev
```

Default credentials (from `docker-compose.yml`):

| | |
|--|--|
| Host | `localhost` |
| Port | `5432` |
| Database | `molibso` |
| User / password | `molibso` / `molibso` |

Change the password in `docker-compose.yml` and `.env` before any shared/office use.

Stop / wipe:

```bash
npm run db:down          # stop container (data kept in volume)
docker compose down -v   # stop and delete DB volume
```

## Option B — Native PostgreSQL install

1. Install PostgreSQL 15+ locally  
2. Create DB and user:

```sql
CREATE USER molibso WITH PASSWORD 'molibso' CREATEDB;
CREATE DATABASE molibso OWNER molibso;
```

3. Point `.env` at it (same URLs as `.env.example`)  
4. `npm run db:setup && npm run dev`

## Environment

```env
DATABASE_URL="postgresql://molibso:molibso@localhost:5432/molibso?schema=public"
DIRECT_URL="postgresql://molibso:molibso@localhost:5432/molibso?schema=public"
USE_MOCK_DATA=false
AUTH_SECRET="a-long-random-secret"
NEXTAUTH_URL="http://localhost:3000"
```

On a single local Postgres, `DATABASE_URL` and `DIRECT_URL` are the same.
`DIRECT_URL` exists so Prisma migrations always use a direct connection.

## Health check

http://localhost:3000/api/v1/health should return `"database": "postgresql"`.

## Production VM notes

- Bind Postgres to `127.0.0.1` if the Next.js app runs on the same VM  
- Use a strong DB password  
- Daily `pg_dump` backups  
- Set `NEXTAUTH_URL` to the URL employees open in the browser  
