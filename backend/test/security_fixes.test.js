import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import express from "express";

/**
 * Security follow-up tests (F1–F5, sec_safecampus_0001_sso).
 *
 * SATU view per modul (pelajaran: mock.module bun 1.4.4 mengganti live
 * binding SEMUA importer saat factory dievaluasi lazy — dua view dari
 * modul yang sama dalam satu file tidak stabil). Maka ssoAuth + router
 * dipakai ASLI; yang di-mock hanya dependensi: src/db.js, jose,
 * global.fetch. Ini sekaligus menguji rantai produksi penuh
 * (verify → provision → guard → handler).
 *
 * Token Bearer `tok-admin` / `tok-responder` / `tok-bentrok` / ... dipetakan
 * ke payload JWT oleh stub jose (terprogram via `ctl`), diverifikasi
 * terhadap cache JWKS yang di-seed (kid k-test, tanpa network).
 */

const USERS = [
  { id: 1, name: "Admin SC", email: "admin@ppkpt.nathara.ac.id", role: "admin", scope: "SAFE_CAMPUS", status: "ACTIVE" },
  { id: 2, name: "Responder", email: "responder@ppkpt.nathara.ac.id", role: "responder", scope: "NONE", status: "ACTIVE" },
];

const REPORTS = [
  { id: 101, case_number: "NSC-9001", report_type: "threat", urgency: "urgent", status: "NEW", reporter_type: "contact", description: "milik admin", created_at: "2026-11-22T10:00:00.000Z", submitted_by_user_id: 1 },
  { id: 102, case_number: "NSC-9002", report_type: "abuse", urgency: "concerning", status: "NEW", reporter_type: "anonymous", description: "milik responder", created_at: "2026-11-22T11:00:00.000Z", submitted_by_user_id: 2 },
  { id: 103, case_number: "NSC-9003", report_type: "threat", urgency: "info", status: "NEW", reporter_type: "anonymous", description: "anonim", created_at: "2026-11-22T12:00:00.000Z", submitted_by_user_id: null },
];

function pick(r, keys) {
  const o = {};
  for (const k of keys) o[k] = r[k];
  return o;
}

// Kontrol terprogram untuk stub (di-reset di beforeEach).
const ctl = {
  // (token) => payload klaim | throw. Default: throw (→401).
  jwtBehavior: null,
  usersInsertConflict: false, // F5: INSERT users → 23505
};
const AUDITS = [];

mock.module("../src/db.js", () => ({
  pool: null,
  query: async (sql, params = []) => {
    // GET /admin/reports/mine — filter kepemilikan by req.user.id
    if (sql.includes("submitted_by_user_id")) {
      const rows = REPORTS.filter((r) => r.submitted_by_user_id === params[0]).map((r) =>
        pick(r, ["case_number", "report_type", "urgency", "status", "created_at"])
      );
      return { rows };
    }
    if (sql.includes("COUNT(*)")) {
      return { rows: [{ total: 3, immediate: 0, urgent: 1, concerning: 1, open_cases: 3 }] };
    }
    if (sql.includes("LIMIT 10")) {
      return {
        rows: REPORTS.map((r) => ({
          case_number: r.case_number, report_type: r.report_type, urgency: r.urgency,
          status: r.status, created_at: r.created_at, assigned_to: null,
        })),
      };
    }
    if (sql.includes("r.case_number = $1")) {
      const r = REPORTS.find((x) => x.case_number === params[0]);
      if (!r) return { rows: [] };
      return { rows: [{ ...r, assigned_user_id: null, assigned_to: null }] };
    }
    if (sql.includes("WHERE 1=1")) {
      return {
        rows: REPORTS.map((r) => ({
          case_number: r.case_number, report_type: r.report_type, urgency: r.urgency,
          status: r.status, reporter_type: r.reporter_type, description: r.description,
          created_at: r.created_at, assigned_to: null,
        })),
      };
    }
    if (sql.includes("FROM reporter_contacts")) {
      return { rows: [{ id: 1, contact_method: "email", contact_value: "pelapor@example.id", safe_to_contact: true }] };
    }
    if (sql.includes("FROM case_notes") || sql.includes("FROM referrals rf") || sql.includes("FROM case_events ev")) {
      return { rows: [] };
    }
    if (sql.includes("role = 'responder'")) {
      return { rows: USERS.filter((u) => u.role === "responder").map((u) => pick(u, ["id", "name"])) };
    }
    if (sql.includes("cases_assigned")) {
      return { rows: USERS.map((u) => ({ ...pick(u, ["id", "name", "email", "role", "scope", "status"]), created_at: "2026-11-22T00:00:00.000Z", cases_assigned: 0 })) };
    }
    // --- jalur requireAuth asli ---
    if (sql.includes("FROM users WHERE supabase_sub")) {
      const sub = params[0];
      const u = USERS.find(
        (x) =>
          (sub === "sub-admin" && x.id === 1) ||
          (sub === "sub-responder" && x.id === 2) ||
          (sub === "sub-disabled" && x.id === 3)
      );
      if (u) return { rows: [{ ...u }] };
      if (sub === "sub-disabled") {
        return { rows: [{ id: 3, name: "Disabled", email: "d@example.id", role: "responder", scope: "NONE", status: "DISABLED" }] };
      }
      return { rows: [] }; // sub baru → jalur INSERT (auto-provision)
    }
    if (sql.includes("INSERT INTO users")) {
      if (ctl.usersInsertConflict) {
        const err = new Error('duplicate key value violates unique constraint "users_email_key"');
        err.code = "23505";
        throw err;
      }
      return { rows: [{ id: 99, name: "Baru", email: "baru@example.id", role: "responder", scope: "NONE", status: "ACTIVE" }] };
    }
    if (sql.includes("UPDATE users SET email")) {
      return { rows: [{ id: 1, name: "Admin SC", email: params[0], role: "admin", scope: "SAFE_CAMPUS", status: "ACTIVE" }] };
    }
    if (sql.includes("sso_login_audit")) {
      AUDITS.push({ sql, params });
      return { rows: [] };
    }
    throw new Error(`fake db: unhandled SQL: ${sql.slice(0, 80)}`);
  },
}));

