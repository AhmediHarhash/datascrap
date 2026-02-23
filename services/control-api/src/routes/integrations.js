"use strict";

const { Router } = require("express");
const { config } = require("../config");
const { requireAuth } = require("../middleware/auth");
const { requireOptionalCloudFeatures } = require("../middleware/optional-cloud");
const { createRateLimiter } = require("../middleware/rate-limit");
const { logAudit } = require("../services/audit");
const { assertCloudOptIn, getCloudPolicy } = require("../services/cloud-policy");
const {
  getIntegrationSecretPlaintext,
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

function validateHttpUrl(value) {
  try {
    const parsed = new URL(String(value || "").trim());
    const protocol = String(parsed.protocol || "").toLowerCase();
    if (protocol !== "http:" && protocol !== "https:") return null;
    const hostname = String(parsed.hostname || "").toLowerCase();
    if (!hostname) return null;
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") return null;
    if (hostname.endsWith(".local")) return null;
    return parsed.toString();
  } catch (_error) {
    return null;
  }
}

function normalizeHttpMethod(value) {
  const method = String(value || "POST")
    .trim()
    .toUpperCase();
  if (["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return method;
  }
  return "POST";
}

function normalizeHeaderName(value) {
  const name = String(value || "")
    .trim()
    .toLowerCase();
  if (!name) return null;
  if (!/^[a-z0-9-]{2,64}$/.test(name)) return null;
  return name;
}

function normalizeHeaders(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const headers = {};
  for (const [rawKey, rawValue] of Object.entries(input)) {
    const key = normalizeHeaderName(rawKey);
    if (!key) continue;
    headers[key] = String(rawValue || "").trim().slice(0, 600);
    if (Object.keys(headers).length >= 24) break;
  }
  return headers;
}

function normalizeBody(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      eventType: "datascrap.integration.test",
      timestamp: new Date().toISOString()
    };
  }
  return input;
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

router.post(
  "/api/integrations/secrets/test",
  requireOptionalCloudFeatures,
  requireAuth,
  integrationWriteLimit,
  async (req, res) => {
    const provider = validateProvider(req.body?.provider);
    const secretName = validateSecretName(req.body?.secretName);
    const targetUrl = validateHttpUrl(req.body?.targetUrl);
    const method = normalizeHttpMethod(req.body?.method);
    const timeoutMs = Math.max(1000, Math.min(20_000, Number(req.body?.timeoutMs || 8000)));
    const headers = normalizeHeaders(req.body?.headers);
    const body = normalizeBody(req.body?.body);
    const secretPlacement = String(req.body?.secretPlacement || "authorization_bearer")
      .trim()
      .toLowerCase();
    const headerName = normalizeHeaderName(req.body?.headerName || "x-api-key") || "x-api-key";

    if (!provider || !secretName || !targetUrl) {
      return res.status(400).json({
        error: "provider, secretName and targetUrl are required"
      });
    }

    if (provider !== "webhook") {
      return res.status(400).json({
        error: "Only webhook provider test is currently supported"
      });
    }

    try {
      const policy = await requireCloudPolicy(req, res, {
        requireWebhook: true
      });
      if (!policy) return;

      const secret = await getIntegrationSecretPlaintext({
        accountId: req.auth.accountId,
        provider,
        secretName
      });

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const requestHeaders = {
        accept: "application/json",
        ...headers
      };

      if (secretPlacement === "header") {
        requestHeaders[headerName] = secret;
      } else {
        requestHeaders.authorization = `Bearer ${secret}`;
      }

      const requestInit = {
        method,
        headers: requestHeaders,
        signal: controller.signal
      };

      if (method !== "GET") {
        requestHeaders["content-type"] = "application/json";
        requestInit.body = JSON.stringify(body);
      }

      const startedAt = Date.now();
      let response;
      let responsePreview = "";
      try {
        response = await fetch(targetUrl, requestInit);
        responsePreview = String(await response.text()).slice(0, 600);
      } finally {
        clearTimeout(timeout);
      }

      const durationMs = Date.now() - startedAt;
      const result = {
        provider,
        secretName,
        targetUrl,
        method,
        timeoutMs,
        statusCode: response.status,
        ok: response.ok,
        durationMs,
        responsePreview
      };

      await logAudit("integrations.secret.test", {
        accountId: req.auth.accountId,
        userId: req.auth.userId,
        data: {
          provider,
          secretName,
          targetUrl,
          method,
          statusCode: response.status,
          ok: response.ok
        }
      });

      return res.status(200).json({
        success: true,
        policy,
        result
      });
    } catch (error) {
      if (error.name === "AbortError") {
        return res.status(408).json({
          error: "Integration test timed out"
        });
      }
      if (error.code === "INTEGRATION_SECRET_NOT_FOUND") {
        return res.status(404).json({
          error: "Integration secret not found"
        });
      }
      if (error.code === "CLOUD_OPT_IN_REQUIRED" || error.code === "WEBHOOK_OPT_IN_REQUIRED") {
        return res.status(403).json({
          error: error.message,
          errorType: error.code
        });
      }
      return res.status(500).json({
        error: "Failed to test integration secret connection"
      });
    }
  }
);

module.exports = {
  integrationsRouter: router
};
