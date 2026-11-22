require("dotenv").config();
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const { runMigrations } = require("./migrate");

/**
 * Provisioning awal database: buat DB (bila belum ada), terapkan
 * schema.sql, lalu jalankan migrasi aditif (db/migrations/*.sql).
 * Run: bun db/setup.js   (atau: DATABASE_URL='...' bun db/setup.js)
 *
 * Perubahan skema SETELAH provisioning awal HANYA via file migrasi
 * baru — JANGAN edit schema.sql yang sudah applied tanpa migrasi.
 * (Lihat db/migrations/0002_sso_rebrand.sql.)
 */
async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Missing required environment variable: DATABASE_URL");
    process.exit(1);
  }
  const dbUrl = new URL(process.env.DATABASE_URL);
  const dbName = dbUrl.pathname.slice(1);

  // 1. Connect to the default "postgres" database to create ours if missing.
  const adminPool = new Pool({
    host: dbUrl.hostname,
    port: dbUrl.port,
    user: dbUrl.username,
    password: dbUrl.password,
    database: "postgres",
  });

  try {
    const { rowCount } = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );
    if (rowCount === 0) {
      // CREATE DATABASE cannot run inside a transaction/parameterized query.
      await adminPool.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✓ Database "${dbName}" created`);
    } else {
      console.log(`✓ Database "${dbName}" already exists`);
    }
  } finally {
    await adminPool.end();
  }

  // 2. Apply the schema on the target database.
  const appPool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
    await appPool.query(schema);
    console.log("✓ Schema applied");

    // 3. Additive migrations (idempotent) —incl. seed admin SSO + DROP password.
    await runMigrations(appPool);
  } finally {
    await appPool.end();
  }
  console.log("✓ Setup complete");
}

main().catch((err) => {
  console.error("Schema setup failed:", err.message);
  process.exit(1);
});
