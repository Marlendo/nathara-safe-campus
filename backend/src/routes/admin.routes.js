const express = require("express");

const { query } = require("../db");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { STATUSES } = require("../utils/constants");

const router = express.Router();

router.use(requireAuth); // everything below requires a responder/admin JWT

/** Resolves a case_number (SP-1042) to an internal report id. */
async function resolveReport(caseNumber) {
  const { rows } = await query(
    "SELECT id, case_number FROM reports WHERE case_number = $1",
    [caseNumber]
  );
  return rows[0] || null;
}

/* ------------------------------------------------------------------ */
/*  Dashboard overview                                                */
/* ------------------------------------------------------------------ */

router.get("/overview", async (req, res, next) => {
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

/* ------------------------------------------------------------------ */
/*  Case list & detail                                                */
/* ------------------------------------------------------------------ */

router.get("/reports", async (req, res, next) => {
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

router.get("/reports/:caseNumber", async (req, res, next) => {
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

/* ------------------------------------------------------------------ */
/*  Case actions                                                      */
/* ------------------------------------------------------------------ */

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
      "SELECT id, name FROM users WHERE id = $1 AND role = 'RESPONDER'",
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
/*  Users (admin only) for assignment dropdowns                        */
/* ------------------------------------------------------------------ */

router.get("/users", requireAdmin, async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, name, email, role, status FROM users ORDER BY name`
    );
    res.json({ users: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;