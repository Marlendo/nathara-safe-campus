import { useEffect, useState } from "react";
import Button from "../../components/Button";
import Badge from "../../components/Badge";
import Card from "../../components/Card";
import Input, { Field } from "../../components/forms";
import { useAuth } from "../../features/auth/AuthContext";
import api from "../../services/api";
import { formatDate } from "../../utils/validation";

const EMPTY = { name: "", email: "", role: "responder", scope: "NONE" };

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

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">User accounts</h1>
      <p className="mt-1 text-sm text-ink/60">
        Manage responder and admin accounts. Sign-in is via SSO — accounts
        here only control the local role and scope mapping.
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
                placeholder="nama@ppkpt.nathara.ac.id"
                required
              />
            </Field>
            <Field label="Role">
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full rounded-lg border border-navy/15 bg-white px-3 py-2 text-sm"
              >
                <option value="responder">Responder</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
            <Field label="Scope">
              <select
                value={form.scope}
                onChange={(e) => setForm({ ...form, scope: e.target.value })}
                className="w-full rounded-lg border border-navy/15 bg-white px-3 py-2 text-sm"
              >
                <option value="NONE">NONE</option>
                <option value="SAFE_CAMPUS">SAFE_CAMPUS</option>
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
                    <Badge tone={u.role === "admin" ? "navy" : "protect"}>
                      {u.role === "admin" ? "Admin" : "Responder"}
                    </Badge>
                    <Badge tone={u.scope === "SAFE_CAMPUS" ? "navy" : "protect"}>
                      {u.scope}
                    </Badge>
                    <Badge tone={u.status === "ACTIVE" ? "protect" : "danger"}>
                      {u.status === "ACTIVE" ? "Active" : "Disabled"}
                    </Badge>
                    {u.id !== me?.id && (
                      <Button
                        variant={u.status === "ACTIVE" ? "danger" : "protect"}
                        size="sm"
                        onClick={() => toggleStatus(u)}
                      >
                        {u.status === "ACTIVE" ? "Disable" : "Enable"}
                      </Button>
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
