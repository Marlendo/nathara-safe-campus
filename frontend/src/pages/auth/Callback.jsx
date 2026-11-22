import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Card from "../../components/Card";
import { useAuth } from "../../features/auth/AuthContext";

/**
 * GET /auth/callback — tujuan redirect portal SSO.
 * Menukar authorization code → token SSO → profil lokal,
 * lalu kembali ke halaman tujuan semula.
 */
export default function Callback() {
  const { handleSsoCallback } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState("");
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const portalError = params.get("error");
    if (portalError) {
      setError(
        params.get("error_description") ||
          "SSO sign-in was cancelled or denied."
      );
      return;
    }

    const code = params.get("code");
    const state = params.get("state");
    if (!code) {
      setError("Missing authorization code — please try signing in again.");
      return;
    }

    handleSsoCallback(code, state)
      .then(() => {
        const to =
          sessionStorage.getItem("nsc_post_login") || "/dashboard";
        sessionStorage.removeItem("nsc_post_login");
        navigate(to, { replace: true });
      })
      .catch((err) => {
        if (err?.status === 403) {
          setError(
            "Forbidden — butuh admin Safe Campus. Hubungi admin."
          );
        } else {
          setError(err.message || "SSO sign-in failed.");
        }
      });
  }, [params, handleSsoCallback, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <Card className="w-full max-w-sm text-center">
        <p className="text-lg font-bold text-navy">Nathara Safe Campus</p>
        {error ? (
          <>
            <p className="mt-4 text-sm text-danger">{error}</p>
            <Link
              to="/dashboard/login"
              className="mt-6 inline-block rounded-lg border border-navy/15 px-4 py-2.5 text-sm font-semibold text-navy hover:bg-canvas"
            >
              Back to sign in
            </Link>
          </>
        ) : (
          <p className="mt-4 text-sm text-ink/60">
            Verifying SSO sign-in…
          </p>
        )}
      </Card>
    </div>
  );
}
