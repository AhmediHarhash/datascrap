"use strict";

const { Pool } = require("pg");
const { config } = require("../config");
const { logError } = require("../utils/logger");

let pool = null;

function hasDatabase() {
  return Boolean(config.databaseUrl);
}

function getPool() {
  if (!hasDatabase()) return null;
  if (pool) return pool;

  pool = new Pool({
    connectionString: config.databaseUrl,
    max: 10,
    idleTimeoutMillis: 10_000,
    ssl: config.databaseUrl.includes("localhost")
      ? false
      : {
          rejectUnauthorized: false
        }
  });

  pool.on("error", (error) => {
    logError("postgres.pool.error", error);
  });

  return pool;
}

async function query(text, params = []) {
  const instance = getPool();
  if (!instance) {
    throw new Error("DATABASE_URL is not configured");
  }
  return instance.query(text, params);
}

async function withTransaction(callback) {
  const instance = getPool();
  if (!instance) {
    throw new Error("DATABASE_URL is not configured");
  }

  const client = await instance.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function runDbProbe() {
  const instance = getPool();
  if (!instance) {
    return {
      ok: !config.requireDb,
      detail: config.requireDb ? "DATABASE_URL missing while REQUIRE_DB=true" : "db check skipped"
    };
  }

  const client = await instance.connect();
  try {
    await client.query("SELECT 1");
    return { ok: true, detail: "db reachable" };
  } finally {
    client.release();
  }
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  closePool,
  getPool,
  hasDatabase,
  query,
  runDbProbe,
  withTransaction
};
