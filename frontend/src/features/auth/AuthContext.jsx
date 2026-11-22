import { createContext, useContext, useMemo, useState } from "react";
import api from "../../services/api";

const AuthContext = createContext(null);

const TOKEN_KEY = "nsc_token";
const USER_KEY = "nsc_user";
const VERIFIER_KEY = "nsc_pkce_verifier";
const STATE_KEY = "nsc_sso_state";

const SSO_CLIENT_ID = import.meta.env.VITE_SSO_CLIENT_ID || "ppkpt";
const SSO_PORTAL_URL =
  import.meta.env.VITE_SSO_PORTAL_URL || "https://sso.nathara.ac.id";
const SSO_TOKEN_URL =
  import.meta.env.VITE_SSO_TOKEN_URL ||
  "https://api.nathara.ac.id/functions/v1/sso-token";

function callbackUrl() {
  return `${window.location.origin}/auth/callback`;
}

/** PKCE helpers (S256). */
function randomString(length = 64) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "")
    .slice(0, length);
}

async function pkceChallenge(verifier) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(
    () => sessionStorage.getItem(TOKEN_KEY) || null
  );
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(USER_KEY) || "null");
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  /** Mulai login SSO: PKCE → redirect ke portal. */
  const loginWithSso = async () => {
    setLoading(true);
    try {
      const verifier = randomString(64);
      const challenge = await pkceChallenge(verifier);
      const state = randomString(32);
      sessionStorage.setItem(VERIFIER_KEY, verifier);
      sessionStorage.setItem(STATE_KEY, state);
      const params = new URLSearchParams({
        client_id: SSO_CLIENT_ID,
        redirect_uri: callbackUrl(),
        response_type: "code",
        code_challenge: challenge,
        code_challenge_method: "S256",
        state,
      });
      window.location.assign(`${SSO_PORTAL_URL}/login?${params.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  /** Exchange authorization code → token SSO → profil lokal. */
  const handleSsoCallback = async (code, state) => {
    setLoading(true);
    try {
      const expected = sessionStorage.getItem(STATE_KEY);
      if (!state || !expected || state !== expected) {
        throw new Error("Invalid SSO state — please try signing in again.");
      }
      const verifier = sessionStorage.getItem(VERIFIER_KEY);
      if (!verifier) {
        throw new Error("SSO session expired — please try signing in again.");
      }
      const res = await fetch(SSO_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code,
          code_verifier: verifier,
          client_id: SSO_CLIENT_ID,
          redirect_uri: callbackUrl(),
        }),
      });
      if (!res.ok) {
        throw new Error("SSO exchange failed — please try signing in again.");
      }
      const data = await res.json();
      const ssoToken = data.access_token || data.token || data.id_token;
      if (!ssoToken) {
        throw new Error("SSO exchange returned no token.");
      }
      const me = await api.getMe(ssoToken);
      // Auth token only — report data is never written to browser storage.
      sessionStorage.setItem(TOKEN_KEY, ssoToken);
      sessionStorage.setItem(USER_KEY, JSON.stringify(me.user));
      sessionStorage.removeItem(VERIFIER_KEY);
      sessionStorage.removeItem(STATE_KEY);
      setToken(ssoToken);
      setUser(me.user);
      return me.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(VERIFIER_KEY);
    sessionStorage.removeItem(STATE_KEY);
    setToken(null);
    setUser(null);
    const params = new URLSearchParams({
      client_id: SSO_CLIENT_ID,
      post_logout_redirect_uri: `${window.location.origin}/`,
    });
    window.location.assign(`${SSO_PORTAL_URL}/logout?${params.toString()}`);
  };

  /** Logout lokal saja (tanpa redirect portal) — untuk sesi 401/403. */
  const clearSession = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      loginWithSso,
      handleSsoCallback,
      logout,
      clearSession,
      loading,
      isAuthenticated: Boolean(token),
      isAdmin: user?.role === "admin" && user?.scope === "SAFE_CAMPUS",
    }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
