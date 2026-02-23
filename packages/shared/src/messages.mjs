import { AUTOMATION_EVENT_TYPES } from "./events.mjs";

export const MESSAGE_TYPES = Object.freeze({
  LIST_RUNNERS_REQUEST: "automation.list_runners.request",
  LIST_RUNNERS_RESPONSE: "automation.list_runners.response",
  START_REQUEST: "automation.start.request",
  START_RESPONSE: "automation.start.response",
  STOP_REQUEST: "automation.stop.request",
  STOP_RESPONSE: "automation.stop.response",
  RERUN_REQUEST: "automation.rerun.request",
  RERUN_RESPONSE: "automation.rerun.response",
  SNAPSHOT_REQUEST: "automation.snapshot.request",
  SNAPSHOT_RESPONSE: "automation.snapshot.response",
  EVENT: "automation.event",
  ERROR: "automation.error"
});

const KNOWN_MESSAGE_TYPES = new Set(Object.values(MESSAGE_TYPES));
const KNOWN_EVENT_TYPES = new Set(Object.values(AUTOMATION_EVENT_TYPES));

export function createMessage(type, payload = {}) {
  if (!KNOWN_MESSAGE_TYPES.has(type)) {
    throw new Error(`Unknown message type: ${String(type)}`);
  }
  return {
    type,
    payload,
    sentAt: new Date().toISOString()
  };
}

export function createEvent(eventType, payload = {}) {
  if (!KNOWN_EVENT_TYPES.has(eventType)) {
    throw new Error(`Unknown automation event type: ${String(eventType)}`);
  }
  return {
    eventType,
    payload,
    emittedAt: new Date().toISOString()
  };
}

export function isKnownMessageType(value) {
  return KNOWN_MESSAGE_TYPES.has(value);
}

