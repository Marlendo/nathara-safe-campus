const express = require("express");
const bcrypt = require("bcryptjs");

const { query } = require("../db");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { SERVICE_TYPES } = require("../utils/constants");

const router = express.Router();

router.use(requireAuth); // everything below requires a responder/admin JWT

/* ------------------------------------------------------------------ */
/*  Users / responder account management (ADMIN only)                  */
/* ------------------------------------------------------------------ */

// GET /admin/responders — active responders for assignment dropdowns
// (available to any authenticated responder/admin)
router.get("/responders", async (_req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT id, name FROM users
       WHERE role = 'RESPONDER' AND status = 'ACTIVE'
       ORDER BY name
    `);
    res.json({ users: rows });
  } catch (err) {
    next(err);
  }
});

// GET /admin/users
router.get("/users", requireAdmin, async (_req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT u.id, u.name, u.email, u.role, u.status, u.created_at,
             (SELECT count(*) FROM case_assignments ca WHERE ca.user_id = u.id)::int AS cases_assigned
        FROM users u
       ORDER BY u.name
    `);
    res.json({ users: rows });
  } catch (err) {
    next(err);
  }
});

// POST /admin/users  — create a responder or admin account
router.post("/users", requireAdmin, async (req, res, next) => {
  try {
    const { name, email, password, role = "RESPONDER" } = req.body || {};

    if (!name || String(name).trim().length < 2) {
      return res.status(400).json({ error: "name is required (min 2 characters)" });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "a valid email is required" });
    }
    if (!password || String(password).length < 8) {
      return res
        .status(400)
        .json({ error: "password must be at least 8 characters" });
    }
    if (!["RESPONDER", "ADMIN"].includes(role)) {
      return res.status(400).json({ error: "role must be RESPONDER or ADMIN" });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, status`,
      [String(name).trim(), email.toLowerCase().trim(), passwordHash, role]
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

// PATCH /admin/users/:id — update name, role, or status (disable/enable)
router.patch("/users/:id", requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, role, status } = req.body || {};

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

    if (role && !["RESPONDER", "ADMIN"].includes(role)) {
      return res.status(400).json({ error: "role must be RESPONDER or ADMIN" });
    }
    if (status && !["ACTIVE", "DISABLED"].includes(status)) {
      return res.status(400).json({ error: "status must be ACTIVE or DISABLED" });
    }

    const { rows } = await query(
      `UPDATE users
          SET name = COALESCE($1, name),
              role = COALESCE($2, role),
              status = COALESCE($3, status),
              updated_at = now()
        WHERE id = $4
        RETURNING id, name, email, role, status`,
      [
        name ? String(name).trim() : null,
        role || null,
        status || null,
        id,
      ]
    );

    res.json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /admin/users/:id/reset-password
router.post("/users/:id/reset-password", requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password } = req.body || {};

    if (!password || String(password).length < 8) {
      return res
        .status(400)
        .json({ error: "password must be at least 8 characters" });
    }

    const { rowCount } = await query(
      "UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2",
      [await bcrypt.hash(String(password), 10), id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------------ */
/*  Service directory management (ADMIN only)                          */
/* ------------------------------------------------------------------ */

// GET /admin/services
router.get("/services", requireAdmin, async (_req, res, next) => {
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
router.post("/services", requireAdmin, async (req, res, next) => {
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
router.patch("/services/:id", requireAdmin, async (req, res, next) => {
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
router.delete("/services/:id", requireAdmin, async (req, res, next) => {
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
/*  System activity (ADMIN only)                                       */
/* ------------------------------------------------------------------ */

// GET /admin/activity?limit=&type=
router.get("/activity", requireAdmin, async (req, res, next) => {
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