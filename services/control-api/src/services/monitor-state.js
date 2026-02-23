"use strict";

const { createHash } = require("crypto");
const { query } = require("../db/pool");

const MONITOR_KEY_PATTERN = /^[a-zA-Z0-9._:-]{3,120}$/;

function toMonitorState(row) {
  if (!row) return null;
  return {
    accountId: row.account_id,
    monitorKey: row.monitor_key,
    targetUrl: row.target_url,
    snapshotHash: row.snapshot_hash,
    snapshot: row.snapshot_json || {},
    runCount: Number(row.run_count || 0),
    changeCount: Number(row.change_count || 0),
    firstSeenAt: row.first_seen_at || null,
    lastSeenAt: row.last_seen_at || null,
    lastChangeAt: row.last_change_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function buildMonitorKeyFromUrl(targetUrl) {
  const hashed = createHash("sha256").update(String(targetUrl || "")).digest("hex").slice(0, 24);
  return `url.${hashed}`;
}

function resolveMonitorKey({ monitorKey = "", targetUrl = "" }) {
  const explicit = String(monitorKey || "").trim();
  if (explicit) {
    if (!MONITOR_KEY_PATTERN.test(explicit)) {
      const error = new Error("monitorKey must match [a-zA-Z0-9._:-]{3,120}");
      error.code = "INVALID_MONITOR_PAYLOAD";
      throw error;
    }
    return explicit.toLowerCase();
  }
  return buildMonitorKeyFromUrl(targetUrl);
}

async function getMonitorState({ accountId, monitorKey }) {
  const result = await query(
    `
      SELECT *
      FROM cloud_monitor_states
      WHERE account_id = $1 AND monitor_key = $2
      LIMIT 1
    `,
    [accountId, monitorKey]
  );
  if (result.rowCount === 0) return null;
  return toMonitorState(result.rows[0]);
}

async function upsertMonitorState({
  accountId,
  monitorKey,
  targetUrl,
  snapshotHash,
  snapshot = {},
  hasChanged = false
}) {
  const nowIso = new Date().toISOString();
  const changed = Boolean(hasChanged);

  const result = await query(
    `
      INSERT INTO cloud_monitor_states (
        account_id,
        monitor_key,
        target_url,
        snapshot_hash,
        snapshot_json,
        run_count,
        change_count,
        first_seen_at,
        last_seen_at,
        last_change_at,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5::jsonb,
        1,
        $6,
        $7,
        $7,
        $8,
        NOW(),
        NOW()
      )
      ON CONFLICT (account_id, monitor_key)
      DO UPDATE SET
        target_url = EXCLUDED.target_url,
        snapshot_hash = EXCLUDED.snapshot_hash,
        snapshot_json = EXCLUDED.snapshot_json,
        run_count = cloud_monitor_states.run_count + 1,
        change_count = cloud_monitor_states.change_count + CASE WHEN $9::boolean THEN 1 ELSE 0 END,
        last_seen_at = EXCLUDED.last_seen_at,
        last_change_at = CASE WHEN $9::boolean THEN EXCLUDED.last_seen_at ELSE cloud_monitor_states.last_change_at END,
        updated_at = NOW()
      RETURNING *
    `,
    [accountId, monitorKey, targetUrl, snapshotHash, JSON.stringify(snapshot), changed ? 1 : 0, nowIso, changed ? nowIso : null, changed]
  );

  return toMonitorState(result.rows[0]);
}

module.exports = {
  MONITOR_KEY_PATTERN,
  getMonitorState,
  resolveMonitorKey,
  upsertMonitorState
};
