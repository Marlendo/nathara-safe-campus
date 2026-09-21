const rateLimit = require("express-rate-limit");

/**
 * Rate limiting for PUBLIC endpoints (report submission, case-status and
 * service lookups). DNS lookups are disabled so failures don't crash the
 * process on some hosts.
 */
const publicLimiter = rateLimit({
  windowMs: Number(process.env.RATE_WINDOW_MS) || 10 * 60 * 1000, // 10 minutes
  max: Number(process.env.RATE_MAX) || 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — please try again later" },
});

/** Stricter limiter for the login endpoint. */
const loginLimiter = rateLimit({
  windowMs: Number(process.env.RATE_WINDOW_MS) || 10 * 60 * 1000,
  max: Number(process.env.RATE_MAX) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts — please wait and try again" },
});

module.exports = { publicLimiter, loginLimiter };