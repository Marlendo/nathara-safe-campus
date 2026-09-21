import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import Button from "../../components/Button";
import Card from "../../components/Card";
import { useAuth } from "../../features/auth/AuthContext";

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("responder@safepath.demo");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");

  const from = location.state?.from?.pathname || "/dashboard";

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <Card className="w-full max-w-sm">
        <Link to="/" className="text-2xl font-bold text-navy">
          SAFE<span className="text-safety">Path</span>
        </Link>
        <h1 className="mt-4 text-lg font-bold text-navy">Protection Responder</h1>
        <p className="text-sm text-ink/60">Sign in to manage cases.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-semibold">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-navy/15 bg-white px-3 py-2 text-sm focus:border-safety focus:outline-none focus:ring-2 focus:ring-safety/30"
            />
          </div>
          <div>
            <label className="text-sm font-semibold">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-navy/15 bg-white px-3 py-2 text-sm focus:border-safety focus:outline-none focus:ring-2 focus:ring-safety/30"
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-4 rounded-lg bg-canvas px-3 py-2 text-xs text-ink/60">
          Demo account pre-filled. Password: <code>demo1234</code>
        </p>

        <Link
          to="/"
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-navy/15 px-4 py-2.5 text-sm font-semibold text-navy hover:bg-canvas"
        >
          <span aria-hidden="true">←</span> Back to SafePath system
        </Link>
      </Card>
    </div>
  );
}