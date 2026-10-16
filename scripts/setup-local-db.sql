-- Bootstrap local PostgreSQL for molibso Internal.
-- Run as superuser (postgres), e.g.:
--   & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -f scripts\setup-local-db.sql
-- Matches docker-compose.yml and .env.example (user/password/db: molibso).

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'molibso') THEN
    CREATE ROLE molibso LOGIN PASSWORD 'molibso' CREATEDB;
  ELSE
    ALTER ROLE molibso WITH LOGIN PASSWORD 'molibso' CREATEDB;
  END IF;
END
$$;

-- Safe to re-run: skip CREATE if the database already exists
SELECT CASE
  WHEN EXISTS (SELECT FROM pg_database WHERE datname = 'molibso')
    THEN 'SELECT 1 -- molibso database already exists'
  ELSE 'CREATE DATABASE molibso OWNER molibso'
END
\gexec

\c molibso
GRANT ALL ON SCHEMA public TO molibso;
ALTER SCHEMA public OWNER TO molibso;