mock.module("jose", () => ({
  decodeProtectedHeader: () => ({ alg: "RS256", kid: "k-test" }),
  importJWK: async () => ({}),
  jwtVerify: async (token) => {
    if (typeof ctl.jwtBehavior === "function") return ctl.jwtBehavior(token);
    throw new Error("Invalid or expired token");
  },
}));

// Modul ASLI (dapat db fake + jose stub di atas).
const sso = await import("../src/middleware/ssoAuth.js");
const adminRoutes = (await import("../src/routes/admin.routes.js")).default;
const authRoutes = (await import("../src/routes/auth.routes.js")).default;

const FAKE_JWK = { kid: "k-test", kty: "RSA", alg: "RS256", n: "x", e: "AQAB" };

function appAndBase() {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/admin", adminRoutes);
  app.use("/api/v1/auth", authRoutes);
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: "Internal server error" });
  });
  return app;
}

let base;
let server;

async function req(path, { method = "GET", body, token } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch { /* no body */ }
  return { status: res.status, json };
}

const TOK = {
  admin: "tok-admin",
  responder: "tok-responder",
  disabled: "tok-disabled",
  bentrok: "tok-bentrok",
  sampah: "sampah.bukan.token",
  accessTanpaKlaim: "access-token-tanpa-klaim-logout",
  logoutTanpaSub: "logout-tanpa-sub",
  logoutSid: "logout-with-sid",
  logoutEvents: "logout-with-events",
};

function payloadFor(token) {
  switch (token) {
    case TOK.admin:
      return { sub: "sub-admin", email: "admin@ppkpt.nathara.ac.id", name: "Admin SC" };
    case TOK.responder:
      return { sub: "sub-responder", email: "responder@ppkpt.nathara.ac.id", name: "Responder" };
    case TOK.disabled:
      return { sub: "sub-disabled", email: "d@example.id", name: "Disabled" };
    case TOK.bentrok:
      return { sub: "sub-bentrok", email: "bentrok@example.id", name: "User Bentrok" };
    case TOK.logoutSid:
      return { sub: "sub-1", email: "a@example.id", sid: "sess-1" };
    case TOK.logoutEvents:
      return { sub: "sub-1", email: "a@example.id", events: { "http://schemas.openid.net/event/backchannel-logout": {} } };
    case TOK.accessTanpaKlaim:
      return { sub: "sub-1", email: "a@example.id" };
    case TOK.logoutTanpaSub:
      return { sid: "sess-1" };
    default:
      throw new Error("Invalid or expired token");
  }
}

beforeEach(() => {
  ctl.usersInsertConflict = false;
  ctl.jwtBehavior = async (token) => ({ payload: payloadFor(token) });
  AUDITS.length = 0;
  sso._jwksTest.reset();
  sso._jwksTest.seed([FAKE_JWK]); // cache segar kid k-test → tanpa network
});

afterEach(() => {
  ctl.jwtBehavior = null;
});

/* ================= F1 ================= */

