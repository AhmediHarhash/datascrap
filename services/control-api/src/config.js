"use strict";

function bool(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  return String(value).toLowerCase() === "true";
}

function int(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: int(process.env.PORT, 3000),
  appVersion: process.env.APP_VERSION || "0.1.0",
  requireDb: bool(process.env.REQUIRE_DB, false),
  databaseUrl: process.env.DATABASE_URL || "",
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || "dev-access-secret-change-me",
  jwtIssuer: process.env.JWT_ISSUER || "datascrap-control-api",
  accessTokenTtlSeconds: int(process.env.ACCESS_TOKEN_TTL_SECONDS, 900),
  refreshTokenTtlDays: int(process.env.REFRESH_TOKEN_TTL_DAYS, 30),
  defaultMaxDevices: int(process.env.DEFAULT_MAX_DEVICES, 2)
};

module.exports = { config };

