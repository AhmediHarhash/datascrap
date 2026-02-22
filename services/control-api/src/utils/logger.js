"use strict";

const { config } = require("../config");
const { captureError } = require("../services/error-tracker");
const { recordErrorEvent } = require("../services/error-store");

function baseEntry(level, event, fields = {}) {
  return {
    level,
    event,
    timestamp: new Date().toISOString(),
    service: "control-api",
    env: config.nodeEnv,
    ...fields
  };
}

function sanitizeError(error) {
  if (!error) return null;
  const payload = {
    name: error.name || "Error",
    message: error.message || "Unknown error"
  };
  if (config.nodeEnv !== "production" && error.stack) {
    payload.stack = error.stack;
  }
  return payload;
}

function logInfo(event, fields = {}) {
  console.log(JSON.stringify(baseEntry("info", event, fields)));
}

function logWarn(event, fields = {}) {
  console.warn(JSON.stringify(baseEntry("warn", event, fields)));
}

function logError(event, error, fields = {}) {
  const payload = baseEntry("error", event, {
    ...fields,
    error: sanitizeError(error)
  });
  console.error(JSON.stringify(payload));
  recordErrorEvent({
    event,
    env: config.nodeEnv,
    service: "control-api",
    fields,
    error: payload.error
  });
  captureError(event, error, fields);
}

module.exports = {
  logError,
  logInfo,
  logWarn
};
