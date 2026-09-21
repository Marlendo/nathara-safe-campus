const express = require("express");

const { query } = require("../db");
const {
  REPORT_TYPES,
  URGENCY,
  SAFETY,
  REPORTER,
  CONTACT_METHODS,
} = require("../utils/constants");

const router = express.Router();

/**
 * POST /api/v1/reports — public, anonymous-friendly report creation.
 */
router.post("/", async (req, res, next) => {
  try {
    const {
      reportType,
      urgency,
      description,
      incidentDate,
      location,
      currentSafety,
      perpetratorNearby,
      reporterType,
      contactMethod,
      contactValue,
    } = req.body || {};

    // --- Validation ---
    if (!REPORT_TYPES.includes(reportType)) {
      return res
        .status(400)
        .json({ error: `reportType must be one of: ${REPORT_TYPES.join(", ")}` });
    }
    if (!URGENCY.includes(urgency)) {
      return res.status(400).json({ error: "Invalid urgency value" });
    }
    if (!description || String(description).trim().length < 10) {
      return res
        .status(400)
        .json({ error: "description must be at least 10 characters" });
    }
    if (currentSafety && !SAFETY.includes(currentSafety)) {
      return res.status(400).json({ error: "Invalid currentSafety value" });
    }
    if (!REPORTER.includes(reporterType)) {
      return res.status(400).json({ error: "Invalid reporterType" });
    }
    if (reporterType === "contact") {
      if (!CONTACT_METHODS.includes(contactMethod)) {
        return res
          .status(400)
          .json({ error: "contactMethod is required when providing contact" });
      }
      if (!contactValue || String(contactValue).trim().length < 3) {
        return res
          .status(400)
          .json({ error: "contactValue is required when providing contact" });
      }
    }

    // --- Create the report ---
    const caseNumber = await nextCaseNumber();

    const { rows } = await query(
      `INSERT INTO reports
         (case_number, report_type, urgency, status, description,
          incident_date, location, current_safety, perpetrator_nearby, reporter_type)
       VALUES ($1, $2, $3, 'NEW', $4, $5, $6, $7, $8, $9)
       RETURNING id, case_number, urgency, status, created_at`,
      [
        caseNumber,
        reportType,
        urgency,
        String(description).trim(),
        incidentDate || null,
        location ? String(location).trim() : null,
        currentSafety || null,
        perpetratorNearby == null ? null : Boolean(perpetratorNearby),
        reporterType,
      ]
    );

    const report = rows[0];

    // --- Optional reporter contact (kept in a separate table) ---
    if (reporterType === "contact") {
      await query(
        `INSERT INTO reporter_contacts (report_id, contact_method, contact_value, safe_to_contact)
         VALUES ($1, $2, $3, true)`,
        [report.id, contactMethod, String(contactValue).trim()]
      );
    }

    // --- Timeline event ---
    await query(
      `INSERT INTO case_events (report_id, event_type, description)
       VALUES ($1, 'REPORT_CREATED', $2)`,
      [report.id, "Report received"]
    );

    res.status(201).json({
      caseNumber: report.case_number,
      status: report.status,
      urgency: report.urgency,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/reports/:caseNumber/status — public case-status lookup.
 */
router.get("/:caseNumber/status", async (req, res, next) => {
  try {
    const { caseNumber } = req.params;

    const { rows } = await query(
      "SELECT id, case_number, status, urgency, report_type, created_at FROM reports WHERE case_number = $1",
      [caseNumber]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Case not found" });
    }

    const report = rows[0];

    const { rows: events } = await query(
      `SELECT event_type, description, created_at
         FROM case_events
        WHERE report_id = $1
        ORDER BY created_at ASC`,
      [report.id]
    );

    res.json({
      caseNumber: report.case_number,
      status: report.status,
      urgency: report.urgency,
      reportType: report.report_type,
      reportedAt: report.created_at,
      timeline: events.map((e) => ({
        eventType: e.event_type,
        description: e.description,
        createdAt: e.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});

/** Generates a sequential SP-XXXX case number. */
async function nextCaseNumber() {
  const { rows } = await query("SELECT nextval('case_seq') AS n");
  return `SP-${rows[0].n}`;
}

module.exports = router;