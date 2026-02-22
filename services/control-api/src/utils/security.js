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

function createAccessToken(payload) {
  return jwt.sign(payload, config.jwtAccessSecret, {
    expiresIn: config.accessTokenTtlSeconds,
    issuer: config.jwtIssuer
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtAccessSecret, {
    issuer: config.jwtIssuer
  });
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

