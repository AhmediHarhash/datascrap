"use strict";

const { randomUUID } = require("crypto");
const { Router } = require("express");
const { config } = require("../config");
const { query, withTransaction } = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const { createRateLimiter, ipRateLimitKey } = require("../middleware/rate-limit");
const { logAudit } = require("../services/audit");
const { getRequestIp, getUserAgent } = require("../utils/http");
const {
  createAccessToken,
  createRefreshToken,
  hashPassword,
  hashRefreshToken,
  normalizeEmail,
  verifyPassword
} = require("../utils/security");

const router = Router();
const rateLimitWindowMs = Math.max(1, config.rateLimitWindowSeconds) * 1_000;

const registerRateLimit = createRateLimiter({
  scope: "auth.register",
  windowMs: rateLimitWindowMs,
  maxRequests: config.rateLimitAuthRegisterMax,
  keyResolver: ipRateLimitKey
});

const loginRateLimit = createRateLimiter({
  scope: "auth.login",
  windowMs: rateLimitWindowMs,
  maxRequests: config.rateLimitAuthLoginMax,
  keyResolver: ipRateLimitKey
});

const refreshRateLimit = createRateLimiter({
  scope: "auth.refresh",
  windowMs: rateLimitWindowMs,
  maxRequests: config.rateLimitAuthRefreshMax,
  keyResolver: ipRateLimitKey
});

const logoutRateLimit = createRateLimiter({
  scope: "auth.logout",
  windowMs: rateLimitWindowMs,
  maxRequests: config.rateLimitAuthLogoutMax,
  keyResolver: ipRateLimitKey
});

function createSessionExpiryDate() {
  const now = Date.now();
  const daysMs = config.refreshTokenTtlDays * 24 * 60 * 60 * 1000;
  return new Date(now + daysMs);
}

function sanitizeAccountRow(row) {
  return {
    id: row.account_id,
    tier: row.tier,
    isLicenseActive: row.is_license_active,
    maxDevices: row.max_devices
  };
}

