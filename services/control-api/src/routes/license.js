"use strict";

const { randomUUID } = require("crypto");
const { Router } = require("express");
const { config } = require("../config");
const { query, withTransaction } = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const { createRateLimiter, ipRateLimitKey } = require("../middleware/rate-limit");
const { logAudit } = require("../services/audit");
const { invalidate, set, get } = require("../services/cache");
const {
  getIdempotencyKey,
  loadIdempotentResponse,
  storeIdempotentResponse
} = require("../services/idempotency");
const { hashLicenseKey } = require("../utils/security");

const router = Router();
const rateLimitWindowMs = Math.max(1, config.rateLimitWindowSeconds) * 1_000;

function accountRateLimitKey(req) {
  return req.auth?.accountId ? `account:${req.auth.accountId}` : `ip:${ipRateLimitKey(req)}`;
}

const licenseRegisterRateLimit = createRateLimiter({
  scope: "license.register",
  windowMs: rateLimitWindowMs,
  maxRequests: config.rateLimitLicenseRegisterMax,
  keyResolver: accountRateLimitKey
});

const licenseStatusRateLimit = createRateLimiter({
  scope: "license.status",
  windowMs: rateLimitWindowMs,
  maxRequests: config.rateLimitLicenseStatusMax,
  keyResolver: accountRateLimitKey
});

function licenseStatusCacheKey(accountId) {
  return `license-status:${accountId}`;
}

function devicesListCacheKeyByHash(licenseKeyHash) {
  return `devices-list:license:${licenseKeyHash}`;
}

function normalizeMaxDevices(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(1, Math.min(10, Math.floor(parsed)));
}

router.post("/api/license/register", requireAuth, licenseRegisterRateLimit, async (req, res) => {
  const licenseKey = String(req.body?.licenseKey || "").trim();
  const maxDevicesOverride = normalizeMaxDevices(req.body?.maxDevices);
  const idempotencyKey = getIdempotencyKey(req);

  if (!licenseKey) {
    return res.status(400).json({ error: "licenseKey is required" });
  }

  const keyHash = hashLicenseKey(licenseKey);
  const keyLast4 = licenseKey.slice(-4);
  const idempotencyScopeKey = `account:${req.auth.accountId}`;
  let idempotencyRequestHash = null;

  if (idempotencyKey) {
    try {
      const result = await loadIdempotentResponse({
        scopeKey: idempotencyScopeKey,
        operation: "license.register",
        idempotencyKey,
        payload: req.body
      });

      if (result.replay) {
        res.setHeader("Idempotent-Replay", "true");
        return res.status(result.replay.status).json(result.replay.body);
      }

      idempotencyRequestHash = result.requestHash;
    } catch (error) {
      if (error.code === "IDEMPOTENCY_KEY_REUSED") {
        return res.status(409).json({
          success: false,
          errorType: "IDEMPOTENCY_KEY_REUSED",
          message: "Idempotency key already used with different payload"
        });
      }
      return res.status(500).json({ success: false, message: "Failed idempotency validation" });
    }
  }

  try {
    const result = await withTransaction(async (client) => {
      const accountResult = await client.query(
        `
          SELECT id, max_devices
          FROM accounts
          WHERE id = $1
          LIMIT 1
        `,
        [req.auth.accountId]
      );
      if (accountResult.rowCount === 0) {
        const accountError = new Error("Account not found");
        accountError.code = "ACCOUNT_NOT_FOUND";
        throw accountError;
      }

      const ownerCheck = await client.query(
        `
          SELECT id
          FROM licenses
          WHERE license_key_hash = $1
          LIMIT 1
        `,
        [keyHash]
      );
      if (ownerCheck.rowCount > 0 && ownerCheck.rows[0].id) {
        const existing = await client.query(
          `
            SELECT account_id
            FROM licenses
            WHERE license_key_hash = $1
            LIMIT 1
          `,
          [keyHash]
        );
        if (existing.rowCount > 0 && existing.rows[0].account_id !== req.auth.accountId) {
          const conflict = new Error("Invalid license key");
          conflict.code = "INVALID_LICENSE";
          throw conflict;
        }
      }

      await client.query(
        `
          INSERT INTO licenses (id, account_id, license_key_hash, license_key_last4, status)
          VALUES ($1, $2, $3, $4, 'active')
          ON CONFLICT (license_key_hash)
          DO UPDATE SET
            account_id = EXCLUDED.account_id,
            status = 'active',
            updated_at = NOW()
        `,
        [randomUUID(), req.auth.accountId, keyHash, keyLast4]
      );

      const maxDevices = maxDevicesOverride || config.defaultMaxDevices;
      await client.query(
        `
          UPDATE accounts
          SET
            is_license_active = TRUE,
            max_devices = $2,
            updated_at = NOW()
          WHERE id = $1
        `,
        [req.auth.accountId, maxDevices]
      );

      return { maxDevices };
    });

    await logAudit("license.register", {
      userId: req.auth.userId,
      accountId: req.auth.accountId,
      data: { keyLast4 }
    });

    const responseBody = {
      success: true,
      valid: true,
      maxDevices: result.maxDevices,
      keyLast4
    };

    if (idempotencyKey && idempotencyRequestHash) {
      await storeIdempotentResponse({
        scopeKey: idempotencyScopeKey,
        operation: "license.register",
        idempotencyKey,
        requestHash: idempotencyRequestHash,
        status: 200,
        body: responseBody
      });
    }

    invalidate(licenseStatusCacheKey(req.auth.accountId));
    invalidate(devicesListCacheKeyByHash(keyHash));

    return res.status(200).json(responseBody);
  } catch (error) {
    if (error.code === "INVALID_LICENSE") {
      return res.status(409).json({
        success: false,
        errorType: "INVALID_LICENSE",
        message: "Invalid license key"
      });
    }
    if (error.code === "ACCOUNT_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Account not found" });
    }
    return res.status(500).json({ success: false, message: "Failed to register license" });
  }
});

router.get("/api/license/status", requireAuth, licenseStatusRateLimit, async (req, res) => {
  const cacheKey = licenseStatusCacheKey(req.auth.accountId);
  const cached = get(cacheKey);
  if (cached) {
    res.setHeader("X-Cache", "HIT");
    return res.status(200).json(cached);
  }

  try {
    const result = await query(
      `
        SELECT
          a.id,
          a.tier,
          a.max_devices,
          a.is_license_active,
          l.license_key_last4,
          l.status AS license_status
        FROM accounts a
        LEFT JOIN licenses l ON l.account_id = a.id
        WHERE a.id = $1
        ORDER BY l.created_at DESC NULLS LAST
        LIMIT 1
      `,
      [req.auth.accountId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Account not found" });
    }

    const row = result.rows[0];
    const responseBody = {
      accountId: row.id,
      tier: row.tier,
      isLicenseActive: row.is_license_active,
      maxDevices: row.max_devices,
      licenseStatus: row.license_status || "none",
      licenseKeyLast4: row.license_key_last4 || null
    };

    set(cacheKey, responseBody, config.licenseStatusCacheTtlSeconds);
    res.setHeader("X-Cache", "MISS");
    return res.status(200).json(responseBody);
  } catch (_error) {
    return res.status(500).json({ error: "Failed to fetch license status" });
  }
});

module.exports = { licenseRouter: router };
