"use strict";

function bool(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  return String(value).toLowerCase() === "true";
}

function int(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function csv(value, fallback = []) {
  if (value === undefined || value === null) return fallback;
  const list = String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return list.length > 0 ? list : fallback;
}

function parseJwtAccessSecrets(rawValue, fallbackSecret) {
  const pairs = csv(rawValue, []);
  const seenKids = new Set();
  const keyring = [];

  for (const pair of pairs) {
    const separatorIndex = pair.indexOf(":");
    if (separatorIndex <= 0) continue;

    const kid = pair.slice(0, separatorIndex).trim();
    const secret = pair.slice(separatorIndex + 1).trim();
    if (!kid || !secret || seenKids.has(kid)) continue;

    seenKids.add(kid);
    keyring.push({ kid, secret });
  }

  if (keyring.length === 0) {
    keyring.push({ kid: "legacy", secret: fallbackSecret });
  }

  return keyring;
}

const jwtAccessSecret = process.env.JWT_ACCESS_SECRET || "dev-access-secret-change-me";
const jwtAccessSecrets = parseJwtAccessSecrets(process.env.JWT_ACCESS_SECRETS, jwtAccessSecret);
const configuredActiveKid = String(process.env.JWT_ACTIVE_KID || "").trim();
const jwtActiveKid = jwtAccessSecrets.some((item) => item.kid === configuredActiveKid)
  ? configuredActiveKid
  : jwtAccessSecrets[0].kid;

const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: int(process.env.PORT, 3000),
  appVersion: process.env.APP_VERSION || "0.1.0",
  requireDb: bool(process.env.REQUIRE_DB, false),
  databaseUrl: process.env.DATABASE_URL || "",
  jwtAccessSecret,
  jwtAccessSecrets,
  jwtActiveKid,
  jwtIssuer: process.env.JWT_ISSUER || "datascrap-control-api",
  accessTokenTtlSeconds: int(process.env.ACCESS_TOKEN_TTL_SECONDS, 900),
  refreshTokenTtlDays: int(process.env.REFRESH_TOKEN_TTL_DAYS, 30),
  defaultMaxDevices: int(process.env.DEFAULT_MAX_DEVICES, 2),
  corsStrict: bool(process.env.CORS_STRICT, false),
  corsAllowNoOrigin: bool(process.env.CORS_ALLOW_NO_ORIGIN, true),
  corsAllowedOrigins: csv(process.env.CORS_ALLOWED_ORIGINS, []),
  corsAllowedOriginPrefixes: csv(process.env.CORS_ALLOWED_ORIGIN_PREFIXES, ["chrome-extension://"]),
  rateLimitWindowSeconds: int(process.env.RATE_LIMIT_WINDOW_SECONDS, 60),
  rateLimitAuthRegisterMax: int(process.env.RATE_LIMIT_AUTH_REGISTER_MAX, 10),
  rateLimitAuthLoginMax: int(process.env.RATE_LIMIT_AUTH_LOGIN_MAX, 15),
  rateLimitAuthRefreshMax: int(process.env.RATE_LIMIT_AUTH_REFRESH_MAX, 30),
  rateLimitAuthLogoutMax: int(process.env.RATE_LIMIT_AUTH_LOGOUT_MAX, 60),
  rateLimitLicenseRegisterMax: int(process.env.RATE_LIMIT_LICENSE_REGISTER_MAX, 30),
  rateLimitLicenseStatusMax: int(process.env.RATE_LIMIT_LICENSE_STATUS_MAX, 60),
  rateLimitDevicesValidateMax: int(process.env.RATE_LIMIT_DEVICES_VALIDATE_MAX, 120),
  rateLimitDevicesMutateMax: int(process.env.RATE_LIMIT_DEVICES_MUTATE_MAX, 60),
  rateLimitDevicesListMax: int(process.env.RATE_LIMIT_DEVICES_LIST_MAX, 120),
  idempotencyTtlHours: int(process.env.IDEMPOTENCY_TTL_HOURS, 24),
  enableMetricsEndpoint: bool(process.env.ENABLE_METRICS_ENDPOINT, true),
  metricsWindowMinutes: int(process.env.METRICS_WINDOW_MINUTES, 60),
  metricsMaxSamples: int(process.env.METRICS_MAX_SAMPLES, 20_000),
  observabilityApiKey: process.env.OBSERVABILITY_API_KEY || "",
  errorTrackingWebhookUrl: process.env.ERROR_TRACKING_WEBHOOK_URL || "",
  errorTrackingWebhookBearerToken: process.env.ERROR_TRACKING_WEBHOOK_BEARER_TOKEN || "",
  errorTrackingMinIntervalSeconds: int(process.env.ERROR_TRACKING_MIN_INTERVAL_SECONDS, 15),
  enableReadCache: bool(process.env.ENABLE_READ_CACHE, true),
  readCacheDefaultTtlSeconds: int(process.env.READ_CACHE_DEFAULT_TTL_SECONDS, 20),
  readCacheMaxEntries: int(process.env.READ_CACHE_MAX_ENTRIES, 5_000),
  licenseStatusCacheTtlSeconds: int(process.env.LICENSE_STATUS_CACHE_TTL_SECONDS, 20),
  devicesListCacheTtlSeconds: int(process.env.DEVICES_LIST_CACHE_TTL_SECONDS, 15)
};

module.exports = { config };
