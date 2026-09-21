import { createContext, useContext, useMemo, useState } from "react";

/**
 * Holds the in-progress public report.
 *
 * Privacy note: this state lives only in React memory — it is deliberately
 * NOT persisted to localStorage/sessionStorage, so no sensitive form data
 * survives a browser close or is written to disk.
 */
const ReportContext = createContext(null);

const initialReport = {
  reportType: null,
  urgency: null,
  description: "",
  incidentDate: "",
  location: "",
  currentSafety: null,
  perpetratorNearby: null,
  reporterType: "anonymous", // 'anonymous' | 'contact'
  contactMethod: "email",
  contactValue: "",
  caseNumber: null,
  submittedUrgency: null,
};

export function ReportProvider({ children }) {
  const [report, setReport] = useState(initialReport);

  const update = (patch) => setReport((prev) => ({ ...prev, ...patch }));

  const reset = () => setReport(initialReport);

  const value = useMemo(() => ({ report, update, reset }), [report]);

  return <ReportContext.Provider value={value}>{children}</ReportContext.Provider>;
}

export function useReport() {
  const ctx = useContext(ReportContext);
  if (!ctx) throw new Error("useReport must be used within ReportProvider");
  return ctx;
}

export const REPORT_TYPES = [
  { value: "threat", label: "Threat" },
  { value: "violence", label: "Violence" },
  { value: "abuse", label: "Abuse" },
  { value: "harassment", label: "Harassment" },
  { value: "exploitation", label: "Exploitation" },
  { value: "missing_vulnerable", label: "Missing / Vulnerable Person" },
  { value: "other", label: "Other" },
];

export const URGENCY_LABELS = {
  immediate: { label: "Immediate Danger", emoji: "🔴", tone: "danger" },
  urgent: { label: "Urgent", emoji: "🟠", tone: "safety" },
  concerning: { label: "Concerning", emoji: "🟡", tone: "warning" },
  info: { label: "Information / report only", emoji: "🟢", tone: "protect" },
};

export const STATUS_LABELS = {
  NEW: "New",
  UNDER_REVIEW: "Under Review",
  ASSIGNED: "Assigned",
  REFERRED: "Referred",
  FOLLOW_UP: "Follow Up",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};