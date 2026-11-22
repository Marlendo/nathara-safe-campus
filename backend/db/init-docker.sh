#!/bin/sh
# Idempotent DB initialization for Docker deployments.
# Runs schema setup (incl. additive migrations), then seeds demo data
# only when no users exist yet.
set -e

echo "==> Applying schema + migrations..."
bun db/setup.js

USERS=$(bun -e "
  const { pool } = require('./src/db');
  pool.query('SELECT count(*)::int AS n FROM users')
    .then(({ rows }) => { console.log(rows[0].n); return pool.end(); })
    .catch((e) => { console.error(e.message); process.exit(1); });
")

if [ "$USERS" = "0" ]; then
  echo "==> Seeding data..."
  bun db/seed.js
else
  echo "==> Users already present ($USERS) — skipping seed."
fi

echo "==> DB init complete"
