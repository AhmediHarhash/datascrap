"use strict";

const { randomUUID } = require("crypto");
const { observeRequest } = require("../services/metrics");
const { recordErrorEvent } = require("../services/error-store");
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
    const routePath =
      req.route && req.route.path
        ? `${req.baseUrl || ""}${req.route.path}`
        : req.path || (req.originalUrl ? String(req.originalUrl).split("?")[0] : req.url);

    observeRequest({
      method: req.method,
      path: routePath || "unknown",
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(2))
    });

    if (res.statusCode >= 500) {
      recordErrorEvent({
        event: "http.5xx.response",
        env: process.env.NODE_ENV || "development",
        service: "control-api",
        fields: {
          requestId: req.requestId || null,
          method: req.method,
          path: routePath || req.originalUrl || req.url,
          statusCode: res.statusCode
        },
        error: {
          name: "Http5xxResponse",
          message: `Response status ${res.statusCode}`
        }
      });
    }

    logInfo("http.request.completed", {
      requestId: req.requestId || null,
      method: req.method,
      path: routePath || req.originalUrl || req.url,
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
