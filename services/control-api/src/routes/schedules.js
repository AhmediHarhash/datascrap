"use strict";

const { Router } = require("express");
const { config } = require("../config");
const { requireAuth } = require("../middleware/auth");
const { requireOptionalCloudFeatures } = require("../middleware/optional-cloud");
const { createRateLimiter } = require("../middleware/rate-limit");
const { logAudit } = require("../services/audit");
const { assertCloudOptIn, getCloudPolicy } = require("../services/cloud-policy");
const {
  createSchedule,
  enqueueScheduleNow,
  getScheduleById,
  listSchedules,
  removeSchedule,
  toggleSchedule,
  updateSchedule
} = require("../services/schedules");
const { validateMetadataOnlyPayload } = require("../services/metadata-policy");

const router = Router();
const rateLimitWindowMs = Math.max(1, config.rateLimitWindowSeconds) * 1_000;

const schedulesReadLimit = createRateLimiter({
  scope: "schedules.read",
  windowMs: rateLimitWindowMs,
  maxRequests: config.rateLimitDevicesListMax,
  keyResolver: (req) => `account:${req.auth?.accountId || "unknown"}`
});

const schedulesWriteLimit = createRateLimiter({
  scope: "schedules.write",
  windowMs: rateLimitWindowMs,
  maxRequests: config.rateLimitDevicesMutateMax,
  keyResolver: (req) => `account:${req.auth?.accountId || "unknown"}`
});

function parseBoolean(value, fallback = null) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
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

function validateTargetPayload(policy, targetPayload) {
  if (!policy.metadataOnlyEnforced) {
    return { ok: true };
  }
  return validateMetadataOnlyPayload(targetPayload || {});
}

router.get("/api/schedules", requireOptionalCloudFeatures, requireAuth, schedulesReadLimit, async (req, res) => {
  try {
    const policy = await requireCloudPolicy(req, res);
    if (!policy) return;

    const activeOnly = parseBoolean(req.query.activeOnly, false);
    const limit = Number(req.query.limit || 50);
    const items = await listSchedules({
      accountId: req.auth.accountId,
      activeOnly: Boolean(activeOnly),
      limit
    });

    return res.status(200).json({
      success: true,
      items
    });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to list schedules" });
  }
});

router.post("/api/schedules/create", requireOptionalCloudFeatures, requireAuth, schedulesWriteLimit, async (req, res) => {
  const name = req.body?.name;
  const scheduleKind = req.body?.scheduleKind;
  const intervalMinutes = req.body?.intervalMinutes;
  const cronExpr = req.body?.cronExpr;
  const timezone = req.body?.timezone;
  const targetJobType = req.body?.targetJobType;
  const targetPayload = req.body?.targetPayload && typeof req.body.targetPayload === "object" ? req.body.targetPayload : {};
  const maxAttempts = req.body?.maxAttempts;
  const isActive = parseBoolean(req.body?.isActive, true);

  try {
    const policy = await requireCloudPolicy(req, res, {
      requireWebhook: String(targetJobType || "").trim().toLowerCase() === "integration.webhook.deliver"
    });
    if (!policy) return;

    const metadataCheck = validateTargetPayload(policy, targetPayload);
    if (!metadataCheck.ok) {
      return res.status(400).json({
        errorType: metadataCheck.code,
        message: metadataCheck.message,
        blockedPaths: metadataCheck.blockedPaths
      });
    }

    if (String(targetJobType || "").trim().toLowerCase() === "integration.webhook.deliver") {
      const webhookError = validateWebhookPayload(targetPayload);
      if (webhookError) {
        return res.status(400).json({
          errorType: "INVALID_WEBHOOK_PAYLOAD",
          message: webhookError
        });
      }
    }

    const schedule = await createSchedule({
      accountId: req.auth.accountId,
      userId: req.auth.userId,
      name,
      scheduleKind,
      intervalMinutes,
      cronExpr,
      timezone,
      targetJobType,
      targetPayload,
      maxAttempts,
      isActive
    });

    await logAudit("schedules.create", {
      accountId: req.auth.accountId,
      userId: req.auth.userId,
      data: {
        scheduleId: schedule.id,
        scheduleKind: schedule.scheduleKind,
        targetJobType: schedule.targetJobType,
        isActive: schedule.isActive
      }
    });

    return res.status(200).json({
      success: true,
      schedule
    });
  } catch (error) {
    if (String(error.code || "").startsWith("INVALID_") || error.code === "CRON_NEXT_RUN_NOT_FOUND") {
      return res.status(400).json({
        errorType: error.code,
        message: error.message
      });
    }
    if (error.code === "CLOUD_OPT_IN_REQUIRED" || error.code === "WEBHOOK_OPT_IN_REQUIRED") {
      return res.status(403).json({
        error: error.message,
        errorType: error.code
      });
    }
    return res.status(500).json({ error: "Failed to create schedule" });
  }
});

