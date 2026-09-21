require("dotenv").config();
const bcrypt = require("bcryptjs");
const { pool } = require("../src/db");

/**
 * Seeds demo data: responder + admin users, support services,
 * a handful of fictional cases, assignments, notes, referrals, events.
 *
 * Run: npm run db:seed   (after db:setup)
 */

const SERVICES = [
  {
    name: "National Emergency Support",
    service_type: "emergency",
    description: "Immediate response for life-threatening situations.",
    phone: "1900",
    email: null,
    availability: "24/7",
  },
  {
    name: "SafePath Protection Center",
    service_type: "protection",
    description: "Case management and safety planning for people at risk.",
    phone: "0800-555-0143",
    email: "protection@safepath.demo",
    availability: "24/7",
  },
  {
    name: "City Medical Support",
    service_type: "medical",
    description: "Medical care and injury assessment.",
    phone: "0800-555-0177",
    email: null,
    availability: "24/7",
  },
  {
    name: "Psychosocial Support Line",
    service_type: "psychosocial",
    description: "Confidential counseling and emotional support.",
    phone: "0800-555-0190",
    email: "pss@safepath.demo",
    availability: "08:00–22:00",
  },
  {
    name: "Legal Assistance Clinic",
    service_type: "legal",
    description: "Rights information and legal advice.",
    phone: "0800-555-0121",
    email: "legal@safepath.demo",
    availability: "Mon–Fri 09:00–17:00",
  },
  {
    name: "Safe Shelter Network",
    service_type: "shelter",
    description: "Temporary safe accommodation.",
    phone: "0800-555-0134",
    email: null,
    availability: "24/7",
  },
];

const DEMO_CASES = [
  {
    case_number: "SP-1001",
    report_type: "threat",
    urgency: "immediate",
    status: "NEW",
    description:
      "I received repeated threats demanding I hand over money. The sender knows where I live and said they would come to my home tonight.",
    incident_date: "2026-09-19",
    location: "Port Sudan",
    current_safety: "no",
    perpetrator_nearby: true,
    reporter_type: "anonymous",
  },
  {
    case_number: "SP-1002",
    report_type: "violence",
    urgency: "urgent",
    status: "UNDER_REVIEW",
    description:
      "A relative assaulted me last week. I am afraid it will happen again but I did not want to involve the police directly.",
    incident_date: "2026-09-15",
    location: "Khartoum",
    current_safety: "unsure",
    perpetrator_nearby: false,
    reporter_type: "contact",
  },
  {
    case_number: "SP-1003",
    report_type: "abuse",
    urgency: "urgent",
    status: "ASSIGNED",
    description:
      "Ongoing abuse at home. I have been managing alone and need to understand what options are available for temporary housing.",
    incident_date: "2026-09-12",
    location: "Omdurman",
    current_safety: "yes",
    perpetrator_nearby: true,
    reporter_type: "anonymous",
  },
  {
    case_number: "SP-1004",
    report_type: "harassment",
    urgency: "concerning",
    status: "CLOSED",
    description:
      "Repeated harassment online and some encounters near my workplace. I was given advice and contacts by the responder.",
    incident_date: "2026-09-08",
    location: "Kassala",
    current_safety: "yes",
    perpetrator_nearby: false,
    reporter_type: "anonymous",
  },
  {
    case_number: "SP-1005",
    report_type: "missing_vulnerable",
    urgency: "urgent",
    status: "REFERRED",
    description:
      "A vulnerable family member has not returned home. I am reporting it here and have been referred to the protection center.",
    incident_date: "2026-09-20",
    location: "Wad Madani",
    current_safety: "unsure",
    perpetrator_nearby: false,
    reporter_type: "contact",
  },
];

const CONTACT_DETAILS = {
  "SP-1002": { method: "phone", value: "+249 9 0000 0002" },
  "SP-1005": { method: "sms", value: "+249 9 0000 0005" },
};

