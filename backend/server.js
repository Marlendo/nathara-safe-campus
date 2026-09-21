require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const authRoutes = require("./src/routes/auth.routes");
const reportRoutes = require("./src/routes/report.routes");
const serviceRoutes = require("./src/routes/service.routes");
const adminRoutes = require("./src/routes/admin.routes");

const app = express();

// Privacy first: never log request bodies (they may contain report data).
app.disable("x-powered-by");
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "512kb" }));

// Basic request log WITHOUT body content.
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

app.get("/api/v1/health", (_req, res) => {
  res.json({ status: "ok", service: "safepath-api" });
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
  console.log(`SafePath API listening on http://localhost:${PORT}`);
});