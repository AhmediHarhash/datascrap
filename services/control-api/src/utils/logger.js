"use strict";

const { config } = require("../config");

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
  console.error(
    JSON.stringify(
      baseEntry("error", event, {
        ...fields,
        error: sanitizeError(error)
      })
    )
  );
}

module.exports = {
  logError,
  logInfo,
  logWarn
};

