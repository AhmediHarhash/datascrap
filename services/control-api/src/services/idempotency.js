"use strict";

const { createHash, randomUUID } = require("crypto");
const { query } = require("../db/pool");
const { config } = require("../config");

function getIdempotencyKey(req) {
  const fromHeader = req.headers["idempotency-key"];
  const fromBody = req.body?.idempotencyKey;
  const raw = fromHeader ?? fromBody;
  const key = String(raw || "").trim();
  return key || null;
}

function withoutIdempotencyKey(payload) {
  if (!payload || typeof payload !== "object") {
    return payload;
  }
  if (Array.isArray(payload)) {
    return payload.map((item) => withoutIdempotencyKey(item));
  }

  const output = {};
  for (const key of Object.keys(payload)) {
    if (key === "idempotencyKey") continue;
    output[key] = withoutIdempotencyKey(payload[key]);
  }
  return output;
}

function stableStringify(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "string") return JSON.stringify(value);

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const keys = Object.keys(value).sort();
  const parts = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
  return `{${parts.join(",")}}`;
}

function hashRequestPayload(payload) {
  const normalized = withoutIdempotencyKey(payload);
  return createHash("sha256").update(stableStringify(normalized)).digest("hex");
}

async function loadIdempotentResponse({ scopeKey, operation, idempotencyKey, payload }) {
  const requestHash = hashRequestPayload(payload);

  const result = await query(
    `
      SELECT request_hash, response_status, response_body
      FROM idempotency_keys
      WHERE scope_key = $1
        AND operation = $2
        AND idempotency_key = $3
        AND expires_at > NOW()
      LIMIT 1
    `,
    [scopeKey, operation, idempotencyKey]
  );

  if (result.rowCount === 0) {
    return {
      replay: null,
      requestHash
    };
  }

  const row = result.rows[0];
  if (row.request_hash !== requestHash) {
    const error = new Error("Idempotency key already used with different payload");
    error.code = "IDEMPOTENCY_KEY_REUSED";
    throw error;
  }

  return {
    replay: {
      status: row.response_status,
      body: row.response_body
    },
    requestHash
  };
}

async function storeIdempotentResponse({
  scopeKey,
  operation,
  idempotencyKey,
  requestHash,
  status,
  body
}) {
  const ttlHours = Math.max(1, Number(config.idempotencyTtlHours || 24));

  await query(
    `
      INSERT INTO idempotency_keys (
        id,
        scope_key,
        operation,
        idempotency_key,
        request_hash,
        response_status,
        response_body,
        expires_at
      ) VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7::jsonb,
        NOW() + ($8 || ' hours')::interval
      )
      ON CONFLICT (scope_key, operation, idempotency_key)
      DO UPDATE SET
        response_status = EXCLUDED.response_status,
        response_body = EXCLUDED.response_body,
        expires_at = EXCLUDED.expires_at
    `,
    [
      randomUUID(),
      scopeKey,
      operation,
      idempotencyKey,
      requestHash,
      status,
      JSON.stringify(body),
      String(ttlHours)
    ]
  );
}

module.exports = {
  getIdempotencyKey,
  loadIdempotentResponse,
  storeIdempotentResponse
};

