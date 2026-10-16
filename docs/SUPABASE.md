# Database hosting notes

This project targets **local / self-hosted PostgreSQL**.

Primary guide: **[POSTGRES.md](./POSTGRES.md)**

Supabase can still be used as a remote Postgres host if you want, but it is not the default.
Use a normal Postgres URL (no PgBouncer required for a single-office deployment):

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/molibso?schema=public"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/molibso?schema=public"
USE_MOCK_DATA=false
```
