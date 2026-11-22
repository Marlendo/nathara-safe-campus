# Nathara Safe Campus — Test Plan

Both servers must be running before any manual testing:

```bash
# Terminal 1 — API on http://localhost:5001
cd backend
bun run dev

# Terminal 2 — Web on http://localhost:5173
bun run --cwd ../frontend dev
```

Reset data whenever you want a clean slate:

```bash
cd backend
bun run db:reset
```

- Public app: http://localhost:5173
- Responder/admin dashboard: http://localhost:5173/dashboard/login (SSO)

Sign-in (seeded admin via SSO only — no passwords exist):
- Admin SSO account comes from `SEED_ADMIN_SUB` / `SEED_ADMIN_EMAIL`
  (values via VPS file, never committed). The admin scope `SAFE_CAMPUS`
  is granted by PM Production.

---

## 1. Automated backend tests

```bash
cd backend
bun run db:reset
bun test
```

Expect: all tests pass.

Covers: health, public services list, anonymous report creation + case-status
lookup (NSC- prefix), input validation (short description rejected),
disabled local login (POST /auth/login → 404), SSO `me` without token (401),
forged token (401), admin routes without token (401), backchannel-logout
validation (400 without logout_token).

---

## 2. Public pages (no login)

| # | URL | What to check |
|---|---|---|
| 1 | `/` | Landing page; three actions: report, find support, protection; staging banner |
| 2 | `/about` | Neutral "Tourism Foundation" page (Quick Exit target) |
| 3 | `/report` | Wizard step 1: choose a report type |
| 4 | `/report/safety` | Urgency assessment questions → recommended level |
| 5 | `/report/details` | Incident details; **short description is rejected with an error** |
| 6 | `/report/contact` | Choose **anonymous** or provide contact (phone/sms) |
| 7 | `/report/review` | Review everything → Submit → **Case ID** (e.g. `NSC-1008`) |
| 8 | `/case-status` | Enter the Case ID → status + timeline shown |
| 9 | `/support` | Service directory; filter by type (emergency/protection/psychosocial…) |
| 10 | `/protection` | Protection pathway steps |
| 11 | Quick Exit (on any sensitive page) | Navigates to `/about` |

---

## 3. SSO sign-in

1. Open `/dashboard/login` → page shows **"Masuk dengan SSO"** (no email/password fields,
   no demo credentials anywhere).
2. Click → redirected to the SSO portal (`VITE_SSO_PORTAL_URL/login`).
3. Sign in with an SSO account that has `role=admin` + `scopes[] ∋ SAFE_CAMPUS`
   → redirected to `/auth/callback` → lands on `/dashboard` with profile loaded.
4. Sign in with an SSO account WITHOUT the scope → `GET /api/v1/auth/me`
   succeeds (authenticated) but `/dashboard/admin/*` shows 403
   **"Forbidden — butuh admin Safe Campus. Hubungi admin."**
5. Invalid/expired token → 401 + prompt to sign in again (no internal reason leaked).

---

## 4. Responder dashboard (SSO session)

| # | Page | What to check |
|---|---|---|
| 1 | `/dashboard` | Stats (total, statuses, urgency), recent cases list |
| 2 | `/dashboard/cases` | Full case list; filters for status / urgency / type work |
| 3 | `/dashboard/cases/:id` (open NSC-1003) | Timeline, contacts, notes, referrals |
| 4 | Same case detail — **Assign** | Pick a responder (dropdown from `/admin/responders`) → case shows assigned |
| 5 | — **Change status** | e.g. → `UNDER_REVIEW` → event added to timeline |
| 6 | — **Add note** | Internal note appears in the notes list |
| 7 | — **Create referral** | Choose an active service → referral recorded |
| 8 | Cross-check | In the public app, `/case-status` with that Case ID shows the new status |

---

## 5. Admin panel (admin + SAFE_CAMPUS only)

After SSO login as admin, the sidebar shows the **Administration** section
(User accounts · Services · Activity log). Non-admins never see this section.

### 5.1 User accounts — `/dashboard/admin/users`

**Create an account** (no password — SSO only)
1. Fill: Full name (`Omar Bakri`), Email (`omar@ppkpt.nathara.ac.id`),
   Role (`Responder`), Scope (`NONE`).
2. Click **Create account** → the account appears in the list (Active badge).
3. Repeat with the same email → expect error **"An account with that email
   already exists"**.
4. Promote: edit role → `admin`, scope → `SAFE_CAMPUS` → admin routes open.

**Disable / enable**
- On a non-own account click **Disable** → badge changes to Disabled and the
  user is blocked (403/401). Click **Enable** to restore.

**Self lock-out guard (security check)**
- On your *own* account (the one marked **(you)**), the Disable button is absent /
  API returns **"You cannot modify your own account"**.

### 5.2 Service directory — `/dashboard/admin/services`

**Add**
1. Fill: Name (`Test Helpline`), Type (`psychosocial`), Description, Phone, Email, Availability.
2. Click **Add service** → appears in the list (Active badge).

**Edit**
- Click **Edit** → form header becomes "Edit service" and is pre-filled →
  change something → **Save changes** → list reflects the update.

**Deactivate**
- Click **Deactivate** → confirm dialog → badge changes to Inactive.
- Verify the deactivated service no longer appears on the **public** `/support` page.

### 5.3 Activity log — `/dashboard/admin/activity`

- Default: all events, newest first (description, case number, actor, role, time).
- Click the filter pills (All events / REPORT_CREATED / CASE_ASSIGNED /
  STATUS_CHANGED / REFERRAL_CREATED / NOTE_ADDED / CASE_CLOSED) → list filters.
- Perform an action (e.g. change a case status) in the responder dashboard,
  come back, and the new event appears at the top.

### 5.4 Role separation (security check)

1. As admin, visit `/dashboard/admin/users` → loads fine.
2. Log out → log in as a **non-admin SSO user** → the Administration section is **absent**
   from the sidebar.
3. While logged in as non-admin, manually open `/dashboard/admin/users` →
   expect redirect to `/dashboard` (not the page).
4. Try the API directly: `GET /api/v1/admin/users` with the non-admin token →
   expect **403**.

---

## 6. Production build check

```bash
bun run --cwd frontend build   # must compile without errors
```

---

## 7. Docker deployment (optional, needs Docker installed)

```bash
cp .env.example .env   # then edit POSTGRES_PASSWORD / SEED_ADMIN_*
docker compose up --build -d
# open http://localhost:8080
```

The `init` service applies the schema + migrations and seeds data once (idempotent).
