"use strict";

const { getRequestIp } = require("../utils/http");

const limiterStats = new Map();

function getOrCreateLimiterStats(scope, maxRequests, windowMs) {
  if (!limiterStats.has(scope)) {
    limiterStats.set(scope, {
      scope,
      maxRequests,
      windowMs,
      requests: 0,
      limitedRequests: 0,
      lastSeenAt: null
    });
  }

  const current = limiterStats.get(scope);
  current.maxRequests = maxRequests;
  current.windowMs = windowMs;
  return current;
}

function createRateLimiter(options) {
  const windowMs = Math.max(1_000, Number(options.windowMs || 60_000));
  const maxRequests = Math.max(1, Number(options.maxRequests || 60));
  const scope = options.scope || "global";
  const keyResolver = typeof options.keyResolver === "function" ? options.keyResolver : () => "anonymous";
  const buckets = new Map();
  const scopeStats = getOrCreateLimiterStats(scope, maxRequests, windowMs);

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
    scopeStats.requests += 1;
    scopeStats.lastSeenAt = new Date().toISOString();

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
      scopeStats.limitedRequests += 1;
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

function getRateLimiterStats() {
  return [...limiterStats.values()].map((item) => ({
    scope: item.scope,
    maxRequests: item.maxRequests,
    windowMs: item.windowMs,
    requests: item.requests,
    limitedRequests: item.limitedRequests,
    limitedRatePercent:
      item.requests > 0 ? Number(((item.limitedRequests / item.requests) * 100).toFixed(2)) : 0,
    lastSeenAt: item.lastSeenAt
  }));
}

module.exports = {
  createRateLimiter,
  getRateLimiterStats,
  ipRateLimitKey
};
