import { AUTOMATION_EVENT_TYPES } from "./events.mjs";

export const MESSAGE_TYPES = Object.freeze({
  LIST_RUNNERS_REQUEST: "automation.list_runners.request",
  LIST_RUNNERS_RESPONSE: "automation.list_runners.response",
  DATA_SOURCE_LIST_REQUEST: "datasource.list.request",
  DATA_SOURCE_LIST_RESPONSE: "datasource.list.response",
  DATA_SOURCE_URLS_REQUEST: "datasource.urls.request",
  DATA_SOURCE_URLS_RESPONSE: "datasource.urls.response",
  TABLE_HISTORY_LIST_REQUEST: "table.history.list.request",
  TABLE_HISTORY_LIST_RESPONSE: "table.history.list.response",
  TABLE_ROWS_REQUEST: "table.rows.request",
  TABLE_ROWS_RESPONSE: "table.rows.response",
  TABLE_UPDATE_CELL_REQUEST: "table.update_cell.request",
  TABLE_UPDATE_CELL_RESPONSE: "table.update_cell.response",
  TABLE_RENAME_COLUMN_REQUEST: "table.rename_column.request",
  TABLE_RENAME_COLUMN_RESPONSE: "table.rename_column.response",
  TABLE_DEDUPE_REQUEST: "table.dedupe.request",
  TABLE_DEDUPE_RESPONSE: "table.dedupe.response",
  PICKER_START_REQUEST: "picker.start.request",
  PICKER_START_RESPONSE: "picker.start.response",
  PICKER_GET_SESSION_REQUEST: "picker.get_session.request",
  PICKER_GET_SESSION_RESPONSE: "picker.get_session.response",
  PICKER_CANCEL_REQUEST: "picker.cancel.request",
  PICKER_CANCEL_RESPONSE: "picker.cancel.response",
  PICKER_EVENT: "picker.event",
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
