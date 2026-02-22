"use strict";

const { config } = require("../config");

let lastSentAtMs = 0;

function sanitizeError(error) {
  if (!error) return { name: "Error", message: "Unknown error" };
  return {
    name: error.name || "Error",
    message: error.message || "Unknown error"
  };
}

async function postToWebhook(payload) {
  if (!config.errorTrackingWebhookUrl) return;

  const intervalMs = Math.max(0, Number(config.errorTrackingMinIntervalSeconds || 0) * 1_000);
  const now = Date.now();
  if (now - lastSentAtMs < intervalMs) {
    return;
  }
  lastSentAtMs = now;

  const headers = {
    "Content-Type": "application/json"
  };
  if (config.errorTrackingWebhookBearerToken) {
    headers.Authorization = `Bearer ${config.errorTrackingWebhookBearerToken}`;
  }

  const response = await fetch(config.errorTrackingWebhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Webhook returned ${response.status}`);
  }
}

function captureError(event, error, fields = {}) {
  if (!config.errorTrackingWebhookUrl) return;

  const payload = {
    event,
    timestamp: new Date().toISOString(),
    service: "control-api",
    env: config.nodeEnv,
    error: sanitizeError(error),
    fields
  };

  void postToWebhook(payload).catch((postError) => {
    console.error(
      JSON.stringify({
        level: "warn",
        event: "error_tracking.webhook_failed",
        timestamp: new Date().toISOString(),
        service: "control-api",
        env: config.nodeEnv,
        message: postError.message
      })
    );
  });
}

module.exports = {
  captureError
};

