const express = require("express");

const { query } = require("../db");
const { requireAuth, requireAdminSc } = require("../middleware/ssoAuth");
const { SERVICE_TYPES, STATUSES } = require("../utils/constants");

const router = express.Router();

/** Petakan nilai legacy (ADMIN/RESPONDER) ke peran kanonis (admin/responder). */
function canonicalRole(value) {
  const v = String(value || "").trim().toLowerCase();
  if (v === "admin") return "admin";
  if (v === "responder") return "responder";
  return null;
}

/** Scope kanonis: exact match SAFE_CAMPUS atau NONE. */
function canonicalScope(value) {
  const v = String(value || "").trim();
  if (v === "SAFE_CAMPUS" || v === "NONE") return v;
  return null;
}

router.use(requireAuth); // everything below requires a valid SSO JWT

/* ------------------------------------------------------------------ */
/*  Case management (responders & admins)                              */
/* ------------------------------------------------------------------ */

/** Resolves a case_number (SP-1042) to an internal report id. */
async function resolveReport(caseNumber) {
  const { rows } = await query(
    "SELECT id, case_number FROM reports WHERE case_number = $1",
    [caseNumber]
  );
  return rows[0] || null;
}

// GET /admin/overview — dashboard stats (admin + SAFE_CAMPUS only;
// agregat + 10 kasus terbaru memuat data seluruh pelapor)
router.get("/overview", requireAdminSc, async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT
        COUNT(*)::int                                        AS total,
        COUNT(*) FILTER (WHERE urgency = 'immediate')::int    AS immediate,
        COUNT(*) FILTER (WHERE urgency = 'urgent')::int       AS urgent,
        COUNT(*) FILTER (WHERE urgency = 'concerning')::int   AS concerning,
        COUNT(*) FILTER (WHERE status IN ('NEW','UNDER_REVIEW','ASSIGNED','REFERRED','FOLLOW_UP'))::int AS open_cases
      FROM reports
    `);

    const stats = rows[0];

    const { rows: recent } = await query(`
      SELECT r.case_number, r.report_type, r.urgency, r.status, r.created_at,
             a.user_name AS assigned_to
        FROM reports r
        LEFT JOIN LATERAL (
          SELECT u.name AS user_name
            FROM case_assignments ca
            JOIN users u ON u.id = ca.user_id
           WHERE ca.report_id = r.id AND ca.unassigned_at IS NULL
           ORDER BY ca.assigned_at DESC
           LIMIT 1
        ) a ON true
       ORDER BY r.created_at DESC
       LIMIT 10
    `);

    res.json({ stats, recent });
  } catch (err) {
    next(err);
  }
});

// GET /admin/reports — case list (admin + SAFE_CAMPUS only)
router.get("/reports", requireAdminSc, async (req, res, next) => {
  try {
    const { status, urgency, reportType } = req.query;

    let sql = `
      SELECT r.case_number, r.report_type, r.urgency, r.status, r.reporter_type,
             description, r.created_at,
             a.user_name AS assigned_to
        FROM reports r
        LEFT JOIN LATERAL (
          SELECT u.name AS user_name
            FROM case_assignments ca
            JOIN users u ON u.id = ca.user_id
           WHERE ca.report_id = r.id AND ca.unassigned_at IS NULL
           ORDER BY ca.assigned_at DESC
           LIMIT 1
        ) a ON true
       WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (status) {
      sql += ` AND r.status = $${idx++}`;
      params.push(status.toUpperCase());
    }
    if (urgency) {
      sql += ` AND r.urgency = $${idx++}`;
      params.push(urgency);
    }
    if (reportType) {
      sql += ` AND r.report_type = $${idx++}`;
      params.push(reportType);
    }

    sql += " ORDER BY r.created_at DESC";

    const { rows } = await query(sql, params);
    res.json({ reports: rows });
  } catch (err) {
    next(err);
  }
});

// GET /admin/reports/mine — laporan milik pelapor yang sedang login.
// (F1 Opsi A: satu-satunya endpoint baca-kasus untuk non-admin.
//  Filter kepemilikan WHERE submitted_by_user_id = req.user.id.
//  TANPA reporter_contacts — minimasi PII. Didefinisikan SEBELUM
//  /reports/:caseNumber agar "mine" tidak ditangkap param caseNumber.)
router.get("/reports/mine", async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT r.case_number, r.report_type, r.urgency, r.status, r.created_at
         FROM reports r
        WHERE r.submitted_by_user_id = $1
        ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    res.json({ reports: rows });
  } catch (err) {
    next(err);
  }
});

