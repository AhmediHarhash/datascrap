"use strict";

const { randomUUID } = require("crypto");
const { query } = require("../db/pool");

async function logAudit(eventType, details = {}) {
  try {
    await query(
      `
      INSERT INTO audit_events (
        id, account_id, user_id, event_type, event_data
      ) VALUES ($1, $2, $3, $4, $5::jsonb)
    `,
      [details.id || randomUUID(), details.accountId || null, details.userId || null, eventType, JSON.stringify(details.data || {})]
    );
  } catch (error) {
    console.error(`[audit] failed for ${eventType}: ${error.message}`);
  }
}

module.exports = {
  logAudit
};
