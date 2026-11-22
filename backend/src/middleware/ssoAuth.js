const { jwtVerify, decodeProtectedHeader, importJWK } = require("jose");
const { query } = require("../db");

/* ------------------------------------------------------------------ */
/*  SSO auth — Nathara Safe Campus                                      */
/*                                                                     */
/*  Satu-satunya jalan masuk = JWT prod Supabase (RS256 via JWKS).     */
/*  Login password lokal DIMATIKAN TOTAL.                               */
/*                                                                     */
/*  Kontrak SSOT (PM Production, FINAL PM-0245):                       */
/*    JWKS     https://api.nathara.ac.id/functions/v1/sso-jwks         */
/*               (kid sso-prod-2026-11, RS256 only)                     */
/*    iss      https://sso.nathara.ac.id                               */
/*    aud      ppkpt                                                   */
/*    klaim    role=admin + scopes[] memuat SAFE_CAMPUS (exact)         */
/*    TTL      900 dtk; skew +-60 dtk; JWKS cache 10 mnt                */
/*                                                                     */
/*  Guard baca PROFIL LOKAL hasil mapping (bukan klaim mentah) supaya   */
/*  revoke/disable lokal langsung berlaku. DILARANG cache decision.     */
/* ------------------------------------------------------------------ */

const SSO_JWKS_URL =
  process.env.SSO_JWKS_URL ||
  "https://api.nathara.ac.id/functions/v1/sso-jwks";
const SSO_ISSUER = process.env.SSO_ISSUER || "https://sso.nathara.ac.id";
const SSO_AUDIENCE = process.env.SSO_AUDIENCE || "ppkpt";

// Cache HANYA kunci JWKS (bukan decision user). TTL 10 menit.
const JWKS_TTL_MS = 10 * 60 * 1000;
const CLOCK_SKEW_SEC = 60;
let jwksCache = { keys: new Map(), fetchedAt: 0 };

async function fetchJwks() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(SSO_JWKS_URL, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`JWKS fetch failed: HTTP ${res.status}`);
    }
    const data = await res.json();
    if (!Array.isArray(data.keys)) {
      throw new Error("JWKS response has no keys array");
    }
    const map = new Map();
    for (const k of data.keys) {
      if (k.kid) map.set(k.kid, k);
    }
    jwksCache = { keys: map, fetchedAt: Date.now() };
  } finally {
    clearTimeout(timer);
  }
}

async function getJwk(kid, forceRefresh = false) {
  const stale = Date.now() - jwksCache.fetchedAt > JWKS_TTL_MS;
  if (forceRefresh || stale || jwksCache.keys.size === 0) {
    await fetchJwks();
  }
  let jwk = jwksCache.keys.get(kid);
  if (!jwk && !forceRefresh) {
    // Kemungkinan rotasi kid — refresh sekali lalu coba lagi.
    await fetchJwks();
    jwk = jwksCache.keys.get(kid);
  }
  return jwk || null;
}

/**
 * Verifikasi JWT prod via JWKS. Melempar Error bila tidak valid.
 * Mengembalikan payload klaim (sub, email, name, role, scopes).
 */
async function verifySsoToken(token) {
  let header;
  try {
    header = decodeProtectedHeader(token);
  } catch {
    throw new Error("Malformed token");
  }

  // RS256 only — tolak none/HS256/algoritma lain (anti downgrade).
  if (header.alg !== "RS256") {
    throw new Error("Unsupported token algorithm");
  }
  if (!header.kid) {
    throw new Error("Token key id missing");
  }

  const jwk = await getJwk(header.kid);
  if (!jwk) {
    throw new Error("Unknown signing key");
  }

  const key = await importJWK(jwk, "RS256");
  const { payload } = await jwtVerify(token, key, {
    issuer: SSO_ISSUER,
    audience: SSO_AUDIENCE,
    clockTolerance: CLOCK_SKEW_SEC,
  });

  if (!payload.sub) {
    throw new Error("Token subject missing");
  }
  return payload;
}