(async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    /* ---------- Users ---------- */
    const passwordHash = await bcrypt.hash("demo1234", 10);

    const users = [
      { name: "Sara Hassan", email: "responder@safepath.demo", role: "RESPONDER" },
      { name: "Admin", email: "admin@safepath.demo", role: "ADMIN" },
    ];

    const userIds = {};
    for (const u of users) {
      const { rows } = await client.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [u.name, u.email, passwordHash, u.role]
      );
      userIds[u.email] = rows[0].id;
    }
    console.log("✓ Users seeded (responder@safepath.demo / demo1234)");

    /* ---------- Services ---------- */
    const serviceIds = {};
    for (const s of SERVICES) {
      const { rows } = await client.query(
        `INSERT INTO services (name, service_type, description, phone, email, availability)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [s.name, s.service_type, s.description, s.phone, s.email, s.availability]
      );
      serviceIds[s.name] = rows[0].id;
    }
    console.log(`✓ ${SERVICES.length} services seeded`);

    /* ---------- Cases ---------- */
    const reportIds = {};
    for (const c of DEMO_CASES) {
      const { rows } = await client.query(
        `INSERT INTO reports
           (case_number, report_type, urgency, status, description,
            incident_date, location, current_safety, perpetrator_nearby, reporter_type)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING id`,
        [
          c.case_number, c.report_type, c.urgency, c.status, c.description,
          c.incident_date, c.location, c.current_safety, c.perpetrator_nearby, c.reporter_type,
        ]
      );
      reportIds[c.case_number] = rows[0].id;

      // Report-created event
      await client.query(
        `INSERT INTO case_events (report_id, event_type, description)
         VALUES ($1, 'REPORT_CREATED', 'Report received')`,
        [rows[0].id]
      );
    }
    console.log(`✓ ${DEMO_CASES.length} demo cases seeded`);

    // Advance the case-number sequence past the demo cases so real
    // submissions (SP-1006, SP-1007, …) don't collide with seeded data.
    // Seq starts at 1001 and mirrors report id (id 1 → SP-1001).
    await client.query(`
      SELECT setval('case_seq', (SELECT COALESCE(max(id), 0) FROM reports) + 1000)
    `);

    /* ---------- Contact details for cases that provided them ---------- */
    for (const [caseNumber, contact] of Object.entries(CONTACT_DETAILS)) {
      await client.query(
        `INSERT INTO reporter_contacts (report_id, contact_method, contact_value)
         VALUES ($1, $2, $3)`,
        [reportIds[caseNumber], contact.method, contact.value]
      );
    }

    /* ---------- Assignment: SP-1003 assigned to Sara ---------- */
    await client.query(
      `INSERT INTO case_assignments (report_id, user_id) VALUES ($1, $2)`,
      [reportIds["SP-1003"], userIds["responder@safepath.demo"]]
    );
    await client.query(
      `INSERT INTO case_events (report_id, user_id, event_type, description)
       VALUES ($1, $2, 'CASE_ASSIGNED', 'Case assigned to Sara Hassan')`,
      [reportIds["SP-1003"], userIds["responder@safepath.demo"]]
    );

    /* ---------- A note on SP-1002 ---------- */
    await client.query(
      `INSERT INTO case_notes (report_id, user_id, note)
       VALUES ($1, $2, $3)`,
      [
        reportIds["SP-1002"],
        userIds["responder@safepath.demo"],
        "Contacted reporter. Offered referrral to safety planning session.",
      ]
    );
    await client.query(
      `INSERT INTO case_events (report_id, user_id, event_type, description)
       VALUES ($1, $2, 'NOTE_ADDED', 'Internal note added')`,
      [reportIds["SP-1002"], userIds["responder@safepath.demo"]]
    );

    /* ---------- Referral on SP-1005 to Protection Center ---------- */
    await client.query(
      `INSERT INTO referrals (report_id, service_id, status, notes)
       VALUES ($1, $2, 'REFERRED', $3)`,
      [
        reportIds["SP-1005"],
        serviceIds["SafePath Protection Center"],
        "Referred for case management.",
      ]
    );
    await client.query(
      `INSERT INTO case_events (report_id, user_id, event_type, description)
       VALUES ($1, $2, 'REFERRAL_CREATED', 'Referral created: SafePath Protection Center')`,
      [reportIds["SP-1005"], userIds["responder@safepath.demo"]]
    );

    /* ---------- Close event on SP-1004 ---------- */
    await client.query(
      `INSERT INTO case_events (report_id, event_type, description)
       VALUES ($1, 'CASE_CLOSED', 'Case closed')`,
      [reportIds["SP-1004"]]
    );

    await client.query("COMMIT");
    console.log("✓ Seed complete");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
})().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});