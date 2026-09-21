const test = require("node:test");
const assert = require("node:assert/strict");

/**
 * SafePath API smoke tests.
 *
 * Requires the API to be running (npm run dev in backend/) and a seeded
 * database (npm run db:reset). Run: npm test
 */

const BASE = process.env.TEST_API_BASE || "http://localhost:5001/api/v1";

async function req(path, { method = "GET", body, token } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* no body */
  }
  return { status: res.status, json };
}

test("health endpoint responds", async () => {
  const { status, json } = await req("/health");
  assert.equal(status, 200);
  assert.equal(json.status, "ok");
});

test("services are listed publicly", async () => {
  const { status, json } = await req("/services");
  assert.equal(status, 200);
  assert.ok(Array.isArray(json.services));
  assert.ok(json.services.length >= 1);
});

test("anonymous report can be created and looked up by case number", async () => {
  const { status, json } = await req("/reports", {
    method: "POST",
    body: {
      reportType: "harassment",
      urgency: "concerning",
      description: "Automated test report — not a real incident.",
      incidentDate: "2026-09-21",
      location: "Test City",
      currentSafety: "yes",
      reporterType: "anonymous",
    },
  });
  assert.equal(status, 201);
  assert.ok(json.caseNumber.startsWith("SP-"));

  const lookup = await req(`/reports/${json.caseNumber}/status`);
  assert.equal(lookup.status, 200);
  assert.equal(lookup.json.status, "NEW");
  assert.ok(Array.isArray(lookup.json.timeline));
});

test("report validation rejects short descriptions", async () => {
  const { status } = await req("/reports", {
    method: "POST",
    body: {
      reportType: "threat",
      urgency: "urgent",
      description: "short",
      reporterType: "anonymous",
    },
  });
  assert.equal(status, 400);
});

test("responder login works and admin endpoints reject responders", async () => {
  const login = await req("/auth/login", {
    method: "POST",
    body: { email: "responder@safepath.demo", password: "demo1234" },
  });
  assert.equal(login.status, 200);
  assert.ok(login.json.token);
  const token = login.json.token;

  // Responder can hit the overview
  const overview = await req("/admin/overview", { token });
  assert.equal(overview.status, 200);

  // But is denied from admin-only user management
  const users = await req("/admin/users", { token });
  assert.equal(users.status, 403);
});

test("admin login can list users and read activity log", async () => {
  const login = await req("/auth/login", {
    method: "POST",
    body: { email: "admin@safepath.demo", password: "demo1234" },
  });
  assert.equal(login.status, 200);
  const token = login.json.token;

  const users = await req("/admin/users", { token });
  assert.equal(users.status, 200);
  assert.ok(Array.isArray(users.json.users));

  const activity = await req("/admin/activity?limit=5", { token });
  assert.equal(activity.status, 200);
  assert.ok(Array.isArray(activity.json.events));
});

test("invalid login is rejected", async () => {
  const { status } = await req("/auth/login", {
    method: "POST",
    body: { email: "responder@safepath.demo", password: "wrong-password" },
  });
  assert.equal(status, 401);
});