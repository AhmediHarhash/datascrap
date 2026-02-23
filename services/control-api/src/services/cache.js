"use strict";

const { config } = require("../config");

const store = new Map();
const stats = {
  hits: 0,
  misses: 0,
  sets: 0,
  invalidations: 0
};

function nowMs() {
  return Date.now();
}

function isEnabled() {
  return Boolean(config.enableReadCache);
}

function normalizeTtlSeconds(ttlSeconds) {
  const value = Number(ttlSeconds);
  if (!Number.isFinite(value) || value <= 0) {
    return Math.max(1, config.readCacheDefaultTtlSeconds);
  }
  return value;
}

function evictExpired() {
  const now = nowMs();
  for (const [key, entry] of store.entries()) {
    if (entry.expiresAtMs <= now) {
      store.delete(key);
    }
  }
}

function ensureCapacity() {
  const maxEntries = Math.max(100, config.readCacheMaxEntries);
  if (store.size <= maxEntries) return;

  const entries = [...store.entries()].sort((a, b) => a[1].storedAtMs - b[1].storedAtMs);
  const toDelete = store.size - maxEntries;
  for (let i = 0; i < toDelete; i += 1) {
    store.delete(entries[i][0]);
  }
}

function get(cacheKey) {
  if (!isEnabled()) return null;
  const entry = store.get(cacheKey);
  if (!entry) {
    stats.misses += 1;
    return null;
  }
  if (entry.expiresAtMs <= nowMs()) {
    store.delete(cacheKey);
    stats.misses += 1;
    return null;
  }
  stats.hits += 1;
  return entry.value;
}

function set(cacheKey, value, ttlSeconds) {
  if (!isEnabled()) return;
  evictExpired();
  const ttl = normalizeTtlSeconds(ttlSeconds);
  const now = nowMs();

  store.set(cacheKey, {
    value,
    storedAtMs: now,
    expiresAtMs: now + ttl * 1_000
  });
  stats.sets += 1;
  ensureCapacity();
}

function invalidate(cacheKey) {
  if (!isEnabled()) return;
  if (store.delete(cacheKey)) {
    stats.invalidations += 1;
  }
}

function invalidateByPrefix(prefix) {
  if (!isEnabled()) return;
  let count = 0;
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
      count += 1;
    }
  }
  stats.invalidations += count;
}

function cacheStats() {
  evictExpired();
  return {
    enabled: isEnabled(),
    size: store.size,
    maxEntries: Math.max(100, config.readCacheMaxEntries),
    defaultTtlSeconds: Math.max(1, config.readCacheDefaultTtlSeconds),
    ...stats
  };
}

module.exports = {
  cacheStats,
  get,
  invalidate,
  invalidateByPrefix,
  set
};

