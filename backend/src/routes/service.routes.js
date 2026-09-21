const express = require("express");

const { query } = require("../db");
const { SERVICE_TYPES } = require("../utils/constants");

const router = express.Router();

/**
 * GET /api/v1/services
 * Optional: ?type=medical  (see SERVICE_TYPES)
 */
router.get("/", async (req, res, next) => {
  try {
    const { type } = req.query;

    let sql = `
      SELECT id, name, service_type, description, phone, email, availability
        FROM services
       WHERE status = 'ACTIVE'
    `;
    const params = [];

    if (type) {
      if (!SERVICE_TYPES.includes(type)) {
        return res
          .status(400)
          .json({ error: `type must be one of: ${SERVICE_TYPES.join(", ")}` });
      }
      sql += " AND service_type = $1";
      params.push(type);
    }

    sql += " ORDER BY service_type, name";

    const { rows } = await query(sql, params);
    res.json({ services: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;