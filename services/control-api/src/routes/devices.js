"use strict";

const { randomUUID } = require("crypto");
const { Router } = require("express");
const { config } = require("../config");
const { withTransaction } = require("../db/pool");
const { createRateLimiter, ipRateLimitKey } = require("../middleware/rate-limit");
const { logAudit } = require("../services/audit");
const { invalidate, get, set } = require("../services/cache");
const {
  getIdempotencyKey,
  loadIdempotentResponse,
  storeIdempotentResponse
} = require("../services/idempotency");
const { hashLicenseKey } = require("../utils/security");

const router = Router();
const rateLimitWindowMs = Math.max(1, config.rateLimitWindowSeconds) * 1_000;

function licenseOrIpKey(req) {
  const key = String(req.body?.key || "").trim();
  if (!key) return `ip:${ipRateLimitKey(req)}`;
  return `license:${hashLicenseKey(key)}`;
}

const devicesValidateRateLimit = createRateLimiter({
  scope: "devices.validate",
  windowMs: rateLimitWindowMs,
  maxRequests: config.rateLimitDevicesValidateMax,
  keyResolver: licenseOrIpKey
});

const devicesListRateLimit = createRateLimiter({
  scope: "devices.list",
  windowMs: rateLimitWindowMs,
  maxRequests: config.rateLimitDevicesListMax,
  keyResolver: licenseOrIpKey
});

const devicesMutateRateLimit = createRateLimiter({
  scope: "devices.mutate",
  windowMs: rateLimitWindowMs,
  maxRequests: config.rateLimitDevicesMutateMax,
  keyResolver: licenseOrIpKey
});

function devicesListCacheKeyByHash(keyHash) {
  return `devices-list:license:${keyHash}`;
}

function devicesListCacheKeyByRawKey(rawKey) {
  return devicesListCacheKeyByHash(hashLicenseKey(rawKey));
}

async function getAccountByKey(client, rawKey) {
  const keyHash = hashLicenseKey(rawKey);
  const result = await client.query(
    `
      SELECT
        a.id AS account_id,
        a.owner_user_id,
        a.max_devices,
        a.is_license_active,
        l.status AS license_status
      FROM licenses l
      JOIN accounts a ON a.id = l.account_id
      WHERE l.license_key_hash = $1
      LIMIT 1
    `,
    [keyHash]
  );
  if (result.rowCount === 0) return null;

  const row = result.rows[0];
  if (!row.is_license_active || row.license_status !== "active") return null;
  return row;
}

async function countDevices(client, accountId) {
  const countResult = await client.query("SELECT COUNT(*)::int AS count FROM devices WHERE account_id = $1", [accountId]);
  return Number(countResult.rows[0].count || 0);
}

router.post("/api/devices/validate-devices", devicesValidateRateLimit, async (req, res) => {
  const key = String(req.body?.key || "").trim();
  const deviceId = String(req.body?.deviceId || "").trim();
  const deviceName = req.body?.deviceName ? String(req.body.deviceName).trim() : null;
  const idempotencyKey = getIdempotencyKey(req);
  const keyHash = key ? hashLicenseKey(key) : null;
  const idempotencyScopeKey = keyHash ? `license:${keyHash}` : null;
  let idempotencyRequestHash = null;

  if (!key || !deviceId) {
    return res.status(400).json({ valid: false, message: "key and deviceId are required" });
  }

  if (idempotencyKey && idempotencyScopeKey) {
    try {
      const replay = await loadIdempotentResponse({
        scopeKey: idempotencyScopeKey,
        operation: "devices.validate",
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
          valid: false,
          errorType: "IDEMPOTENCY_KEY_REUSED",
          message: "Idempotency key already used with different payload"
        });
      }
      return res.status(500).json({ valid: false, message: "Failed idempotency validation" });
    }
  }

  try {
    const result = await withTransaction(async (client) => {
      const account = await getAccountByKey(client, key);
      if (!account) {
        return {
          valid: false,
          message: "Invalid license key"
        };
      }

      const existingDevice = await client.query(
        `
          SELECT id
          FROM devices
          WHERE account_id = $1 AND device_id = $2
          LIMIT 1
        `,
        [account.account_id, deviceId]
      );

      let currentDevices = await countDevices(client, account.account_id);

      if (existingDevice.rowCount === 0) {
        if (currentDevices >= account.max_devices) {
          return {
            valid: false,
            message: "Maximum number of devices reached",
            maxDevices: account.max_devices,
            currentDevices
          };
        }

        await client.query(
          `
            INSERT INTO devices (
              id, account_id, device_id, device_name
            ) VALUES ($1, $2, $3, $4)
          `,
          [randomUUID(), account.account_id, deviceId, deviceName || deviceId]
        );
        currentDevices += 1;
      } else {
        await client.query(
          `
            UPDATE devices
            SET
              device_name = COALESCE($3, device_name),
              last_seen_at = NOW(),
              updated_at = NOW()
            WHERE account_id = $1 AND device_id = $2
          `,
          [account.account_id, deviceId, deviceName || null]
        );
      }

      await logAudit("devices.validate", {
        accountId: account.account_id,
        userId: account.owner_user_id,
        data: { deviceId, valid: true }
      });

      return {
        valid: true,
        userId: account.owner_user_id,
        deviceInfo: {
          id: deviceId,
          name: deviceName || deviceId
        },
        maxDevices: account.max_devices,
        currentDevices
      };
    });

    if (idempotencyKey && idempotencyScopeKey && idempotencyRequestHash) {
      await storeIdempotentResponse({
        scopeKey: idempotencyScopeKey,
        operation: "devices.validate",
        idempotencyKey,
        requestHash: idempotencyRequestHash,
        status: 200,
        body: result
      });
    }

    if (result.valid && keyHash) {
      invalidate(devicesListCacheKeyByHash(keyHash));
    }

    return res.status(200).json(result);
  } catch (_error) {
    return res.status(500).json({ valid: false, message: "Unexpected device validation error" });
  }
});

