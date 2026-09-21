#!/bin/sh
# Idempotent DB initialization for Docker deployments.
# Runs schema setup, then seeds demo data only when no users exist yet.
set -e

echo "==> Applying schema..."
node db/setup.js

USERS=$(node -e "
  const { pool } = require('./src/db');
  pool.query('SELECT count(*)::int AS n FROM users')
    .then(({ rows }) => { console.log(rows[0].n); return pool.end(); })
    .catch((e) => { console.error(e.message); process.exit(1); });
")

if [ "$USERS" = "0" ]; then
  echo "==> Seeding demo data..."
  node db/seed.js
else
  echo "==> Users already present ($USERS) — skipping seed."
fi

echo "==> DB init complete"