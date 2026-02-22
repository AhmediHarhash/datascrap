"use strict";

require("dotenv").config();

const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const { Pool } = require("pg");

const app = express();

const PORT = Number(process.env.PORT || 3000);
const NODE_ENV = process.env.NODE_ENV || "development";
const REQUIRE_DB = String(process.env.REQUIRE_DB || "false").toLowerCase() === "true";
const DATABASE_URL = process.env.DATABASE_URL || "";
const APP_VERSION = process.env.APP_VERSION || "0.1.0";

let pool = null;

function getPool() {
  if (!DATABASE_URL) return null;
  if (pool) return pool;

  pool = new Pool({
    connectionString: DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 10_000,
    ssl: DATABASE_URL.includes("localhost")
      ? false
      : {
          rejectUnauthorized: false
        }
  });

  pool.on("error", (error) => {
    console.error("[control-api] postgres pool error:", error.message);
  });

  return pool;
}

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("tiny"));

app.get("/", (_req, res) => {
  res.status(200).json({
    service: "control-api",
    status: "ok",
    version: APP_VERSION
  });
});

app.get("/healthz", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "control-api",
    version: APP_VERSION,
    env: NODE_ENV,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime())
  });
});

async function runDbProbe() {
  const instance = getPool();
  if (!instance) {
    return {
      ok: !REQUIRE_DB,
      detail: REQUIRE_DB ? "DATABASE_URL missing while REQUIRE_DB=true" : "db check skipped"
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

app.get("/readyz", async (_req, res) => {
  try {
    const db = await runDbProbe();
    if (!db.ok) {
      return res.status(503).json({
        status: "not_ready",
        service: "control-api",
        checks: { db }
      });
    }

    return res.status(200).json({
      status: "ready",
      service: "control-api",
      checks: { db }
    });
  } catch (error) {
    return res.status(503).json({
      status: "not_ready",
      service: "control-api",
      checks: {
        db: {
          ok: false,
          detail: error.message
        }
      }
    });
  }
});

const server = app.listen(PORT, () => {
  console.log(`[control-api] listening on port ${PORT} (${NODE_ENV})`);
});

async function shutdown(signal) {
  console.log(`[control-api] received ${signal}, shutting down`);
  server.close(async () => {
    if (pool) {
      await pool.end();
    }
    process.exit(0);
  });
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

