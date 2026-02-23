"use strict";

const { Router } = require("express");
const { config } = require("../config");
const { requireAuth } = require("../middleware/auth");
const { requireOptionalCloudFeatures } = require("../middleware/optional-cloud");
const { createRateLimiter } = require("../middleware/rate-limit");
const { logAudit } = require("../services/audit");
const { assertCloudOptIn, getCloudPolicy } = require("../services/cloud-policy");
const {
  listIntegrationSecrets,
  removeIntegrationSecret,
  upsertIntegrationSecret
} = require("../services/integration-vault");

const router = Router();
const rateLimitWindowMs = Math.max(1, config.rateLimitWindowSeconds) * 1_000;

const integrationReadLimit = createRateLimiter({
  scope: "integrations.read",
  windowMs: rateLimitWindowMs,
  maxRequests: config.rateLimitDevicesListMax,
  keyResolver: (req) => `account:${req.auth?.accountId || "unknown"}`
});

const integrationWriteLimit = createRateLimiter({
  scope: "integrations.write",
  windowMs: rateLimitWindowMs,
  maxRequests: config.rateLimitDevicesMutateMax,
  keyResolver: (req) => `account:${req.auth?.accountId || "unknown"}`
});

function validateProvider(value) {
  const provider = String(value || "")
    .trim()
    .toLowerCase();
  if (!provider) return null;
  if (!/^[a-z0-9._-]{2,50}$/.test(provider)) return null;
  return provider;
}

function validateSecretName(value) {
  const secretName = String(value || "")
    .trim()
    .toLowerCase();
  if (!secretName) return null;
  if (!/^[a-z0-9._-]{2,80}$/.test(secretName)) return null;
  return secretName;
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

router.get("/api/integrations/secrets", requireOptionalCloudFeatures, requireAuth, integrationReadLimit, async (req, res) => {
  try {
    const policy = await requireCloudPolicy(req, res);
    if (!policy) return;

    const items = await listIntegrationSecrets(req.auth.accountId);
    return res.status(200).json({
      policy,
      items
    });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to list integration secrets" });
  }
});

router.post(
  "/api/integrations/secrets/upsert",
  requireOptionalCloudFeatures,
  requireAuth,
  integrationWriteLimit,
  async (req, res) => {
    const provider = validateProvider(req.body?.provider);
    const secretName = validateSecretName(req.body?.secretName);
    const secretValue = String(req.body?.secretValue || "").trim();
    const label = req.body?.label ? String(req.body.label).trim().slice(0, 120) : null;

    if (!provider || !secretName || !secretValue) {
      return res.status(400).json({
        error: "provider, secretName and secretValue are required"
      });
    }

    try {
      const policy = await requireCloudPolicy(req, res, {
        requireWebhook: provider === "webhook"
      });
      if (!policy) return;

      const metadata = await upsertIntegrationSecret({
        accountId: req.auth.accountId,
        provider,
        secretName,
        secretValue,
        label
      });

      await logAudit("integrations.secret.upsert", {
        accountId: req.auth.accountId,
        userId: req.auth.userId,
        data: {
          provider,
          secretName
        }
      });

      return res.status(200).json({
        success: true,
        item: metadata
      });
    } catch (error) {
      if (error.code === "VAULT_KEY_REQUIRED") {
        return res.status(500).json({
          error: "Secret vault is not configured"
        });
      }
      if (error.code === "CLOUD_OPT_IN_REQUIRED" || error.code === "WEBHOOK_OPT_IN_REQUIRED") {
        return res.status(403).json({
          error: error.message,
          errorType: error.code
        });
      }
      return res.status(500).json({ error: "Failed to store integration secret" });
    }
  }
);

router.post(
  "/api/integrations/secrets/remove",
  requireOptionalCloudFeatures,
  requireAuth,
  integrationWriteLimit,
  async (req, res) => {
    const id = req.body?.id ? String(req.body.id).trim() : null;
    const provider = validateProvider(req.body?.provider);
    const secretName = validateSecretName(req.body?.secretName);

    if (!id && (!provider || !secretName)) {
      return res.status(400).json({
        error: "id or provider+secretName are required"
      });
    }

    try {
      const policy = await requireCloudPolicy(req, res);
      if (!policy) return;

      const removed = await removeIntegrationSecret({
        accountId: req.auth.accountId,
        id,
        provider,
        secretName
      });

      await logAudit("integrations.secret.remove", {
        accountId: req.auth.accountId,
        userId: req.auth.userId,
        data: {
          id,
          provider,
          secretName,
          removed
        }
      });

      return res.status(200).json({
        success: true,
        removed
      });
    } catch (error) {
      if (error.code === "CLOUD_OPT_IN_REQUIRED") {
        return res.status(403).json({
          error: error.message,
          errorType: error.code
        });
      }
      return res.status(500).json({ error: "Failed to remove integration secret" });
    }
  }
);

module.exports = {
  integrationsRouter: router
};
