import { createAutomationRuntime } from "../vendor/core/src/automation-runtime.mjs";
import { createPermissionManager } from "../vendor/core/src/permission-manager.mjs";
import { MESSAGE_TYPES } from "../vendor/shared/src/messages.mjs";
import { createStorageClient } from "../vendor/storage/src/storage-client.mjs";
import {
  dedupeTableRows,
  getTableRows,
  listTableHistory,
  renameTableColumn,
  updateTableCell
} from "./data-table-service.mjs";
import { listDataSources, resolveDataSourceUrls } from "./datasource-service.mjs";
import { createListExtractionEngine } from "./list-extraction-engine.mjs";
import { createPageExtractionEngine } from "./page-extraction-engine.mjs";
import { createPickerSessionManager } from "./picker-session-manager.mjs";

function noop() {}

function safeSendRuntimeMessage(message) {
  try {
    chrome.runtime.sendMessage(message, () => {
      void chrome.runtime.lastError;
    });
  } catch (_error) {
    noop();
  }
}

const controllersReady = (async () => {
  const storageClient = await createStorageClient({
    driver: "auto"
  });

  const pickerSessionManager = createPickerSessionManager({
    chromeApi: chrome,
    onSessionEvent(eventType, session) {
      safeSendRuntimeMessage({
        type: MESSAGE_TYPES.PICKER_EVENT,
        payload: {
          eventType,
          session
        }
      });
    }
  });

  const listExtractionEngine = createListExtractionEngine({
    chromeApi: chrome
  });
  const pageExtractionEngine = createPageExtractionEngine({
    chromeApi: chrome
  });

  const runtime = createAutomationRuntime({
    storageClient,
    permissionManager: createPermissionManager({
      chromeApi: chrome,
      assumeAllowedIfUnavailable: false
    }),
    capabilities: {
      listExtractionEngine,
      pageExtractionEngine
    },
    onEvent(event) {
      safeSendRuntimeMessage({
        type: MESSAGE_TYPES.EVENT,
        payload: event
      });
    }
  });

  await runtime.init();
  return {
    storageClient,
    runtime,
    pickerSessionManager
  };
})();

chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel?.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({
      openPanelOnActionClick: true
    });
  }
});

