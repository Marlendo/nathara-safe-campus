const REPORT_TYPES = [
  "threat",
  "violence",
  "abuse",
  "harassment",
  "exploitation",
  "missing_vulnerable",
  "other",
];

const URGENCY = ["immediate", "urgent", "concerning", "info"];
const SAFETY = ["yes", "no", "unsure"];
const REPORTER = ["anonymous", "contact"];
const CONTACT_METHODS = ["phone", "sms", "email"];

const SERVICE_TYPES = [
  "emergency",
  "protection",
  "medical",
  "psychosocial",
  "legal",
  "shelter",
];

const STATUSES = [
  "NEW",
  "UNDER_REVIEW",
  "ASSIGNED",
  "REFERRED",
  "FOLLOW_UP",
  "RESOLVED",
  "CLOSED",
];

module.exports = {
  REPORT_TYPES,
  URGENCY,
  SAFETY,
  REPORTER,
  CONTACT_METHODS,
  SERVICE_TYPES,
  STATUSES,
};