// GET /admin/reports/:caseNumber — full case detail (admin + SAFE_CAMPUS
// only; memuat reporter_contacts = PII pelapor)
router.get("/reports/:caseNumber", requireAdminSc, async (req, res, next) => {
  try {
    const { caseNumber } = req.params;

    const { rows: reportRows } = await query(
      `SELECT r.*, a.user_id AS assigned_user_id, a.user_name AS assigned_to
         FROM reports r
         LEFT JOIN LATERAL (
           SELECT ca.user_id, u.name AS user_name
             FROM case_assignments ca
             JOIN users u ON u.id = ca.user_id
            WHERE ca.report_id = r.id AND ca.unassigned_at IS NULL
            ORDER BY ca.assigned_at DESC
            LIMIT 1
         ) a ON true
        WHERE r.case_number = $1`,
      [caseNumber]
    );

    if (reportRows.length === 0) {
      return res.status(404).json({ error: "Case not found" });
    }

    const report = reportRows[0];

    const { rows: contacts } = await query(
      "SELECT id, contact_method, contact_value, safe_to_contact FROM reporter_contacts WHERE report_id = $1",
      [report.id]
    );

    const { rows: notes } = await query(
      `SELECT cn.id, cn.note, cn.created_at, u.name AS author
         FROM case_notes cn
         JOIN users u ON u.id = cn.user_id
        WHERE cn.report_id = $1
        ORDER BY cn.created_at DESC`,
      [report.id]
    );

    const { rows: referrals } = await query(
      `SELECT rf.id, rf.status, rf.referred_at, rf.completed_at, rf.notes,
              s.name AS service_name, s.service_type
         FROM referrals rf
         JOIN services s ON s.id = rf.service_id
        WHERE rf.report_id = $1
        ORDER BY rf.referred_at DESC`,
      [report.id]
    );

    const { rows: events } = await query(
      `SELECT ev.event_type, ev.description, ev.created_at, u.name AS user_name
         FROM case_events ev
         LEFT JOIN users u ON u.id = ev.user_id
        WHERE ev.report_id = $1
        ORDER BY ev.created_at ASC`,
      [report.id]
    );

    res.json({ report, contacts, notes, referrals, events });
  } catch (err) {
    next(err);
  }
});

// POST /admin/reports/:caseNumber/assign
router.post("/reports/:caseNumber/assign", async (req, res, next) => {
  try {
    const { caseNumber } = req.params;
    const { userId } = req.body || {};

    const report = await resolveReport(caseNumber);
    if (!report) return res.status(404).json({ error: "Case not found" });

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const { rows: userRows } = await query(
      "SELECT id, name FROM users WHERE id = $1 AND role = 'responder'",
      [userId]
    );
    if (userRows.length === 0) {
      return res.status(400).json({ error: "Responder not found" });
    }

    // Close any existing active assignment
    await query(
      "UPDATE case_assignments SET unassigned_at = now() WHERE report_id = $1 AND unassigned_at IS NULL",
      [report.id]
    );

    await query(
      "INSERT INTO case_assignments (report_id, user_id) VALUES ($1, $2)",
      [report.id, userId]
    );

    // If the case was still NEW, move it to ASSIGNED
    await query(
      `UPDATE reports SET status = CASE WHEN status = 'NEW' THEN 'ASSIGNED' ELSE status END
        WHERE id = $1`,
      [report.id]
    );

    await query(
      `INSERT INTO case_events (report_id, user_id, event_type, description)
       VALUES ($1, $2, 'CASE_ASSIGNED', $3)`,
      [report.id, req.user.id, `Case assigned to ${userRows[0].name}`]
    );

    res.json({ ok: true, assignedTo: userRows[0].name });
  } catch (err) {
    next(err);
  }
});

// PATCH /admin/reports/:caseNumber/status
router.patch("/reports/:caseNumber/status", async (req, res, next) => {
  try {
    const { caseNumber } = req.params;
    const { status } = req.body || {};

    const report = await resolveReport(caseNumber);
    if (!report) return res.status(404).json({ error: "Case not found" });

    if (!STATUSES.includes(status)) {
      return res
        .status(400)
        .json({ error: `status must be one of: ${STATUSES.join(", ")}` });
    }

    await query(
      "UPDATE reports SET status = $1, updated_at = now() WHERE id = $2",
      [status, report.id]
    );

    const eventType = status === "CLOSED" ? "CASE_CLOSED" : "STATUS_CHANGED";
    const description =
      status === "CLOSED" ? "Case closed" : `Status changed to ${status.replace(/_/g, " ")}`;

    await query(
      `INSERT INTO case_events (report_id, user_id, event_type, description)
       VALUES ($1, $2, $3, $4)`,
      [report.id, req.user.id, eventType, description]
    );

    res.json({ ok: true, status, caseNumber: report.case_number });
  } catch (err) {
    next(err);
  }
});

