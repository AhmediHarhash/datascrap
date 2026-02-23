import {
  AUTOMATION_EVENT_TYPES,
  AUTOMATION_STATES,
  LIFECYCLE_TRANSITIONS,
  RUNNER_TYPES
} from "../../shared/src/events.mjs";
import { createLifecycleMachine } from "./lifecycle-machine.mjs";
import { createPermissionManager } from "./permission-manager.mjs";
import { createDefaultRunnerRegistry } from "./runner-registry.mjs";
import { createAbortError, createId } from "./utils.mjs";

const TERMINAL_STATES = new Set([
  AUTOMATION_STATES.STOPPED,
  AUTOMATION_STATES.COMPLETED,
  AUTOMATION_STATES.ERROR
]);

const MAX_RECENT_EVENTS = 500;
const MAX_RUN_ARTIFACTS = 200;
const MAX_FAILED_ARTIFACTS = 60;
const MAX_PROGRESS_SAMPLES = 120;
const MAX_ERROR_MESSAGE_CHARS = 1200;
const MAX_ERROR_STACK_CHARS = 6000;

const EVENT_TAXONOMY = Object.freeze({
  [AUTOMATION_EVENT_TYPES.STARTED]: Object.freeze({
    eventName: "extraction_started",
    severity: "info",
    stage: "start"
  }),
  [AUTOMATION_EVENT_TYPES.PROGRESS]: Object.freeze({
    eventName: "extraction_progress",
    severity: "info",
    stage: "progress"
  }),
  [AUTOMATION_EVENT_TYPES.STOP_REQUESTED]: Object.freeze({
    eventName: "extraction_stop_requested",
    severity: "warning",
    stage: "stop_request"
  }),
  [AUTOMATION_EVENT_TYPES.STOPPED]: Object.freeze({
    eventName: "extraction_stopped",
    severity: "warning",
    stage: "stopped"
  }),
  [AUTOMATION_EVENT_TYPES.COMPLETED]: Object.freeze({
    eventName: "extraction_completed",
    severity: "info",
    stage: "completed"
  }),
  [AUTOMATION_EVENT_TYPES.FAILED]: Object.freeze({
    eventName: "extraction_failed",
    severity: "error",
    stage: "failed"
  })
});

const TOOL_BY_ACTION_TYPE = Object.freeze({
  EXTRACT_PAGES_EMAIL: "email",
  EXTRACT_PAGES_TEXT: "text",
  EXTRACT_PAGES_GOOGLE_MAPS: "maps",
  EXTRACT_PAGES_PHONE: "phone",
  EXTRACT_PAGES: "pages"
});

function nowIso() {
  return new Date().toISOString();
}

function pushBounded(array, item, maxItems) {
  if (!Array.isArray(array)) return;
  array.push(item);
  if (array.length > maxItems) {
    array.splice(0, array.length - maxItems);
  }
}

function cloneForSnapshot(value) {
  try {
    if (typeof globalThis.structuredClone === "function") {
      return globalThis.structuredClone(value);
    }
  } catch {
    // fallback below
  }
  return JSON.parse(JSON.stringify(value));
}

function sanitizeError(error) {
  const message = String(error?.message || "Unknown runtime error").slice(0, MAX_ERROR_MESSAGE_CHARS);
  return {
    code: error?.code || "AUTOMATION_RUNTIME_ERROR",
    message
  };
}

function sanitizeStack(error) {
  const stack = String(error?.stack || "").trim();
  if (!stack) return "";
  return stack.slice(0, MAX_ERROR_STACK_CHARS);
}

function inferErrorType(error) {
  const code = String(error?.code || "").toLowerCase();
  const message = String(error?.message || "").toLowerCase();
  const haystack = `${code} ${message}`;
  if (haystack.includes("permission")) return "permission";
  if (haystack.includes("timeout") || haystack.includes("timed out")) return "timeout";
  if (haystack.includes("selector")) return "selector";
  if (haystack.includes("network") || haystack.includes("fetch") || haystack.includes("socket") || haystack.includes("connect")) {
    return "network";
  }
  if (haystack.includes("invalid") || haystack.includes("validation")) return "validation";
  return "unexpected";
}

function inferSeverity(errorType) {
  if (errorType === "permission" || errorType === "unexpected") return "critical";
  if (errorType === "validation") return "warning";
  if (errorType === "timeout" || errorType === "network" || errorType === "selector") return "error";
  return "error";
}

function inferRecoverable(errorType) {
  return errorType === "timeout" || errorType === "network" || errorType === "selector";
}

function resolveSourceUrl(config = {}) {
  const startUrl = String(config?.startUrl || "").trim();
  if (startUrl) return startUrl;
  const urls = Array.isArray(config?.urls) ? config.urls : [];
  const first = String(urls[0] || "").trim();
  return first || "";
}

function summarizeQueue(queueInput = {}) {
  const queue = queueInput && typeof queueInput === "object" ? queueInput : {};
  const reliability = queue.reliability && typeof queue.reliability === "object" ? queue.reliability : {};
  return {
    maxConcurrentTabs: Number(queue.maxConcurrentTabs || 0),
    delayBetweenRequestsMs: Number(queue.delayBetweenRequestsMs || 0),
    pageTimeoutMs: Number(queue.pageTimeoutMs || 0),
    maxRetries: Number(queue.maxRetries || 0),
    retryDelayMs: Number(queue.retryDelayMs || 0),
    jitterMs: Number(queue.jitterMs || 0),
    waitForPageLoad: Boolean(queue.waitForPageLoad !== false),
    waitForSelector: String(queue.waitForSelector || "").trim(),
    waitForSelectorTimeoutMs: Number(queue.waitForSelectorTimeoutMs || 0),
    reliability: {
      profile: String(reliability.profile || "").trim(),
      backoffStrategy: String(reliability.backoffStrategy || "").trim(),
      jitterMode: String(reliability.jitterMode || "").trim(),
      sessionReuseMode: String(reliability.sessionReuseMode || "").trim(),
      minRetryDelayMs: Number(reliability.minRetryDelayMs || 0),
      maxRetryDelayMs: Number(reliability.maxRetryDelayMs || 0)
    }
  };
}

function classifyToolType(runnerType, actionType = "") {
  if (runnerType === RUNNER_TYPES.LIST_EXTRACTOR) return "list";
  if (runnerType === RUNNER_TYPES.METADATA_EXTRACTOR) return "metadata";
  if (runnerType !== RUNNER_TYPES.PAGE_EXTRACTOR) return "unknown";
  const normalizedAction = String(actionType || "").trim().toUpperCase();
  return TOOL_BY_ACTION_TYPE[normalizedAction] || "pages";
}

function summarizeConfig(config = {}, runnerType = RUNNER_TYPES.LIST_EXTRACTOR) {
  const normalized = config && typeof config === "object" ? config : {};
  const urls = Array.isArray(normalized.urls) ? normalized.urls : [];
  const actions = Array.isArray(normalized.actions) ? normalized.actions : [];
  const actionType = String(
    normalized.pageActionType || actions[0]?.type || ""
  )
    .trim()
    .toUpperCase();
  return {
    toolType: classifyToolType(runnerType, actionType),
    actionType,
    urlSourceMode: String(normalized.urlSourceMode || "").trim(),
    startUrl: resolveSourceUrl(normalized),
    urlCount: urls.length,
    hasActions: actions.length > 0,
    queue: summarizeQueue(normalized.queue)
  };
}

function createErrorPacket(error, context = {}) {
  const errorType = inferErrorType(error);
  const severity = String(context.severity || "").trim().toLowerCase() || inferSeverity(errorType);
  const retryCount = Number(context.retryCount || 0);
  return {
    errorType,
    severity,
    code: String(error?.code || "AUTOMATION_RUNTIME_ERROR"),
    message: String(error?.message || "Unknown runtime error").slice(0, MAX_ERROR_MESSAGE_CHARS),
    stack: sanitizeStack(error),
    runStep: String(context.runStep || "runtime"),
    url: String(context.url || ""),
    retryCount: Number.isFinite(retryCount) ? retryCount : 0,
    isRecoverable: inferRecoverable(errorType),
    capturedAt: nowIso()
  };
}

function buildEventTaxonomy(eventType, payload = {}) {
  const base = EVENT_TAXONOMY[eventType] || EVENT_TAXONOMY[AUTOMATION_EVENT_TYPES.PROGRESS];
  const runnerType = String(payload?.runnerType || "").trim();
  const actionType = String(payload?.actionType || "").trim();
  return {
    eventName: base.eventName,
    family: "extraction_lifecycle",
    severity: base.severity,
    stage: base.stage,
    toolType: classifyToolType(runnerType, actionType),
    runnerType
  };
}

function summarizeRecentEvents(events) {
  const source = Array.isArray(events) ? events : [];
  const byType = {};
  const bySeverity = {};
  const byTool = {};
  for (const event of source) {
    const eventType = String(event?.eventType || "unknown");
    byType[eventType] = (byType[eventType] || 0) + 1;
    const severity = String(event?.taxonomy?.severity || "info");
    bySeverity[severity] = (bySeverity[severity] || 0) + 1;
    const toolType = String(event?.taxonomy?.toolType || "unknown");
    byTool[toolType] = (byTool[toolType] || 0) + 1;
  }
  return {
    total: source.length,
    byType,
    bySeverity,
    byTool
  };
}

function createRunArtifact(automationRecord) {
  const runnerType = String(automationRecord?.runnerType || RUNNER_TYPES.LIST_EXTRACTOR);
  const actionType = String(
    automationRecord?.config?.pageActionType || automationRecord?.config?.actions?.[0]?.type || ""
  )
    .trim()
    .toUpperCase();
  const startedAt = String(automationRecord?.createdAt || nowIso());
  return {
    automationId: automationRecord?.id || "",
    parentAutomationId: automationRecord?.parentAutomationId || null,
    runnerType,
    toolType: classifyToolType(runnerType, actionType),
    actionType,
    startedAt,
    updatedAt: startedAt,
    endedAt: null,
    durationMs: null,
    status: String(automationRecord?.status || AUTOMATION_STATES.IDLE),
    terminalEventType: null,
    configSummary: summarizeConfig(automationRecord?.config || {}, runnerType),
    eventCounts: {},
    lifecycle: [],
    progress: {
      count: 0,
      max: 0,
      last: null,
      samples: []
    },
    permission: null,
    table: null,
    result: null,
    errorPacket: null
  };
}

function retainNewestArtifacts(artifactMap, maxItems) {
  while (artifactMap.size > maxItems) {
    let oldestKey = null;
    let oldestTimestamp = Number.POSITIVE_INFINITY;
    for (const [key, value] of artifactMap.entries()) {
      const timestamp = new Date(String(value?.startedAt || "")).getTime();
      const safeTimestamp = Number.isFinite(timestamp) ? timestamp : 0;
      if (safeTimestamp < oldestTimestamp) {
        oldestTimestamp = safeTimestamp;
        oldestKey = key;
      }
    }
    if (!oldestKey) break;
    artifactMap.delete(oldestKey);
  }
}

function createNoopStorageClient() {
  const automations = new Map();

  return {
    async init() {
      return null;
    },
    async clearAll() {
      automations.clear();
    },
    automations: {
      async put(record) {
        automations.set(record.id, { ...record });
        return { ...record };
      },
      async getById(automationId) {
        return automations.get(automationId) || null;
      },
      async list() {
        return Array.from(automations.values());
      },
      async remove(automationId) {
        automations.delete(automationId);
      }
    },
    tableData: {
      async put(record) {
        return record;
      }
    },
    tableRows: {
      async addMany() {
        return {
          inserted: 0,
          skipped: 0,
          total: 0
        };
      }
    }
  };
}

export function createAutomationRuntime(options = {}) {
  const storageClient = options.storageClient || createNoopStorageClient();
  const runnerRegistry = options.runnerRegistry || createDefaultRunnerRegistry();
  const permissionManager = options.permissionManager || createPermissionManager();
  const capabilities = options.capabilities || {};
  const onEvent = typeof options.onEvent === "function" ? options.onEvent : () => {};

  const activeRuns = new Map();
  const recentEvents = [];
  const runHistory = new Map();
  const runArtifacts = new Map();
  const failedArtifacts = [];

  function captureFailedArtifact(artifact) {
    const cloned = cloneForSnapshot(artifact);
    const existingIndex = failedArtifacts.findIndex((item) => item.automationId === cloned.automationId);
    if (existingIndex >= 0) {
      failedArtifacts.splice(existingIndex, 1);
    }
    failedArtifacts.unshift(cloned);
    if (failedArtifacts.length > MAX_FAILED_ARTIFACTS) {
      failedArtifacts.splice(MAX_FAILED_ARTIFACTS);
    }
  }

  function getRunArtifact(automationId) {
    const key = String(automationId || "").trim();
    if (!key) return null;
    return runArtifacts.get(key) || null;
  }

  function recordEventForRunArtifact(event) {
    const automationId = String(event?.payload?.automationId || "").trim();
    if (!automationId) return;
    const artifact = runArtifacts.get(automationId);
    if (!artifact) return;

    artifact.updatedAt = event.emittedAt;
    const count = Number(artifact.eventCounts[event.eventType] || 0);
    artifact.eventCounts[event.eventType] = count + 1;
    pushBounded(
      artifact.lifecycle,
      {
        eventType: event.eventType,
        state: String(event?.payload?.state || artifact.status || ""),
        phase: String(event?.payload?.phase || "").trim(),
        emittedAt: event.emittedAt
      },
      MAX_RECENT_EVENTS
    );

    if (event.eventType === AUTOMATION_EVENT_TYPES.PROGRESS) {
      const progressValue = Number(event?.payload?.progress || 0);
      const normalizedProgress = Number.isFinite(progressValue) ? Math.max(0, Math.min(100, progressValue)) : 0;
      artifact.progress.count += 1;
      artifact.progress.max = Math.max(artifact.progress.max, normalizedProgress);
      artifact.progress.last = {
        progress: normalizedProgress,
        phase: String(event?.payload?.phase || "").trim(),
        context: event?.payload?.context || null,
        emittedAt: event.emittedAt
      };
      pushBounded(
        artifact.progress.samples,
        {
          progress: normalizedProgress,
          phase: String(event?.payload?.phase || "").trim(),
          emittedAt: event.emittedAt
        },
        MAX_PROGRESS_SAMPLES
      );
    }

    if (event.eventType === AUTOMATION_EVENT_TYPES.STARTED) {
      artifact.runnerType = String(event?.payload?.runnerType || artifact.runnerType || "");
      artifact.actionType = String(event?.payload?.actionType || artifact.actionType || "");
      artifact.toolType = classifyToolType(artifact.runnerType, artifact.actionType);
    }

    if (event.eventType === AUTOMATION_EVENT_TYPES.STOP_REQUESTED) {
      artifact.status = AUTOMATION_STATES.STOPPING;
      return;
    }

    if (event.eventType === AUTOMATION_EVENT_TYPES.COMPLETED) {
      artifact.status = AUTOMATION_STATES.COMPLETED;
      artifact.terminalEventType = AUTOMATION_EVENT_TYPES.COMPLETED;
      return;
    }
    if (event.eventType === AUTOMATION_EVENT_TYPES.STOPPED) {
      artifact.status = AUTOMATION_STATES.STOPPED;
      artifact.terminalEventType = AUTOMATION_EVENT_TYPES.STOPPED;
      return;
    }
    if (event.eventType === AUTOMATION_EVENT_TYPES.FAILED) {
      artifact.status = AUTOMATION_STATES.ERROR;
      artifact.terminalEventType = AUTOMATION_EVENT_TYPES.FAILED;
    }
  }

  function pushEvent(eventType, payload = {}) {
    const event = {
      eventType,
      payload,
      emittedAt: nowIso(),
      taxonomy: buildEventTaxonomy(eventType, payload)
    };
    recentEvents.push(event);
    if (recentEvents.length > MAX_RECENT_EVENTS) {
      recentEvents.shift();
    }
    recordEventForRunArtifact(event);
    onEvent(event);
    return event;
  }

  async function persistAutomation(record) {
    await storageClient.automations.put(record);
    runHistory.set(record.id, { ...record });
  }

  async function persistTableData(automationRecord, result) {
    const tableDataId = createId("table");
    await storageClient.tableData.put({
      id: tableDataId,
      automationId: automationRecord.id,
      runnerType: automationRecord.runnerType,
      status: automationRecord.status,
      summary: result?.summary || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const rowInsertSummary = await storageClient.tableRows.addMany({
      tableDataId,
      rows: Array.isArray(result?.rows) ? result.rows : [],
      sourceUrl: automationRecord.config?.startUrl || null
    });

    return {
      tableDataId,
      rowInsertSummary
    };
  }

  async function finalizeRun({ automationId, transition, eventType, payload }) {
    const run = activeRuns.get(automationId);
    if (!run) {
      return null;
    }

    const nextState = run.lifecycle.transition(transition);
    run.automationRecord.status = nextState;
    run.automationRecord.updatedAt = nowIso();
    await persistAutomation(run.automationRecord);

    const artifact = getRunArtifact(automationId);
    if (artifact) {
      artifact.status = nextState;
      artifact.endedAt = nowIso();
      artifact.updatedAt = artifact.endedAt;
      const duration = Date.parse(artifact.endedAt) - Date.parse(artifact.startedAt);
      artifact.durationMs = Number.isFinite(duration) ? Math.max(0, duration) : null;
      artifact.terminalEventType = eventType;
      if (payload?.table) {
        artifact.table = cloneForSnapshot(payload.table);
      }
      if (payload?.result) {
        artifact.result = cloneForSnapshot(payload.result);
      }
      if (payload?.permission) {
        artifact.permission = cloneForSnapshot(payload.permission);
      }
      if (payload?.errorPacket) {
        artifact.errorPacket = cloneForSnapshot(payload.errorPacket);
      }
    }

    activeRuns.delete(automationId);
    pushEvent(eventType, {
      automationId,
      state: nextState,
      ...payload
    });
    if (nextState === AUTOMATION_STATES.ERROR && artifact) {
      captureFailedArtifact(artifact);
    }
    return run.automationRecord;
  }

  async function startAutomation(input = {}) {
    const runnerType = String(input.runnerType || "").trim();
    if (!runnerRegistry.has(runnerType)) {
      throw new Error(`Unknown runner type: ${runnerType || "(empty)"}`);
    }

    const parentAutomationId = String(input.parentAutomationId || "").trim() || null;
    const automationId = createId("automation");
    const lifecycle = createLifecycleMachine();
    const state = lifecycle.transition(LIFECYCLE_TRANSITIONS.START);
    const createdAt = nowIso();
    const automationRecord = {
      id: automationId,
      parentAutomationId,
      runnerType,
      status: state,
      config: input.config || {},
      createdAt,
      updatedAt: createdAt
    };

    const runner = runnerRegistry.get(runnerType);
    const abortController = new AbortController();
    const run = {
      automationRecord,
      lifecycle,
      runner,
      abortController
    };

    activeRuns.set(automationId, run);
    runArtifacts.set(automationId, createRunArtifact(automationRecord));
    retainNewestArtifacts(runArtifacts, MAX_RUN_ARTIFACTS);
    await persistAutomation(automationRecord);
    const actionType = String(
      automationRecord?.config?.pageActionType || automationRecord?.config?.actions?.[0]?.type || ""
    )
      .trim()
      .toUpperCase();
    pushEvent(AUTOMATION_EVENT_TYPES.STARTED, {
      automationId,
      runnerType,
      actionType,
      state
    });

    const permissionContext = {
      startUrl: automationRecord.config?.startUrl || null,
      url:
        automationRecord.config?.startUrl ||
        (Array.isArray(automationRecord.config?.urls) ? automationRecord.config.urls[0] : null) ||
        null
    };
    const permissionResult = await permissionManager.ensureOperation(runner.permissionOperation, permissionContext);
    if (!permissionResult.allowed) {
      const error = new Error("Required permission was denied by the user");
      error.code = "PERMISSION_DENIED";
      const errorPacket = createErrorPacket(error, {
        runStep: "permission_check",
        url: permissionContext.url
      });
      await finalizeRun({
        automationId,
        transition: LIFECYCLE_TRANSITIONS.FAIL,
        eventType: AUTOMATION_EVENT_TYPES.FAILED,
        payload: {
          error: sanitizeError(error),
          errorPacket,
          permission: permissionResult
        }
      });
      throw error;
    }

    void (async () => {
      try {
        let result = null;
        try {
          result = await runner.run({
            automation: automationRecord,
            signal: abortController.signal,
            capabilities,
            emitProgress: (progressPayload) => {
              pushEvent(AUTOMATION_EVENT_TYPES.PROGRESS, {
                automationId,
                runnerType,
                actionType,
                state: run.lifecycle.getState(),
                ...progressPayload
              });
            }
          });
        } catch (error) {
          if (error?.code === "AUTOMATION_ABORTED") {
            await finalizeRun({
              automationId,
              transition: LIFECYCLE_TRANSITIONS.STOP,
              eventType: AUTOMATION_EVENT_TYPES.STOPPED,
              payload: {
                reason: "user_stopped"
              }
            });
            return;
          }
          throw error;
        }

        let tableSummary = null;
        try {
          tableSummary = await persistTableData(automationRecord, result);
        } catch (error) {
          error.runStep = "table_persist";
          throw error;
        }

        await finalizeRun({
          automationId,
          transition: LIFECYCLE_TRANSITIONS.COMPLETE,
          eventType: AUTOMATION_EVENT_TYPES.COMPLETED,
          payload: {
            result: result?.summary || {},
            table: tableSummary
          }
        });
      } catch (error) {
        const runStillActive = activeRuns.has(automationId);
        if (!runStillActive) return;
        const errorPacket = createErrorPacket(error, {
          runStep: String(error?.runStep || "runner_execution"),
          url: resolveSourceUrl(automationRecord.config || {})
        });
        await finalizeRun({
          automationId,
          transition: LIFECYCLE_TRANSITIONS.FAIL,
          eventType: AUTOMATION_EVENT_TYPES.FAILED,
          payload: {
            error: sanitizeError(error),
            errorPacket
          }
        });
      }
    })();

    return {
      automationId,
      runnerType,
      state
    };
  }

  async function stopAutomation(automationId) {
    const run = activeRuns.get(automationId);
    if (!run) {
      return {
        automationId,
        state: null,
        stopped: false
      };
    }

    if (!run.lifecycle.can(LIFECYCLE_TRANSITIONS.STOP_REQUEST)) {
      return {
        automationId,
        state: run.lifecycle.getState(),
        stopped: false
      };
    }

    const state = run.lifecycle.transition(LIFECYCLE_TRANSITIONS.STOP_REQUEST);
    run.automationRecord.status = state;
    run.automationRecord.updatedAt = nowIso();
    await persistAutomation(run.automationRecord);

    pushEvent(AUTOMATION_EVENT_TYPES.STOP_REQUESTED, {
      automationId,
      runnerType: run.automationRecord.runnerType,
      actionType: String(run.automationRecord?.config?.pageActionType || "").trim().toUpperCase(),
      state
    });
    run.abortController.abort(createAbortError());

    return {
      automationId,
      state,
      stopped: true
    };
  }

  async function rerunAutomation(automationId) {
    const fromStorage = await storageClient.automations.getById(automationId);
    const sourceRun = fromStorage || runHistory.get(automationId);
    if (!sourceRun) {
      throw new Error(`Cannot rerun unknown automation: ${automationId}`);
    }

    if (!TERMINAL_STATES.has(sourceRun.status)) {
      throw new Error("Can only rerun terminal automations");
    }

    return startAutomation({
      runnerType: sourceRun.runnerType || RUNNER_TYPES.LIST_EXTRACTOR,
      config: sourceRun.config || {},
      parentAutomationId: sourceRun.id
    });
  }

  async function getSnapshot() {
    const automations = await storageClient.automations.list({
      limit: 20
    });
    const runArtifactsList = Array.from(runArtifacts.values())
      .sort((a, b) => Date.parse(String(b.updatedAt || "")) - Date.parse(String(a.updatedAt || "")))
      .slice(0, 60)
      .map((item) => cloneForSnapshot(item));
    const recentEventsList = [...recentEvents].slice(-120);
    return {
      generatedAt: nowIso(),
      activeRuns: Array.from(activeRuns.values()).map((run) => ({
        automationId: run.automationRecord.id,
        runnerType: run.automationRecord.runnerType,
        state: run.lifecycle.getState()
      })),
      recentEvents: recentEventsList,
      recentEventSummary: summarizeRecentEvents(recentEventsList),
      runArtifacts: runArtifactsList,
      failedArtifacts: cloneForSnapshot(failedArtifacts.slice(0, 20)),
      automations
    };
  }

  return {
    async init() {
      await storageClient.init();
    },
    getRunnerCatalog() {
      return runnerRegistry.list();
    },
    startAutomation,
    stopAutomation,
    rerunAutomation,
    getSnapshot
  };
}
