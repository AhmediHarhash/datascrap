"use strict";

const { getRequestIp } = require("../utils/http");

function createRateLimiter(options) {
  const windowMs = Math.max(1_000, Number(options.windowMs || 60_000));
  const maxRequests = Math.max(1, Number(options.maxRequests || 60));
  const scope = options.scope || "global";
  const keyResolver = typeof options.keyResolver === "function" ? options.keyResolver : () => "anonymous";
  const buckets = new Map();

  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (bucket.resetAt <= now) {
        buckets.delete(key);
      }
    }
  }, Math.max(windowMs, 30_000));

  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return function rateLimitMiddleware(req, res, next) {
    const identity = String(keyResolver(req) || "anonymous");
    const key = `${scope}:${identity}`;
    const now = Date.now();
    const current = buckets.get(key);

    let bucket = current;
    if (!bucket || bucket.resetAt <= now) {
      bucket = {
        count: 0,
        resetAt: now + windowMs
      };
    }

    bucket.count += 1;
    buckets.set(key, bucket);

    const remaining = Math.max(0, maxRequests - bucket.count);
    res.setHeader("X-RateLimit-Limit", String(maxRequests));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1_000)));

    if (bucket.count > maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000));
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({
        error: "Too many requests",
        errorType: "RATE_LIMITED",
        retryAfterSeconds
      });
    }

    return next();
  };
}

function ipRateLimitKey(req) {
  return getRequestIp(req) || "unknown";
}

module.exports = {
  createRateLimiter,
  ipRateLimitKey
};

