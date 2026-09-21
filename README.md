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
| POST   | `/auth/login`                   | Issue JWT           |
| GET    | `/admin/overview`               | Dashboard stats     |
| GET    | `/admin/reports`                | List cases (filters)|
| GET    | `/admin/reports/:caseNumber`    | Case detail         |
| POST   | `/admin/reports/:caseNumber/assign`    | Assign responder    |
| PATCH  | `/admin/reports/:caseNumber/status`    | Change status       |
| POST   | `/admin/reports/:caseNumber/notes`     | Add internal note   |
| POST   | `/admin/reports/:caseNumber/referrals` | Create a referral   |
| GET    | `/admin/users` (admin only)     | List users          |

## Database schema

`backend/db/schema.sql` — tables:

- `users` — responders & admins
- `reports` — public submissions (case_number, type, urgency, status, description, …)
- `reporter_contacts` — **separate** from the report (privacy by design)
- `case_assignments`, `case_notes`, `referrals`, `case_events` — case management & timeline
- `services` — support directory

## Privacy & security notes (POC)

- **Anonymous by default** — no name / phone / email required; `reporter_type` is `anonymous`.
- Report contact info lives in a **separate table** and only when the user opts in.
- **No IP-based geolocation.** Location is typed by the reporter, or a consent-based
  browser prompt rounds coordinates to ~2 decimals (~1 km) before storing.
- Sensitive form data is kept **in memory only** during the wizard (not in localStorage).
- **Quick Exit** on every sensitive page → navigates to `/about` (a plain page).
- Passwords hashed with bcrypt; responder routes protected with JWTs.
- Developer reminder: never `console.log(req.body)`.

## Notes

- This is a POC/demo. All reports & services are fictional — do **not** submit real
  emergency or personal information.
- The `/about` page is intentionally generic ("Tourism Foundation") so a Quick Exit
  reveals nothing.