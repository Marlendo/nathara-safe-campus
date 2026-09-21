-- ============================================================
-- SafePath — POC schema
-- PostgreSQL 17
-- ============================================================

-- Clean slate (dev only)
DROP TABLE IF EXISTS case_events CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS case_notes CASCADE;
DROP TABLE IF EXISTS case_assignments CASCADE;
DROP TABLE IF EXISTS reporter_contacts CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP SEQUENCE IF EXISTS case_seq;

-- ============================================================
-- Users (responders & admins)
-- ============================================================
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('ADMIN', 'RESPONDER')),
  status        TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Reports (all public submissions)
-- ============================================================
CREATE SEQUENCE case_seq START 1001;

CREATE TABLE reports (
  id                SERIAL PRIMARY KEY,
  case_number       TEXT NOT NULL UNIQUE,
  report_type       TEXT NOT NULL CHECK (report_type IN
                      ('threat','violence','abuse','harassment','exploitation','missing_vulnerable','other')),
  urgency           TEXT NOT NULL CHECK (urgency IN ('immediate','urgent','concerning','info')),
  status            TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN
                      ('NEW','UNDER_REVIEW','ASSIGNED','REFERRED','FOLLOW_UP','RESOLVED','CLOSED')),
  description       TEXT NOT NULL,
  incident_date     DATE,
  location          TEXT,                 -- approximate, reporter-supplied (never IP-based)
  current_safety    TEXT CHECK (current_safety IN ('yes', 'no', 'unsure')),
  perpetrator_nearby BOOLEAN,
  reporter_type     TEXT NOT NULL DEFAULT 'anonymous' CHECK (reporter_type IN ('anonymous','contact')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_status  ON reports (status);
CREATE INDEX idx_reports_urgency ON reports (urgency);
CREATE INDEX idx_reports_created ON reports (created_at DESC);

-- ============================================================
-- Reporter contact — deliberately SEPARATE from the report so
-- anonymous reports carry no contact data at all.
-- ============================================================
CREATE TABLE reporter_contacts (
  id              SERIAL PRIMARY KEY,
  report_id       INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  contact_method  TEXT NOT NULL CHECK (contact_method IN ('phone','sms','email')),
  contact_value   TEXT NOT NULL,
  safe_to_contact BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Case management
-- ============================================================
CREATE TABLE case_assignments (
  id            SERIAL PRIMARY KEY,
  report_id     INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  unassigned_at TIMESTAMPTZ
);

CREATE TABLE case_notes (
  id         SERIAL PRIMARY KEY,
  report_id  INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  note       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE case_events (
  id          SERIAL PRIMARY KEY,
  report_id   INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id     INTEGER REFERENCES users(id),
  event_type  TEXT NOT NULL CHECK (event_type IN
                ('REPORT_CREATED','CASE_ASSIGNED','STATUS_CHANGED','REFERRAL_CREATED','NOTE_ADDED','CASE_CLOSED')),
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Services (support directory)
-- ============================================================
CREATE TABLE services (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  service_type  TEXT NOT NULL CHECK (service_type IN
                  ('emergency','protection','medical','psychosocial','legal','shelter')),
  description   TEXT,
  phone         TEXT,
  email         TEXT,
  availability  TEXT,
  status        TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Referrals (must be defined after services — FK dependency)
-- ============================================================
CREATE TABLE referrals (
  id           SERIAL PRIMARY KEY,
  report_id    INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  service_id   INTEGER NOT NULL REFERENCES services(id),
  status       TEXT NOT NULL DEFAULT 'REFERRED' CHECK (status IN ('REFERRED','CONTACTED','COMPLETED','CANCELED')),
  referred_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  notes        TEXT
);