describe("F1 — endpoint baca kasus dikunci requireAdminSc (rantai asli)", () => {
  test("setup app", async () => {
    server = appAndBase().listen(0);
    await new Promise((r) => server.once("listening", r));
    base = `http://localhost:${server.address().port}/api/v1`;
    expect(base.startsWith("http://localhost:")).toBe(true);
  });

  const locked = ["/admin/overview", "/admin/reports", "/admin/reports/NSC-9001", "/admin/responders"];

  for (const p of locked) {
    test(`non-admin → 403 di ${p}`, async () => {
      const { status, json } = await req(p, { token: TOK.responder });
      expect(status).toBe(403);
      expect(json.error).toMatch(/admin/i);
    });
  }

  for (const p of locked) {
    test(`tanpa token → 401 di ${p}`, async () => {
      const { status } = await req(p);
      expect(status).toBe(401);
    });
  }

  test(`token sampah → 401 di /admin/overview`, async () => {
    const { status } = await req("/admin/overview", { token: TOK.sampah });
    expect(status).toBe(401);
  });

  test(`akun DISABLED → 403 di /admin/overview`, async () => {
    const { status } = await req("/admin/overview", { token: TOK.disabled });
    expect(status).toBe(403);
  });

  test("admin → 200 di /admin/overview (+stats+recent)", async () => {
    const { status, json } = await req("/admin/overview", { token: TOK.admin });
    expect(status).toBe(200);
    expect(json.stats.total).toBe(3);
    expect(Array.isArray(json.recent)).toBe(true);
  });

  test("admin → 200 di /admin/reports (list)", async () => {
    const { status, json } = await req("/admin/reports", { token: TOK.admin });
    expect(status).toBe(200);
    expect(json.reports.length).toBe(3);
  });

  test("admin → 200 di /admin/reports/:caseNumber (+contacts PII)", async () => {
    const { status, json } = await req("/admin/reports/NSC-9001", { token: TOK.admin });
    expect(status).toBe(200);
    expect(json.report.case_number).toBe("NSC-9001");
    expect(Array.isArray(json.contacts)).toBe(true);
    expect(json.contacts.length).toBe(1);
  });

  test("admin → 200 di /admin/responders", async () => {
    const { status, json } = await req("/admin/responders", { token: TOK.admin });
    expect(status).toBe(200);
    expect(json.users.length).toBe(1);
  });

  test("admin → 404 untuk case tak dikenal (bukan bocor)", async () => {
    const { status } = await req("/admin/reports/NSC-0000", { token: TOK.admin });
    expect(status).toBe(404);
  });
});

describe("F1 — GET /admin/reports/mine milik-pelapor", () => {
  test("responder hanya melihat miliknya (NSC-9002)", async () => {
    const { status, json } = await req("/admin/reports/mine", { token: TOK.responder });
    expect(status).toBe(200);
    expect(json.reports.length).toBe(1);
    expect(json.reports[0].case_number).toBe("NSC-9002");
  });

  test("admin hanya melihat miliknya (NSC-9001) — bukan semua", async () => {
    const { status, json } = await req("/admin/reports/mine", { token: TOK.admin });
    expect(status).toBe(200);
    expect(json.reports.length).toBe(1);
    expect(json.reports[0].case_number).toBe("NSC-9001");
  });

  test("mine TANPA contacts/description (minimasi PII)", async () => {
    const { json } = await req("/admin/reports/mine", { token: TOK.responder });
    expect("contacts" in json).toBe(false);
    expect("description" in json.reports[0]).toBe(false);
  });

  test("mine tanpa token → 401", async () => {
    const { status } = await req("/admin/reports/mine");
    expect(status).toBe(401);
  });
});

/* ================= F3 ================= */

describe("F3 — validasi klaim logout backchannel", () => {
  async function postLogout(logout_token) {
    return req("/auth/backchannel-logout", { method: "POST", body: { logout_token } });
  }

  test("tanpa logout_token → 400", async () => {
    const { status } = await req("/auth/backchannel-logout", { method: "POST", body: {} });
    expect(status).toBe(400);
    expect(AUDITS.length).toBe(0);
  });

  test("token invalid → 200 TANPA audit (dulu: baris invalid-token)", async () => {
    const { status, json } = await postLogout(TOK.sampah);
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(AUDITS.length).toBe(0);
  });

  test("access token biasa (tanpa sid/events) → 200 TANPA audit", async () => {
    const { status } = await postLogout(TOK.accessTanpaKlaim);
    expect(status).toBe(200);
    expect(AUDITS.length).toBe(0);
  });

  test("logout token tanpa sub → 200 TANPA audit", async () => {
    const { status } = await postLogout(TOK.logoutTanpaSub);
    expect(status).toBe(200);
    expect(AUDITS.length).toBe(0);
  });

  test("logout token dgn sid → 200 + audit backchannel-logout", async () => {
    const { status } = await postLogout(TOK.logoutSid);
    expect(status).toBe(200);
    expect(AUDITS.length).toBe(1);
    expect(AUDITS[0].params.includes("backchannel-logout")).toBe(true);
    expect(AUDITS[0].params.includes("sub-1")).toBe(true);
  });

  test("logout token dgn events → 200 + audit backchannel-logout", async () => {
    const { status } = await postLogout(TOK.logoutEvents);
    expect(status).toBe(200);
    expect(AUDITS.length).toBe(1);
    expect(AUDITS[0].params.includes("backchannel-logout")).toBe(true);
  });
});

