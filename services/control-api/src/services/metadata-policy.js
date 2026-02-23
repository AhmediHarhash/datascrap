"use strict";

const { config } = require("../config");

const BLOCKED_KEYWORDS = [
  "rows",
  "records",
  "dataset",
  "extracted",
  "raw_html",
  "html",
  "dom_snapshot",
  "screenshot",
  "page_content",
  "full_text",
  "csv",
  "xlsx",
  "json_export"
];

function normalizeKey(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function isBlockedKey(key) {
  const normalized = normalizeKey(key);
  return BLOCKED_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function walkPayload(value, path, blockedPaths) {
  if (value === null || value === undefined) return;

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      walkPayload(value[index], `${path}[${index}]`, blockedPaths);
    }
    return;
  }

  if (typeof value === "object") {
    for (const key of Object.keys(value)) {
      const childPath = path ? `${path}.${key}` : key;
      if (isBlockedKey(key)) {
        blockedPaths.push(childPath);
      }
      walkPayload(value[key], childPath, blockedPaths);
    }
  }
}

function payloadByteSize(payload) {
  try {
    return Buffer.byteLength(JSON.stringify(payload), "utf8");
  } catch (_error) {
    return Number.MAX_SAFE_INTEGER;
  }
}

function validateMetadataOnlyPayload(payload) {
  const blockedPaths = [];
  walkPayload(payload, "", blockedPaths);

  const sizeBytes = payloadByteSize(payload);
  if (sizeBytes > config.maxMetadataPayloadBytes) {
    return {
      ok: false,
      code: "METADATA_PAYLOAD_TOO_LARGE",
      message: `Payload exceeds metadata limit (${sizeBytes} > ${config.maxMetadataPayloadBytes} bytes)`,
      blockedPaths
    };
  }

  if (blockedPaths.length > 0) {
    return {
      ok: false,
      code: "METADATA_ONLY_POLICY_VIOLATION",
      message: "Payload appears to include row-level or raw extracted content",
      blockedPaths
    };
  }

  return {
    ok: true,
    code: null,
    message: "Payload is metadata-only",
    blockedPaths: []
  };
}

module.exports = {
  validateMetadataOnlyPayload
};
