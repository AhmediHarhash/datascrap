"use strict";

const { Router } = require("express");
const { config } = require("../config");
const { requireAuth } = require("../middleware/auth");
const { requireOptionalCloudFeatures } = require("../middleware/optional-cloud");
const { createRateLimiter } = require("../middleware/rate-limit");
const { logAudit } = require("../services/audit");
const { assertCloudOptIn, getCloudPolicy } = require("../services/cloud-policy");
const {
  getIdempotencyKey,
  loadIdempotentResponse,
  storeIdempotentResponse
} = require("../services/idempotency");
const {
  cancelJob,
  enqueueJob,
  listDeadLetters,
  listJobs
} = require("../services/jobs");
const { SUPPORTED_JOB_TYPES } = require("../services/job-processor");
const { validateMetadataOnlyPayload } = require("../services/metadata-policy");

const router = Router();
const rateLimitWindowMs = Math.max(1, config.rateLimitWindowSeconds) * 1_000;

const jobsReadLimit = createRateLimiter({
  scope: "jobs.read",
  windowMs: rateLimitWindowMs,
  maxRequests: config.rateLimitDevicesListMax,
  keyResolver: (req) => `account:${req.auth?.accountId || "unknown"}`
});

const jobsWriteLimit = createRateLimiter({
  scope: "jobs.write",
  windowMs: rateLimitWindowMs,
  maxRequests: config.rateLimitDevicesMutateMax,
  keyResolver: (req) => `account:${req.auth?.accountId || "unknown"}`
});

function validateJobType(value) {
  const jobType = String(value || "").trim().toLowerCase();
  if (!jobType) return null;
  if (!/^[a-z0-9._-]{3,80}$/.test(jobType)) return null;
  return jobType;
}

function isValidHttpUrl(value) {
  const input = String(value || "").trim();
  if (!input) return false;
  try {
    const parsed = new URL(input);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch (_error) {
    return false;
  }
}

function validateWebhookPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return "Webhook payload must be an object";
  }
  if (!isValidHttpUrl(payload.targetUrl)) {
    return "Webhook payload targetUrl must be a valid http/https URL";
  }
  if (!payload.eventType || String(payload.eventType).trim().length < 2) {
    return "Webhook payload eventType is required";
  }
  return null;
}

function validateExtractionSummaryPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return "Extraction payload must be an object";
  }

  const targetUrl = String(payload.targetUrl || "").trim();
  const targetUrls = Array.isArray(payload.targetUrls) ? payload.targetUrls : [];
  const hasSingle = Boolean(targetUrl);
  const hasMany = targetUrls.some((item) => String(item || "").trim().length > 0);
  if (!hasSingle && !hasMany) {
    return "Extraction payload requires targetUrl or targetUrls";
  }

  const urlsToCheck = [];
  if (hasSingle) urlsToCheck.push(targetUrl);
  for (const item of targetUrls) {
    const value = String(item || "").trim();
    if (value) urlsToCheck.push(value);
  }

  for (const url of urlsToCheck.slice(0, 10)) {
    if (!isValidHttpUrl(url)) {
      return "Extraction payload URLs must be valid http/https URLs";
    }
  }

  return null;
}

async function requireCloudPolicy(req, res, options = {}) {
  try {
    const policy = await getCloudPolicy(req.auth.accountId);
    assertCloudOptIn(policy, options);
    return policy;
  } catch (error) {
    if (error.code === "CLOUD_OPT_IN_REQUIRED" || error.code === "WEBHOOK_OPT_IN_REQUIRED") {
      res.status(403).json({
        error: error.message,
        errorType: error.code
      });
      return null;
    }
    throw error;
  }
}

router.get("/api/jobs/policy", requireOptionalCloudFeatures, requireAuth, jobsReadLimit, async (req, res) => {
  try {
    const policy = await requireCloudPolicy(req, res);
    if (!policy) return;

    return res.status(200).json({
      policy,
      queue: {
        backoffBaseSeconds: config.jobBackoffBaseSeconds,
        backoffMultiplier: config.jobBackoffMultiplier,
        backoffMaxSeconds: config.jobBackoffMaxSeconds,
        maxAttemptsDefault: config.jobMaxAttemptsDefault,
        lockTimeoutSeconds: config.jobLockTimeoutSeconds
      },
      supportedJobTypes: SUPPORTED_JOB_TYPES
    });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to load jobs policy" });
  }
});

