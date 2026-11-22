import { useState } from "react";
import { useNavigate, useLocation, Link, useSearchParams } from "react-router-dom";
import Button from "../../components/Button";
import Card from "../../components/Card";
import { useAuth } from "../../features/auth/AuthContext";

export default function Login() {
  const { loginWithSso, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [error, setError] = useState(() => params.get("error") || "");

  const from = location.state?.from?.pathname || "/dashboard";

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      // Simpan tujuan lalu redirect ke portal SSO (PKCE).
      sessionStorage.setItem("nsc_post_login", from);
      await loginWithSso();
      // loginWithSso me-redirect ke portal — tidak ada navigasi lokal.
      void navigate;
    } catch (err) {
      setError(err.message || "Sign in failed");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <Card className="w-full max-w-sm">
        <Link to="/" className="text-2xl font-bold text-navy">
          Nathara Safe Campus
        </Link>
        <h1 className="mt-4 text-lg font-bold text-navy">Protection Responder</h1>
        <p className="text-sm text-ink/60">
          Sign in with your Nathara SSO account to manage cases.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? "Redirecting…" : "Masuk dengan SSO"}
          </Button>
        </form>

        <p className="mt-4 rounded-lg bg-canvas px-3 py-2 text-xs text-ink/60">
          No local password. Access requires an SSO account with Safe Campus
          scope — contact your admin if you see a 403.
        </p>

        <Link
          to="/"
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-navy/15 px-4 py-2.5 text-sm font-semibold text-navy hover:bg-canvas"
        >
          <span aria-hidden="true">←</span> Back to Nathara Safe Campus
        </Link>
      </Card>
    </div>
  );
}
