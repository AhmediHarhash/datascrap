"use strict";

const { Router } = require("express");
const { config } = require("../config");
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

