export const RUNNER_TYPES = Object.freeze({
  LIST_EXTRACTOR: "listExtractor",
  PAGE_EXTRACTOR: "pageExtractor",
  METADATA_EXTRACTOR: "metadataExtractor"
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

