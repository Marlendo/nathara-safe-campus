import { useNavigate } from "react-router-dom";
import Card from "../../components/Card";
import ProgressBar from "../../components/ProgressBar";
import { REPORT_TYPES, useReport } from "../../features/reports/ReportContext";

export default function ReportType() {
  const navigate = useNavigate();
  const { report, update } = useReport();

  const choose = (type) => {
    update({ reportType: type });
    navigate("/report/safety");
  };

  return (
    <div className="mx-auto max-w-xl">
      <ProgressBar active={0} />
      <h1 className="mt-6 text-2xl font-bold text-navy">What would you like to report?</h1>
      <p className="mt-2 text-sm text-ink/60">
        Choose the closest option. You can provide as much detail as you feel safe
        sharing.
      </p>

      <div className="mt-6 grid gap-3">
        {REPORT_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => choose(t.value)}
            className={`rounded-xl border px-4 py-3 text-left font-semibold transition-colors ${
              report.reportType === t.value
                ? "border-safety bg-safety/10 text-navy"
                : "border-navy/10 bg-white text-navy hover:border-safety/50 hover:bg-canvas"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}