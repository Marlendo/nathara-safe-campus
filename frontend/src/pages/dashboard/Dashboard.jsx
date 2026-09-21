import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../../components/Card";
import { StatusBadge, UrgencyBadge } from "../../components/Badge";
import { useAuth } from "../../features/auth/AuthContext";
import api from "../../services/api";
import { formatDate } from "../../utils/validation";

const STAT_CARDS = [
  { key: "total", label: "Total Cases", tone: "bg-navy" },
  { key: "immediate", label: "Immediate", tone: "bg-danger" },
  { key: "urgent", label: "Urgent", tone: "bg-safety" },
  { key: "open_cases", label: "Open", tone: "bg-protect" },
];

export default function Dashboard() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getOverview(token)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [token]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">Overview</h1>
      <p className="mt-1 text-sm text-ink/60">Live summary of incoming protection cases.</p>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {data && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {STAT_CARDS.map((c) => (
              <div key={c.key} className={`rounded-xl ${c.tone} p-4 text-white`}>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
                  {c.label}
                </p>
                <p className="mt-1 text-3xl font-bold">{data.stats?.[c.key] ?? 0}</p>
              </div>
            ))}
          </div>

          <Card className="mt-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-navy">Recent cases</h2>
              <Link to="/dashboard/cases" className="text-sm font-semibold text-safety">
                View all →
              </Link>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-navy/10 text-xs uppercase tracking-wide text-ink/50">
                    <th className="pb-2">Case</th>
                    <th className="pb-2">Type</th>
                    <th className="pb-2">Priority</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Assigned to</th>
                    <th className="pb-2">Reported</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent?.map((row) => (
                    <tr
                      key={row.case_number}
                      className="border-b border-navy/5 hover:bg-canvas/60"
                    >
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
                      <td>{row.assigned_to || "—"}</td>
                      <td className="text-ink/50">{formatDate(row.created_at)}</td>
                    </tr>
                  ))}
                  {!data.recent?.length && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-ink/50">
                        No cases yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}