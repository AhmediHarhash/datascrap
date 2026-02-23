"use strict";

const crypto = require("crypto");

const baseUrl = process.env.API_BASE_URL || "http://127.0.0.1:3000";
const email = process.env.SMOKE_EMAIL || `phase5-${Date.now()}-${crypto.randomBytes(3).toString("hex")}@example.com`;
const password = process.env.SMOKE_PASSWORD || "Phase5-Smoke-Password-2026!";
const deviceId = process.env.SMOKE_DEVICE_ID || "phase5-smoke-device";
const webhookUrl = process.env.SMOKE_WEBHOOK_URL || "https://httpbin.org/status/204";
const secretName = process.env.SMOKE_SECRET_NAME || "default";
const secretValue = process.env.SMOKE_SECRET_VALUE || "phase5-secret-token";

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

function assertStatus(step, actual, expected) {
  if (!expected.includes(actual)) {
    throw new Error(`${step} failed. expected ${expected.join("/")} got ${actual}`);
  }
}

async function main() {
  const register = await request("/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      displayName: "Phase 5 Smoke"
    })
  });
  assertStatus("register", register.response.status, [201, 409]);

  const login = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      deviceId,
      deviceName: "Phase5 Smoke Device"
    })
  });
  assertStatus("login", login.response.status, [200]);
  const accessToken = String(login.body.accessToken || "");

  const authHeaders = {
    authorization: `Bearer ${accessToken}`,
    "content-type": "application/json"
  };

  const configResult = await request("/api/config");
  assertStatus("config", configResult.response.status, [200]);
  if (!configResult.body.optionalCloudFeaturesEnabled) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          skipped: true,
          reason: "optional cloud features disabled",
          baseUrl
        },
        null,
        2
      )
    );
    return;
  }

  const policy = await request("/api/data-handling/policy", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      cloudFeaturesOptIn: true,
      webhookDeliveryOptIn: true,
      consentVersion: "2026-02-23",
      consentText: "Phase 5 smoke consent"
    })
  });
  assertStatus("policy", policy.response.status, [200]);

  const secret = await request("/api/integrations/secrets/upsert", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      provider: "webhook",
      secretName,
      secretValue,
      label: "Phase5 Smoke"
    })
  });
  assertStatus("secret upsert", secret.response.status, [200]);

  const enqueue = await request("/api/jobs/enqueue", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      jobType: "integration.webhook.deliver",
      payload: {
        targetUrl: webhookUrl,
        eventType: "phase5.smoke",
        eventId: `evt-${Date.now()}`,
        metadata: {
          source: "phase5-smoke"
        },
        secretRef: {
          provider: "webhook",
          secretName
        }
      }
    })
  });
  assertStatus("enqueue", enqueue.response.status, [200]);

  const enqueueExtraction = await request("/api/jobs/enqueue", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      jobType: "extraction.page.summary",
      payload: {
        targetUrl: "https://example.com",
        extract: {
          includeTitle: true,
          includeMetaDescription: true,
          includeWordCount: true,
          includeHeadings: true,
          includeLinks: true,
          includeCanonical: true
        },
        metadata: {
          source: "phase5-smoke"
        }
      }
    })
  });
  assertStatus("enqueue extraction", enqueueExtraction.response.status, [200]);

  const jobs = await request("/api/jobs", {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });
  assertStatus("jobs list", jobs.response.status, [200]);

  console.log(
    JSON.stringify(
      {
        ok: true,
        baseUrl,
        accountId: login.body.account?.id || null,
        jobId: enqueue.body?.job?.id || null,
        extractionJobId: enqueueExtraction.body?.job?.id || null,
        jobsListed: Array.isArray(jobs.body?.items) ? jobs.body.items.length : 0
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[phase5-smoke] failed: ${error.message}`);
  process.exit(1);
});
