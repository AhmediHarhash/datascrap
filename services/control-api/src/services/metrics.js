"use strict";

const { config } = require("../config");

const STARTED_AT_MS = Date.now();
const WINDOW_MS = Math.max(1, Number(config.metricsWindowMinutes || 60)) * 60 * 1_000;
const MAX_SAMPLES = Math.max(1_000, Number(config.metricsMaxSamples || 20_000));

const state = {
  totals: {
    requests: 0,
    status2xx: 0,
    status4xx: 0,
    status5xx: 0,
    authFailures: 0,
    licenseFailures: 0,
    deviceFailures: 0
  },
  routeTotals: new Map(),
  requestEvents: [],
  healthzEvents: [],
  authLatencyEvents: [],
  licenseLatencyEvents: []
};

function pathIsAuthSlo(path) {
  return path === "/api/auth/login" || path === "/api/auth/refresh";
}

function pathIsLicenseSlo(path) {
  return path === "/api/license/status" || path === "/api/devices/validate-devices";
}

function pathIsAuth(path) {
  return path.startsWith("/api/auth/");
}

function pathIsLicense(path) {
  return path.startsWith("/api/license/");
}

function pathIsDevice(path) {
  return path.startsWith("/api/devices");
}

function classifyFamily(path) {
  if (pathIsAuth(path)) return "auth";
  if (pathIsLicense(path)) return "license";
  if (pathIsDevice(path)) return "devices";
  if (path === "/healthz" || path === "/readyz") return "health";
  if (path.startsWith("/api/observability/") || path === "/metrics") return "observability";
  return "other";
}

function statusClass(statusCode) {
  if (statusCode >= 500) return "5xx";
  if (statusCode >= 400) return "4xx";
  if (statusCode >= 300) return "3xx";
  if (statusCode >= 200) return "2xx";
  return "1xx";
}

function pushBoundedEvent(array, event) {
  array.push(event);
  if (array.length > MAX_SAMPLES) {
    array.splice(0, array.length - MAX_SAMPLES);
  }
}

function pruneEvents(array, cutoffMs) {
  while (array.length > 0 && array[0].ts < cutoffMs) {
    array.shift();
  }
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return Number(sorted[index].toFixed(2));
}

function percent(numerator, denominator, digits = 2) {
  if (!denominator) return null;
  return Number(((numerator / denominator) * 100).toFixed(digits));
}

function summarizeWindowFamilies(requestEvents) {
  const families = new Map();
  for (const event of requestEvents) {
    const family = event.family;
    const stats = families.get(family) || {
      requests: 0,
      failures: 0,
      durations: []
    };

    stats.requests += 1;
    if (event.statusCode >= 400) stats.failures += 1;
    stats.durations.push(event.durationMs);
    families.set(family, stats);
  }

  const output = {};
  for (const [family, stats] of families.entries()) {
    output[family] = {
      requests: stats.requests,
      failures: stats.failures,
      failureRatePercent: percent(stats.failures, stats.requests),
      avgDurationMs:
        stats.requests > 0
          ? Number((stats.durations.reduce((sum, value) => sum + value, 0) / stats.requests).toFixed(2))
          : 0,
      p95DurationMs: percentile(stats.durations, 95)
    };
  }

  return output;
}

function summarizeWindowRequests(requestEvents) {
  let status2xx = 0;
  let status4xx = 0;
  let status5xx = 0;

  for (const event of requestEvents) {
    if (event.statusCode >= 500) status5xx += 1;
    else if (event.statusCode >= 400) status4xx += 1;
    else if (event.statusCode >= 200) status2xx += 1;
  }

  const total = requestEvents.length;
  return {
    requestsTotal: total,
    status2xx,
    status4xx,
    status5xx,
    errorRatePercent: percent(status5xx, total),
    byFamily: summarizeWindowFamilies(requestEvents)
  };
}

function observeRequest({ method, path, statusCode, durationMs }) {
  const ts = Date.now();
  const classKey = statusClass(statusCode);
  const routeKey = `${method} ${path}`;
  const safeDurationMs = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0;
  const family = classifyFamily(path);

  state.totals.requests += 1;
  if (classKey === "2xx") state.totals.status2xx += 1;
  if (classKey === "4xx") state.totals.status4xx += 1;
  if (classKey === "5xx") state.totals.status5xx += 1;
  if (pathIsAuth(path) && statusCode >= 400) state.totals.authFailures += 1;
  if (pathIsLicense(path) && statusCode >= 400) state.totals.licenseFailures += 1;
  if (pathIsDevice(path) && statusCode >= 400) state.totals.deviceFailures += 1;

  const routeStats = state.routeTotals.get(routeKey) || {
    method,
    path,
    count: 0,
    errorCount: 0,
    totalDurationMs: 0
  };
  routeStats.count += 1;
  routeStats.totalDurationMs += safeDurationMs;
  if (statusCode >= 400) routeStats.errorCount += 1;
  state.routeTotals.set(routeKey, routeStats);

  pushBoundedEvent(state.requestEvents, {
    ts,
    statusCode,
    durationMs: safeDurationMs,
    family
  });

  if (path === "/healthz") {
    pushBoundedEvent(state.healthzEvents, { ts, ok: statusCode >= 200 && statusCode < 400 });
  }
  if (pathIsAuthSlo(path)) {
    pushBoundedEvent(state.authLatencyEvents, { ts, durationMs: safeDurationMs });
  }
  if (pathIsLicenseSlo(path)) {
    pushBoundedEvent(state.licenseLatencyEvents, { ts, durationMs: safeDurationMs });
  }

  const cutoffMs = ts - WINDOW_MS;
  pruneEvents(state.requestEvents, cutoffMs);
  pruneEvents(state.healthzEvents, cutoffMs);
  pruneEvents(state.authLatencyEvents, cutoffMs);
  pruneEvents(state.licenseLatencyEvents, cutoffMs);
}