router.post("/api/jobs/enqueue", requireOptionalCloudFeatures, requireAuth, jobsWriteLimit, async (req, res) => {
  const idempotencyKey = getIdempotencyKey(req);
  const idempotencyScopeKey = `account:${req.auth.accountId}`;
  let idempotencyRequestHash = null;

  const jobType = validateJobType(req.body?.jobType);
  const payload = req.body?.payload && typeof req.body.payload === "object" ? req.body.payload : {};
  const maxAttempts = req.body?.maxAttempts;

  if (!jobType) {
    return res.status(400).json({ error: "jobType is required" });
  }

  if (idempotencyKey) {
    try {
      const replay = await loadIdempotentResponse({
        scopeKey: idempotencyScopeKey,
        operation: "jobs.enqueue",
        idempotencyKey,
        payload: req.body
      });
      if (replay.replay) {
        res.setHeader("Idempotent-Replay", "true");
        return res.status(replay.replay.status).json(replay.replay.body);
      }
      idempotencyRequestHash = replay.requestHash;
    } catch (error) {
      if (error.code === "IDEMPOTENCY_KEY_REUSED") {
        return res.status(409).json({
          errorType: "IDEMPOTENCY_KEY_REUSED",
          message: "Idempotency key already used with different payload"
        });
      }
      return res.status(500).json({ error: "Failed idempotency validation" });
    }
  }

  try {
    const policy = await requireCloudPolicy(req, res, {
      requireWebhook: jobType === "integration.webhook.deliver"
    });
    if (!policy) return;

    if (policy.metadataOnlyEnforced) {
      const metadataCheck = validateMetadataOnlyPayload(payload);
      if (!metadataCheck.ok) {
        return res.status(400).json({
          errorType: metadataCheck.code,
          message: metadataCheck.message,
          blockedPaths: metadataCheck.blockedPaths
        });
      }
    }

    if (jobType === "integration.webhook.deliver") {
      const webhookValidationError = validateWebhookPayload(payload);
      if (webhookValidationError) {
        return res.status(400).json({
          errorType: "INVALID_WEBHOOK_PAYLOAD",
          message: webhookValidationError
        });
      }
    }

    if (jobType === "extraction.page.summary") {
      const extractionValidationError = validateExtractionSummaryPayload(payload);
      if (extractionValidationError) {
        return res.status(400).json({
          errorType: "INVALID_EXTRACTION_PAYLOAD",
          message: extractionValidationError
        });
      }
    }

    const job = await enqueueJob({
      accountId: req.auth.accountId,
      userId: req.auth.userId,
      jobType,
      payload,
      maxAttempts
    });

    const responseBody = {
      success: true,
      job
    };

    if (idempotencyKey && idempotencyRequestHash) {
      await storeIdempotentResponse({
        scopeKey: idempotencyScopeKey,
        operation: "jobs.enqueue",
        idempotencyKey,
        requestHash: idempotencyRequestHash,
        status: 200,
        body: responseBody
      });
    }

    await logAudit("jobs.enqueue", {
      accountId: req.auth.accountId,
      userId: req.auth.userId,
      data: {
        jobId: job.id,
        jobType: job.jobType,
        maxAttempts: job.maxAttempts
      }
    });

    return res.status(200).json(responseBody);
  } catch (error) {
    if (error.code === "CLOUD_OPT_IN_REQUIRED" || error.code === "WEBHOOK_OPT_IN_REQUIRED") {
      return res.status(403).json({
        error: error.message,
        errorType: error.code
      });
    }
    return res.status(500).json({ error: "Failed to enqueue job" });
  }
});

router.get("/api/jobs", requireOptionalCloudFeatures, requireAuth, jobsReadLimit, async (req, res) => {
  try {
    const policy = await requireCloudPolicy(req, res);
    if (!policy) return;

    const status = String(req.query.status || "").trim();
    const limit = Number(req.query.limit || 50);
    const items = await listJobs({
      accountId: req.auth.accountId,
      status: status ? status.split(",").map((item) => item.trim()) : [],
      limit
    });

    return res.status(200).json({
      success: true,
      items
    });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to list jobs" });
  }
});

router.get("/api/jobs/dead-letter", requireOptionalCloudFeatures, requireAuth, jobsReadLimit, async (req, res) => {
  try {
    const policy = await requireCloudPolicy(req, res);
    if (!policy) return;

    const limit = Number(req.query.limit || 50);
    const items = await listDeadLetters({
      accountId: req.auth.accountId,
      limit
    });

    return res.status(200).json({
      success: true,
      items
    });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to list dead letter jobs" });
  }
});

router.post("/api/jobs/cancel", requireOptionalCloudFeatures, requireAuth, jobsWriteLimit, async (req, res) => {
  const jobId = String(req.body?.jobId || "").trim();
  if (!jobId) {
    return res.status(400).json({ error: "jobId is required" });
  }

  try {
    const policy = await requireCloudPolicy(req, res);
    if (!policy) return;

    const canceled = await cancelJob({
      accountId: req.auth.accountId,
      jobId
    });

    await logAudit("jobs.cancel", {
      accountId: req.auth.accountId,
      userId: req.auth.userId,
      data: {
        jobId,
        canceled: Boolean(canceled)
      }
    });

    return res.status(200).json({
      success: true,
      canceled: Boolean(canceled),
      job: canceled
    });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to cancel job" });
  }
});

module.exports = {
  jobsRouter: router
};
