require("dotenv").config();
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

/**
 * Creates the database (if needed) and applies schema.sql.
 * Run: npm run db:setup   (or node db/setup.js)
 *
 * Assumes a running PostgreSQL server whose connection details are in
 * DATABASE_URL (see .env.example) — e.g. postgres://postgres:postgres@localhost:5432/safepath
 */
async function main() {
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
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await appPool.query(schema);
  console.log("✓ Schema applied");
  await appPool.end();
}

main().catch((err) => {
  console.error("Schema setup failed:", err.message);
  process.exit(1);
});