function currentWindowSnapshot() {
  const now = Date.now();
  const cutoffMs = now - WINDOW_MS;

  pruneEvents(state.requestEvents, cutoffMs);
  pruneEvents(state.healthzEvents, cutoffMs);
  pruneEvents(state.authLatencyEvents, cutoffMs);
  pruneEvents(state.licenseLatencyEvents, cutoffMs);

  const healthTotal = state.healthzEvents.length;
  const healthOk = state.healthzEvents.filter((event) => event.ok).length;
  const healthAvailabilityPercent =
    healthTotal === 0 ? null : Number(((healthOk / healthTotal) * 100).toFixed(4));

  const authP95Ms = percentile(
    state.authLatencyEvents.map((event) => event.durationMs),
    95
  );
  const licenseP95Ms = percentile(
    state.licenseLatencyEvents.map((event) => event.durationMs),
    95
  );

  const topRoutes = [...state.routeTotals.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 25)
    .map((item) => ({
      method: item.method,
      path: item.path,
      count: item.count,
      errorCount: item.errorCount,
      avgDurationMs: item.count > 0 ? Number((item.totalDurationMs / item.count).toFixed(2)) : 0
    }));

  const window = summarizeWindowRequests(state.requestEvents);

  return {
    generatedAt: new Date(now).toISOString(),
    since: new Date(STARTED_AT_MS).toISOString(),
    windowMinutes: Number(config.metricsWindowMinutes || 60),
    totals: {
      ...state.totals
    },
    window,
    slo: {
      availability: {
        targetPercent: 99.5,
        windowHealthzRequests: healthTotal,
        availabilityPercent: healthAvailabilityPercent
      },
      authP95: {
        targetMs: 400,
        windowSamples: state.authLatencyEvents.length,
        valueMs: authP95Ms
      },
      licenseP95: {
        targetMs: 350,
        windowSamples: state.licenseLatencyEvents.length,
        valueMs: licenseP95Ms
      }
    },
    topRoutes
  };
}

function toPrometheus(snapshot) {
  const lines = [];
  lines.push("# HELP control_api_requests_total Total requests since process start");
  lines.push("# TYPE control_api_requests_total counter");
  lines.push(`control_api_requests_total ${snapshot.totals.requests}`);
  lines.push(`control_api_requests_total{status_class=\"2xx\"} ${snapshot.totals.status2xx}`);
  lines.push(`control_api_requests_total{status_class=\"4xx\"} ${snapshot.totals.status4xx}`);
  lines.push(`control_api_requests_total{status_class=\"5xx\"} ${snapshot.totals.status5xx}`);

  lines.push("# HELP control_api_failures_total Failures by endpoint family");
  lines.push("# TYPE control_api_failures_total counter");
  lines.push(`control_api_failures_total{family=\"auth\"} ${snapshot.totals.authFailures}`);
  lines.push(`control_api_failures_total{family=\"license\"} ${snapshot.totals.licenseFailures}`);
  lines.push(`control_api_failures_total{family=\"devices\"} ${snapshot.totals.deviceFailures}`);

  lines.push("# HELP control_api_window_requests_total Requests in current rolling window");
  lines.push("# TYPE control_api_window_requests_total gauge");
  lines.push(`control_api_window_requests_total ${snapshot.window.requestsTotal}`);
  lines.push(`control_api_window_requests_total{status_class=\"2xx\"} ${snapshot.window.status2xx}`);
  lines.push(`control_api_window_requests_total{status_class=\"4xx\"} ${snapshot.window.status4xx}`);
  lines.push(`control_api_window_requests_total{status_class=\"5xx\"} ${snapshot.window.status5xx}`);

  lines.push("# HELP control_api_window_error_rate_percent 5xx error rate in rolling window");
  lines.push("# TYPE control_api_window_error_rate_percent gauge");
  lines.push(`control_api_window_error_rate_percent ${snapshot.window.errorRatePercent ?? "NaN"}`);

  lines.push("# HELP control_api_window_family_failure_rate_percent Failure rate by endpoint family");
  lines.push("# TYPE control_api_window_family_failure_rate_percent gauge");
  for (const [family, stats] of Object.entries(snapshot.window.byFamily || {})) {
    lines.push(
      `control_api_window_family_failure_rate_percent{family=\"${family}\"} ${
        stats.failureRatePercent ?? "NaN"
      }`
    );
  }

  lines.push("# HELP control_api_window_family_p95_ms p95 latency by endpoint family in rolling window");
  lines.push("# TYPE control_api_window_family_p95_ms gauge");
  for (const [family, stats] of Object.entries(snapshot.window.byFamily || {})) {
    lines.push(
      `control_api_window_family_p95_ms{family=\"${family}\"} ${stats.p95DurationMs ?? "NaN"}`
    );
  }

  lines.push("# HELP control_api_slo_value SLO values in current window");
  lines.push("# TYPE control_api_slo_value gauge");
  lines.push(
    `control_api_slo_value{name=\"healthz_availability_percent\"} ${
      snapshot.slo.availability.availabilityPercent ?? "NaN"
    }`
  );
  lines.push(
    `control_api_slo_value{name=\"auth_p95_ms\"} ${snapshot.slo.authP95.valueMs ?? "NaN"}`
  );
  lines.push(
    `control_api_slo_value{name=\"license_p95_ms\"} ${snapshot.slo.licenseP95.valueMs ?? "NaN"}`
  );

  return `${lines.join("\n")}\n`;
}

module.exports = {
  currentWindowSnapshot,
  observeRequest,
  toPrometheus
};