async function issueSessionAndTokens(client, payload) {
  const refreshToken = createRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const sessionId = randomUUID();
  const expiresAt = createSessionExpiryDate();

  await client.query(
    `
      INSERT INTO sessions (
        id, user_id, account_id, refresh_token_hash, user_agent, ip_address, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      sessionId,
      payload.userId,
      payload.accountId,
      refreshTokenHash,
      payload.userAgent || null,
      payload.ipAddress || null,
      expiresAt.toISOString()
    ]
  );

  const accessToken = createAccessToken({
    sub: payload.userId,
    accountId: payload.accountId
  });

  return {
    accessToken,
    refreshToken,
    expiresAt
  };
}

async function bindDevice(client, args) {
  const existingDevice = await client.query(
    `
      SELECT id
      FROM devices
      WHERE account_id = $1 AND device_id = $2
      LIMIT 1
    `,
    [args.accountId, args.deviceId]
  );

  if (existingDevice.rowCount === 0) {
    const countResult = await client.query(
      "SELECT COUNT(*)::int AS count FROM devices WHERE account_id = $1",
      [args.accountId]
    );
    const currentDevices = Number(countResult.rows[0].count || 0);
    if (currentDevices >= args.maxDevices) {
      const error = new Error("Maximum number of devices reached");
      error.code = "MAX_DEVICES";
      error.maxDevices = args.maxDevices;
      error.currentDevices = currentDevices;
      throw error;
    }

    await client.query(
      `
        INSERT INTO devices (
          id, account_id, device_id, device_name
        ) VALUES ($1, $2, $3, $4)
      `,
      [randomUUID(), args.accountId, args.deviceId, args.deviceName || args.deviceId]
    );
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
      [args.accountId, args.deviceId, args.deviceName || null]
    );
  }
}

router.post("/api/auth/register", registerRateLimit, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");
  const displayName = req.body?.displayName ? String(req.body.displayName).trim() : null;

  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Valid email is required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  try {
    const result = await withTransaction(async (client) => {
      const existing = await client.query("SELECT id FROM users WHERE email = $1 LIMIT 1", [email]);
      if (existing.rowCount > 0) {
        const conflict = new Error("Email already registered");
        conflict.code = "EMAIL_EXISTS";
        throw conflict;
      }

      const userId = randomUUID();
      const accountId = randomUUID();

      await client.query(
        `
          INSERT INTO users (id, email, password_hash, display_name)
          VALUES ($1, $2, $3, $4)
        `,
        [userId, email, hashPassword(password), displayName]
      );

      await client.query(
        `
          INSERT INTO accounts (id, owner_user_id, tier, max_devices)
          VALUES ($1, $2, 'free', $3)
        `,
        [accountId, userId, config.defaultMaxDevices]
      );

      return { userId, accountId };
    });

    await logAudit("auth.register", {
      userId: result.userId,
      accountId: result.accountId,
      data: { email }
    });

    return res.status(201).json({
      success: true,
      user: {
        id: result.userId,
        email,
        displayName
      },
      account: {
        id: result.accountId,
        tier: "free",
        isLicenseActive: false,
        maxDevices: config.defaultMaxDevices
      }
    });
  } catch (error) {
    if (error.code === "EMAIL_EXISTS") {
      return res.status(409).json({ error: error.message });
    }
    return res.status(500).json({ error: "Failed to register user" });
  }
});

router.post("/api/auth/login", loginRateLimit, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");
  const deviceId = String(req.body?.deviceId || "").trim();
  const deviceName = req.body?.deviceName ? String(req.body.deviceName).trim() : null;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  if (!deviceId) {
    return res.status(400).json({ error: "deviceId is required" });
  }

  try {
    const result = await withTransaction(async (client) => {
      const rowResult = await client.query(
        `
          SELECT
            u.id AS user_id,
            u.email,
            u.password_hash,
            u.display_name,
            a.id AS account_id,
            a.tier,
            a.max_devices,
            a.is_license_active
          FROM users u
          JOIN accounts a ON a.owner_user_id = u.id
          WHERE u.email = $1
          LIMIT 1
        `,
        [email]
      );

      if (rowResult.rowCount === 0) {
        const authError = new Error("Invalid credentials");
        authError.code = "INVALID_CREDENTIALS";
        throw authError;
      }

      const row = rowResult.rows[0];
      if (!verifyPassword(password, row.password_hash)) {
        const authError = new Error("Invalid credentials");
        authError.code = "INVALID_CREDENTIALS";
        throw authError;
      }

      await bindDevice(client, {
        accountId: row.account_id,
        deviceId,
        deviceName,
        maxDevices: row.max_devices
      });

      const tokens = await issueSessionAndTokens(client, {
        userId: row.user_id,
        accountId: row.account_id,
        ipAddress: getRequestIp(req),
        userAgent: getUserAgent(req)
      });

      return {
        user: {
          id: row.user_id,
          email: row.email,
          displayName: row.display_name
        },
        account: sanitizeAccountRow(row),
        tokens
      };
    });

    await logAudit("auth.login", {
      userId: result.user.id,
      accountId: result.account.id,
      data: { deviceId }
    });

    return res.status(200).json({
      success: true,
      user: result.user,
      account: result.account,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      refreshTokenExpiresAt: result.tokens.expiresAt.toISOString()
    });
  } catch (error) {
    if (error.code === "INVALID_CREDENTIALS") {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    if (error.code === "MAX_DEVICES") {
      return res.status(403).json({
        errorType: "MAX_DEVICES",
        message: "Maximum number of devices reached",
        maxDevices: error.maxDevices,
        currentDevices: error.currentDevices
      });
    }

    return res.status(500).json({ error: "Failed to login" });
  }
});

router.post("/api/auth/refresh", refreshRateLimit, async (req, res) => {
  const refreshToken = String(req.body?.refreshToken || "").trim();
  if (!refreshToken) {
    return res.status(400).json({ error: "refreshToken is required" });
  }

  const refreshTokenHash = hashRefreshToken(refreshToken);

  try {
    const result = await withTransaction(async (client) => {
      const sessionResult = await client.query(
        `
          SELECT
            s.id AS session_id,
            s.user_id,
            s.account_id,
            s.expires_at,
            s.revoked_at,
            u.email,
            u.display_name,
            a.tier,
            a.max_devices,
            a.is_license_active
          FROM sessions s
          JOIN users u ON u.id = s.user_id
          JOIN accounts a ON a.id = s.account_id
          WHERE s.refresh_token_hash = $1
          LIMIT 1
        `,
        [refreshTokenHash]
      );

      if (sessionResult.rowCount === 0) {
        const tokenError = new Error("Invalid refresh token");
        tokenError.code = "INVALID_TOKEN";
        throw tokenError;
      }

      const row = sessionResult.rows[0];
      if (row.revoked_at) {
        const tokenError = new Error("Refresh token revoked");
        tokenError.code = "INVALID_TOKEN";
        throw tokenError;
      }
      if (new Date(row.expires_at).getTime() < Date.now()) {
        const tokenError = new Error("Refresh token expired");
        tokenError.code = "INVALID_TOKEN";
        throw tokenError;
      }

      await client.query(
        `
          UPDATE sessions
          SET revoked_at = NOW(), last_used_at = NOW()
          WHERE id = $1
        `,
        [row.session_id]
      );

      const tokens = await issueSessionAndTokens(client, {
        userId: row.user_id,
        accountId: row.account_id,
        ipAddress: getRequestIp(req),
        userAgent: getUserAgent(req)
      });

      return {
        user: {
          id: row.user_id,
          email: row.email,
          displayName: row.display_name
        },
        account: sanitizeAccountRow({
          account_id: row.account_id,
          tier: row.tier,
          max_devices: row.max_devices,
          is_license_active: row.is_license_active
        }),
        tokens
      };
    });

    await logAudit("auth.refresh", {
      userId: result.user.id,
      accountId: result.account.id
    });

    return res.status(200).json({
      success: true,
      user: result.user,
      account: result.account,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      refreshTokenExpiresAt: result.tokens.expiresAt.toISOString()
    });
  } catch (error) {
    if (error.code === "INVALID_TOKEN") {
      return res.status(401).json({ error: "Invalid refresh token" });
    }
    return res.status(500).json({ error: "Failed to refresh session" });
  }
});

router.post("/api/auth/logout", logoutRateLimit, async (req, res) => {
  const refreshToken = String(req.body?.refreshToken || "").trim();
  if (!refreshToken) {
    return res.status(400).json({ error: "refreshToken is required" });
  }

  try {
    await query(
      `
        UPDATE sessions
        SET revoked_at = NOW(), last_used_at = NOW()
        WHERE refresh_token_hash = $1 AND revoked_at IS NULL
      `,
      [hashRefreshToken(refreshToken)]
    );

    return res.status(200).json({ success: true });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to logout" });
  }
});

router.get("/api/auth/me", requireAuth, async (req, res) => {
  try {
    const result = await query(
      `
        SELECT
          u.id AS user_id,
          u.email,
          u.display_name,
          a.id AS account_id,
          a.tier,
          a.max_devices,
          a.is_license_active,
          (SELECT COUNT(*)::int FROM devices d WHERE d.account_id = a.id) AS current_devices
        FROM users u
        JOIN accounts a ON a.owner_user_id = u.id AND a.id = $2
        WHERE u.id = $1
        LIMIT 1
      `,
      [req.auth.userId, req.auth.accountId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const row = result.rows[0];
    return res.status(200).json({
      user: {
        id: row.user_id,
        email: row.email,
        displayName: row.display_name
      },
      account: {
        id: row.account_id,
        tier: row.tier,
        isLicenseActive: row.is_license_active,
        maxDevices: row.max_devices,
        currentDevices: row.current_devices
      }
    });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to fetch profile" });
  }
});

module.exports = { authRouter: router };
