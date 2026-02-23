"use strict";

const { Router } = require("express");
const { config } = require("../config");
const { getRateLimiterStats } = require("../middleware/rate-limit");
const { cacheStats } = require("../services/cache");
const { listRecentErrors, getErrorSummary } = require("../services/error-store");
const { currentWindowSnapshot, toPrometheus } = require("../services/metrics");

const router = Router();

function requireObservabilityKey(req, res, next) {
  if (!config.observabilityApiKey) {
    return next();
  }

  const headerValue = String(req.headers["x-observability-key"] || "").trim();
  if (headerValue !== config.observabilityApiKey) {
    return res.status(401).json({
      error: "Unauthorized observability access"
    });
  }

  return next();
}

router.get("/api/observability/slo", requireObservabilityKey, (_req, res) => {
  if (!config.enableMetricsEndpoint) {
    return res.status(404).json({ error: "Observability endpoints are disabled" });
  }

  return res.status(200).json(currentWindowSnapshot());
});

router.get("/api/observability/dashboard", requireObservabilityKey, (_req, res) => {
  if (!config.enableMetricsEndpoint) {
    return res.status(404).json({ error: "Observability endpoints are disabled" });
  }

  const snapshot = currentWindowSnapshot();
  return res.status(200).json({
    generatedAt: snapshot.generatedAt,
    windowMinutes: snapshot.windowMinutes,
    window: snapshot.window,
    slo: snapshot.slo,
    topRoutes: snapshot.topRoutes,
    rateLimits: getRateLimiterStats(),
    cache: cacheStats()
  });
});

router.get("/api/observability/errors/recent", requireObservabilityKey, (req, res) => {
  if (!config.enableMetricsEndpoint) {
    return res.status(404).json({ error: "Observability endpoints are disabled" });
  }

  const limit = Number(req.query.limit || 50);
  return res.status(200).json({
    summary: getErrorSummary(),
    items: listRecentErrors(limit)
  });
});

router.get("/api/observability/rate-limits", requireObservabilityKey, (_req, res) => {
  if (!config.enableMetricsEndpoint) {
    return res.status(404).json({ error: "Observability endpoints are disabled" });
  }

  return res.status(200).json({
    generatedAt: new Date().toISOString(),
    windowSeconds: config.rateLimitWindowSeconds,
    items: getRateLimiterStats()
  });
});

router.get("/metrics", requireObservabilityKey, (_req, res) => {
  if (!config.enableMetricsEndpoint) {
    return res.status(404).send("Not found");
  }

  const snapshot = currentWindowSnapshot();
  res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
  return res.status(200).send(toPrometheus(snapshot));
});

module.exports = {
  observabilityRouter: router
};
