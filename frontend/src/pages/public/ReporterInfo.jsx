import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import Card from "../../components/Card";
import ProgressBar from "../../components/ProgressBar";
import { useReport } from "../../features/reports/ReportContext";

export default function ReporterInfo() {
  const navigate = useNavigate();
  const { report, update } = useReport();

  return (
    <div className="mx-auto max-w-xl">
      <ProgressBar active={3} />
      <h1 className="mt-6 text-2xl font-bold text-navy">How would you like to report?</h1>
      <p className="mt-2 text-sm text-ink/60">
        Anonymous reporting means no name, phone, or email is required. Your case can
        still be tracked using its Case ID.
      </p>

      <div className="mt-6 space-y-4">
        {[
          {
            value: "anonymous",
            title: "Anonymously",
            desc: "No name, no phone, no email. You'll get a Case ID to check status later.",
          },
          {
            value: "contact",
            title: "I want to provide contact information",
            desc: "A responder may contact you about your report.",
          },
        ].map((opt) => (
          <Card
            key={opt.value}
            className={`cursor-pointer transition-colors ${
              report.reporterType === opt.value
                ? "border-safety ring-2 ring-safety/30"
                : ""
            }`}
            onClick={() => update({ reporterType: opt.value })}
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 inline-block h-4 w-4 shrink-0 rounded-full border-2 ${
                  report.reporterType === opt.value
                    ? "border-safety bg-safety"
                    : "border-ink/30"
                }`}
              />
              <div>
                <p className="font-semibold text-navy">{opt.title}</p>
                <p className="text-sm text-ink/60">{opt.desc}</p>
              </div>
            </div>
          </Card>
        ))}

        {report.reporterType === "contact" && (
          <Card className="space-y-3">
            <div>
              <label className="text-sm font-semibold">Preferred contact method</label>
              <div className="mt-2 flex gap-2">
                {["phone", "sms", "email"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => update({ contactMethod: m })}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold uppercase transition-colors ${
                      report.contactMethod === m
                        ? "border-safety bg-safety/10 text-navy"
                        : "border-navy/10 bg-white text-ink/60 hover:bg-canvas"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold">
                Contact ({report.contactMethod})
              </label>
              <input
                type="text"
                className="mt-1 w-full rounded-lg border border-navy/15 bg-white px-3 py-2 text-sm focus:border-safety focus:outline-none focus:ring-2 focus:ring-safety/30"
                placeholder={
                  report.contactMethod === "email" ? "you@example.com" : "+249 …"
                }
                value={report.contactValue}
                onChange={(e) => update({ contactValue: e.target.value })}
              />
            </div>
          </Card>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-navy/10 pt-5">
        <Button variant="ghost" onClick={() => navigate("/report/details")}>
          ← Back
        </Button>
        <Button variant="primary" onClick={() => navigate("/report/review")}>
          Continue
        </Button>
      </div>
    </div>
  );
}