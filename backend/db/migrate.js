require("dotenv").config();
const fs = require("fs");
const path = require("path");

/**
 * Runner migrasi aditif (bun db/migrate.js).
 * Menjalankan semua file backend/db/migrations/*.sql berurutan.
 * Placeholder __SEED_ADMIN_SUB__ / __SEED_ADMIN_EMAIL__ /
 * __SEED_ADMIN_NAME__ disubstitusi dari env (placeholder di repo,
 * TANPA nilai). Nilai di-escape untuk literal SQL.
 */

function sqlLiteral(value) {
  return String(value || "").replace(/'/g, "''");
}

function withSeedPlaceholders(sql) {
  return sql
    .replaceAll("__SEED_ADMIN_SUB__", sqlLiteral(process.env.SEED_ADMIN_SUB))
    .replaceAll("__SEED_ADMIN_EMAIL__", sqlLiteral(process.env.SEED_ADMIN_EMAIL))
    .replaceAll(
      "__SEED_ADMIN_NAME__",
      sqlLiteral(process.env.SEED_ADMIN_NAME || "Safe Campus Admin")
    );
}

function migrationFiles() {
  const dir = path.join(__dirname, "migrations");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => path.join(dir, f));
}

async function runMigrations(pool) {
  const files = migrationFiles();
  for (const file of files) {
    const sql = withSeedPlaceholders(fs.readFileSync(file, "utf8"));
    await pool.query(sql);
    console.log(`✓ Migration applied: ${path.basename(file)}`);
  }
  if (files.length === 0) {
    console.log("(no migrations)");
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Missing required environment variable: DATABASE_URL");
    process.exit(1);
  }
  const { Pool } = require("pg");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await runMigrations(pool);
    console.log("✓ Migrations complete");
  } finally {
    await pool.end();
  }
}

module.exports = { runMigrations };

if (require.main === module) {
  main().catch((err) => {
    console.error("Migration failed:", err.message);
    process.exit(1);
  });
}