router.post("/api/schedules/update", requireOptionalCloudFeatures, requireAuth, schedulesWriteLimit, async (req, res) => {
  const scheduleId = String(req.body?.scheduleId || "").trim();
  if (!scheduleId) {
    return res.status(400).json({ error: "scheduleId is required" });
  }

  const updates = {};
  for (const key of [
    "name",
    "scheduleKind",
    "intervalMinutes",
    "cronExpr",
    "timezone",
    "targetJobType",
    "targetPayload",
    "maxAttempts"
  ]) {
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, key)) {
      updates[key] = req.body[key];
    }
  }

  try {
    let existing = null;
    const hasTargetPayloadUpdate = Object.prototype.hasOwnProperty.call(updates, "targetPayload");
    const hasTargetJobTypeUpdate = Object.prototype.hasOwnProperty.call(updates, "targetJobType");
    if (!hasTargetJobTypeUpdate || hasTargetPayloadUpdate) {
      existing = await getScheduleById({
        accountId: req.auth.accountId,
        scheduleId
      });
      if (!existing) {
        return res.status(404).json({
          error: "Schedule not found"
        });
      }
    }

    const effectiveTargetJobType = String(
      (hasTargetJobTypeUpdate ? updates.targetJobType : existing?.targetJobType) || ""
    )
      .trim()
      .toLowerCase();

    const policy = await requireCloudPolicy(req, res, {
      requireWebhook: effectiveTargetJobType === "integration.webhook.deliver"
    });
    if (!policy) return;

    if (hasTargetPayloadUpdate) {
      const metadataCheck = validateTargetPayload(policy, updates.targetPayload);
      if (!metadataCheck.ok) {
        return res.status(400).json({
          errorType: metadataCheck.code,
          message: metadataCheck.message,
          blockedPaths: metadataCheck.blockedPaths
        });
      }

      if (effectiveTargetJobType === "integration.webhook.deliver") {
        const webhookError = validateWebhookPayload(updates.targetPayload);
        if (webhookError) {
          return res.status(400).json({
            errorType: "INVALID_WEBHOOK_PAYLOAD",
            message: webhookError
          });
        }
      }
    }

    const schedule = await updateSchedule({
      accountId: req.auth.accountId,
      scheduleId,
      updates
    });
    if (!schedule) {
      return res.status(404).json({
        error: "Schedule not found"
      });
    }

    await logAudit("schedules.update", {
      accountId: req.auth.accountId,
      userId: req.auth.userId,
      data: {
        scheduleId: schedule.id,
        scheduleKind: schedule.scheduleKind,
        targetJobType: schedule.targetJobType
      }
    });

    return res.status(200).json({
      success: true,
      schedule
    });
  } catch (error) {
    if (String(error.code || "").startsWith("INVALID_") || error.code === "CRON_NEXT_RUN_NOT_FOUND") {
      return res.status(400).json({
        errorType: error.code,
        message: error.message
      });
    }
    if (error.code === "CLOUD_OPT_IN_REQUIRED" || error.code === "WEBHOOK_OPT_IN_REQUIRED") {
      return res.status(403).json({
        error: error.message,
        errorType: error.code
      });
    }
    return res.status(500).json({ error: "Failed to update schedule" });
  }
});

router.post("/api/schedules/toggle", requireOptionalCloudFeatures, requireAuth, schedulesWriteLimit, async (req, res) => {
  const scheduleId = String(req.body?.scheduleId || "").trim();
  const isActive = parseBoolean(req.body?.isActive, null);
  if (!scheduleId || typeof isActive !== "boolean") {
    return res.status(400).json({ error: "scheduleId and isActive are required" });
  }

  try {
    const policy = await requireCloudPolicy(req, res);
    if (!policy) return;

    const schedule = await toggleSchedule({
      accountId: req.auth.accountId,
      scheduleId,
      isActive
    });

    if (!schedule) {
      return res.status(404).json({ error: "Schedule not found" });
    }

    await logAudit("schedules.toggle", {
      accountId: req.auth.accountId,
      userId: req.auth.userId,
      data: {
        scheduleId: schedule.id,
        isActive: schedule.isActive
      }
    });

    return res.status(200).json({
      success: true,
      schedule
    });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to toggle schedule" });
  }
});

router.post("/api/schedules/remove", requireOptionalCloudFeatures, requireAuth, schedulesWriteLimit, async (req, res) => {
  const scheduleId = String(req.body?.scheduleId || "").trim();
  if (!scheduleId) {
    return res.status(400).json({ error: "scheduleId is required" });
  }

  try {
    const policy = await requireCloudPolicy(req, res);
    if (!policy) return;

    const removed = await removeSchedule({
      accountId: req.auth.accountId,
      scheduleId
    });

    await logAudit("schedules.remove", {
      accountId: req.auth.accountId,
      userId: req.auth.userId,
      data: {
        scheduleId,
        removed
      }
    });

    return res.status(200).json({
      success: true,
      removed
    });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to remove schedule" });
  }
});

router.post("/api/schedules/run-now", requireOptionalCloudFeatures, requireAuth, schedulesWriteLimit, async (req, res) => {
  const scheduleId = String(req.body?.scheduleId || "").trim();
  if (!scheduleId) {
    return res.status(400).json({ error: "scheduleId is required" });
  }

  try {
    const policy = await requireCloudPolicy(req, res);
    if (!policy) return;

    const result = await enqueueScheduleNow({
      accountId: req.auth.accountId,
      scheduleId,
      userId: req.auth.userId
    });
    if (!result) {
      return res.status(404).json({ error: "Schedule not found" });
    }

    await logAudit("schedules.run_now", {
      accountId: req.auth.accountId,
      userId: req.auth.userId,
      data: {
        scheduleId,
        jobId: result.job.id
      }
    });

    return res.status(200).json({
      success: true,
      schedule: result.schedule,
      job: result.job
    });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to run schedule now" });
  }
});

module.exports = {
  schedulesRouter: router
};