// POST /admin/reports/:caseNumber/notes
router.post("/reports/:caseNumber/notes", async (req, res, next) => {
  try {
    const { caseNumber } = req.params;
    const { note } = req.body || {};

    const report = await resolveReport(caseNumber);
    if (!report) return res.status(404).json({ error: "Case not found" });

    if (!note || String(note).trim().length < 2) {
      return res.status(400).json({ error: "note is required" });
    }

    const { rows } = await query(
      `INSERT INTO case_notes (report_id, user_id, note)
       VALUES ($1, $2, $3)
       RETURNING id, note, created_at`,
      [report.id, req.user.id, String(note).trim()]
    );

    await query(
      `INSERT INTO case_events (report_id, user_id, event_type, description)
       VALUES ($1, $2, 'NOTE_ADDED', 'Internal note added')`,
      [report.id, req.user.id]
    );

    res.status(201).json({ note: rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /admin/reports/:caseNumber/referrals
router.post("/reports/:caseNumber/referrals", async (req, res, next) => {
  try {
    const { caseNumber } = req.params;
    const { serviceId, notes } = req.body || {};

    const report = await resolveReport(caseNumber);
    if (!report) return res.status(404).json({ error: "Case not found" });

    if (!serviceId) {
      return res.status(400).json({ error: "serviceId is required" });
    }

    const { rows: svcRows } = await query(
      "SELECT id, name, service_type FROM services WHERE id = $1 AND status = 'ACTIVE'",
      [serviceId]
    );
    if (svcRows.length === 0) {
      return res.status(400).json({ error: "Service not found" });
    }

    const { rows } = await query(
      `INSERT INTO referrals (report_id, service_id, status, notes)
       VALUES ($1, $2, 'REFERRED', $3)
       RETURNING id, status, referred_at`,
      [report.id, serviceId, notes ? String(notes).trim() : null]
    );

    // Move the case to REFERRED if it isn't already further along
    await query(
      `UPDATE reports
          SET status = CASE
            WHEN status IN ('NEW') THEN 'REFERRED'
            ELSE status
          END
        WHERE id = $1`,
      [report.id]
    );

    await query(
      `INSERT INTO case_events (report_id, user_id, event_type, description)
       VALUES ($1, $2, 'REFERRAL_CREATED', $3)`,
      [report.id, req.user.id, `Referral created: ${svcRows[0].name}`]
    );

    res.status(201).json({
      referral: rows[0],
      service: { id: svcRows[0].id, name: svcRows[0].name },
    });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------------ */
/*  Users / responder account management (admin + SAFE_CAMPUS only)    */
/*  Akun dibuat TANPA password — akses via SSO; peran/scope dipetakan  */
/*  dari klaim prod ke profil lokal. Tidak ada reset-password.         */
/* ------------------------------------------------------------------ */

// GET /admin/responders — active responders for assignment dropdowns
// (admin + SAFE_CAMPUS only; direktori internal, bukan untuk pelapor)
router.get("/responders", requireAdminSc, async (_req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT id, name FROM users
       WHERE role = 'responder' AND status = 'ACTIVE'
       ORDER BY name
    `);
    res.json({ users: rows });
  } catch (err) {
    next(err);
  }
});

// GET /admin/users
router.get("/users", requireAdminSc, async (_req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT u.id, u.name, u.email, u.role, u.scope, u.status, u.created_at,
             (SELECT count(*) FROM case_assignments ca WHERE ca.user_id = u.id)::int AS cases_assigned
        FROM users u
       ORDER BY u.name
    `);
    res.json({ users: rows });
  } catch (err) {
    next(err);
  }
});

// POST /admin/users — create a responder or admin account (no password, SSO only)
router.post("/users", requireAdminSc, async (req, res, next) => {
  try {
    const { name, email, role = "responder", scope = "NONE" } = req.body || {};

    if (!name || String(name).trim().length < 2) {
      return res.status(400).json({ error: "name is required (min 2 characters)" });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "a valid email is required" });
    }
    const canonRole = canonicalRole(role);
    if (!canonRole) {
      return res.status(400).json({ error: "role must be responder or admin" });
    }
    const canonScope = canonicalScope(scope);
    if (!canonScope) {
      return res.status(400).json({ error: "scope must be NONE or SAFE_CAMPUS" });
    }

    const { rows } = await query(
      `INSERT INTO users (name, email, role, scope)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, scope, status`,
      [String(name).trim(), email.toLowerCase().trim(), canonRole, canonScope]
    ).catch((err) => {
      if (err.code === "23505") {
        const e = new Error("An account with that email already exists");
        e.status = 409;
        throw e;
      }
      throw err;
    });

    res.status(201).json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /admin/users/:id — update name, role, scope, or status (disable/enable)
router.patch("/users/:id", requireAdminSc, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, role, scope, status } = req.body || {};

    const { rows: existing } = await query(
      "SELECT id, role FROM users WHERE id = $1",
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Never allow an admin to disable/change their own account (lock-out guard).
    if (Number(id) === req.user.id) {
      return res.status(400).json({
        error: "You cannot modify your own account",
      });
    }

    let canonRole = null;
    if (role) {
      canonRole = canonicalRole(role);
      if (!canonRole) {
        return res.status(400).json({ error: "role must be responder or admin" });
      }
    }
    let canonScope = null;
    if (scope) {
      canonScope = canonicalScope(scope);
      if (!canonScope) {
        return res.status(400).json({ error: "scope must be NONE or SAFE_CAMPUS" });
      }
    }
    if (status && !["ACTIVE", "DISABLED"].includes(status)) {
      return res.status(400).json({ error: "status must be ACTIVE or DISABLED" });
    }

    const { rows } = await query(
      `UPDATE users
          SET name = COALESCE($1, name),
              role = COALESCE($2, role),
              scope = COALESCE($3, scope),
              status = COALESCE($4, status),
              updated_at = now()
        WHERE id = $5
        RETURNING id, name, email, role, scope, status`,
      [
        name ? String(name).trim() : null,
        canonRole,
        canonScope,
        status || null,
        id,
      ]
    );

    res.json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------------ */
/*  Service directory management (admin + SAFE_CAMPUS only)            */
/* ------------------------------------------------------------------ */

// GET /admin/services
router.get("/services", requireAdminSc, async (_req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT id, name, service_type, description, phone, email, availability, status, created_at
        FROM services
       ORDER BY service_type, name
    `);
    res.json({ services: rows });
  } catch (err) {
    next(err);
  }
});

// POST /admin/services
router.post("/services", requireAdminSc, async (req, res, next) => {
  try {
    const { name, serviceType, description, phone, email, availability } =
      req.body || {};

    if (!name || String(name).trim().length < 2) {
      return res.status(400).json({ error: "name is required (min 2 characters)" });
    }
    if (!SERVICE_TYPES.includes(serviceType)) {
      return res.status(400).json({
        error: `serviceType must be one of: ${SERVICE_TYPES.join(", ")}`,
      });
    }

    const { rows } = await query(
      `INSERT INTO services (name, service_type, description, phone, email, availability)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, service_type, description, phone, email, availability, status`,
      [
        String(name).trim(),
        serviceType,
        description ? String(description).trim() : null,
        phone ? String(phone).trim() : null,
        email ? String(email).trim() : null,
        availability ? String(availability).trim() : null,
      ]
    );

    res.status(201).json({ service: rows[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /admin/services/:id
router.patch("/services/:id", requireAdminSc, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, serviceType, description, phone, email, availability, status } =
      req.body || {};

    if (serviceType && !SERVICE_TYPES.includes(serviceType)) {
      return res.status(400).json({
        error: `serviceType must be one of: ${SERVICE_TYPES.join(", ")}`,
      });
    }
    if (status && !["ACTIVE", "INACTIVE"].includes(status)) {
      return res.status(400).json({ error: "status must be ACTIVE or INACTIVE" });
    }

    const { rows } = await query(
      `UPDATE services
          SET name = COALESCE($1, name),
              service_type = COALESCE($2, service_type),
              description = COALESCE($3, description),
              phone = COALESCE($4, phone),
              email = COALESCE($5, email),
              availability = COALESCE($6, availability),
              status = COALESCE($7, status)
        WHERE id = $8
        RETURNING id, name, service_type, description, phone, email, availability, status`,
      [
        name ? String(name).trim() : null,
        serviceType || null,
        description !== undefined ? description : null,
        phone !== undefined ? phone : null,
        email !== undefined ? email : null,
        availability !== undefined ? availability : null,
        status || null,
        id,
      ]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Service not found" });
    }

    res.json({ service: rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /admin/services/:id — soft delete via INACTIVE status
router.delete("/services/:id", requireAdminSc, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      "UPDATE services SET status = 'INACTIVE' WHERE id = $1 AND status = 'ACTIVE' RETURNING id",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Service not found or already inactive" });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------------ */
/*  System activity (admin + SAFE_CAMPUS only)                           */
/* ------------------------------------------------------------------ */

// GET /admin/activity?limit=&type=
router.get("/activity", requireAdminSc, async (req, res, next) => {
  try {
    const { type } = req.query;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);

    let sql = `
      SELECT ev.id, ev.event_type, ev.description, ev.created_at,
             r.case_number, r.urgency AS case_urgency,
             u.name AS user_name, u.role AS user_role
        FROM case_events ev
        LEFT JOIN reports r ON r.id = ev.report_id
        LEFT JOIN users u ON u.id = ev.user_id
       WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (type) {
      sql += ` AND ev.event_type = $${idx++}`;
      params.push(type);
    }

    sql += " ORDER BY ev.created_at DESC LIMIT $" + idx;
    params.push(limit);

    const { rows } = await query(sql, params);
    res.json({ events: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;