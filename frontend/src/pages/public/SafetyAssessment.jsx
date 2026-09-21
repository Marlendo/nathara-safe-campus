import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/Card";
import ProgressBar from "../../components/ProgressBar";
import { URGENCY_LABELS, useReport } from "../../features/reports/ReportContext";

export default function SafetyAssessment() {
  const navigate = useNavigate();
  const { update } = useReport();
  const [showDanger, setShowDanger] = useState(false);

  const choose = (urgency) => {
    update({ urgency });
    if (urgency === "immediate") {
      setShowDanger(true); // show the guidance first
    } else {
      navigate("/report/details");
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <ProgressBar active={1} />
      <h1 className="mt-6 text-2xl font-bold text-navy">Before continuing…</h1>
      <p className="mt-1 text-lg font-medium">
        Is anyone in immediate danger right now?
      </p>
      <p className="mt-1 text-xs text-ink/50">
        This is not a professional risk assessment — it helps responders prioritize.
      </p>

      {showDanger ? (
        <Card className="mt-6 border-danger/30 bg-danger/5">
          <h2 className="font-bold text-danger">If you are in immediate danger:</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex gap-2">
              <span>✔</span> Move to a safe location if possible.
            </li>
            <li className="flex gap-2">
              <span>✔</span> Avoid direct confrontation.
            </li>
            <li className="flex gap-2">
              <span>✔</span> Contact appropriate emergency services if available to you.
            </li>
            <li className="flex gap-2">
              <span>✔</span> A protection responder can still review your report.
            </li>
          </ul>
          <button
            onClick={() => navigate("/report/details")}
            className="mt-5 w-full rounded-lg bg-danger px-4 py-3 text-sm font-bold text-white hover:bg-danger/90"
          >
            Continue
          </button>
        </Card>
      ) : (
        <div className="mt-6 grid gap-3">
          {[
            { key: "immediate", emoji: "🔴" },
            { key: "urgent", emoji: "🟠" },
            { key: "concerning", emoji: "🟡" },
            { key: "info", emoji: "🟢" },
          ].map(({ key, emoji }) => (
            <button
              key={key}
              onClick={() => choose(key)}
              className="flex items-center gap-3 rounded-xl border border-navy/10 bg-white px-4 py-3 text-left font-semibold text-navy transition-colors hover:border-safety/50 hover:bg-canvas"
            >
              <span aria-hidden>{emoji}</span>
              {URGENCY_LABELS[key].label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}