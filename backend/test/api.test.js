import { describe, test, expect } from "bun:test";

/**
 * Nathara Safe Campus API smoke tests (SSO).
 *
 * Requires the API to be running (bun run dev in backend/) and a seeded
 * database (bun run db:reset). No password login exists anymore.
 * Run: bun test
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
  expect(status).toBe(200);
  expect(json.status).toBe("ok");
  expect(json.service).toBe("nathara-safe-campus-api");
});

test("services are listed publicly", async () => {
  const { status, json } = await req("/services");
  expect(status).toBe(200);
  expect(Array.isArray(json.services)).toBe(true);
  expect(json.services.length >= 1).toBe(true);
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
  expect(status).toBe(201);
  expect(json.caseNumber.startsWith("NSC-")).toBe(true);

  const lookup = await req(`/reports/${json.caseNumber}/status`);
  expect(lookup.status).toBe(200);
  expect(lookup.json.status).toBe("NEW");
  expect(Array.isArray(lookup.json.timeline)).toBe(true);
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
  expect(status).toBe(400);
});

test("local password login is gone (404)", async () => {
  const { status } = await req("/auth/login", {
    method: "POST",
    body: { email: "someone@ppkpt.nathara.ac.id", password: "whatever123" },
  });
  expect(status).toBe(404);
});

test("me without token is rejected (401)", async () => {
  const { status } = await req("/auth/me");
  expect(status).toBe(401);
});

test("me with a forged token is rejected (401)", async () => {
  const { status } = await req("/auth/me", { token: "forged.token.here" });
  expect(status).toBe(401);
});

test("admin endpoints require SSO auth (401 without token)", async () => {
  const { status } = await req("/admin/users");
  expect(status).toBe(401);
});

test("backchannel-logout without logout_token is rejected (400)", async () => {
  const { status } = await req("/auth/backchannel-logout", {
    method: "POST",
    body: {},
  });
  expect(status).toBe(400);
});

test("admin reports/mine without token is rejected (401)", async () => {
  const { status } = await req("/admin/reports/mine");
  expect(status).toBe(401);
});

test("backchannel-logout with garbage token is acknowledged (200, no audit spam)", async () => {
  const { status, json } = await req("/auth/backchannel-logout", {
    method: "POST",
    body: { logout_token: "sampah.bukan.token" },
  });
  expect(status).toBe(200);
  expect(json.ok).toBe(true);
});
