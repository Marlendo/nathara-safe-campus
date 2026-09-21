import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import Card from "../../components/Card";
import ProgressBar from "../../components/ProgressBar";
import { UrgencyBadge } from "../../components/Badge";
import {
  REPORT_TYPES,
  URGENCY_LABELS,
  useReport,
} from "../../features/reports/ReportContext";
import api from "../../services/api";
import { formatDateOnly } from "../../utils/validation";

export default function ReviewReport() {
  const navigate = useNavigate();
  const { report, update } = useReport();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const typeLabel =
    REPORT_TYPES.find((t) => t.value === report.reportType)?.label || "—";

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const data = await api.createReport({
        reportType: report.reportType,
        urgency: report.urgency,
        description: report.description,
        incidentDate: report.incidentDate || null,
        location: report.location || null,
        currentSafety: report.currentSafety || null,
        perpetratorNearby: report.perpetratorNearby,
        reporterType: report.reporterType,
        contactMethod:
          report.reporterType === "contact" ? report.contactMethod : undefined,
        contactValue:
          report.reporterType === "contact" ? report.contactValue : undefined,
      });

      update({
        caseNumber: data.caseNumber,
        submittedUrgency: data.urgency,
      });
      navigate("/report/success");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <ProgressBar active={4} />
      <h1 className="mt-6 text-2xl font-bold text-navy">Review your report</h1>
      <p className="mt-1 text-sm text-ink/60">
        Check the details before submitting. You can go back to edit anything.
      </p>

      <Card className="mt-6 space-y-4">
        {[
          { label: "Type", value: typeLabel },
          { label: "Urgency", value: URGENCY_LABELS[report.urgency]?.label },
          { label: "Current safety", value: report.currentSafety },
          { label: "Location", value: report.location || "Not provided" },
          { label: "Incident date", value: formatDateOnly(report.incidentDate) || "Not provided" },
          {
            label: "Reporter",
            value:
              report.reporterType === "anonymous"
                ? "Anonymous"
                : `${report.contactMethod.toUpperCase()} · ${report.contactValue}`,
          },
        ].map((row) => (
          <div key={row.label} className="flex justify-between gap-6 border-b border-navy/5 pb-3 last:border-0">
            <span className="text-sm font-semibold text-ink/60">{row.label}</span>
            <span className="text-right text-sm font-medium">
              {row.label === "Urgency" ? (
                <UrgencyBadge urgency={report.urgency} label={row.value} />
              ) : (
                row.value
              )}
            </span>
          </div>
        ))}

        <div>
          <p className="text-sm font-semibold text-ink/60">Description</p>
          <p className="mt-1 whitespace-pre-wrap rounded-lg bg-canvas px-3 py-2 text-sm">
            {report.description}
          </p>
        </div>
      </Card>

      {error && (
        <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-6 flex items-center justify-between border-t border-navy/10 pt-5">
        <Button variant="ghost" onClick={() => navigate("/report/contact")}>
          ← Back
        </Button>
        <Button variant="safety" onClick={submit} disabled={submitting}>
          {submitting ? "Submitting…" : "Submit report"}
        </Button>
      </div>
    </div>
  );
}