import { useEffect, useState } from "react";
import Card from "../../components/Card";
import Badge from "../../components/Badge";
import { useAuth } from "../../features/auth/AuthContext";
import api from "../../services/api";
import { formatDate } from "../../utils/validation";

const EVENT_TYPES = [
  "REPORT_CREATED",
  "CASE_ASSIGNED",
  "STATUS_CHANGED",
  "REFERRAL_CREATED",
  "NOTE_ADDED",
  "CASE_CLOSED",
];

const TONE = {
  REPORT_CREATED: "protect",
  CASE_ASSIGNED: "navy",
  STATUS_CHANGED: "safety",
  REFERRAL_CREATED: "protect",
  NOTE_ADDED: "neutral",
  CASE_CLOSED: "neutral",
};

export default function Activity() {
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    api
      .getActivity(token, 100)
      .then((d) => {
        const filtered = type ? d.events.filter((ev) => ev.event_type === type) : d.events;
        setEvents(filtered);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token, type]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">System activity</h1>
      <p className="mt-1 text-sm text-ink/60">
        Audit trail of case events across the platform.
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          onClick={() => setType("")}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            type === "" ? "bg-navy text-white" : "border border-navy/15 bg-white text-ink/60"
          }`}
        >
          All events
        </button>
        {EVENT_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              type === t ? "bg-navy text-white" : "border border-navy/15 bg-white text-ink/60"
            }`}
          >
            {t.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      <Card className="mt-6">
        {loading ? (
          <p className="py-8 text-center text-sm text-ink/50">Loading…</p>
        ) : events.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink/50">No matching events.</p>
        ) : (
          <ol className="divide-y divide-navy/5">
            {events.map((ev) => (
              <li key={ev.id} className="flex flex-wrap items-center gap-3 py-3">
                <Badge tone={TONE[ev.event_type] || "neutral"}>
                  {ev.event_type.replace(/_/g, " ")}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink/80">
                    {ev.description || "—"}
                    {ev.case_number && (
                      <span className="ml-2 font-semibold text-navy">{ev.case_number}</span>
                    )}
                  </p>
                  <p className="text-xs text-ink/50">
                    by {ev.user_name || "system"}
                    {ev.user_role ? ` · ${ev.user_role}` : ""} · {formatDate(ev.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}