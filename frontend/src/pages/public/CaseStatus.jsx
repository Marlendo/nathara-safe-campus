import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import Card from "../../components/Card";
import { StatusBadge, UrgencyBadge } from "../../components/Badge";
import api from "../../services/api";
import { useReport } from "../../features/reports/ReportContext";
import { formatDate } from "../../utils/validation";

export default function CaseStatus() {
  const navigate = useNavigate();
  const { report } = useReport();
  const [caseId, setCaseId] = useState(report.caseNumber || "");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const check = async (e) => {
    e?.preventDefault();
    if (!caseId.trim()) {
      setError("Please enter your Case ID, e.g. NSC-1042");
      return;
    }
    setError("");
    try {
      const data = await api.getCaseStatus(caseId.trim().toUpperCase());
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(err.status === 404 ? "Case not found." : err.message);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold text-navy">Check case status</h1>
      <p className="mt-2 text-sm text-ink/60">
        Enter the Case ID you received when you submitted your report.
      </p>

      <form onSubmit={check} className="mt-6 flex gap-2">
        <input
          type="text"
          className="w-full rounded-lg border border-navy/15 bg-white px-3 py-2.5 text-sm uppercase tracking-wide focus:border-safety focus:outline-none focus:ring-2 focus:ring-safety/30"
          placeholder="NSC-1042"
          value={caseId}
          onChange={(e) => setCaseId(e.target.value)}
        />
        <Button type="submit" variant="primary">
          Check status
        </Button>
      </form>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {result && (
        <Card className="mt-6">
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold tracking-wider text-navy">
              {result.caseNumber}
            </p>
            <StatusBadge status={result.status} />
          </div>
          <div className="mt-3 flex items-center gap-3 text-sm">
            <UrgencyBadge urgency={result.urgency} />
            <span className="text-ink/60">{result.reportType}</span>
          </div>
          <p className="mt-1 text-xs text-ink/50">
            Reported {formatDate(result.reportedAt)}
          </p>

          <h2 className="mt-6 font-bold text-navy">Timeline</h2>
          <ol className="mt-3 space-y-0">
            {result.timeline.map((event, i) => {
              const last = i === result.timeline.length - 1;
              return (
                <li key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`h-3 w-3 rounded-full ${
                        last ? "bg-safety" : "bg-protect"
                      }`}
                    />
                    {!last && <span className="w-px flex-1 bg-navy/15" />}
                  </div>
                  <div className="pb-5">
                    <p className="text-sm font-semibold text-navy">{event.description}</p>
                    <p className="text-xs text-ink/50">{formatDate(event.createdAt)}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          <Button
            variant="ghost"
            className="mt-2"
            onClick={() => navigate("/protection")}
          >
            ← View protection pathway
          </Button>
        </Card>
      )}
    </div>
  );
}