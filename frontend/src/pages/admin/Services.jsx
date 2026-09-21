import { useEffect, useState } from "react";
import Button from "../../components/Button";
import Badge from "../../components/Badge";
import Card from "../../components/Card";
import Input, { Field } from "../../components/forms";
import { useAuth } from "../../features/auth/AuthContext";
import api from "../../services/api";

const TYPES = [
  "emergency",
  "protection",
  "medical",
  "psychosocial",
  "legal",
  "shelter",
];

const EMPTY = {
  name: "",
  serviceType: "protection",
  description: "",
  phone: "",
  email: "",
  availability: "",
};

export default function Services() {
  const { token } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    api
      .getAdminServices(token)
      .then((d) => setServices(d.services))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editingId) {
        await api.updateService(token, editingId, form);
      } else {
        await api.createService(token, form);
      }
      setForm(EMPTY);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const edit = (svc) => {
    setEditingId(svc.id);
    setForm({
      name: svc.name,
      serviceType: svc.service_type,
      description: svc.description || "",
      phone: svc.phone || "",
      email: svc.email || "",
      availability: svc.availability || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY);
  };

  const remove = async (svc) => {
    if (!window.confirm(`Deactivate "${svc.name}"?`)) return;
    setError("");
    try {
      await api.deleteService(token, svc.id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">Service directory</h1>
      <p className="mt-1 text-sm text-ink/60">
        Manage the support services offered to reporters.
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Create / edit form */}
        <Card>
          <h2 className="font-bold text-navy">
            {editingId ? "Edit service" : "Add service"}
          </h2>
          <form onSubmit={save} className="mt-4 space-y-4">
            <Field label="Name">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. City Protection Center"
                required
              />
            </Field>
            <Field label="Type">
              <select
                value={form.serviceType}
                onChange={(e) => setForm({ ...form, serviceType: e.target.value })}
                className="w-full rounded-lg border border-navy/15 bg-white px-3 py-2 text-sm"
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Description">
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-lg border border-navy/15 bg-white px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Phone">
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="0800-000-0000"
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Availability">
              <Input
                value={form.availability}
                onChange={(e) => setForm({ ...form, availability: e.target.value })}
                placeholder="24/7"
              />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" variant="primary" className="flex-1" disabled={saving}>
                {saving ? "Saving…" : editingId ? "Save changes" : "Add service"}
              </Button>
              {editingId && (
                <Button type="button" variant="ghost" onClick={cancelEdit}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Card>

        {/* Service list */}
        <Card className="lg:col-span-2">
          <h2 className="font-bold text-navy">
            Services ({services.length}) · active visible to reporters
          </h2>
          {loading ? (
            <p className="py-8 text-center text-sm text-ink/50">Loading…</p>
          ) : (
            <div className="mt-4 space-y-3">
              {services.map((svc) => (
                <div
                  key={svc.id}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 ${
                    svc.status === "ACTIVE" ? "border-navy/10" : "border-navy/5 bg-canvas/60"
                  }`}
                >
                  <div>
                    <p className="font-semibold text-navy">{svc.name}</p>
                    <p className="text-xs text-ink/60">
                      <span className="font-semibold capitalize">{svc.service_type}</span>
                      {svc.phone ? ` · ${svc.phone}` : ""}
                      {svc.email ? ` · ${svc.email}` : ""}
                    </p>
                    {svc.description && (
                      <p className="mt-1 text-xs text-ink/50">{svc.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={svc.status === "ACTIVE" ? "protect" : "neutral"}>
                      {svc.status === "ACTIVE" ? "Active" : "Inactive"}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => edit(svc)}>
                      Edit
                    </Button>
                    {svc.status === "ACTIVE" && (
                      <Button variant="danger" size="sm" onClick={() => remove(svc)}>
                        Deactivate
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