function sendResponseError(sendResponse, error) {
  sendResponse({
    type: MESSAGE_TYPES.ERROR,
    payload: {
      message: error?.message || "Unknown error",
      code: error?.code || "BACKGROUND_HANDLER_ERROR"
    }
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const type = String(message?.type || "").trim();
  if (!type) return false;

  void (async () => {
    try {
      const controllers = await controllersReady;
      const { runtime, pickerSessionManager, storageClient } = controllers;

      const pickerInbound = pickerSessionManager.handleIncomingMessage(message);
      if (pickerInbound.handled) {
        sendResponse({
          ok: true
        });
        return;
      }

      if (type === MESSAGE_TYPES.LIST_RUNNERS_REQUEST) {
        sendResponse({
          type: MESSAGE_TYPES.LIST_RUNNERS_RESPONSE,
          payload: {
            runners: runtime.getRunnerCatalog()
          }
        });
        return;
      }

      if (type === MESSAGE_TYPES.SNAPSHOT_REQUEST) {
        sendResponse({
          type: MESSAGE_TYPES.SNAPSHOT_RESPONSE,
          payload: await runtime.getSnapshot()
        });
        return;
      }

      if (type === MESSAGE_TYPES.DATA_SOURCE_LIST_REQUEST) {
        const items = await listDataSources({
          storageClient,
          limit: Number(message?.payload?.limit || 50)
        });
        sendResponse({
          type: MESSAGE_TYPES.DATA_SOURCE_LIST_RESPONSE,
          payload: {
            items
          }
        });
        return;
      }

      if (type === MESSAGE_TYPES.DATA_SOURCE_URLS_REQUEST) {
        const tableDataId = String(message?.payload?.tableDataId || "").trim();
        if (!tableDataId) {
          throw new Error("tableDataId is required");
        }
        const result = await resolveDataSourceUrls({
          storageClient,
          tableDataId,
          selectedColumn: message?.payload?.selectedColumn,
          limit: Number(message?.payload?.limit || 2000)
        });
        sendResponse({
          type: MESSAGE_TYPES.DATA_SOURCE_URLS_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.TABLE_HISTORY_LIST_REQUEST) {
        const items = await listTableHistory({
          storageClient,
          limit: Number(message?.payload?.limit || 100)
        });
        sendResponse({
          type: MESSAGE_TYPES.TABLE_HISTORY_LIST_RESPONSE,
          payload: {
            items
          }
        });
        return;
      }

      if (type === MESSAGE_TYPES.TABLE_ROWS_REQUEST) {
        const tableDataId = String(message?.payload?.tableDataId || "").trim();
        if (!tableDataId) {
          throw new Error("tableDataId is required");
        }
        const result = await getTableRows({
          storageClient,
          tableDataId,
          limit: Number(message?.payload?.limit || 300),
          search: message?.payload?.search || "",
          filterColumn: message?.payload?.filterColumn || "",
          filterValue: message?.payload?.filterValue || ""
        });
        sendResponse({
          type: MESSAGE_TYPES.TABLE_ROWS_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.TABLE_UPDATE_CELL_REQUEST) {
        const tableDataId = String(message?.payload?.tableDataId || "").trim();
        const dedupeKey = String(message?.payload?.dedupeKey || "").trim();
        const columnName = String(message?.payload?.columnName || "").trim();
        if (!tableDataId || !dedupeKey || !columnName) {
          throw new Error("tableDataId, dedupeKey, and columnName are required");
        }
        const result = await updateTableCell({
          storageClient,
          tableDataId,
          dedupeKey,
          columnName,
          value: message?.payload?.value
        });
        sendResponse({
          type: MESSAGE_TYPES.TABLE_UPDATE_CELL_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.TABLE_RENAME_COLUMN_REQUEST) {
        const tableDataId = String(message?.payload?.tableDataId || "").trim();
        if (!tableDataId) {
          throw new Error("tableDataId is required");
        }
        const result = await renameTableColumn({
          storageClient,
          tableDataId,
          fromColumn: message?.payload?.fromColumn,
          toColumn: message?.payload?.toColumn
        });
        sendResponse({
          type: MESSAGE_TYPES.TABLE_RENAME_COLUMN_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.TABLE_DEDUPE_REQUEST) {
        const tableDataId = String(message?.payload?.tableDataId || "").trim();
        if (!tableDataId) {
          throw new Error("tableDataId is required");
        }
        const result = await dedupeTableRows({
          storageClient,
          tableDataId
        });
        sendResponse({
          type: MESSAGE_TYPES.TABLE_DEDUPE_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.PICKER_START_REQUEST) {
        const started = await pickerSessionManager.startSession({
          mode: message?.payload?.mode,
          multiSelect: message?.payload?.multiSelect,
          anchorSelector: message?.payload?.anchorSelector,
          prompt: message?.payload?.prompt
        });
        sendResponse({
          type: MESSAGE_TYPES.PICKER_START_RESPONSE,
          payload: {
            session: started
          }
        });
        return;
      }

      if (type === MESSAGE_TYPES.PICKER_GET_SESSION_REQUEST) {
        const sessionId = String(message?.payload?.sessionId || "");
        const session = pickerSessionManager.getSession(sessionId);
        sendResponse({
          type: MESSAGE_TYPES.PICKER_GET_SESSION_RESPONSE,
          payload: {
            session
          }
        });
        return;
      }

      if (type === MESSAGE_TYPES.PICKER_CANCEL_REQUEST) {
        const sessionId = String(message?.payload?.sessionId || "");
        const session = await pickerSessionManager.cancelSession(sessionId);
        sendResponse({
          type: MESSAGE_TYPES.PICKER_CANCEL_RESPONSE,
          payload: {
            session
          }
        });
        return;
      }

      if (type === MESSAGE_TYPES.START_REQUEST) {
        const started = await runtime.startAutomation(message.payload || {});
        sendResponse({
          type: MESSAGE_TYPES.START_RESPONSE,
          payload: started
        });
        return;
      }

      if (type === MESSAGE_TYPES.STOP_REQUEST) {
        const stopped = await runtime.stopAutomation(String(message?.payload?.automationId || ""));
        sendResponse({
          type: MESSAGE_TYPES.STOP_RESPONSE,
          payload: stopped
        });
        return;
      }

      if (type === MESSAGE_TYPES.RERUN_REQUEST) {
        const rerun = await runtime.rerunAutomation(String(message?.payload?.automationId || ""));
        sendResponse({
          type: MESSAGE_TYPES.RERUN_RESPONSE,
          payload: rerun
        });
        return;
      }

      sendResponse({
        type: MESSAGE_TYPES.ERROR,
        payload: {
          message: `Unsupported message type: ${type}`,
          code: "UNSUPPORTED_MESSAGE_TYPE"
        }
      });
    } catch (error) {
      sendResponseError(sendResponse, error);
    }
  })();

  return true;
});
