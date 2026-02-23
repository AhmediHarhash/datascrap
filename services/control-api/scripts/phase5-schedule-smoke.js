"use strict";

const crypto = require("crypto");

const baseUrl = process.env.API_BASE_URL || "http://127.0.0.1:3000";
const email = process.env.SCHEDULE_SMOKE_EMAIL || `phase5-schedule-${Date.now()}-${crypto.randomBytes(3).toString("hex")}@example.com`;
const password = process.env.SCHEDULE_SMOKE_PASSWORD || "Phase5-Schedule-Smoke-2026!";
const deviceId = process.env.SCHEDULE_SMOKE_DEVICE_ID || "phase5-schedule-smoke-device";
const webhookUrl = process.env.SCHEDULE_SMOKE_WEBHOOK_URL || "https://httpbin.org/status/204";
const intervalMinutes = Number(process.env.SCHEDULE_SMOKE_INTERVAL_MINUTES || 1);
const waitAutoSeconds = Number(process.env.SCHEDULE_SMOKE_WAIT_AUTO_SECONDS || 0);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
      displayName: "Phase 5 Schedule Smoke"
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
      deviceName: "Phase5 Schedule Smoke Device"
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
      consentText: "Phase 5 schedule smoke consent"
    })
  });
  assertStatus("policy", policy.response.status, [200]);

  const createSchedule = await request("/api/schedules/create", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      name: "Phase5 Schedule Smoke",
      scheduleKind: "interval",
      intervalMinutes,
      timezone: "UTC",
      targetJobType: "integration.webhook.deliver",
      targetPayload: {
        targetUrl: webhookUrl,
        eventType: "phase5.schedule.smoke",
        metadata: {
          source: "phase5-schedule-smoke"
        }
      },
      maxAttempts: 3,
      isActive: true
    })
  });
  assertStatus("create schedule", createSchedule.response.status, [200]);

  const scheduleId = String(createSchedule.body?.schedule?.id || "");
  if (!scheduleId) {
    throw new Error("create schedule did not return schedule id");
  }

  const createExtractionSchedule = await request("/api/schedules/create", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      name: "Phase5 Extraction Schedule Smoke",
      scheduleKind: "interval",
      intervalMinutes,
      timezone: "UTC",
      targetJobType: "extraction.page.summary",
      targetPayload: {
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
          source: "phase5-schedule-smoke"
        }
      },
      maxAttempts: 3,
      isActive: true
    })
  });
  assertStatus("create extraction schedule", createExtractionSchedule.response.status, [200]);
  const extractionScheduleId = String(createExtractionSchedule.body?.schedule?.id || "");
  if (!extractionScheduleId) {
    throw new Error("create extraction schedule did not return schedule id");
  }

  let autoJobId = null;
  if (waitAutoSeconds > 0) {
    const deadline = Date.now() + waitAutoSeconds * 1000;
    while (Date.now() < deadline) {
      const jobs = await request("/api/jobs?limit=20", {
        headers: {
          authorization: `Bearer ${accessToken}`
        }
      });
      assertStatus("jobs while waiting", jobs.response.status, [200]);

      const items = Array.isArray(jobs.body?.items) ? jobs.body.items : [];
      const matched = items.find((item) => {
        const schedule = item?.payload?.schedule || {};
        return schedule.id === scheduleId && schedule.manualTrigger !== true;
      });
      if (matched) {
        autoJobId = matched.id;
        break;
      }
      await sleep(5_000);
    }
  }

  const runNow = await request("/api/schedules/run-now", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      scheduleId
    })
  });
  assertStatus("run now", runNow.response.status, [200]);
  const jobId = String(runNow.body?.job?.id || "");

  const runExtractionNow = await request("/api/schedules/run-now", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      scheduleId: extractionScheduleId
    })
  });
  assertStatus("run extraction now", runExtractionNow.response.status, [200]);
  const extractionJobId = String(runExtractionNow.body?.job?.id || "");

  const listSchedules = await request("/api/schedules?activeOnly=true&limit=10", {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });
  assertStatus("list schedules", listSchedules.response.status, [200]);

  const removeSchedule = await request("/api/schedules/remove", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      scheduleId
    })
  });
  assertStatus("remove schedule", removeSchedule.response.status, [200]);

  const removeExtractionSchedule = await request("/api/schedules/remove", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      scheduleId: extractionScheduleId
    })
  });
  assertStatus("remove extraction schedule", removeExtractionSchedule.response.status, [200]);

  console.log(
    JSON.stringify(
      {
        ok: true,
        baseUrl,
        accountId: login.body.account?.id || null,
        scheduleId,
        extractionScheduleId,
        autoJobId,
        jobId,
        extractionJobId,
        listedSchedules: Array.isArray(listSchedules.body?.items) ? listSchedules.body.items.length : 0
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[phase5-schedule-smoke] failed: ${error.message}`);
  process.exit(1);
});
