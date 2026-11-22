-- ============================================================
-- 0002_sso_rebrand — SSO Supabase prod + rebrand SafePath → NSC
--
--  - Tambah supabase_sub UNIQUE + scope + last_login + index
--  - Mapping legacy (keputusan human): ADMIN → admin+SAFE_CAMPUS,
--    RESPONDER → responder+scope NONE
--  - Seed admin SSO DULU dari env (placeholder __SEED_ADMIN_*__
--    disubstitusi db/setup.js & db/migrate.js — TANPA nilai di repo)
--    SEBELUM DROP password_hash (anti lock-out)
--  - DROP COLUMN password_hash (keputusan human: langsung, satu migrasi)
--  - Tabel audit login SSO (tanpa token)
--  Idempoten: aman dijalankan ulang.
-- ============================================================

-- ---------- 1. Kolom SSO ----------
ALTER TABLE users ADD COLUMN IF NOT EXISTS supabase_sub TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_supabase_sub_key') THEN
    ALTER TABLE users ADD CONSTRAINT users_supabase_sub_key UNIQUE (supabase_sub);
  END IF;
END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- ---------- 2. Mapping peran legacy → kanonis ----------
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

UPDATE users SET role = 'admin' WHERE role = 'ADMIN';
UPDATE users SET role = 'responder' WHERE role = 'RESPONDER';
UPDATE users SET scope = 'SAFE_CAMPUS' WHERE role = 'admin' AND scope = 'NONE';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check') THEN
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'responder'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_scope_check') THEN
    ALTER TABLE users ADD CONSTRAINT users_scope_check CHECK (scope IN ('NONE', 'SAFE_CAMPUS'));
  END IF;
END $$;

-- ---------- 3. Audit login SSO (tanpa token) ----------
CREATE TABLE IF NOT EXISTS sso_login_audit (
  id           SERIAL PRIMARY KEY,
  supabase_sub TEXT,
  email        TEXT,
  hasil        TEXT NOT NULL,
  ip           TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sso_login_audit_sub ON sso_login_audit (supabase_sub);

-- ---------- 4. Seed admin SSO (DULU, sebelum DROP) ----------
-- Transisi: longgarkan NOT NULL agar baris admin SSO bisa dibuat
-- tanpa password, lalu DROP kolom setelah seed.
DO $$
BEGIN
  -- Transisi (DB legacy saja): longgarkan NOT NULL agar baris admin SSO
  -- bisa dibuat tanpa password. Instalasi baru tidak punya kolom ini.
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'users' AND column_name = 'password_hash') THEN
    ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
  END IF;
END $$;
-- Placeholder __SEED_ADMIN_*__ diganti nilai env oleh runner bun
-- (SEED_ADMIN_SUB / SEED_ADMIN_EMAIL / SEED_ADMIN_NAME).
-- Bila env kosong → no-op (tidak ada baris dibuat).
INSERT INTO users (name, email, supabase_sub, role, scope, status)
SELECT '__SEED_ADMIN_NAME__', '__SEED_ADMIN_EMAIL__', '__SEED_ADMIN_SUB__',
       'admin', 'SAFE_CAMPUS', 'ACTIVE'
WHERE '__SEED_ADMIN_SUB__' <> '' AND '__SEED_ADMIN_EMAIL__' <> ''
ON CONFLICT (supabase_sub) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = 'admin',
  scope = 'SAFE_CAMPUS',
  status = 'ACTIVE';

-- ---------- 5. Matikan password lokal ----------
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;

-- ---------- 6. Index ----------
CREATE INDEX IF NOT EXISTS idx_users_supabase_sub ON users (supabase_sub);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
