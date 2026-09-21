import { useEffect, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import Button from "../../components/Button";
import Card from "../../components/Card";
import { StatusBadge, UrgencyBadge } from "../../components/Badge";
import { useAuth } from "../../features/auth/AuthContext";
import api from "../../services/api";
import { formatDate, formatDateOnly } from "../../utils/validation";

const STATUS_OPTIONS = [
  "NEW",
  "UNDER_REVIEW",
  "ASSIGNED",
  "REFERRED",
  "FOLLOW_UP",
  "RESOLVED",
  "CLOSED",
];

export default function ReportDetails() {
  const { id } = useParams();
  const { token } = useAuth();

  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  // Action states
  const [note, setNote] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [referralService, setReferralService] = useState("");
  const [busy, setBusy] = useState("");

  const load = () => {
    api
      .getReport(token, id)
      .then(setData)
      .catch((err) => (err.status === 404 ? setNotFound(true) : setError(err.message)));
    api.getServices().then((d) => setServices(d.services)).catch(() => {});
    api
      .getActiveResponders(token)
      .then((d) => {
        setUsers(d.users);
        const assigned = d.users.find(
          (u) => u.id === data?.report?.assigned_user_id
        );
        if (assigned) setAssignedTo(String(assigned.id));
      })
      .catch(() => {});
  };

  useEffect(load, [token, id]);

  if (notFound) return <Navigate to="/dashboard/cases" replace />;

  const run = async (key, fn) => {
    setBusy(key);
    setError("");
    try {
      await fn();
      setNote("");
      setReferralService("");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      {error && (
        <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <Link to="/dashboard/cases" className="text-sm font-semibold text-safety">
        ← All cases
      </Link>

      {data && (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-navy">{data.report.case_number}</h1>
            <UrgencyBadge urgency={data.report.urgency} />
            <StatusBadge status={data.report.status} />
          </div>

          {/* ------------------------------ Case info ------------------------------ */}
          <Card className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">Type</p>
              <p className="capitalize">{data.report.report_type.replace(/_/g, " ")}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">Reported</p>
              <p>{formatDate(data.report.created_at)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">Reporter</p>
              <p className="capitalize">
                {data.report.reporter_type === "anonymous" ? "Anonymous" : "Provided contact"}
              </p>
              {data.contacts.length > 0 && (
                <p className="text-sm text-ink/60">
                  {data.contacts[0].contact_method.toUpperCase()} ·{" "}
                  {data.contacts[0].contact_value}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">Current safety</p>
              <p className="capitalize">{data.report.current_safety || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">Incident date</p>
              <p>{formatDateOnly(data.report.incident_date) || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">Location</p>
              <p>{data.report.location || "Not provided"}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
                Description
              </p>
              <p className="mt-1 whitespace-pre-wrap rounded-lg bg-canvas px-3 py-2 text-sm">
                {data.report.description}
              </p>
            </div>
          </Card>

          {/* ------------------------------ Actions ------------------------------ */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {/* Assign */}
            <Card>
              <h2 className="font-bold text-navy">Assign case</h2>
              <div className="mt-2 flex gap-2">
                <select
                  value={assignedTo || (data.report.assigned_user_id ?? "")}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full rounded-lg border border-navy/15 bg-white px-3 py-2 text-sm focus:border-safety focus:outline-none"
                >
                  <option value="">Select responder…</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <Button
                  variant="navy"
                  disabled={!assignedTo || busy === "assign"}
                  onClick={() =>
                    run("assign", () => api.assignCase(token, id, Number(assignedTo)))
                  }
                >
                  Assign
                </Button>
              </div>
              {data.report.assigned_to && (
                <p className="mt-2 text-xs text-ink/50">
                  Currently assigned to <b>{data.report.assigned_to}</b>
                </p>
              )}
            </Card>

            {/* Status */}
            <Card>
              <h2 className="font-bold text-navy">Change status</h2>
              <div className="mt-2 flex gap-2">
                <select
                  id="status-select"
                  value={data.report.status}
                  onChange={(e) =>
                    run("status", () => api.changeStatus(token, id, e.target.value))
                  }
                  className="w-full rounded-lg border border-navy/15 bg-white px-3 py-2 text-sm focus:border-safety focus:outline-none"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="safety"
                  size="sm"
                  disabled={busy === "status"}
                  onClick={() =>
                    run("status", () => api.changeStatus(token, id, "UNDER_REVIEW"))
                  }
                >
                  Under review
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={busy === "status-close"}
                  onClick={() => run("status-close", () => api.changeStatus(token, id, "CLOSED"))}
                >
                  Close case
                </Button>
              </div>
            </Card>

            {/* Referral */}
            <Card>
              <h2 className="font-bold text-navy">Refer to a service</h2>
              <div className="mt-2 flex gap-2">
                <select
                  value={referralService}
                  onChange={(e) => setReferralService(e.target.value)}
                  className="w-full rounded-lg border border-navy/15 bg-white px-3 py-2 text-sm focus:border-safety focus:outline-none"
                >
                  <option value="">Select service…</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.service_type})
                    </option>
                  ))}
                </select>
                <Button
                  variant="protect"
                  disabled={!referralService || busy === "referral"}
                  onClick={() =>
                    run("referral", () =>
                      api.createReferral(token, id, Number(referralService))
                    )
                  }
                >
                  Refer
                </Button>
              </div>
              {data.referrals.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {data.referrals.map((r) => (
                    <li key={r.id} className="text-xs text-ink/60">
                      <span className="font-semibold text-protect">{r.service_name}</span>{" "}
                      · {r.status} · {formatDate(r.referred_at)}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Note */}
            <Card>
              <h2 className="font-bold text-navy">Internal note</h2>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Write an internal note…"
                className="mt-2 w-full rounded-lg border border-navy/15 bg-white px-3 py-2 text-sm focus:border-safety focus:outline-none"
              />
              <Button
                variant="primary"
                size="sm"
                className="mt-2"
                disabled={note.trim().length < 2 || busy === "note"}
                onClick={() => run("note", () => api.addNote(token, id, note))}
              >
                Add note
              </Button>
            </Card>
          </div>

          {/* ------------------------------ Timeline ------------------------------ */}
          <Card className="mt-6">
            <h2 className="font-bold text-navy">Timeline</h2>
            <ol className="mt-4">
              {data.events.map((event, i) => {
                const last = i === data.events.length - 1;
                return (
                  <li key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`mt-1 h-3 w-3 rounded-full ${
                          last ? "bg-safety" : "bg-protect"
                        }`}
                      />
                      {!last && <span className="w-px flex-1 bg-navy/15" />}
                    </div>
                    <div className="pb-5">
                      <p className="text-sm font-semibold text-navy">
                        {event.event_type.replace(/_/g, " ")}
                        {event.description ? ` — ${event.description}` : ""}
                      </p>
                      <p className="text-xs text-ink/50">
                        {formatDate(event.created_at)}
                        {event.user_name ? ` · ${event.user_name}` : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>
        </>
      )}
    </div>
  );
}