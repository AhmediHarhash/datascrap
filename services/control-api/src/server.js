"use strict";

require("dotenv").config();

const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");

const { authRouter } = require("./routes/auth");
const { configRouter } = require("./routes/config");
const { devicesRouter } = require("./routes/devices");
const { licenseRouter } = require("./routes/license");
const { config } = require("./config");
const { closePool, runDbProbe } = require("./db/pool");

const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("tiny"));

app.get("/", (_req, res) => {
  res.status(200).json({
    service: "control-api",
    status: "ok",
    version: config.appVersion
  });
});

app.get("/healthz", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "control-api",
    version: config.appVersion,
    env: config.nodeEnv,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime())
  });
});

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

app.use(configRouter);
app.use(authRouter);
app.use(licenseRouter);
app.use(devicesRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((error, _req, res, _next) => {
  console.error("[control-api] unhandled error:", error);
  res.status(500).json({ error: "Internal server error" });
});

const server = app.listen(config.port, () => {
  console.log(`[control-api] listening on port ${config.port} (${config.nodeEnv})`);
});

async function shutdown(signal) {
  console.log(`[control-api] received ${signal}, shutting down`);
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

