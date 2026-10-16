# molibso Internal

Internal team tool for **molibso GmbH** — time tracking, leave, attendance, and team management.

## Stack

- **Frontend + Backend:** Next.js 15 (App Router, Server Actions, REST `/api/v1`)
- **ORM:** Prisma
- **Database:** PostgreSQL (local / Docker / office VM)
- **Auth:** Auth.js (UI sessions) + Bearer JWT (REST APIs)

## Quick start (local Postgres)

Full guide: **[docs/POSTGRES.md](./docs/POSTGRES.md)**  
API reference: **[docs/API.md](./docs/API.md)**  
Windows native install: **[SETUP.md](./SETUP.md)**

```bash
npm install
copy .env.example .env
npm run db:up          # Docker Postgres on localhost:5432
npm run db:setup       # migrations + seed
npm run dev
```

- App: http://localhost:3000  
- Health: http://localhost:3000/api/v1/health  

Create the first admin via `POST /api/v1/auth/bootstrap`, then add teammates with `POST /api/v1/employees` (see [docs/API.md](./docs/API.md)).

## Offline demo (no database)

```env
USE_MOCK_DATA=true
```

Then `npm run dev` — in-memory data only.
