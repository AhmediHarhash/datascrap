"use strict";

const { randomUUID } = require("crypto");
const { Router } = require("express");
const { withTransaction } = require("../db/pool");
const { logAudit } = require("../services/audit");
const { hashLicenseKey } = require("../utils/security");

const router = Router();

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

router.post("/api/devices/validate-devices", async (req, res) => {
  const key = String(req.body?.key || "").trim();
  const deviceId = String(req.body?.deviceId || "").trim();
  const deviceName = req.body?.deviceName ? String(req.body.deviceName).trim() : null;

  if (!key || !deviceId) {
    return res.status(400).json({ valid: false, message: "key and deviceId are required" });
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

    return res.status(200).json(result);
  } catch (_error) {
    return res.status(500).json({ valid: false, message: "Unexpected device validation error" });
  }
});

router.post("/api/devices", async (req, res) => {
  const key = String(req.body?.key || "").trim();
  if (!key) {
    return res.status(400).json({ success: false, message: "No license key provided" });
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

    return res.status(200).json(result);
  } catch (_error) {
    return res.status(500).json({ success: false, message: "Failed to get devices" });
  }
});

router.post("/api/devices/remove", async (req, res) => {
  const key = String(req.body?.key || "").trim();
  const deviceId = String(req.body?.deviceId || "").trim();

  if (!key || !deviceId) {
    return res.status(400).json({ success: false, message: "key and deviceId are required" });
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

    return res.status(200).json(result);
  } catch (_error) {
    return res.status(500).json({ success: false, message: "Failed to remove device" });
  }
});

router.post("/api/devices/rename", async (req, res) => {
  const key = String(req.body?.key || "").trim();
  const deviceId = String(req.body?.deviceId || "").trim();
  const deviceName = String(req.body?.deviceName || "").trim();

  if (!key || !deviceId || !deviceName) {
    return res.status(400).json({ success: false, message: "key, deviceId and deviceName are required" });
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

    return res.status(200).json(result);
  } catch (_error) {
    return res.status(500).json({ success: false, message: "Failed to rename device" });
  }
});

module.exports = { devicesRouter: router };

