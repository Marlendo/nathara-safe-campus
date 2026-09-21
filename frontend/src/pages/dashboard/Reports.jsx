import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../../components/Card";
import { StatusBadge, UrgencyBadge } from "../../components/Badge";
import { useAuth } from "../../features/auth/AuthContext";
import api from "../../services/api";
import { formatDate } from "../../utils/validation";

const FILTERS = [
  { key: "status", label: "All", value: "" },
  { key: "urgency", label: "Immediate", value: "immediate" },
  { key: "urgency", label: "Urgent", value: "urgent" },
  { key: "status", label: "Open", value: "NEW" },
  { key: "status", label: "Closed", value: "CLOSED" },
];

export default function Reports() {
  const { token } = useAuth();
  const [reports, setReports] = useState([]);
  const [active, setActive] = useState({ key: "", value: "" });
  const [loading, setLoading] = useState(true);

  const load = (filter) => {
    setLoading(true);
    api
      .getReports(token, filter)
      .then((d) => setReports(d.reports))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load({});
  }, [token]);

  const applyFilter = (f) => {
    setActive(f);
    if (!f.value) load({});
    else load({ [f.key]: f.value });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">Cases</h1>
      <p className="mt-1 text-sm text-ink/60">All incoming reports, filterable by priority and status.</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map((f, i) => (
          <button
            key={i}
            onClick={() => applyFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              active.value === f.value &&
              (active.key === f.key || (!active.value && !f.value))
                ? "bg-navy text-white"
                : "border border-navy/15 bg-white text-ink/60 hover:bg-canvas"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card className="mt-6">
        {loading ? (
          <p className="py-8 text-center text-sm text-ink/50">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-navy/10 text-xs uppercase tracking-wide text-ink/50">
                  <th className="pb-2">Case</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Priority</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Reporter</th>
                  <th className="pb-2">Reported</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((row) => (
                  <tr key={row.case_number} className="border-b border-navy/5 hover:bg-canvas/60">
                    <td className="py-3">
                      <Link
                        to={`/dashboard/cases/${row.case_number}`}
                        className="font-semibold text-navy hover:text-safety"
                      >
                        {row.case_number}
                      </Link>
                    </td>
                    <td className="capitalize">{row.report_type.replace(/_/g, " ")}</td>
                    <td>
                      <UrgencyBadge urgency={row.urgency} />
                    </td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="capitalize">{row.reporter_type === "anonymous" ? "Anonymous" : "Contact"}</td>
                    <td className="text-ink/50">{formatDate(row.created_at)}</td>
                  </tr>
                ))}
                {reports.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-ink/50">
                      No cases match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}