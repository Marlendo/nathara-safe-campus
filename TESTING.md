# SafePath — Test Plan

Both servers must be running before any manual testing:

```powershell
# Terminal 1 — API on http://localhost:5001
cd backend
npm run dev

# Terminal 2 — Web on http://localhost:5173
cd frontend
npm run dev
```

Reset demo data whenever you want a clean slate:

```powershell
cd backend
npm run db:reset
```

- Public app: http://localhost:5173
- Responder/admin dashboard: http://localhost:5173/dashboard/login

Demo accounts (seeded, fictional data only):

| Role | Email | Password |
|---|---|---|
| Responder | responder@safepath.demo | demo1234 |
| Admin | admin@safepath.demo | demo1234 |

---

## 1. Automated backend tests

```powershell
cd backend
npm run db:reset
npm test
```

Expect: `tests 7 · pass 7 · fail 0`.

Covers: health, public services list, anonymous report creation + case-status
lookup, input validation (short description rejected), responder login + RBAC
(responder blocked from admin-only routes), admin login + activity log, invalid
login rejected.

---

## 2. Public pages (no login)

| # | URL | What to check |
|---|---|---|
| 1 | `/` | Landing page; three actions: report, find support, protection; DEMO banner |
| 2 | `/about` | Neutral "Tourism Foundation" page (Quick Exit target) |
| 3 | `/report` | Wizard step 1: choose a report type |
| 4 | `/report/safety` | Urgency assessment questions → recommended level |
| 5 | `/report/details` | Incident details; **short description is rejected with an error** |
| 6 | `/report/contact` | Choose **anonymous** or provide contact (phone/sms) |
| 7 | `/report/review` | Review everything → Submit → **Case ID** (e.g. `SP-1008`) |
| 8 | `/case-status` | Enter the Case ID → status + timeline shown |
| 9 | `/support` | Service directory; filter by type (emergency/protection/psychosocial…) |
| 10 | `/protection` | Protection pathway steps |
| 11 | Quick Exit (on any sensitive page) | Navigates to `/about` |

---

## 3. Responder dashboard

Login: `responder@safepath.demo` / `demo1234`

| # | Page | What to check |
|---|---|---|
| 1 | `/dashboard` | Stats (total, statuses, urgency), recent cases list |
| 2 | `/dashboard/cases` | Full case list; filters for status / urgency / type work |
| 3 | `/dashboard/cases/:id` (open SP-1003) | Timeline, contacts, notes, referrals |
| 4 | Same case detail — **Assign** | Pick a responder (dropdown from `/admin/responders`) → case shows assigned |
| 5 | — **Change status** | e.g. → `UNDER_REVIEW` → event added to timeline |
| 6 | — **Add note** | Internal note appears in the notes list |
| 7 | — **Create referral** | Choose an active service → referral recorded |
| 8 | Cross-check | In the public app, `/case-status` with that Case ID shows the new status |

---

## 4. Admin panel (admin only)

Login: `admin@safepath.demo` / `demo1234`

After login, the sidebar shows the **Administration** section
(User accounts · Services · Activity log). Responders never see this section.

### 4.1 User accounts — `/dashboard/admin/users`

**Create an account**
1. Fill: Full name (`Omar Bakri`), Email (`omar@safepath.demo`), Temporary
   password (≥ 8 chars, e.g. `temp1234`), Role (`Responder`).
2. Click **Create account** → the account appears in the list (Active badge).
3. Repeat with the same email → expect error **"An account with that email
   already exists"**.
4. Repeat with an 4-char password → expect a clear validation error.

**Disable / enable**
- On the new account click **Disable** → badge changes to Disabled and the
  user can no longer log in. Click **Enable** to restore.

**Reset password**
- Click **Reset password** → enter a new password (≥ 8 chars) → "Password
  updated" alert.

**Self lock-out guard (security check)**
- On your *own* account (the one marked **(you)**), click **Disable** →
  expect error **"You cannot modify your own account"**.

### 4.2 Service directory — `/dashboard/admin/services`

**Add**
1. Fill: Name (`Test Helpline`), Type (`psychosocial`), Description, Phone, Email, Availability.
2. Click **Add service** → appears in the list (Active badge).

**Edit**
- Click **Edit** → form header becomes "Edit service" and is pre-filled →
  change something → **Save changes** → list reflects the update.

**Deactivate**
- Click **Deactivate** → confirm dialog → badge changes to Inactive.
- Verify the deactivated service no longer appears in the **public** `/support` page.

### 4.3 Activity log — `/dashboard/admin/activity`

- Default: all events, newest first (description, case number, actor, role, time).
- Click the filter pills (All events / REPORT_CREATED / CASE_ASSIGNED /
  STATUS_CHANGED / REFERRAL_CREATED / NOTE_ADDED / CASE_CLOSED) → list filters.
- Perform an action (e.g. change a case status) in the responder dashboard,
  come back, and the new event appears at the top.

### 4.4 Role separation (security check)

1. As admin, visit `/dashboard/admin/users` → loads fine.
2. Log out → log in as **responder** → the Administration section is **absent**
   from the sidebar.
3. While logged in as responder, manually open `/dashboard/admin/users` →
   expect redirect to `/dashboard` (not the page).
4. Try the API directly: `GET /api/v1/admin/users` with the responder token →
   expect **403**.

---

## 5. Production build check

```powershell
cd frontend
npm run build   # must compile without errors
```

---

## 6. Docker deployment (optional, needs Docker installed)

```powershell
xcopy /E /I .env.example .env   # then edit JWT_SECRET / POSTGRES_PASSWORD
docker compose up --build -d
# open http://localhost:8080
```

The `init` service applies the schema and seeds demo data once (idempotent).