import { Link } from "react-router-dom";

const steps = [
  { to: "/report", label: "Type" },
  { to: "/report/safety", label: "Safety" },
  { to: "/report/details", label: "Details" },
  { to: "/report/contact", label: "Identity" },
  { to: "/report/review", label: "Review" },
];

/**
 * Wizard progress indicator. `active` is the 0-based index of the current step.
 * Each step is a link so the user can safely go back.
 */
export default function ProgressBar({ active = 0 }) {
  return (
    <ol className="flex items-center gap-1 text-xs" aria-label="Report progress">
      {steps.map((step, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <li key={step.to} className="flex items-center gap-1">
            <Link
              to={step.to}
              aria-current={current ? "step" : undefined}
              className={`rounded-full px-2.5 py-1 font-semibold transition-colors ${
                current
                  ? "bg-navy text-white"
                  : done
                    ? "text-protect hover:bg-canvas"
                    : "text-ink/40 hover:bg-canvas"
              }`}
            >
              <span className="mr-1 inline-block">{i + 1}</span>
              {step.label}
            </Link>
            {i < steps.length - 1 && <span className="text-ink/25">→</span>}
          </li>
        );
      })}
    </ol>
  );
}