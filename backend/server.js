require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const { publicLimiter, loginLimiter } = require("./src/middleware/rateLimit");

const authRoutes = require("./src/routes/auth.routes");
const reportRoutes = require("./src/routes/report.routes");
const serviceRoutes = require("./src/routes/service.routes");
const adminRoutes = require("./src/routes/admin.routes");

/* ------------------------------------------------------------------ */
/*  Fail fast on missing critical config                               */
/* ------------------------------------------------------------------ */
const isProd = process.env.NODE_ENV === "production";
const missing = [];
if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "change-me-safepath-dev-secret") {
  if (isProd) missing.push("JWT_SECRET (set a strong production secret)");
}
if (missing.length > 0) {
  console.error(`Missing required environment variable(s): ${missing.join(", ")}`);
  if (isProd) process.exit(1);
}

const app = express();

// Privacy first: never log request bodies (they may contain report data).
app.disable("x-powered-by");
app.use(helmet());
app.use(cors());

// Trust proxy only when explicitly enabled (behind nginx/ELB in production).
if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}

// Public endpoints are rate-limited.
app.use("/api/v1/reports", publicLimiter);
app.use("/api/v1/services", publicLimiter);
app.use("/api/v1/auth/login", loginLimiter);

app.use(express.json({ limit: "512kb" }));

// Basic request log WITHOUT body content.
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

app.get("/api/v1/health", (_req, res) => {
  res.json({ status: "ok", service: "safepath-api", env: process.env.NODE_ENV || "development" });
});

// A neutral, public page target for client-side "quick exit" — returns plain HTML.
app.get("/about", (_req, res) => {
  res
    .type("html")
    .send(
      "<!doctype html><html><head><title>Tourism Foundation</title></head><body style='font-family:system-ui;padding:3rem'><h1>Tourism Foundation</h1><p>This looks like a perfectly ordinary website.</p></body></html>"
    );
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/services", serviceRoutes);
app.use("/api/v1/admin", adminRoutes);

// 404
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Central error handler — never echo err.stack to the client.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err.message);
  res.status(err.status || 500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`SafePath API listening on http://localhost:${PORT} (${isProd ? "production" : "development"})`);
});