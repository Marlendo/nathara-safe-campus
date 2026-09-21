# SafePath — POC

A web app for **Safety, Reporting & Protection**: people can safely report threats,
violence, or abuse (anonymously if they wish), get an urgency assessment, an immediate
protection pathway, and access to support services — while responders manage cases,
prioritize, and follow up.

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

| Layer     | Technology                                    |
|-----------|-----------------------------------------------|
| Frontend  | React 18 + Vite + Tailwind CSS v4             |
| Backend   | Node.js + Express (REST API)                  |
| Database  | PostgreSQL 17                                 |
| Auth      | JWT (responder/admin only) via bcryptjs       |
| Deploy    | Docker Compose (nginx + API + PostgreSQL)     |

## Prerequisites

- Node.js 18+ (tested on v23)
- PostgreSQL running locally (tested on 17)
- Default credentials: `postgres` / `postgres` (edit `backend/.env` if different)

## Getting started

```bash
# 1. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 2. Configure the database connection
#    backend/.env  →  DATABASE_URL=postgres://postgres:postgres@localhost:5432/safepath

# 3. Create the database, apply schema, and seed demo data
cd ../backend
npm run db:reset

# 4. Start the API (http://localhost:5001)
npm run dev

# 5. In another terminal, start the frontend (http://localhost:5173)
cd ../frontend
npm run dev
```

Open http://localhost:5173

## Demo accounts

| Role      | Email                      | Password  |
|-----------|----------------------------|-----------|
| Responder | responder@safepath.demo    | demo1234  |
| Admin     | admin@safepath.demo        | demo1234  |

## Demo data

- 5 fictional cases (SP-1001 … SP-1005) in various statuses so the dashboard looks alive.
- 6 fictional support services (emergency, protection, medical, psychosocial, legal, shelter).

New reports get the next sequential case number (SP-1006, SP-1007, …).

## Screens

### Public (reporting experience) — /report
1. `/` — Landing page (I need help / Report / Find support)
2. `/about` — Neutral page used as the **Quick Exit** destination
3. `/report` → `/report/safety` → `/report/details` → `/report/contact` → `/report/review` → `/report/success` — guided report wizard
4. `/protection` — protection pathway with steps & support services
5. `/case-status` — anonymous case lookup by Case ID (SP-XXXX)
6. `/support` — support directory (filterable)

### Responder (dashboard) — /dashboard
1. `/dashboard/login` — responder sign-in
2. `/dashboard` — stats + recent cases
3. `/dashboard/cases` — full case list with filters
4. `/dashboard/cases/:id` — case detail: assign, change status, add note, create referral, timeline

### Admin (panel) — /dashboard/admin (visible in the sidebar for admins only)
1. `/dashboard/admin/users` — create responder/admin accounts, enable/disable, reset passwords
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

### Authenticated (responder/admin)
| Method | Path                            | Purpose             |
|--------|---------------------------------|---------------------|
| POST   | `/auth/login`                   | Issue JWT (rate-limited) |
| GET    | `/admin/overview`               | Dashboard stats     |
| GET    | `/admin/reports`                | List cases (filters)|
| GET    | `/admin/reports/:caseNumber`    | Case detail         |
| POST   | `/admin/reports/:caseNumber/assign`    | Assign responder    |
| PATCH  | `/admin/reports/:caseNumber/status`    | Change status       |
| POST   | `/admin/reports/:caseNumber/notes`     | Add internal note   |
| POST   | `/admin/reports/:caseNumber/referrals` | Create a referral   |
| GET    | `/admin/responders`             | Active responders (assign dropdown) |

### Admin only
| Method | Path                            | Purpose             |
|--------|---------------------------------|---------------------|
| GET    | `/admin/users`                  | List all accounts   |
| POST   | `/admin/users`                  | Create account      |
| PATCH  | `/admin/users/:id`              | Update name/role/status |
| POST   | `/admin/users/:id/reset-password` | Reset a password  |
| GET    | `/admin/services`               | List services       |
| POST   | `/admin/services`               | Create service      |
| PATCH  | `/admin/services/:id`           | Update service      |
| DELETE | `/admin/services/:id`           | Deactivate service  |
| GET    | `/admin/activity`               | Audit log (`?limit=&type=`) |

## Database schema

`backend/db/schema.sql` — tables:

- `users` — responders & admins
- `reports` — public submissions (case_number, type, urgency, status, description, …)
- `reporter_contacts` — **separate** from the report (privacy by design)
- `case_assignments`, `case_notes`, `referrals`, `case_events` — case management & timeline
- `services` — support directory

## Privacy & security notes

- **Anonymous by default** — no name / phone / email required; `reporter_type` is `anonymous`.
- Report contact info lives in a **separate table** and only when the user opts in.
- **No IP-based geolocation.** Location is typed by the reporter, or a consent-based
  browser prompt rounds coordinates to ~2 decimals (~1 km) before storing.
- Sensitive form data is kept **in memory only** during the wizard (not in localStorage).
- **Quick Exit** on every sensitive page → navigates to `/about` (a plain page).
- Passwords hashed with bcrypt; responder/admin routes protected with JWTs.
- Public endpoints are **rate-limited** (reports/services: 60 req/10 min, login: 20 req/10 min, configurable).
- Helmet security headers, hidden `x-powered-by`, 512 KB JSON body limit.
- **Self lock-out guard** — an admin cannot disable/demote their own account.
- Never logs request bodies; the error handler never echoes stack traces to clients.
- Fails fast in production if `DATABASE_URL` or a strong `JWT_SECRET` is missing.

## Tests

```bash
cd backend
npm run db:reset   # reset to clean demo data first
npm test           # API smoke tests: health, services, report+status lookup,
                   # validation, login, RBAC (responder denied from admin routes)
```

## Production deployment (Docker)

A `docker-compose.yml` runs the full stack: **PostgreSQL 17**, the **API**, and
**nginx** serving the built frontend (which proxies `/api` and `/about`).

```bash
# 1. Set your secrets
cp .env.example .env      # root-level ops file (see below)

# 2. Build & start
docker compose up --build -d

# 3. Open http://localhost:8080
```

`.env` (root):
```
POSTGRES_PASSWORD=<db password>
JWT_SECRET=<openssl rand -hex 32>
WEB_PORT=8080
```

Notes:

- `init` applies the schema and seeds demo data **once** (idempotent — skips seeding
  when users already exist). Remove the `init` service from `docker compose up` after first boot if desired.
- `TRUST_PROXY=true` is set for the API so rate limiting keys on real IPs behind the nginx proxy.
- For real deployments, put nginx behind TLS (Let's Encrypt / managed certificate),
  set a long random `JWT_SECRET`, rotate `POSTGRES_PASSWORD`, restrict the DB port to the compose
  network, schedule `pg_dump` backups, and point `DATABASE_URL` at a managed PostgreSQL service.

## Notes

- This is a POC/demo. All reports & services are fictional — do **not** submit real
  emergency or personal information.
- The `/about` page is intentionally generic ("Tourism Foundation") so a Quick Exit
  reveals nothing.