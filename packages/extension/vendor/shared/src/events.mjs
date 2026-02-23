export const RUNNER_TYPES = Object.freeze({
  LIST_EXTRACTOR: "listExtractor",
  PAGE_EXTRACTOR: "pageExtractor",
  METADATA_EXTRACTOR: "metadataExtractor"
});

export const PICKER_MODES = Object.freeze({
  CONTAINER: "container",
  FIELD: "field",
  LOAD_MORE_BUTTON: "load_more_button",
  CLICK_ACTION: "click_action"
});

export const LOAD_MORE_METHODS = Object.freeze({
  NONE: "none",
  SCROLL: "scroll",
  NAVIGATE: "navigate",
  CLICK_BUTTON: "click_button"
});

export const URL_SOURCE_MODES = Object.freeze({
  MANUAL: "manual",
  CSV: "csv",
  DATASOURCE: "datasource"
});

export const PAGE_ACTION_TYPES = Object.freeze({
  EXTRACT_PAGES: "EXTRACT_PAGES",
  EXTRACT_PAGES_EMAIL: "EXTRACT_PAGES_EMAIL",
  EXTRACT_PAGES_PHONE: "EXTRACT_PAGES_PHONE",
  EXTRACT_PAGES_TEXT: "EXTRACT_PAGES_TEXT",
  EXTRACT_PAGES_GOOGLE_MAPS: "EXTRACT_PAGES_GOOGLE_MAPS"
});

export const AUTOMATION_STATES = Object.freeze({
  IDLE: "idle",
  RUNNING: "running",
  STOPPING: "stopping",
  STOPPED: "stopped",
  COMPLETED: "completed",
  ERROR: "error"
});

export const AUTOMATION_EVENT_TYPES = Object.freeze({
  STARTED: "automation.started",
  PROGRESS: "automation.progress",
  STOP_REQUESTED: "automation.stop_requested",
  STOPPED: "automation.stopped",
  COMPLETED: "automation.completed",
  FAILED: "automation.failed"
});

export const LIFECYCLE_TRANSITIONS = Object.freeze({
  START: "start",
  STOP_REQUEST: "stop_request",
  STOP: "stop",
  COMPLETE: "complete",
  FAIL: "fail",
  RESET: "reset"
});

export function isRunnerType(value) {
  return Object.values(RUNNER_TYPES).includes(value);
}

export function isAutomationState(value) {
  return Object.values(AUTOMATION_STATES).includes(value);
}

export function isPickerMode(value) {
  return Object.values(PICKER_MODES).includes(value);
}

export function isLoadMoreMethod(value) {
  return Object.values(LOAD_MORE_METHODS).includes(value);
}

export function isUrlSourceMode(value) {
  return Object.values(URL_SOURCE_MODES).includes(value);
}
