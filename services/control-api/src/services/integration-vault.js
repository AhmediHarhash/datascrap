"use strict";

const crypto = require("crypto");
const { randomUUID } = require("crypto");
const { config } = require("../config");
const { query } = require("../db/pool");

function deriveMasterKeyBytes() {
  const raw = String(config.vaultMasterKey || "").trim();
  if (!raw) return null;

  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }

  try {
    const decoded = Buffer.from(raw, "base64");
    if (decoded.length === 32) {
      return decoded;
    }
  } catch (_error) {
    // Fall through to hash-based derivation.
  }

  return crypto.createHash("sha256").update(raw).digest();
}

function requireVaultKey() {
  const key = deriveMasterKeyBytes();
  if (!key) {
    if (config.vaultRequireKey) {
      const error = new Error("VAULT_MASTER_KEY is required");
      error.code = "VAULT_KEY_REQUIRED";
      throw error;
    }

    // Development fallback. Never intended for production.
    return crypto.createHash("sha256").update("dev-vault-fallback").digest();
  }

  return key;
}

function encryptSecretValue(plaintext) {
  const key = requireVaultKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    version: "v1",
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64url"),
    tag: tag.toString("base64url"),
    ciphertext: encrypted.toString("base64url")
  };
}

function decryptSecretValue(encryptedPayload) {
  const key = requireVaultKey();
  const version = String(encryptedPayload?.version || "");
  if (version !== "v1") {
    const error = new Error("Unsupported encrypted payload version");
    error.code = "VAULT_VERSION_UNSUPPORTED";
    throw error;
  }

  const iv = Buffer.from(String(encryptedPayload.iv || ""), "base64url");
  const tag = Buffer.from(String(encryptedPayload.tag || ""), "base64url");
  const ciphertext = Buffer.from(String(encryptedPayload.ciphertext || ""), "base64url");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

function toSecretMetadata(row) {
  return {
    id: row.id,
    accountId: row.account_id,
    provider: row.provider,
    secretName: row.secret_name,
    label: row.label || null,
    isActive: Boolean(row.is_active),
    lastUsedAt: row.last_used_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function upsertIntegrationSecret({ accountId, provider, secretName, secretValue, label }) {
  const encryptedPayload = encryptSecretValue(secretValue);
  const result = await query(
    `
      INSERT INTO integration_secrets (
        id,
        account_id,
        provider,
        secret_name,
        label,
        encrypted_payload,
        is_active,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6::jsonb,
        TRUE,
        NOW()
      )
      ON CONFLICT (account_id, provider, secret_name)
      DO UPDATE SET
        label = EXCLUDED.label,
        encrypted_payload = EXCLUDED.encrypted_payload,
        is_active = TRUE,
        updated_at = NOW()
      RETURNING
        id,
        account_id,
        provider,
        secret_name,
        label,
        is_active,
        last_used_at,
        created_at,
        updated_at
    `,
    [randomUUID(), accountId, provider, secretName, label || null, JSON.stringify(encryptedPayload)]
  );

  return toSecretMetadata(result.rows[0]);
}

async function listIntegrationSecrets(accountId) {
  const result = await query(
    `
      SELECT
        id,
        account_id,
        provider,
        secret_name,
        label,
        is_active,
        last_used_at,
        created_at,
        updated_at
      FROM integration_secrets
      WHERE account_id = $1
      ORDER BY created_at DESC
    `,
    [accountId]
  );

  return result.rows.map((row) => toSecretMetadata(row));
}

async function removeIntegrationSecret({ accountId, id, provider, secretName }) {
  if (id) {
    const result = await query(
      `
        DELETE FROM integration_secrets
        WHERE account_id = $1 AND id = $2
      `,
      [accountId, id]
    );
    return result.rowCount > 0;
  }

  const result = await query(
    `
      DELETE FROM integration_secrets
      WHERE account_id = $1 AND provider = $2 AND secret_name = $3
    `,
    [accountId, provider, secretName]
  );
  return result.rowCount > 0;
}

async function getIntegrationSecretPlaintext({ accountId, provider, secretName }) {
  const result = await query(
    `
      SELECT
        id,
        account_id,
        provider,
        secret_name,
        encrypted_payload
      FROM integration_secrets
      WHERE
        account_id = $1
        AND provider = $2
        AND secret_name = $3
        AND is_active = TRUE
      LIMIT 1
    `,
    [accountId, provider, secretName]
  );

  if (result.rowCount === 0) {
    const error = new Error("Integration secret not found");
    error.code = "INTEGRATION_SECRET_NOT_FOUND";
    throw error;
  }

  const row = result.rows[0];
  const plaintext = decryptSecretValue(row.encrypted_payload);

  await query(
    `
      UPDATE integration_secrets
      SET last_used_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `,
    [row.id]
  );

  return plaintext;
}

module.exports = {
  getIntegrationSecretPlaintext,
  listIntegrationSecrets,
  removeIntegrationSecret,
  upsertIntegrationSecret
};
