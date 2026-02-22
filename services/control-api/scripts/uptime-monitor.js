"use strict";

const DEFAULT_URLS = [
  "https://control-api-staging-98c0.up.railway.app/healthz",
  "https://control-api-production-e750.up.railway.app/healthz"
];

function parseUrls() {
  const raw = String(process.env.UPTIME_URLS || "").trim();
  if (!raw) return DEFAULT_URLS;
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function fetchWithTimeout(url, timeoutMs = 15_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal
    });

    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    let payload = null;
    if (contentType.includes("application/json")) {
      payload = await response.json();
    } else {
      payload = await response.text();
    }

    return {
      ok: response.ok,
      status: response.status,
      body: payload
    };
  } finally {
    clearTimeout(timer);
  }
}

async function postAlert(payload) {
  const webhook = String(process.env.ALERT_WEBHOOK_URL || "").trim();
  if (!webhook) return;

  const headers = {
    "Content-Type": "application/json"
  };
  const bearer = String(process.env.ALERT_WEBHOOK_BEARER_TOKEN || "").trim();
  if (bearer) {
    headers.Authorization = `Bearer ${bearer}`;
  }

  await fetch(webhook, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
}

async function main() {
  const urls = parseUrls();
  const failures = [];

  for (const url of urls) {
    try {
      const result = await fetchWithTimeout(url);
      const jsonStatus =
        result.body && typeof result.body === "object" ? String(result.body.status || "").toLowerCase() : "";
      const healthy = result.ok && (jsonStatus === "ok" || jsonStatus === "");

      console.log(
        JSON.stringify({
          event: "uptime.check",
          url,
          statusCode: result.status,
          healthy
        })
      );

      if (!healthy) {
        failures.push({
          url,
          statusCode: result.status,
          body: result.body
        });
      }
    } catch (error) {
      failures.push({
        url,
        statusCode: 0,
        error: error.message
      });
    }
  }

  if (failures.length > 0) {
    const payload = {
      event: "uptime.monitor.failed",
      timestamp: new Date().toISOString(),
      failures
    };
    console.error(JSON.stringify(payload));
    await postAlert(payload).catch(() => {});
    process.exit(1);
  }

  console.log(
    JSON.stringify({
      event: "uptime.monitor.ok",
      timestamp: new Date().toISOString(),
      targets: urls.length
    })
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      event: "uptime.monitor.crash",
      timestamp: new Date().toISOString(),
      error: error.message
    })
  );
  process.exit(1);
});

