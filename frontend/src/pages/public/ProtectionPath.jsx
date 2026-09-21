import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/Button";
import Card from "../../components/Card";
import { UrgencyBadge } from "../../components/Badge";
import api from "../../services/api";
import { useReport } from "../../features/reports/ReportContext";

const STEPS = [
  { title: "Immediate safety", icon: "🛟" },
  { title: "Protection support", icon: "🛡" },
  { title: "Medical support", icon: "🏥" },
  { title: "Psychosocial support", icon: "💬" },
  { title: "Follow-up", icon: "↩" },
];

export default function ProtectionPath() {
  const { report } = useReport();
  const [services, setServices] = useState([]);

  useEffect(() => {
    api.getServices().then((d) => setServices(d.services)).catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold text-navy">Your protection pathway</h1>
      <p className="mt-2 text-sm text-ink/60">
        {report.caseNumber ? (
          <>
            Case <span className="font-bold text-navy">{report.caseNumber}</span> ·{" "}
            <UrgencyBadge urgency={report.submittedUrgency} />
          </>
        ) : (
          "Recommended next steps after reporting."
        )}
      </p>

      <Card className="mt-6">
        <ol className="space-y-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-sm text-white">
                {i + 1}
              </span>
              <div>
                <p className="font-semibold text-navy">
                  {s.icon} {s.title}
                </p>
                <p className="text-sm text-ink/60">…</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="mt-4">
        <h2 className="font-bold text-navy">Support services</h2>
        <ul className="mt-3 space-y-3">
          {services.slice(0, 5).map((svc) => (
            <li
              key={svc.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-navy/10 px-3 py-2"
            >
              <div>
                <p className="text-sm font-semibold">{svc.name}</p>
                <p className="text-xs text-ink/50">{svc.phone}</p>
              </div>
              <span className="rounded-full bg-protect/10 px-2 py-0.5 text-xs font-semibold text-protect">
                {svc.service_type}
              </span>
            </li>
          ))}
        </ul>
        <Link to="/support">
          <Button variant="protect" className="mt-4 w-full">
            View full support directory
          </Button>
        </Link>
      </Card>

      <Card className="mt-4 bg-navy text-white">
        <h2 className="font-bold">Follow-up</h2>
        <p className="mt-1 text-sm text-white/70">
          Your report can be reviewed by a protection responder. You can track progress
          with your Case ID.
        </p>
        <Link to="/case-status">
          <Button variant="safety" className="mt-4 w-full">
            Check case status
          </Button>
        </Link>
      </Card>
    </div>
  );
}