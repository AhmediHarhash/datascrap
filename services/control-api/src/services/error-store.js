"use strict";

const MAX_ERROR_EVENTS = 500;
const events = [];

function recordErrorEvent(payload) {
  events.push({
    ...payload,
    timestamp: new Date().toISOString()
  });

  if (events.length > MAX_ERROR_EVENTS) {
    events.splice(0, events.length - MAX_ERROR_EVENTS);
  }
}

function listRecentErrors(limit = 50) {
  const safeLimit = Math.max(1, Math.min(500, Number(limit) || 50));
  return events.slice(-safeLimit).reverse();
}

function getErrorSummary() {
  const byEvent = {};
  for (const item of events) {
    byEvent[item.event] = (byEvent[item.event] || 0) + 1;
  }

  return {
    total: events.length,
    byEvent
  };
}

module.exports = {
  getErrorSummary,
  listRecentErrors,
  recordErrorEvent
};

