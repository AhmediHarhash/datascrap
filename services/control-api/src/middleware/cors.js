"use strict";

const { config } = require("../config");

function matchesAllowedOrigin(origin) {
  if (!origin) {
    return config.corsAllowNoOrigin;
  }

  if (config.corsAllowedOrigins.includes(origin)) {
    return true;
  }

  return config.corsAllowedOriginPrefixes.some((prefix) => origin.startsWith(prefix));
}

function corsPolicy(req, res, next) {
  const origin = String(req.headers.origin || "").trim();
  const hasOrigin = Boolean(origin);
  const allowByDefault = !config.corsStrict && config.corsAllowedOrigins.length === 0;
  const allowed = allowByDefault || matchesAllowedOrigin(origin);

  if (!allowed) {
    return res.status(403).json({
      error: "Origin not allowed"
    });
  }

  if (hasOrigin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Authorization,Content-Type,Idempotency-Key,X-Request-Id"
    );
    res.setHeader("Access-Control-Expose-Headers", "X-Request-Id,Idempotent-Replay");
    res.setHeader("Access-Control-Max-Age", "86400");
  }

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  return next();
}

module.exports = {
  corsPolicy
};

