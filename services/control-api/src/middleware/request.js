"use strict";

const { randomUUID } = require("crypto");
const { getRequestIp, getUserAgent } = require("../utils/http");
const { logInfo } = require("../utils/logger");

function attachRequestContext(req, res, next) {
  const incomingRequestId = String(req.headers["x-request-id"] || "").trim();
  const requestId = incomingRequestId || randomUUID();

  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
}

function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    logInfo("http.request.completed", {
      requestId: req.requestId || null,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      ip: getRequestIp(req),
      userAgent: getUserAgent(req)
    });
  });

  next();
}

module.exports = {
  attachRequestContext,
  requestLogger
};

