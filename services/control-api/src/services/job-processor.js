"use strict";

const { getIntegrationSecretPlaintext } = require("./integration-vault");

function createJobError(message, { code = "JOB_EXECUTION_FAILED", retryable = true } = {}) {
  const error = new Error(message);
  error.code = code;
  error.retryable = retryable;
  return error;
}

function clampTimeoutMs(input) {
  const parsed = Number(input);
  if (!Number.isFinite(parsed)) return 10_000;
  return Math.max(1_000, Math.min(60_000, Math.floor(parsed)));
}

async function executeWebhookDelivery(job) {
  const payload = job.payload || {};
  const targetUrl = String(payload.targetUrl || "").trim();
  const eventType = String(payload.eventType || "").trim();
  const eventId = payload.eventId ? String(payload.eventId).trim() : job.id;

  if (!targetUrl || !eventType) {
    throw createJobError("Invalid webhook job payload", {
      code: "INVALID_WEBHOOK_PAYLOAD",
      retryable: false
    });
  }

  const headers = {
    "content-type": "application/json",
    "x-datascrap-job-id": job.id
  };

  if (payload.secretRef && typeof payload.secretRef === "object") {
    const provider = String(payload.secretRef.provider || "").trim().toLowerCase();
    const secretName = String(payload.secretRef.secretName || "").trim().toLowerCase();
    if (provider && secretName) {
      const secret = await getIntegrationSecretPlaintext({
        accountId: job.accountId,
        provider,
        secretName
      });
      headers.authorization = `Bearer ${secret}`;
    }
  }

  const requestBody = {
    eventType,
    eventId,
    accountId: job.accountId,
    metadata: payload.metadata || {},
    emittedAt: new Date().toISOString()
  };

  const controller = new AbortController();
  const timeoutMs = clampTimeoutMs(payload.timeoutMs);
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response = null;
  let responseText = "";

  try {
    response = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    responseText = await response.text();
  } catch (error) {
    const isAbort = error && (error.name === "AbortError" || /aborted/i.test(String(error.message || "")));
    throw createJobError(isAbort ? "Webhook delivery timed out" : `Webhook delivery failed: ${error.message}`, {
      code: isAbort ? "WEBHOOK_TIMEOUT" : "WEBHOOK_NETWORK_ERROR",
      retryable: true
    });
  } finally {
    clearTimeout(timer);
  }

  if (response.status >= 200 && response.status < 300) {
    return {
      delivered: true,
      statusCode: response.status,
      responseText: responseText.slice(0, 2_000)
    };
  }

  const retryableStatus = response.status === 429 || response.status >= 500;
  throw createJobError(`Webhook endpoint responded with ${response.status}`, {
    code: `WEBHOOK_HTTP_${response.status}`,
    retryable: retryableStatus
  });
}

async function executeJob(job) {
  switch (job.jobType) {
    case "integration.webhook.deliver":
      return executeWebhookDelivery(job);
    default:
      throw createJobError(`Unsupported job type: ${job.jobType}`, {
        code: "UNSUPPORTED_JOB_TYPE",
        retryable: false
      });
  }
}

module.exports = {
  executeJob
};
