import { createAutomationRuntime } from "../vendor/core/src/automation-runtime.mjs";
import { createPermissionManager } from "../vendor/core/src/permission-manager.mjs";
import { MESSAGE_TYPES } from "../vendor/shared/src/messages.mjs";
import { createStorageClient } from "../vendor/storage/src/storage-client.mjs";

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

const runtimeReady = (async () => {
  const storageClient = await createStorageClient({
    driver: "auto"
  });

  const runtime = createAutomationRuntime({
    storageClient,
    permissionManager: createPermissionManager({
      chromeApi: chrome,
      assumeAllowedIfUnavailable: false
    }),
    onEvent(event) {
      safeSendRuntimeMessage({
        type: MESSAGE_TYPES.EVENT,
        payload: event
      });
    }
  });

  await runtime.init();
  return runtime;
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
      const runtime = await runtimeReady;

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
