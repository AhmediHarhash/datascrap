"use strict";

const { Router } = require("express");
const { config } = require("../config");
const { requireAuth } = require("../middleware/auth");
const { requireOptionalCloudFeatures } = require("../middleware/optional-cloud");
const { createRateLimiter } = require("../middleware/rate-limit");
const { logAudit } = require("../services/audit");
const { getCloudPolicy, upsertCloudPolicy } = require("../services/cloud-policy");

const router = Router();
const rateLimitWindowMs = Math.max(1, config.rateLimitWindowSeconds) * 1_000;

const policyReadLimit = createRateLimiter({
  scope: "cloud.policy.read",
  windowMs: rateLimitWindowMs,
  maxRequests: config.rateLimitDevicesListMax,
  keyResolver: (req) => `account:${req.auth?.accountId || "unknown"}`
});

const policyWriteLimit = createRateLimiter({
  scope: "cloud.policy.write",
  windowMs: rateLimitWindowMs,
  maxRequests: config.rateLimitDevicesMutateMax,
  keyResolver: (req) => `account:${req.auth?.accountId || "unknown"}`
});

function parseBoolean(value, fallback) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
}

router.get("/api/data-handling/policy", requireOptionalCloudFeatures, requireAuth, policyReadLimit, async (req, res) => {
  try {
    const policy = await getCloudPolicy(req.auth.accountId);
    return res.status(200).json({
      policy,
      policyVersion: config.optInPolicyVersion
    });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to load data handling policy" });
  }
});

router.post("/api/data-handling/policy", requireOptionalCloudFeatures, requireAuth, policyWriteLimit, async (req, res) => {
  const cloudFeaturesOptIn = parseBoolean(req.body?.cloudFeaturesOptIn, null);
  const webhookDeliveryOptIn = parseBoolean(req.body?.webhookDeliveryOptIn, false);
  const metadataOnlyEnforced = req.body?.metadataOnlyEnforced;
  const consentVersion = req.body?.consentVersion ? String(req.body.consentVersion).trim() : null;
  const consentText = req.body?.consentText ? String(req.body.consentText).trim() : null;

  if (typeof cloudFeaturesOptIn !== "boolean") {
    return res.status(400).json({ error: "cloudFeaturesOptIn (boolean) is required" });
  }

  if (metadataOnlyEnforced === false) {
    return res.status(400).json({
      error: "metadataOnlyEnforced cannot be disabled for Mode 2"
    });
  }

  try {
    const updated = await upsertCloudPolicy({
      accountId: req.auth.accountId,
      cloudFeaturesOptIn,
      webhookDeliveryOptIn: cloudFeaturesOptIn ? webhookDeliveryOptIn : false,
      metadataOnlyEnforced: true,
      consentVersion: cloudFeaturesOptIn ? consentVersion || config.optInPolicyVersion : null,
      consentText: cloudFeaturesOptIn ? consentText : null
    });

    await logAudit("cloud.policy.updated", {
      accountId: req.auth.accountId,
      userId: req.auth.userId,
      data: {
        cloudFeaturesOptIn: updated.cloudFeaturesOptIn,
        webhookDeliveryOptIn: updated.webhookDeliveryOptIn,
        metadataOnlyEnforced: updated.metadataOnlyEnforced,
        consentVersion: updated.consentVersion
      }
    });

    return res.status(200).json({
      success: true,
      policy: updated
    });
  } catch (error) {
    if (error.code === "METADATA_POLICY_LOCKED") {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: "Failed to update data handling policy" });
  }
});

module.exports = {
  dataHandlingRouter: router
};
