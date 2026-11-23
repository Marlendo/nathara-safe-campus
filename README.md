# Nathara Safe Campus

A web app for **Safety, Reporting & Protection**: people can safely report threats,
violence, or abuse (anonymously if they wish), get an urgency assessment, an immediate
protection pathway, and access to support services — while responders manage cases,
prioritize, and follow up.

Served at `https://ppkpt.nathara.ac.id` (staging runtime).

## The core story

```
Person at risk
  → Safe report (anonymous by default)
  → Urgency assessment
  → Immediate safety guidance
  → Protection pathway
  → Support service
  → Responder receives case
  → Follow-up & case management
```

## Tech stack

| Layer     | Technology                                              |
|-----------|---------------------------------------------------------|
| Frontend  | React 18 + Vite + Tailwind CSS v4                       |
| Backend   | Node.js + Express (REST API)                            |
| Database  | PostgreSQL 18                                           |
| Auth      | SSO Supabase prod (RS256 via JWKS, no local passwords)  |
| Deploy    | Docker Compose (nginx + API + PostgreSQL)               |

## Prerequisites

- [Bun](https://bun.sh) 1.x
- PostgreSQL running locally (tested on 18)
- Default credentials: `postgres` / `postgres` (edit `backend/.env` if different)
- SSO identifiers (public, bukan secret): `SSO_JWKS_URL`, `SSO_ISSUER`,
  `SSO_AUDIENCE` — lihat `backend/.env.example`

## Getting started

```bash
# 1. Install dependencies
bun install --cwd backend
bun install --cwd frontend

# 2. Configure the database connection
#    backend/.env  →  DATABASE_URL=postgres://postgres:postgres@localhost:5432/safe_campus

# 3. Create the database, apply schema + migrations, and seed data
cd backend
bun run db:reset

# 4. Start the API (http://localhost:5001)
bun run dev

# 5. In another terminal, start the frontend (http://localhost:5173)
#    (+ frontend/.env — lihat frontend/.env.example untuk SSO_CLIENT_ID)
bun run --cwd ../frontend dev
```

Open http://localhost:5173

## Accounts

There are no local passwords. Sign in happens via Nathara SSO
(`https://sso.nathara.ac.id`, client `ppkpt`).

- The first admin is seeded from `SEED_ADMIN_SUB` / `SEED_ADMIN_EMAIL`
  (values via VPS file, never committed). Email final menyusul.
- New SSO users auto-provision as non-admin (`responder` + `NONE` scope);
  promotion to `admin` + `SAFE_CAMPUS` is done by an active admin via
  `/dashboard/admin/users` (or the seed).
- Guard kanonis: `role === 'admin' && scope === 'SAFE_CAMPUS'` (exact).

## Demo data

- 5 fictional cases (NSC-1001 … NSC-1005) in various statuses so the dashboard looks alive.
- 6 fictional support services (emergency, protection, medical, psychosocial, legal, shelter).

New reports get the next sequential case number (NSC-1006, NSC-1007, …).

## Screens

### Public (reporting experience) — /report
1. `/` — Landing page (I need help / Report / Find support)
2. `/about` — Neutral page used as the **Quick Exit** destination
3. `/report` → `/report/safety` → `/report/details` → `/report/contact` → `/report/review` → `/report/success` — guided report wizard
4. `/protection` — protection pathway with steps & support services
5. `/case-status` — anonymous case lookup by Case ID (NSC-XXXX)
6. `/support` — support directory (filterable)

### Responder (dashboard) — /dashboard
1. `/dashboard/login` — SSO sign-in (redirects to the SSO portal)
2. `/auth/callback` — SSO callback (code → token exchange → profile)
3. `/dashboard` — stats + recent cases
4. `/dashboard/cases` — full case list with filters
5. `/dashboard/cases/:id` — case detail: assign, change status, add note, create referral, timeline

### Admin (panel) — /dashboard/admin (visible in the sidebar for admins only)
1. `/dashboard/admin/users` — create accounts (no password, SSO only),
   set role/scope, enable/disable
   - includes a **self lock-out guard**: admins can't disable or modify their own account
2. `/dashboard/admin/services` — full CRUD for the support-services directory (soft delete via deactivate)
3. `/dashboard/admin/activity` — filterable audit trail of case events across the platform

## API overview (`/api/v1`)

### Public
| Method | Path                        | Purpose                    |
|--------|-----------------------------|----------------------------|
| POST   | `/reports`                  | Create a report            |
| GET    | `/reports/:caseNumber/status` | Check case status & timeline |
| GET    | `/services`                 | List support services (`?type=`) |

### Authenticated (SSO)
| Method | Path                            | Purpose             |
|--------|---------------------------------|---------------------|
| GET    | `/auth/me`                      | SSO profile (rate-limited) |
| POST   | `/auth/backchannel-logout`      | OIDC backchannel logout (IdP → app) |
| GET    | `/admin/overview`               | Dashboard stats     |
| GET    | `/admin/reports`                | List cases (filters)|
| GET    | `/admin/reports/:caseNumber`    | Case detail         |
| POST   | `/admin/reports/:caseNumber/assign`    | Assign responder    |
| PATCH  | `/admin/reports/:caseNumber/status`    | Change status       |
| POST   | `/admin/reports/:caseNumber/notes`     | Add internal note   |
| POST   | `/admin/reports/:caseNumber/referrals` | Create a referral   |
| GET    | `/admin/responders`             | Active responders (assign dropdown) |

### Admin only (`admin` + `SAFE_CAMPUS`)
| Method | Path                            | Purpose             |
|--------|---------------------------------|---------------------|
| GET    | `/admin/users`                  | List all accounts   |
| POST   | `/admin/users`                  | Create account (no password) |
| PATCH  | `/admin/users/:id`              | Update name/role/scope/status |
| GET    | `/admin/services`               | List services       |
| POST   | `/admin/services`               | Create service      |
| PATCH  | `/admin/services/:id`           | Update service      |
| DELETE | `/admin/services/:id`           | Deactivate service  |
| GET    | `/admin/activity`               | Audit log (`?limit=&type=`) |

The legacy `POST /auth/login` endpoint is disabled (404).

## Database schema

`backend/db/schema.sql` + `backend/db/migrations/*.sql` — tables:

- `users` — SSO-provisioned (`supabase_sub`, `role`, `scope`, no password)
- `sso_login_audit` — login audit (no tokens)
- `reports` — public submissions (case_number, type, urgency, status, description, …)
- `reporter_contacts` — **separate** from the report (privacy by design)
- `case_assignments`, `case_notes`, `referrals`, `case_events` — case management & timeline
- `services` — support directory

Schema changes only via new files in `backend/db/migrations/` (idempotent).

## Privacy & security notes

- **Anonymous by default** — no name / phone / email required; `reporter_type` is `anonymous`.
- Report contact info lives in a **separate table** and only when the user opts in.
- **No IP-based geolocation.** Location is typed by the reporter, or a consent-based
  browser prompt rounds coordinates to ~2 decimals (~1 km) before storing.
- Sensitive form data is kept **in memory only** during the wizard (not in localStorage).
- **Quick Exit** on every sensitive page → navigates to `/about` (a plain page).
- No local passwords; SSO JWTs (RS256 via JWKS, 10-min key cache, ±60s skew)
  verified per request. Never forwarded to PostgREST — DB via server-side `DATABASE_URL`.
- Responder/admin routes protected by `requireAuth` + canonical `requireAdminSc`
  (`admin` + `SAFE_CAMPUS`, default deny 403).
- Public endpoints are **rate-limited** (reports/services: 60 req/10 min, SSO session
  endpoints: 20 req/10 min, configurable).
- Helmet security headers, hidden `x-powered-by`, 512 KB JSON body limit.
- **Self lock-out guard** — an admin cannot disable/demote their own account.
- Never logs request bodies or tokens; the error handler never echoes stack traces to clients.
- Fails fast in production if `DATABASE_URL` or `SSO_JWKS_URL` is missing.
- The legacy local-password column on `users` was dropped in migration `0002_sso_rebrand`
  (admin SSO seeded first in the same migration — anti lock-out).

## Tests

```bash
cd backend
bun run db:reset   # reset to clean demo data first
bun test           # API smoke tests: health, services, report+status lookup,
                   # validation, login disabled (404), SSO me 401 cases
```

## Production deployment (Docker)

A `docker-compose.yml` runs the full stack against the **shared PostgreSQL 18
cluster** (`staging-postgres-18`, network `staging-shared`): the **API**, and
**nginx** serving the built frontend (which proxies `/api` and `/about`).
There is no local `db` service — DB lives in `/home/marlendo/staging/docker`.

```bash
# 1. Set your secrets
cp .env.example .env      # then edit SAFE_CAMPUS_DB_PASSWORD / SEED_ADMIN_*
                          # (password from /home/marlendo/staging/docker/.env)

# 2. Build & start
docker compose up --build -d

# 3. Open http://localhost:8080 (or https://ppkpt.nathara.ac.id in staging)
```

`.env` (root):
```
SAFE_CAMPUS_DB_PASSWORD=<db password, from /home/marlendo/staging/docker/.env>
WEB_PORT=8080
```

Notes:

- `init` applies the schema + migrations and seeds data **once** (idempotent — skips seeding
  when users already exist). Remove the `init` service from `docker compose up` after first boot if desired.
- `TRUST_PROXY=true` is set for the API so rate limiting keys on real IPs behind the nginx proxy.
- For real deployments, put nginx behind TLS (Let's Encrypt / managed certificate),
  rotate `SAFE_CAMPUS_DB_PASSWORD` (in `/home/marlendo/staging/docker/.env`),
  schedule `pg_dump` backups of database `safe_campus` on the shared cluster.

## Notes

- Staging data is fictional — do **not** submit real emergency or personal information.
- The `/about` page is intentionally generic ("Tourism Foundation") so a Quick Exit
  reveals nothing.
