import { classNames } from "../utils/validation";

const tones = {
  navy: "bg-navy text-white",
  safety: "bg-safety text-white",
  protect: "bg-protect text-white",
  danger: "bg-danger text-white",
  warning: "bg-amber-100 text-amber-800 ring-amber-200",
  neutral: "bg-canvas text-ink ring-navy/10",
};

export default function Badge({ tone = "neutral", children, className = "" }) {
  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function UrgencyBadge({ urgency, label }) {
  const map = {
    immediate: { tone: "danger", label: label || "Immediate" },
    urgent: { tone: "safety", label: label || "Urgent" },
    concerning: { tone: "warning", label: label || "Concerning" },
    info: { tone: "protect", label: label || "Information" },
  };
  const u = map[urgency] || map.info;
  return <Badge tone={u.tone}>{u.label}</Badge>;
}

export function StatusBadge({ status }) {
  const map = {
    NEW: { tone: "danger", label: "New" },
    UNDER_REVIEW: { tone: "safety", label: "Under Review" },
    ASSIGNED: { tone: "navy", label: "Assigned" },
    REFERRED: { tone: "protect", label: "Referred" },
    FOLLOW_UP: { tone: "warning", label: "Follow Up" },
    RESOLVED: { tone: "protect", label: "Resolved" },
    CLOSED: { tone: "neutral", label: "Closed" },
  };
  const s = map[status] || map.NEW;
  return <Badge tone={s.tone}>{s.label}</Badge>;
}