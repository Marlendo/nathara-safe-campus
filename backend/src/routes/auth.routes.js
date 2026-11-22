const express = require("express");

const { requireAuth, verifySsoToken, auditLogin } = require("../middleware/ssoAuth");

const router = express.Router();

/* ------------------------------------------------------------------ */
/*  Login password lokal DIMATIKAN TOTAL (SSO Supabase prod only).      */
/*  Endpoint lama balas 404 — jangan iklankan endpoint yang sudah mati. */
/* ------------------------------------------------------------------ */
router.all("/login", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// GET /api/v1/auth/me — profil lokal hasil mapping SSO
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

/* ------------------------------------------------------------------ */
/*  POST /api/v1/auth/backchannel-logout (OIDC backchannel, PM-0245)    */
/*  IdP memanggil ini saat logout terpusat. Sesi app bersifat           */
/*  stateless (JWT prod per-request, tanpa sesi server), jadi tidak ada  */
/*  sesi lokal yang perlu direvoke — panggil ini diakui 200 + audit.    */
/* ------------------------------------------------------------------ */
router.post("/backchannel-logout", async (req, res) => {
  const logoutToken = req.body && req.body.logout_token;
  if (!logoutToken) {
    return res.status(400).json({ error: "logout_token is required" });
  }
  try {
    const payload = await verifySsoToken(logoutToken);
    await auditLogin({
      sub: payload.sub ? String(payload.sub) : null,
      email: typeof payload.email === "string" ? payload.email : null,
      hasil: "backchannel-logout",
      ip: req.ip,
    });
  } catch {
    // Token logout tidak valid — tetap akui agar IdP tidak retry,
    // tapi catat sebagai invalid-token.
    await auditLogin({
      sub: null,
      email: null,
      hasil: "invalid-token",
      ip: req.ip,
    });
  }
  res.json({ ok: true });
});

module.exports = router;