router.post("/api/devices", devicesListRateLimit, async (req, res) => {
  const key = String(req.body?.key || "").trim();
  if (!key) {
    return res.status(400).json({ success: false, message: "No license key provided" });
  }
  const cacheKey = devicesListCacheKeyByRawKey(key);
  const cached = get(cacheKey);
  if (cached) {
    res.setHeader("X-Cache", "HIT");
    return res.status(200).json(cached);
  }

  try {
    const result = await withTransaction(async (client) => {
      const account = await getAccountByKey(client, key);
      if (!account) {
        return { success: false, message: "Invalid license key" };
      }

      const devices = await client.query(
        `
          SELECT device_id, device_name, created_at, last_seen_at
          FROM devices
          WHERE account_id = $1
          ORDER BY created_at ASC
        `,
        [account.account_id]
      );

      return {
        success: true,
        devices: devices.rows.map((row) => ({
          deviceId: row.device_id,
          deviceName: row.device_name,
          createdAt: row.created_at,
          lastSeenAt: row.last_seen_at
        })),
        maxDevices: account.max_devices,
        currentDevices: devices.rowCount
      };
    });

    set(cacheKey, result, config.devicesListCacheTtlSeconds);
    res.setHeader("X-Cache", "MISS");
    return res.status(200).json(result);
  } catch (_error) {
    return res.status(500).json({ success: false, message: "Failed to get devices" });
  }
});

router.post("/api/devices/remove", devicesMutateRateLimit, async (req, res) => {
  const key = String(req.body?.key || "").trim();
  const deviceId = String(req.body?.deviceId || "").trim();
  const idempotencyKey = getIdempotencyKey(req);
  const keyHash = key ? hashLicenseKey(key) : null;
  const idempotencyScopeKey = keyHash ? `license:${keyHash}` : null;
  let idempotencyRequestHash = null;

  if (!key || !deviceId) {
    return res.status(400).json({ success: false, message: "key and deviceId are required" });
  }

  if (idempotencyKey && idempotencyScopeKey) {
    try {
      const replay = await loadIdempotentResponse({
        scopeKey: idempotencyScopeKey,
        operation: "devices.remove",
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
      const account = await getAccountByKey(client, key);
      if (!account) {
        return { success: false, message: "Invalid license key" };
      }

      await client.query(
        "DELETE FROM devices WHERE account_id = $1 AND device_id = $2",
        [account.account_id, deviceId]
      );

      await logAudit("devices.remove", {
        accountId: account.account_id,
        userId: account.owner_user_id,
        data: { deviceId }
      });

      return { success: true };
    });

    if (idempotencyKey && idempotencyScopeKey && idempotencyRequestHash) {
      await storeIdempotentResponse({
        scopeKey: idempotencyScopeKey,
        operation: "devices.remove",
        idempotencyKey,
        requestHash: idempotencyRequestHash,
        status: 200,
        body: result
      });
    }

    if (keyHash) {
      invalidate(devicesListCacheKeyByHash(keyHash));
    }

    return res.status(200).json(result);
  } catch (_error) {
    return res.status(500).json({ success: false, message: "Failed to remove device" });
  }
});

router.post("/api/devices/rename", devicesMutateRateLimit, async (req, res) => {
  const key = String(req.body?.key || "").trim();
  const deviceId = String(req.body?.deviceId || "").trim();
  const deviceName = String(req.body?.deviceName || "").trim();
  const idempotencyKey = getIdempotencyKey(req);
  const keyHash = key ? hashLicenseKey(key) : null;
  const idempotencyScopeKey = keyHash ? `license:${keyHash}` : null;
  let idempotencyRequestHash = null;

  if (!key || !deviceId || !deviceName) {
    return res.status(400).json({ success: false, message: "key, deviceId and deviceName are required" });
  }

  if (idempotencyKey && idempotencyScopeKey) {
    try {
      const replay = await loadIdempotentResponse({
        scopeKey: idempotencyScopeKey,
        operation: "devices.rename",
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
      const account = await getAccountByKey(client, key);
      if (!account) {
        return { success: false, message: "Invalid license key" };
      }

      await client.query(
        `
          UPDATE devices
          SET
            device_name = $3,
            updated_at = NOW(),
            last_seen_at = NOW()
          WHERE account_id = $1 AND device_id = $2
        `,
        [account.account_id, deviceId, deviceName]
      );

      await logAudit("devices.rename", {
        accountId: account.account_id,
        userId: account.owner_user_id,
        data: { deviceId, deviceName }
      });

      return { success: true };
    });

    if (idempotencyKey && idempotencyScopeKey && idempotencyRequestHash) {
      await storeIdempotentResponse({
        scopeKey: idempotencyScopeKey,
        operation: "devices.rename",
        idempotencyKey,
        requestHash: idempotencyRequestHash,
        status: 200,
        body: result
      });
    }

    if (keyHash) {
      invalidate(devicesListCacheKeyByHash(keyHash));
    }

    return res.status(200).json(result);
  } catch (_error) {
    return res.status(500).json({ success: false, message: "Failed to rename device" });
  }
});

module.exports = { devicesRouter: router };
