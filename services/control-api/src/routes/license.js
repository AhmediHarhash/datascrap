"use strict";

const { randomUUID } = require("crypto");
const { Router } = require("express");
const { config } = require("../config");
const { query, withTransaction } = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const { logAudit } = require("../services/audit");
const { hashLicenseKey } = require("../utils/security");

const router = Router();

function normalizeMaxDevices(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(1, Math.min(10, Math.floor(parsed)));
}

router.post("/api/license/register", requireAuth, async (req, res) => {
  const licenseKey = String(req.body?.licenseKey || "").trim();
  const maxDevicesOverride = normalizeMaxDevices(req.body?.maxDevices);

  if (!licenseKey) {
    return res.status(400).json({ error: "licenseKey is required" });
  }

  const keyHash = hashLicenseKey(licenseKey);
  const keyLast4 = licenseKey.slice(-4);

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

    return res.status(200).json({
      success: true,
      valid: true,
      maxDevices: result.maxDevices,
      keyLast4
    });
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

router.get("/api/license/status", requireAuth, async (req, res) => {
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
    return res.status(200).json({
      accountId: row.id,
      tier: row.tier,
      isLicenseActive: row.is_license_active,
      maxDevices: row.max_devices,
      licenseStatus: row.license_status || "none",
      licenseKeyLast4: row.license_key_last4 || null
    });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to fetch license status" });
  }
});

module.exports = { licenseRouter: router };