/* ================= F4 ================= */

describe("F4 — serve-stale JWKS + backoff", () => {
  const realFetch = globalThis.fetch;
  let fetchCalls;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  function failFetch() {
    fetchCalls = 0;
    globalThis.fetch = async () => {
      fetchCalls += 1;
      throw new Error("IdP down (simulasi)");
    };
  }
  function okFetch(keys) {
    fetchCalls = 0;
    globalThis.fetch = async () => {
      fetchCalls += 1;
      return { ok: true, json: async () => ({ keys }) };
    };
  }

  const OLD_KEY = { kid: "k-lama", kty: "RSA", alg: "RS256", n: "x", e: "AQAB" };

  test("konstanta backoff ≥ 60 dtk (spec)", () => {
    expect(sso._ssoConfig.JWKS_RETRY_MIN_MS).toBeGreaterThanOrEqual(60000);
    expect(sso._ssoConfig.JWKS_TTL_MS).toBe(10 * 60 * 1000);
  });

  test("cache basi dipakai saat fetch gagal (serve-stale)", async () => {
    sso._jwksTest.seed([OLD_KEY], Date.now() - 11 * 60 * 1000);
    failFetch();
    const jwk = await sso._jwksTest.get("k-lama");
    expect(jwk && jwk.kid).toBe("k-lama");
    expect(fetchCalls).toBe(1);
  });

  test("selama backoff TIDAK hantam IdP tiap request", async () => {
    sso._jwksTest.seed([OLD_KEY], Date.now() - 11 * 60 * 1000);
    failFetch();
    await sso._jwksTest.get("k-lama");
    expect(fetchCalls).toBe(1);
    const again = await sso._jwksTest.get("k-lama");
    expect(again && again.kid).toBe("k-lama");
    expect(fetchCalls).toBe(1);
    expect(await sso._jwksTest.get("kid-tak-dikenal")).toBeNull();
    expect(fetchCalls).toBe(1);
  });

  test("tanpa cache + fetch gagal → throw (auth jadi 401)", async () => {
    sso._jwksTest.reset(); // kosongkan seed beforeEach → benar-benar tanpa cache
    failFetch();
    let threw = false;
    try {
      await sso._jwksTest.get("k-apa-pun");
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
    expect(fetchCalls).toBe(1);
  });

  test("fetch sukses menyegarkan cache + reset backoff", async () => {
    failFetch();
    try {
      await sso._jwksTest.get("x");
    } catch { /* expected */ }
    expect(sso._jwksTest.state().fetchFailedAt).toBeGreaterThan(0);
    okFetch([{ kid: "k-baru", kty: "RSA", alg: "RS256", n: "y", e: "AQAB" }]);
    expect(await sso._jwksTest.get("k-baru")).toBeNull(); // masih backoff
    sso._jwksTest.seed([], Date.now() - 11 * 60 * 1000); // backoff lewat
    okFetch([{ kid: "k-baru", kty: "RSA", alg: "RS256", n: "y", e: "AQAB" }]);
    const jwk = await sso._jwksTest.get("k-baru");
    expect(jwk && jwk.kid).toBe("k-baru");
    expect(sso._jwksTest.state().fetchFailedAt).toBe(0);
  });
});

/* ================= F5 ================= */

describe("F5 — 23505 auto-provision → 409 + audit conflict", () => {
  test("email bentrok → 409 (bukan 500) + audit conflict", async () => {
    ctl.usersInsertConflict = true;
    const { status, json } = await req("/admin/overview", { token: TOK.bentrok });
    expect(status).toBe(409);
    expect(json.error).toMatch(/hubungi admin/i);
    const conflicts = AUDITS.filter((a) => a.params.includes("conflict"));
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].params.includes("sub-bentrok")).toBe(true);
  });
});

describe("teardown", () => {
  test("tutup server", async () => {
    await new Promise((r) => server.close(r));
  });
});
