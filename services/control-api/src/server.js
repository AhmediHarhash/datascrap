"use strict";

require("dotenv").config();

const express = require("express");
const helmet = require("helmet");

const { authRouter } = require("./routes/auth");
const { configRouter } = require("./routes/config");
const { devicesRouter } = require("./routes/devices");
const { licenseRouter } = require("./routes/license");
const { observabilityRouter } = require("./routes/observability");
const { config } = require("./config");
const { closePool, runDbProbe } = require("./db/pool");
const { corsPolicy } = require("./middleware/cors");
const { attachRequestContext, requestLogger } = require("./middleware/request");
const { logError, logInfo } = require("./utils/logger");

const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(attachRequestContext);
app.use(corsPolicy);
app.use(express.json({ limit: "1mb" }));
app.use(requestLogger);

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
app.use(observabilityRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((error, _req, res, _next) => {
  logError("http.unhandled.error", error, {
    requestId: _req.requestId || null,
    path: _req.originalUrl || _req.url,
    method: _req.method
  });
  res.status(500).json({ error: "Internal server error" });
});

const server = app.listen(config.port, () => {
  logInfo("server.started", {
    port: config.port,
    env: config.nodeEnv
  });
});

async function shutdown(signal) {
  logInfo("server.shutdown.started", { signal });
  server.close(async () => {
    await closePool();
    logInfo("server.shutdown.completed", { signal });
    process.exit(0);
  });
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