/** Audit login TANPA token (tidak pernah menyimpan token). */
async function auditLogin({ sub, email, hasil, ip }) {
  try {
    await query(
      `INSERT INTO sso_login_audit (supabase_sub, email, hasil, ip)
       VALUES ($1, $2, $3, $4)`,
      [sub || null, email || null, hasil, ip || null]
    );
  } catch {
    // Audit tidak boleh menggagalkan auth (mis. tabel belum migrasi).
  }
}

function scopesOf(payload) {
  if (Array.isArray(payload.scopes)) return payload.scopes;
  if (typeof payload.scope === "string") return payload.scope.split(" ");
  return [];
}

/**
 * requireAuth — JWT SSO prod valid + profil lokal ACTIVE.
 * Auto-provision by supabase_sub bila baris belum ada (default
 * non-admin: role responder + scope NONE, least privilege).
 * Promosi ke admin HANYA via admin aktif / seed awal.
 */
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  let payload;
  try {
    payload = await verifySsoToken(token);
  } catch {
    await auditLogin({ sub: null, email: null, hasil: "invalid-token", ip: req.ip });
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const sub = String(payload.sub);
  const email =
    typeof payload.email === "string" ? payload.email.toLowerCase().trim() : null;
  const name =
    typeof payload.name === "string" && payload.name.trim()
      ? payload.name.trim()
      : email || "SSO user";

  try {
    const { rows } = await query(
      "SELECT id, name, email, role, scope, status FROM users WHERE supabase_sub = $1",
      [sub]
    );

    let user = rows[0];
    if (!user) {
      if (!email) {
        await auditLogin({ sub, email, hasil: "invalid-token", ip: req.ip });
        return res.status(401).json({ error: "Invalid or expired token" });
      }
      const created = await query(
        `INSERT INTO users (name, email, supabase_sub, role, scope, status)
         VALUES ($1, $2, $3, 'responder', 'NONE', 'ACTIVE')
         ON CONFLICT (supabase_sub) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name
         RETURNING id, name, email, role, scope, status`,
        [name, email, sub]
      );
      user = created.rows[0];
      await auditLogin({ sub, email, hasil: "created", ip: req.ip });
    } else {
      // Sinkronkan identitas dasar dari IdP; role/scope/status tetap milik lokal.
      if (email && (email !== user.email || name !== user.name)) {
        const updated = await query(
          `UPDATE users SET email = $1, name = $2, updated_at = now()
            WHERE id = $3 RETURNING id, name, email, role, scope, status`,
          [email, name, user.id]
        );
        user = updated.rows[0];
      }
      await auditLogin({ sub, email: user.email, hasil: "ok", ip: req.ip });
    }

    if (user.status !== "ACTIVE") {
      await auditLogin({ sub, email: user.email, hasil: "disabled", ip: req.ip });
      return res.status(403).json({ error: "Account disabled" });
    }

    req.user = user;
    req.sso = { sub, scopes: scopesOf(payload) };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * requireAdminSc — guard kanonis: role === 'admin' && scope === 'SAFE_CAMPUS'
 * (exact match, case-sensitive). Selain itu default deny → 403 jelas.
 */
function requireAdminSc(req, res, next) {
  if (req.user && req.user.role === "admin" && req.user.scope === "SAFE_CAMPUS") {
    return next();
  }
  return res
    .status(403)
    .json({ error: "Forbidden — butuh admin Safe Campus. Hubungi admin." });
}

module.exports = {
  requireAuth,
  requireAdminSc,
  verifySsoToken,
  auditLogin,
  // Diekspor untuk test: jangan dipakai untuk cache decision di manapun.
  _ssoConfig: { SSO_JWKS_URL, SSO_ISSUER, SSO_AUDIENCE },
};
