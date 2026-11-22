import { Link } from "react-router-dom";
import Button from "../../components/Button";
import Card from "../../components/Card";
import { UrgencyBadge } from "../../components/Badge";
import { useReport } from "../../features/reports/ReportContext";

export default function ReportSuccess() {
  const { report } = useReport();

  return (
    <div className="mx-auto max-w-xl">
      <Card className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-protect/10 text-3xl">
          ✓
        </div>
        <h1 className="mt-4 text-2xl font-bold text-navy">Report received</h1>

        <div className="mx-auto mt-6 max-w-sm rounded-xl bg-canvas p-5">
          <p className="text-sm text-ink/60">Your case ID</p>
          <p className="mt-1 text-3xl font-bold tracking-wider text-navy">
            {report.caseNumber || "NSC-…"}
          </p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="text-sm text-ink/60">Priority</span>
            <UrgencyBadge urgency={report.submittedUrgency} />
          </div>
          <p className="mt-4 text-xs text-ink/50">
            Keep your Case ID if you want to refer to this report later. It is the only
            way to check status anonymously.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <Link to="/protection">
            <Button variant="primary" className="w-full">
              View protection pathway
            </Button>
          </Link>
          <Link to="/case-status">
            <Button variant="outline" className="w-full">
              Check case status
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}