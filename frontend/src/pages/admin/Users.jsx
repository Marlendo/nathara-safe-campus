import { useEffect, useState } from "react";
import Button from "../../components/Button";
import Badge from "../../components/Badge";
import Card from "../../components/Card";
import Input, { Field } from "../../components/forms";
import { useAuth } from "../../features/auth/AuthContext";
import api from "../../services/api";
import { formatDate } from "../../utils/validation";

const EMPTY = { name: "", email: "", password: "", role: "RESPONDER" };

export default function Users() {
  const { token, user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () => {
    api
      .getUsers(token)
      .then((d) => setUsers(d.users))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const createUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.createUser(token, form);
      setForm(EMPTY);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (u) => {
    setError("");
    try {
      await api.updateUser(token, u.id, {
        status: u.status === "ACTIVE" ? "DISABLED" : "ACTIVE",
      });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const resetPassword = async (u) => {
    const pw = window.prompt(`New password for ${u.name} (min 8 characters):`);
    if (!pw) return;
    if (pw.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setError("");
    try {
      await api.resetPassword(token, u.id, pw);
      window.alert("Password updated.");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">Responder accounts</h1>
      <p className="mt-1 text-sm text-ink/60">
        Create and manage responder and admin accounts.
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Create user */}
        <Card>
          <h2 className="font-bold text-navy">Create account</h2>
          <form onSubmit={createUser} className="mt-4 space-y-4">
            <Field label="Full name">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Omar Bakri"
                required
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="omar@safepath.demo"
                required
              />
            </Field>
            <Field label="Temporary password">
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="min 8 characters"
                required
              />
            </Field>
            <Field label="Role">
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full rounded-lg border border-navy/15 bg-white px-3 py-2 text-sm"
              >
                <option value="RESPONDER">Responder</option>
                <option value="ADMIN">Admin</option>
              </select>
            </Field>
            <Button type="submit" variant="primary" className="w-full" disabled={saving}>
              {saving ? "Creating…" : "Create account"}
            </Button>
          </form>
        </Card>

        {/* User list */}
        <Card className="lg:col-span-2">
          <h2 className="font-bold text-navy">Accounts ({users.length})</h2>
          {loading ? (
            <p className="py-8 text-center text-sm text-ink/50">Loading…</p>
          ) : (
            <div className="mt-4 space-y-3">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-navy/10 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-navy">
                      {u.name}
                      {u.id === me?.id && (
                        <span className="ml-2 text-xs text-safety">(you)</span>
                      )}
                    </p>
                    <p className="text-xs text-ink/60">{u.email}</p>
                    <p className="text-xs text-ink/50">
                      {u.cases_assigned} case(s) assigned · joined {formatDate(u.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={u.role === "ADMIN" ? "navy" : "protect"}>
                      {u.role === "ADMIN" ? "Admin" : "Responder"}
                    </Badge>
                    <Badge tone={u.status === "ACTIVE" ? "protect" : "danger"}>
                      {u.status === "ACTIVE" ? "Active" : "Disabled"}
                    </Badge>
                    {u.id !== me?.id && (
                      <>
                        <Button
                          variant={u.status === "ACTIVE" ? "danger" : "protect"}
                          size="sm"
                          onClick={() => toggleStatus(u)}
                        >
                          {u.status === "ACTIVE" ? "Disable" : "Enable"}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => resetPassword(u)}>
                          Reset password
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}