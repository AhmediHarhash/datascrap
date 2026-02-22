"use strict";

const fs = require("fs");
const path = require("path");
const { getPool, hasDatabase } = require("./pool");

const MIGRATIONS_DIR = path.resolve(__dirname, "..", "..", "migrations");

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGSERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

function listMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();
}

async function runMigrations() {
  if (!hasDatabase()) {
    throw new Error("DATABASE_URL is required to run migrations");
  }

  const pool = getPool();
  const client = await pool.connect();
  let applied = 0;

  try {
    await ensureMigrationsTable(client);

    const files = listMigrationFiles();
    const existing = await client.query("SELECT filename FROM schema_migrations");
    const appliedSet = new Set(existing.rows.map((row) => row.filename));

    for (const filename of files) {
      if (appliedSet.has(filename)) continue;

      const filePath = path.join(MIGRATIONS_DIR, filename);
      const sql = fs.readFileSync(filePath, "utf8");

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [filename]);
        await client.query("COMMIT");
        applied += 1;
        console.log(`[migrate] applied ${filename}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    return { applied, totalFiles: files.length };
  } finally {
    client.release();
  }
}

module.exports = {
  runMigrations
};

