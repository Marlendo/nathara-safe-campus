require("dotenv").config();
const { pool } = require("../src/db");

/**
 * Seeds demo data untuk Nathara Safe Campus.
 *
 * - TANPA password / kredensial demo (login hanya via SSO Supabase prod).
 * - Admin awal dari env SEED_ADMIN_SUB + SEED_ADMIN_EMAIL (+ SEED_ADMIN_NAME
 *   opsional); placeholder di repo, nilai via file VPS. Bila env kosong,
 *   admin dilewati (peringatan) — email final menyusul dari human.
 * - Prefix kasus NSC-, email layanan netral @ppkpt.nathara.ac.id.
 *
 * Run: bun db/seed.js   (setelah bun db/setup.js)
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
    name: "Nathara Safe Campus Protection Center",
    service_type: "protection",
    description: "Case management and safety planning for people at risk.",
    phone: "0800-555-0143",
    email: "protection@ppkpt.nathara.ac.id",
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
    email: "pss@ppkpt.nathara.ac.id",
    availability: "08:00–22:00",
  },
  {
    name: "Legal Assistance Clinic",
    service_type: "legal",
    description: "Rights information and legal advice.",
    phone: "0800-555-0121",
    email: "legal@ppkpt.nathara.ac.id",
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
    case_number: "NSC-1001",
    report_type: "threat",
    urgency: "immediate",
    status: "NEW",
    description:
      "I received repeated threats demanding I hand over money. The sender knows where I live and said they would come to my home tonight.",
    incident_date: "2026-09-19",
    location: "North District",
    current_safety: "no",
    perpetrator_nearby: true,
    reporter_type: "anonymous",
  },
  {
    case_number: "NSC-1002",
    report_type: "violence",
    urgency: "urgent",
    status: "UNDER_REVIEW",
    description:
      "A relative assaulted me last week. I am afraid it will happen again but I did not want to involve the police directly.",
    incident_date: "2026-09-15",
    location: "Central District",
    current_safety: "unsure",
    perpetrator_nearby: false,
    reporter_type: "contact",
  },
  {
    case_number: "NSC-1003",
    report_type: "abuse",
    urgency: "urgent",
    status: "ASSIGNED",
    description:
      "Ongoing abuse at home. I have been managing alone and need to understand what options are available for temporary housing.",
    incident_date: "2026-09-12",
    location: "West District",
    current_safety: "yes",
    perpetrator_nearby: true,
    reporter_type: "anonymous",
  },
  {
    case_number: "NSC-1004",
    report_type: "harassment",
    urgency: "concerning",
    status: "CLOSED",
    description:
      "Repeated harassment online and some encounters near my workplace. I was given advice and contacts by the responder.",
    incident_date: "2026-09-08",
    location: "East District",
    current_safety: "yes",
    perpetrator_nearby: false,
    reporter_type: "anonymous",
  },
  {
    case_number: "NSC-1005",
    report_type: "missing_vulnerable",
    urgency: "urgent",
    status: "REFERRED",
    description:
      "A vulnerable family member has not returned home. I am reporting it here and have been referred to the protection center.",
    incident_date: "2026-09-20",
    location: "South District",
    current_safety: "unsure",
    perpetrator_nearby: false,
    reporter_type: "contact",
  },
];

const CONTACT_DETAILS = {
  "NSC-1002": { method: "phone", value: "+249 9 0000 0002" },
  "NSC-1005": { method: "sms", value: "+249 9 0000 0005" },
};

(async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    /* ---------- Admin awal via SSO (dari env, tanpa password) ---------- */
    const adminSub = (process.env.SEED_ADMIN_SUB || "").trim();
    const adminEmail = (process.env.SEED_ADMIN_EMAIL || "").toLowerCase().trim();
    const adminName = (process.env.SEED_ADMIN_NAME || "Safe Campus Admin").trim();
    if (adminSub && adminEmail) {
      await client.query(
        `INSERT INTO users (name, email, supabase_sub, role, scope, status)
         VALUES ($1, $2, $3, 'admin', 'SAFE_CAMPUS', 'ACTIVE')
         ON CONFLICT (supabase_sub) DO UPDATE SET
           email = EXCLUDED.email, name = EXCLUDED.name,
           role = 'admin', scope = 'SAFE_CAMPUS', status = 'ACTIVE'`,
        [adminName, adminEmail, adminSub]
      );
      console.log(`✓ Admin SSO seeded (${adminEmail})`);
    } else {
      console.warn(
        "! SEED_ADMIN_SUB/SEED_ADMIN_EMAIL kosong — admin awal dilewati. " +
          "Isi dari file VPS sebelum login admin pertama (email final menyusul)."
      );
    }

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
    // submissions (NSC-1006, NSC-1007, …) don't collide with seeded data.
    // Seq starts at 1001 and mirrors report id (id 1 → NSC-1001).
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

    /* ---------- Referral on NSC-1005 to Protection Center ---------- */
    await client.query(
      `INSERT INTO referrals (report_id, service_id, status, notes)
       VALUES ($1, $2, 'REFERRED', $3)`,
      [
        reportIds["NSC-1005"],
        serviceIds["Nathara Safe Campus Protection Center"],
        "Referred for case management.",
      ]
    );
    await client.query(
      `INSERT INTO case_events (report_id, event_type, description)
       VALUES ($1, 'REFERRAL_CREATED', 'Referral created: Nathara Safe Campus Protection Center')`,
      [reportIds["NSC-1005"]]
    );

    /* ---------- Close event on NSC-1004 ---------- */
    await client.query(
      `INSERT INTO case_events (report_id, event_type, description)
       VALUES ($1, 'CASE_CLOSED', 'Case closed')`,
      [reportIds["NSC-1004"]]
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
