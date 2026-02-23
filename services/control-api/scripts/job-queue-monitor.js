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
  maxDueJobs: numberEnv("MAX_DUE_JOBS", 200),
  maxDeadLetterJobs: numberEnv("MAX_DEAD_LETTER_JOBS", 0)
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

async function postAlert(payload) {
  const webhook = String(process.env.ALERT_WEBHOOK_URL || "").trim();
  if (!webhook) return;

  const headers = {
    "Content-Type": "application/json"
  };
  const token = String(process.env.ALERT_WEBHOOK_BEARER_TOKEN || "").trim();
  if (token) headers.Authorization = `Bearer ${token}`;

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
    const url = `${target.baseUrl.replace(/\/$/, "")}/api/observability/jobs`;
    const headers = {};
    if (target.key) {
      headers["X-Observability-Key"] = target.key;
    }

    let response;
    try {
      response = await fetchJson(url, headers);
    } catch (error) {
      failures.push(`${target.name}: request failed (${error.message})`);
      results.push({ target: target.name, ok: false, status: 0 });
      continue;
    }

    if (!response.ok) {
      failures.push(`${target.name}: status ${response.status}`);
      results.push({ target: target.name, ok: false, status: response.status, body: response.body });
      continue;
    }

    const queue = response.body?.queue || {};
    const dueNow = Number(queue.dueNow || 0);
    const deadLetters = Number(queue.deadLetters || 0);
    const enabled = Boolean(queue.enabled);

    if (enabled) {
      if (dueNow > thresholds.maxDueJobs) {
        failures.push(`${target.name}: dueNow=${dueNow} > ${thresholds.maxDueJobs}`);
      }
      if (deadLetters > thresholds.maxDeadLetterJobs) {
        failures.push(`${target.name}: deadLetters=${deadLetters} > ${thresholds.maxDeadLetterJobs}`);
      }
    }

    results.push({
      target: target.name,
      ok: true,
      status: response.status,
      queue
    });
  }

  const report = {
    event: "job.queue.monitor.result",
    timestamp: new Date().toISOString(),
    thresholds,
    results,
    failures
  };

  if (failures.length > 0) {
    console.error(JSON.stringify(report));
    await postAlert({
      event: "job.queue.monitor.failed",
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
      event: "job.queue.monitor.crash",
      timestamp: new Date().toISOString(),
      error: error.message
    })
  );
  process.exit(1);
});
