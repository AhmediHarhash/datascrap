"use strict";

const DEFAULT_TARGETS = [
  {
    name: "staging",
    baseUrl: "https://control-api-staging-98c0.up.railway.app",
    key: process.env.OBSERVABILITY_KEY_STAGING || ""
  },
  {
    name: "production",
    baseUrl: "https://control-api-production-e750.up.railway.app",
    key: process.env.OBSERVABILITY_KEY_PRODUCTION || ""
  }
];

function numberEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

function getTargets() {
  const stagingUrl = String(process.env.OBSERVABILITY_URL_STAGING || "").trim();
  const productionUrl = String(process.env.OBSERVABILITY_URL_PRODUCTION || "").trim();

  const targets = [...DEFAULT_TARGETS];
  if (stagingUrl) targets[0].baseUrl = stagingUrl;
  if (productionUrl) targets[1].baseUrl = productionUrl;
  return targets;
}

const thresholds = {
  maxWindow5xxRatePercent: numberEnv("MAX_WINDOW_5XX_RATE_PERCENT", 2),
  maxAuthP95Ms: numberEnv("MAX_AUTH_P95_MS", 600),
  maxLicenseP95Ms: numberEnv("MAX_LICENSE_P95_MS", 600),
  minWindowRequests: numberEnv("MIN_WINDOW_REQUESTS", 20),
  minP95Samples: numberEnv("MIN_P95_SAMPLES", 10),
  maxAuthFailureRatePercent: numberEnv("MAX_AUTH_FAILURE_RATE_PERCENT", 20),
  maxLicenseFailureRatePercent: numberEnv("MAX_LICENSE_FAILURE_RATE_PERCENT", 20),
  maxDeviceFailureRatePercent: numberEnv("MAX_DEVICE_FAILURE_RATE_PERCENT", 20),
  minFamilyRequests: numberEnv("MIN_FAMILY_REQUESTS", 10),
  minHealthChecks: numberEnv("MIN_HEALTHZ_SAMPLES", 2)
};

async function fetchJson(url, headers = {}) {
  const response = await fetch(url, {
    method: "GET",
    headers
  });

  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch (_error) {
    body = text;
  }

  return {
    status: response.status,
    ok: response.ok,
    body
  };
}

function checkTarget(target, snapshot) {
  const failures = [];

  const availability = snapshot?.slo?.availability?.availabilityPercent;
  const healthSamples = Number(snapshot?.slo?.availability?.windowHealthzRequests || 0);
  if (
    healthSamples >= thresholds.minHealthChecks &&
    availability !== null &&
    availability !== undefined &&
    availability < 99.5
  ) {
    failures.push(
      `${target.name}: availability ${availability}% below target 99.5% (samples=${healthSamples})`
    );
  }

  const window = snapshot?.window || {};
  const windowRequests = Number(window.requestsTotal || 0);
  const window5xxRate = window.errorRatePercent;
  if (
    windowRequests >= thresholds.minWindowRequests &&
    window5xxRate !== null &&
    window5xxRate !== undefined &&
    window5xxRate > thresholds.maxWindow5xxRatePercent
  ) {
    failures.push(
      `${target.name}: window 5xx rate ${window5xxRate}% > ${thresholds.maxWindow5xxRatePercent}%`
    );
  }

  const authP95 = snapshot?.slo?.authP95?.valueMs;
  const authSamples = Number(snapshot?.slo?.authP95?.windowSamples || 0);
  if (
    authSamples >= thresholds.minP95Samples &&
    authP95 !== null &&
    authP95 !== undefined &&
    authP95 > thresholds.maxAuthP95Ms
  ) {
    failures.push(`${target.name}: auth p95 ${authP95}ms > ${thresholds.maxAuthP95Ms}ms`);
  }

  const licenseP95 = snapshot?.slo?.licenseP95?.valueMs;
  const licenseSamples = Number(snapshot?.slo?.licenseP95?.windowSamples || 0);
  if (
    licenseSamples >= thresholds.minP95Samples &&
    licenseP95 !== null &&
    licenseP95 !== undefined &&
    licenseP95 > thresholds.maxLicenseP95Ms
  ) {
    failures.push(`${target.name}: license p95 ${licenseP95}ms > ${thresholds.maxLicenseP95Ms}ms`);
  }

  const byFamily = window.byFamily || {};
  const authFamily = byFamily.auth;
  if (authFamily && authFamily.requests >= thresholds.minFamilyRequests) {
    if (
      authFamily.failureRatePercent !== null &&
      authFamily.failureRatePercent > thresholds.maxAuthFailureRatePercent
    ) {
      failures.push(
        `${target.name}: auth failure rate ${authFamily.failureRatePercent}% > ${thresholds.maxAuthFailureRatePercent}%`
      );
    }
  }

  const licenseFamily = byFamily.license;
  if (licenseFamily && licenseFamily.requests >= thresholds.minFamilyRequests) {
    if (
      licenseFamily.failureRatePercent !== null &&
      licenseFamily.failureRatePercent > thresholds.maxLicenseFailureRatePercent
    ) {
      failures.push(
        `${target.name}: license failure rate ${licenseFamily.failureRatePercent}% > ${thresholds.maxLicenseFailureRatePercent}%`
      );
    }
  }

  const deviceFamily = byFamily.devices;
  if (deviceFamily && deviceFamily.requests >= thresholds.minFamilyRequests) {
    if (
      deviceFamily.failureRatePercent !== null &&
      deviceFamily.failureRatePercent > thresholds.maxDeviceFailureRatePercent
    ) {
      failures.push(
        `${target.name}: devices failure rate ${deviceFamily.failureRatePercent}% > ${thresholds.maxDeviceFailureRatePercent}%`
      );
    }
  }

  return failures;
}

async function postAlert(payload) {
  const webhook = String(process.env.ALERT_WEBHOOK_URL || "").trim();
  if (!webhook) return;

  const headers = {
    "Content-Type": "application/json"
  };
  const token = String(process.env.ALERT_WEBHOOK_BEARER_TOKEN || "").trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  await fetch(webhook, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
}

async function main() {
  const targets = getTargets();
  const failures = [];
  const results = [];

  for (const target of targets) {
    const url = `${target.baseUrl.replace(/\/$/, "")}/api/observability/slo`;
    const headers = {};
    if (target.key) {
      headers["X-Observability-Key"] = target.key;
    }

    let response;
    try {
      response = await fetchJson(url, headers);
    } catch (error) {
      failures.push(`${target.name}: request failed (${error.message})`);
      results.push({
        target: target.name,
        status: 0,
        ok: false
      });
      continue;
    }

    if (!response.ok) {
      failures.push(`${target.name}: status ${response.status}`);
      results.push({
        target: target.name,
        status: response.status,
        ok: false,
        body: response.body
      });
      continue;
    }

    const snapshot = response.body;
    const targetFailures = checkTarget(target, snapshot);
    failures.push(...targetFailures);
    results.push({
      target: target.name,
      status: response.status,
      ok: true,
      window: snapshot.window,
      slo: snapshot.slo
    });
  }

  const report = {
    event: "slo.monitor.result",
    timestamp: new Date().toISOString(),
    thresholds,
    results,
    failures
  };

  if (failures.length > 0) {
    console.error(JSON.stringify(report));
    await postAlert({
      event: "slo.monitor.failed",
      timestamp: report.timestamp,
      failures,
      results
    }).catch(() => {});
    process.exit(1);
  }

  console.log(JSON.stringify(report));
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      event: "slo.monitor.crash",
      timestamp: new Date().toISOString(),
      error: error.message
    })
  );
  process.exit(1);
});

