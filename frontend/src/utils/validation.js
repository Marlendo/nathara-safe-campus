export function classNames(...parts) {
  return parts.filter(Boolean).join(" ");
}

/** Formats a JS Date or ISO string into a compact "21 Sep 2026, 09:31" label. */
export function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateOnly(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/** Maps an urgency code to Tailwind classes. */
export function urgencyTone(urgency) {
  const tones = {
    immediate: { text: "text-danger", bg: "bg-danger/10", ring: "ring-danger/30", dot: "bg-danger" },
    urgent: { text: "text-safety", bg: "bg-safety/10", ring: "ring-safety/30", dot: "bg-safety" },
    concerning: { text: "text-amber-600", bg: "bg-amber-100", ring: "ring-amber-200", dot: "bg-amber-500" },
    info: { text: "text-protect", bg: "bg-protect/10", ring: "ring-protect/30", dot: "bg-protect" },
  };
  return tones[urgency] || tones.info;
}