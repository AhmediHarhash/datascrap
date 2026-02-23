"use strict";

const crypto = require("crypto");
const { executeJob } = require("../src/services/job-processor");
const { getMonitorState } = require("../src/services/monitor-state");

const baseUrl = process.env.API_BASE_URL || "http://127.0.0.1:3000";
const email =
  process.env.MONITOR_SMOKE_EMAIL || `phase9-monitor-${Date.now()}-${crypto.randomBytes(3).toString("hex")}@example.com`;
const password = process.env.MONITOR_SMOKE_PASSWORD || "Phase9-Monitor-Smoke-2026!";
const deviceId = process.env.MONITOR_SMOKE_DEVICE_ID || "phase9-monitor-smoke-device";

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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function buildBasePayload(monitorKey) {
  return {
    targetUrl: "https://example.com",
    monitorKey,
    compare: {
      includeTitle: true,
      includeMetaDescription: true,
      includeCanonical: true,
      includeWordCount: true,
      includeHeadings: true,
      includeLinks: true,
      includeLang: true,
      includeStatusCode: true,
      includeContentType: true
    },
    request: {
      timeoutMs: 12000
    },
    metadata: {
      source: "phase9-monitor-smoke"
    }
  };
}

function buildJob(accountId, payload, suffix) {
  return {
    id: `phase9-monitor-job-${Date.now()}-${suffix}`,
    accountId,
    jobType: "monitor.page.diff",
    payload
  };
}

async function main() {
  const register = await request("/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      displayName: "Phase 9 Monitor Smoke"
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
      deviceName: "Phase9 Monitor Smoke Device"
    })
  });
  assertStatus("login", login.response.status, [200]);
  const accessToken = String(login.body.accessToken || "");
  const accountId = String(login.body.account?.id || "");
  assert(accountId, "login did not return account id");

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
      webhookDeliveryOptIn: false,
      consentVersion: "2026-02-23",
      consentText: "Phase 9 monitor smoke consent"
    })
  });
  assertStatus("policy", policy.response.status, [200]);

  const monitorKey = `phase9-example-${Date.now()}`;
  const basePayload = buildBasePayload(monitorKey);

  const first = await executeJob(buildJob(accountId, basePayload, "1"));
  assert(first.firstRun === true, "first run must be firstRun=true");
  assert(first.changed === false, "first run should not report changed");
  assert(Number(first.diffCount || 0) === 0, "first run diffCount should be 0");

  const second = await executeJob(buildJob(accountId, basePayload, "2"));
  assert(second.firstRun === false, "second run must be firstRun=false");
  assert(second.changed === false, "second run should be unchanged");
  assert(Number(second.diffCount || 0) === 0, "second run diffCount should be 0");

  const changedPayload = {
    ...basePayload,
    compare: {
      ...basePayload.compare,
      includeLinks: false
    }
  };
  const third = await executeJob(buildJob(accountId, changedPayload, "3"));
  assert(third.firstRun === false, "third run must be firstRun=false");
  assert(third.changed === true, "third run should detect changed");
  assert(Number(third.diffCount || 0) > 0, "third run diffCount should be > 0");

  const fourth = await executeJob(buildJob(accountId, changedPayload, "4"));
  assert(fourth.changed === false, "fourth run should return to unchanged");
  assert(Number(fourth.diffCount || 0) === 0, "fourth run diffCount should be 0");

  const state = await getMonitorState({
    accountId,
    monitorKey
  });
  assert(Boolean(state), "monitor state should exist");
  assert(Number(state.runCount || 0) >= 4, "monitor state runCount should be >= 4");
  assert(Number(state.changeCount || 0) >= 1, "monitor state changeCount should be >= 1");

  console.log(
    JSON.stringify(
      {
        ok: true,
        baseUrl,
        accountId,
        monitorKey,
        first: {
          changed: first.changed,
          snapshotHash: first.snapshotHash
        },
        second: {
          changed: second.changed,
          snapshotHash: second.snapshotHash
        },
        third: {
          changed: third.changed,
          snapshotHash: third.snapshotHash,
          diffCount: third.diffCount
        },
        fourth: {
          changed: fourth.changed,
          snapshotHash: fourth.snapshotHash
        },
        state: {
          runCount: state.runCount,
          changeCount: state.changeCount,
          lastSeenAt: state.lastSeenAt,
          lastChangeAt: state.lastChangeAt
        }
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[phase9-monitor-smoke] failed: ${error.message}`);
  process.exit(1);
});
