const jwt = require("jsonwebtoken");
const { query } = require("../db");

/**
 * Protects responder/admin routes.
 * Verifies the JWT, then loads the user from the DB so a disabled
 * account stops working immediately.
 */
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const { rows } = await query(
    "SELECT id, name, email, role, status FROM users WHERE id = $1",
    [payload.sub]
  );

  if (rows.length === 0) {
    return res.status(401).json({ error: "User no longer exists" });
  }

  const user = rows[0];
  if (user.status !== "ACTIVE") {
    return res.status(403).json({ error: "Account disabled" });
  }

  req.user = user;
  next();
}

/** Restricts a route to ADMIN role. */
function requireAdmin(req, res, next) {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Administrator role required" });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };