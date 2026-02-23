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

function sanitizeError(error) {
  return {
    code: error?.code || "AUTOMATION_RUNTIME_ERROR",
    message: error?.message || "Unknown runtime error"
  };
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

  function pushEvent(eventType, payload = {}) {
    const event = {
      eventType,
      payload,
      emittedAt: new Date().toISOString()
    };
    recentEvents.push(event);
    if (recentEvents.length > 200) {
      recentEvents.shift();
    }
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
    run.automationRecord.updatedAt = new Date().toISOString();
    await persistAutomation(run.automationRecord);

    activeRuns.delete(automationId);
    pushEvent(eventType, {
      automationId,
      state: nextState,
      ...payload
    });
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
    const createdAt = new Date().toISOString();
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
    await persistAutomation(automationRecord);
    pushEvent(AUTOMATION_EVENT_TYPES.STARTED, {
      automationId,
      runnerType,
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
      await finalizeRun({
        automationId,
        transition: LIFECYCLE_TRANSITIONS.FAIL,
        eventType: AUTOMATION_EVENT_TYPES.FAILED,
        payload: {
          error: sanitizeError(error),
          permission: permissionResult
        }
      });
      throw error;
    }

    void (async () => {
      try {
        const result = await runner.run({
          automation: automationRecord,
          signal: abortController.signal,
          capabilities,
          emitProgress: (progressPayload) => {
            pushEvent(AUTOMATION_EVENT_TYPES.PROGRESS, {
              automationId,
              runnerType,
              state: run.lifecycle.getState(),
              ...progressPayload
            });
          }
        });

        const tableSummary = await persistTableData(automationRecord, result);
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

        const runStillActive = activeRuns.has(automationId);
        if (!runStillActive) return;
        await finalizeRun({
          automationId,
          transition: LIFECYCLE_TRANSITIONS.FAIL,
          eventType: AUTOMATION_EVENT_TYPES.FAILED,
          payload: {
            error: sanitizeError(error)
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
    run.automationRecord.updatedAt = new Date().toISOString();
    await persistAutomation(run.automationRecord);

    pushEvent(AUTOMATION_EVENT_TYPES.STOP_REQUESTED, {
      automationId,
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
    return {
      activeRuns: Array.from(activeRuns.values()).map((run) => ({
        automationId: run.automationRecord.id,
        runnerType: run.automationRecord.runnerType,
        state: run.lifecycle.getState()
      })),
      recentEvents: [...recentEvents].slice(-100),
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
