"use strict";

const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { config } = require("../config");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function sha256Hex(input) {
  return crypto.createHash("sha256").update(String(input)).digest("hex");
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const digest = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `scrypt:${salt}:${digest}`;
}

function verifyPassword(password, storedHash) {
  const [algo, salt, digest] = String(storedHash || "").split(":");
  if (algo !== "scrypt" || !salt || !digest) return false;

  const actual = crypto.scryptSync(String(password), salt, 64).toString("hex");
  const expected = Buffer.from(digest, "hex");
  const received = Buffer.from(actual, "hex");
  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(expected, received);
}

function getJwtSigningKey() {
  const keyring = Array.isArray(config.jwtAccessSecrets) ? config.jwtAccessSecrets : [];
  if (keyring.length === 0) {
    return { kid: "legacy", secret: config.jwtAccessSecret };
  }

  const activeKey = keyring.find((item) => item.kid === config.jwtActiveKid);
  return activeKey || keyring[0];
}

function createAccessToken(payload) {
  const signingKey = getJwtSigningKey();
  return jwt.sign(payload, signingKey.secret, {
    expiresIn: config.accessTokenTtlSeconds,
    issuer: config.jwtIssuer,
    header: { kid: signingKey.kid }
  });
}

function verifyAccessToken(token) {
  const keyring = Array.isArray(config.jwtAccessSecrets) ? config.jwtAccessSecrets : [];
  const decoded = jwt.decode(token, { complete: true });
  const headerKid = String(decoded?.header?.kid || "").trim();
  const candidates = [];

  if (headerKid) {
    const headerKey = keyring.find((item) => item.kid === headerKid);
    if (headerKey) {
      candidates.push(headerKey);
    }
  }

  for (const item of keyring) {
    if (!candidates.some((candidate) => candidate.kid === item.kid)) {
      candidates.push(item);
    }
  }

  if (candidates.length === 0) {
    candidates.push({ kid: "legacy", secret: config.jwtAccessSecret });
  }

  let lastError = null;
  for (const item of candidates) {
    try {
      return jwt.verify(token, item.secret, {
        issuer: config.jwtIssuer
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Invalid token");
}

function createRefreshToken() {
  return crypto.randomBytes(48).toString("base64url");
}

function hashRefreshToken(token) {
  return sha256Hex(token);
}

function hashLicenseKey(key) {
  return sha256Hex(String(key || "").trim());
}

module.exports = {
  createAccessToken,
  createRefreshToken,
  hashLicenseKey,
  hashPassword,
  hashRefreshToken,
  normalizeEmail,
  verifyAccessToken,
  verifyPassword
};
