import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import Card from "../../components/Card";
import ProgressBar from "../../components/ProgressBar";
import { useReport } from "../../features/reports/ReportContext";

const INPUT_CLASS =
  "mt-1 w-full rounded-lg border border-navy/15 bg-white px-3 py-2 text-sm focus:border-safety focus:outline-none focus:ring-2 focus:ring-safety/30";

export default function IncidentDetails() {
  const navigate = useNavigate();
  const { report, update } = useReport();

  const canContinue = report.description.trim().length >= 10;

  const submit = (e) => {
    e.preventDefault();
    navigate("/report/contact");
  };

  const askLocation = () => {
    // Only runs after an explicit click; the browser then asks permission.
    // Coordinates are rounded to ~2 decimals (~1 km) to avoid storing precise fixes.
    if (!navigator.geolocation) {
      window.alert("Location sharing is not supported by this browser. You can type an approximate area instead.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(2);
        const lng = pos.coords.longitude.toFixed(2);
        update({ location: `approx ${lat}, ${lng}` });
      },
      () => {
        window.alert("Location permission was not granted. You can type an approximate area instead.");
      },
      { enableHighAccuracy: false, timeout: 6000 }
    );
  };

  return (
    <div className="mx-auto max-w-xl">
      <ProgressBar active={2} />
      <h1 className="mt-6 text-2xl font-bold text-navy">Tell us what happened</h1>
      <p className="mt-2 text-sm text-ink/60">
        Only share what you feel safe sharing. Location is optional and approximate.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-5">
        <div>
          <label className="text-sm font-semibold">Incident date</label>
          <input
            type="date"
            className={INPUT_CLASS}
            value={report.incidentDate}
            onChange={(e) => update({ incidentDate: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm font-semibold">Approximate location</label>
          <div className="flex gap-2">
            <input
              type="text"
              className={INPUT_CLASS}
              placeholder="e.g. Port Sudan area"
              value={report.location}
              onChange={(e) => update({ location: e.target.value })}
            />
            <button
              type="button"
              onClick={askLocation}
              className="shrink-0 rounded-lg border border-protect/30 px-3 text-xs font-bold text-protect hover:bg-protect/10"
            >
              📍 Use my location
            </button>
          </div>
          <p className="mt-1 text-xs text-ink/50">
            Optional. Your exact location is never shared without your permission.
          </p>
        </div>

        <div>
          <label className="text-sm font-semibold">What happened?</label>
          <textarea
            rows={4}
            className={INPUT_CLASS}
            placeholder="Describe the incident in your own words. Do not include information that could put you at further risk."
            value={report.description}
            onChange={(e) => update({ description: e.target.value })}
          />
          <p className="mt-1 text-xs text-ink/50">At least 10 characters.</p>
        </div>

        <div>
          <span className="text-sm font-semibold">Is the person currently safe?</span>
          <div className="mt-2 flex gap-2">
            {[
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
              { value: "unsure", label: "Unsure" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => update({ currentSafety: opt.value })}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                  report.currentSafety === opt.value
                    ? "border-safety bg-safety/10 text-navy"
                    : "border-navy/10 bg-white text-ink/60 hover:bg-canvas"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="text-sm font-semibold">Is the alleged perpetrator nearby?</span>
          <div className="mt-2 flex gap-2">
            {[
              { value: true, label: "Yes" },
              { value: false, label: "No" },
              { value: null, label: "Unsure / prefer not to say" },
            ].map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => update({ perpetratorNearby: opt.value })}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                  report.perpetratorNearby === opt.value
                    ? "border-safety bg-safety/10 text-navy"
                    : "border-navy/10 bg-white text-ink/60 hover:bg-canvas"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-navy/10 pt-5">
          <Button type="button" variant="ghost" onClick={() => navigate("/report/safety")}>
            ← Back
          </Button>
          <Button type="submit" variant="primary" disabled={!canContinue}>
            Continue
          </Button>
        </div>
      </form>
    </div>
  );
}