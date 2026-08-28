# molibso Internal

Internal team tool for **molibso GmbH** — time tracking, leave, attendance, and team management.

## Stack

- **Frontend + Backend:** Next.js 15 (App Router, Server Actions, REST `/api/v1`)
- **ORM:** Prisma
- **Database:** Supabase PostgreSQL
- **Auth:** Auth.js (UI sessions) + Bearer JWT (REST APIs)

## Quick start with Supabase

Full guide: **[docs/SUPABASE.md](./docs/SUPABASE.md)**  
API reference: **[docs/API.md](./docs/API.md)**

```bash
npm install
# edit .env with your Supabase DATABASE_URL + DIRECT_URL
npm run db:setup
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
