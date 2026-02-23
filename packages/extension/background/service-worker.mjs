import { createAutomationRuntime } from "../vendor/core/src/automation-runtime.mjs";
import { createPermissionManager } from "../vendor/core/src/permission-manager.mjs";
import { MESSAGE_TYPES } from "../vendor/shared/src/messages.mjs";
import { createStorageClient } from "../vendor/storage/src/storage-client.mjs";
import {
  activationCancelJob,
  activationCreateSchedule,
  activationEnqueueJob,
  activationGetCloudPolicy,
  activationGetJobsPolicy,
  activationGetObservabilityDashboard,
  activationGetObservabilityJobs,
  activationGetObservabilitySlo,
  activationLicenseStatus,
  activationListDevices,
  activationListIntegrationSecrets,
  activationTestIntegrationSecret,
  activationListJobs,
  activationListObservabilityErrors,
  activationListSchedules,
  activationLogin,
  activationLogout,
  activationRemoveIntegrationSecret,
  activationRemoveSchedule,
  activationRefreshProfile,
  activationRegister,
  activationRegisterLicense,
  activationRemoveDevice,
  activationRenameDevice,
  activationRunScheduleNow,
  activationSetCloudPolicy,
  activationValidateDevice,
  activationUpsertIntegrationSecret,
  activationUpdateSchedule,
  activationListDeadLetterJobs,
  activationToggleSchedule,
  getActivationSession,
  setActivationConfig
} from "./activation-service.mjs";
import {
  cleanupTableRows,
  dedupeTableRows,
  getTableRows,
  listTableHistory,
  mergeTableColumns,
  renameTableColumn,
  updateTableCell
} from "./data-table-service.mjs";
import { buildClipboardExport, exportTableToFile } from "./export-service.mjs";
import { downloadImages, scanActiveTabImages } from "./image-downloader-service.mjs";
import { listDataSources, resolveDataSourceUrls } from "./datasource-service.mjs";
import { createListExtractionEngine } from "./list-extraction-engine.mjs";
import { autodetectListConfig } from "./list-autodetect-service.mjs";
import { createMetadataExtractionEngine } from "./metadata-extraction-engine.mjs";
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
  const metadataExtractionEngine = createMetadataExtractionEngine({
    chromeApi: chrome
  });
  const permissionManager = createPermissionManager({
    chromeApi: chrome,
    assumeAllowedIfUnavailable: false
  });

  const runtime = createAutomationRuntime({
    storageClient,
    permissionManager,
    capabilities: {
      listExtractionEngine,
      pageExtractionEngine,
      metadataExtractionEngine
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
    pickerSessionManager,
    permissionManager
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
      const { runtime, pickerSessionManager, storageClient, permissionManager } = controllers;

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

      if (type === MESSAGE_TYPES.LIST_AUTODETECT_REQUEST) {
        const result = await autodetectListConfig({
          chromeApi: chrome,
          permissionManager,
          options: message?.payload || {}
        });
        sendResponse({
          type: MESSAGE_TYPES.LIST_AUTODETECT_RESPONSE,
          payload: result
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

      if (type === MESSAGE_TYPES.TABLE_MERGE_COLUMNS_REQUEST) {
        const tableDataId = String(message?.payload?.tableDataId || "").trim();
        if (!tableDataId) {
          throw new Error("tableDataId is required");
        }
        const result = await mergeTableColumns({
          storageClient,
          tableDataId,
          sourceColumns: message?.payload?.sourceColumns,
          mergedColumnName: message?.payload?.mergedColumnName,
          separator: message?.payload?.separator,
          removeSourceColumns: message?.payload?.removeSourceColumns
        });
        sendResponse({
          type: MESSAGE_TYPES.TABLE_MERGE_COLUMNS_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.TABLE_CLEANUP_REQUEST) {
        const tableDataId = String(message?.payload?.tableDataId || "").trim();
        if (!tableDataId) {
          throw new Error("tableDataId is required");
        }
        const result = await cleanupTableRows({
          storageClient,
          tableDataId,
          options: message?.payload?.options
        });
        sendResponse({
          type: MESSAGE_TYPES.TABLE_CLEANUP_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.TABLE_EXPORT_REQUEST) {
        const tableDataId = String(message?.payload?.tableDataId || "").trim();
        if (!tableDataId) {
          throw new Error("tableDataId is required");
        }
        const result = await exportTableToFile({
          storageClient,
          permissionManager,
          chromeApi: chrome,
          tableDataId,
          format: message?.payload?.format,
          search: message?.payload?.search || "",
          filterColumn: message?.payload?.filterColumn || "",
          filterValue: message?.payload?.filterValue || "",
          limit: Number(message?.payload?.limit || 5000)
        });
        sendResponse({
          type: MESSAGE_TYPES.TABLE_EXPORT_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.TABLE_EXPORT_CLIPBOARD_REQUEST) {
        const tableDataId = String(message?.payload?.tableDataId || "").trim();
        if (!tableDataId) {
          throw new Error("tableDataId is required");
        }
        const result = await buildClipboardExport({
          storageClient,
          tableDataId,
          search: message?.payload?.search || "",
          filterColumn: message?.payload?.filterColumn || "",
          filterValue: message?.payload?.filterValue || "",
          limit: Number(message?.payload?.limit || 5000)
        });
        sendResponse({
          type: MESSAGE_TYPES.TABLE_EXPORT_CLIPBOARD_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.IMAGE_SCAN_REQUEST) {
        const result = await scanActiveTabImages({
          chromeApi: chrome,
          permissionManager
        });
        sendResponse({
          type: MESSAGE_TYPES.IMAGE_SCAN_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.IMAGE_DOWNLOAD_REQUEST) {
        const images = Array.isArray(message?.payload?.images) ? message.payload.images : [];
        const result = await downloadImages({
          chromeApi: chrome,
          permissionManager,
          images,
          namingPattern: message?.payload?.namingPattern || "image_{index}_{width}x{height}.{ext}",
          onProgress(progressPayload) {
            safeSendRuntimeMessage({
              type: MESSAGE_TYPES.IMAGE_DOWNLOAD_PROGRESS_EVENT,
              payload: progressPayload
            });
          }
        });
        sendResponse({
          type: MESSAGE_TYPES.IMAGE_DOWNLOAD_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.ACTIVATION_SESSION_GET_REQUEST) {
        const result = await getActivationSession({
          chromeApi: chrome
        });
        sendResponse({
          type: MESSAGE_TYPES.ACTIVATION_SESSION_GET_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.ACTIVATION_CONFIG_SET_REQUEST) {
        const result = await setActivationConfig({
          chromeApi: chrome,
          apiBaseUrl: message?.payload?.apiBaseUrl,
          deviceName: message?.payload?.deviceName,
          licenseKey: message?.payload?.licenseKey
        });
        sendResponse({
          type: MESSAGE_TYPES.ACTIVATION_CONFIG_SET_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.ACTIVATION_AUTH_REGISTER_REQUEST) {
        const result = await activationRegister({
          chromeApi: chrome,
          permissionManager,
          apiBaseUrl: message?.payload?.apiBaseUrl,
          email: message?.payload?.email,
          password: message?.payload?.password,
          displayName: message?.payload?.displayName
        });
        sendResponse({
          type: MESSAGE_TYPES.ACTIVATION_AUTH_REGISTER_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.ACTIVATION_AUTH_LOGIN_REQUEST) {
        const result = await activationLogin({
          chromeApi: chrome,
          permissionManager,
          apiBaseUrl: message?.payload?.apiBaseUrl,
          email: message?.payload?.email,
          password: message?.payload?.password,
          deviceName: message?.payload?.deviceName
        });
        sendResponse({
          type: MESSAGE_TYPES.ACTIVATION_AUTH_LOGIN_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.ACTIVATION_AUTH_LOGOUT_REQUEST) {
        const result = await activationLogout({
          chromeApi: chrome,
          permissionManager
        });
        sendResponse({
          type: MESSAGE_TYPES.ACTIVATION_AUTH_LOGOUT_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.ACTIVATION_AUTH_REFRESH_PROFILE_REQUEST) {
        const result = await activationRefreshProfile({
          chromeApi: chrome,
          permissionManager
        });
        sendResponse({
          type: MESSAGE_TYPES.ACTIVATION_AUTH_REFRESH_PROFILE_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.ACTIVATION_LICENSE_REGISTER_REQUEST) {
        const result = await activationRegisterLicense({
          chromeApi: chrome,
          permissionManager,
          licenseKey: message?.payload?.licenseKey
        });
        sendResponse({
          type: MESSAGE_TYPES.ACTIVATION_LICENSE_REGISTER_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.ACTIVATION_LICENSE_STATUS_REQUEST) {
        const result = await activationLicenseStatus({
          chromeApi: chrome,
          permissionManager
        });
        sendResponse({
          type: MESSAGE_TYPES.ACTIVATION_LICENSE_STATUS_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.ACTIVATION_DEVICE_VALIDATE_REQUEST) {
        const result = await activationValidateDevice({
          chromeApi: chrome,
          permissionManager,
          licenseKey: message?.payload?.licenseKey
        });
        sendResponse({
          type: MESSAGE_TYPES.ACTIVATION_DEVICE_VALIDATE_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.ACTIVATION_DEVICES_LIST_REQUEST) {
        const result = await activationListDevices({
          chromeApi: chrome,
          permissionManager,
          licenseKey: message?.payload?.licenseKey
        });
        sendResponse({
          type: MESSAGE_TYPES.ACTIVATION_DEVICES_LIST_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.ACTIVATION_DEVICE_REMOVE_REQUEST) {
        const result = await activationRemoveDevice({
          chromeApi: chrome,
          permissionManager,
          licenseKey: message?.payload?.licenseKey,
          deviceId: message?.payload?.deviceId
        });
        sendResponse({
          type: MESSAGE_TYPES.ACTIVATION_DEVICE_REMOVE_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.ACTIVATION_DEVICE_RENAME_REQUEST) {
        const result = await activationRenameDevice({
          chromeApi: chrome,
          permissionManager,
          licenseKey: message?.payload?.licenseKey,
          deviceId: message?.payload?.deviceId,
          deviceName: message?.payload?.deviceName
        });
        sendResponse({
          type: MESSAGE_TYPES.ACTIVATION_DEVICE_RENAME_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.ACTIVATION_CLOUD_POLICY_GET_REQUEST) {
        const result = await activationGetCloudPolicy({
          chromeApi: chrome,
          permissionManager
        });
        sendResponse({
          type: MESSAGE_TYPES.ACTIVATION_CLOUD_POLICY_GET_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.ACTIVATION_CLOUD_POLICY_SET_REQUEST) {
        const result = await activationSetCloudPolicy({
          chromeApi: chrome,
          permissionManager,
          cloudFeaturesOptIn: message?.payload?.cloudFeaturesOptIn,
          webhookDeliveryOptIn: message?.payload?.webhookDeliveryOptIn,
          consentVersion: message?.payload?.consentVersion
        });
        sendResponse({
          type: MESSAGE_TYPES.ACTIVATION_CLOUD_POLICY_SET_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.ACTIVATION_INTEGRATIONS_LIST_REQUEST) {
        const result = await activationListIntegrationSecrets({
          chromeApi: chrome,
          permissionManager
        });
        sendResponse({
          type: MESSAGE_TYPES.ACTIVATION_INTEGRATIONS_LIST_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.ACTIVATION_INTEGRATIONS_UPSERT_REQUEST) {
        const result = await activationUpsertIntegrationSecret({
          chromeApi: chrome,
          permissionManager,
          provider: message?.payload?.provider,
          secretName: message?.payload?.secretName,
          secretValue: message?.payload?.secretValue,
          label: message?.payload?.label
        });
        sendResponse({
          type: MESSAGE_TYPES.ACTIVATION_INTEGRATIONS_UPSERT_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.ACTIVATION_INTEGRATIONS_TEST_REQUEST) {
        const result = await activationTestIntegrationSecret({
          chromeApi: chrome,
          permissionManager,
          provider: message?.payload?.provider,
          secretName: message?.payload?.secretName,
          targetUrl: message?.payload?.targetUrl,
          method: message?.payload?.method,
          timeoutMs: message?.payload?.timeoutMs,
          secretPlacement: message?.payload?.secretPlacement,
          headerName: message?.payload?.headerName,
          headers: message?.payload?.headers,
          body: message?.payload?.body
        });
        sendResponse({
          type: MESSAGE_TYPES.ACTIVATION_INTEGRATIONS_TEST_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.ACTIVATION_INTEGRATIONS_REMOVE_REQUEST) {
        const result = await activationRemoveIntegrationSecret({
          chromeApi: chrome,
          permissionManager,
          id: message?.payload?.id,
          provider: message?.payload?.provider,
          secretName: message?.payload?.secretName
        });
        sendResponse({
          type: MESSAGE_TYPES.ACTIVATION_INTEGRATIONS_REMOVE_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.ACTIVATION_JOBS_POLICY_REQUEST) {
        const result = await activationGetJobsPolicy({
          chromeApi: chrome,
          permissionManager
        });
        sendResponse({
          type: MESSAGE_TYPES.ACTIVATION_JOBS_POLICY_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.ACTIVATION_JOBS_ENQUEUE_REQUEST) {
        const result = await activationEnqueueJob({
          chromeApi: chrome,
          permissionManager,
          jobType: message?.payload?.jobType,
          payload: message?.payload?.payload,
          maxAttempts: message?.payload?.maxAttempts
        });
        sendResponse({
          type: MESSAGE_TYPES.ACTIVATION_JOBS_ENQUEUE_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.ACTIVATION_JOBS_LIST_REQUEST) {
        const result = await activationListJobs({
          chromeApi: chrome,
          permissionManager,
          status: message?.payload?.status,
          limit: message?.payload?.limit
        });
        sendResponse({
          type: MESSAGE_TYPES.ACTIVATION_JOBS_LIST_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.ACTIVATION_JOBS_DEAD_LIST_REQUEST) {
        const result = await activationListDeadLetterJobs({
          chromeApi: chrome,
          permissionManager,
          limit: message?.payload?.limit
        });
        sendResponse({
          type: MESSAGE_TYPES.ACTIVATION_JOBS_DEAD_LIST_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.ACTIVATION_JOBS_CANCEL_REQUEST) {
        const result = await activationCancelJob({
          chromeApi: chrome,
          permissionManager,
          jobId: message?.payload?.jobId
        });
        sendResponse({
          type: MESSAGE_TYPES.ACTIVATION_JOBS_CANCEL_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.ACTIVATION_SCHEDULES_LIST_REQUEST) {
        const result = await activationListSchedules({
          chromeApi: chrome,
          permissionManager,
          activeOnly: message?.payload?.activeOnly,
          limit: message?.payload?.limit
        });
        sendResponse({
          type: MESSAGE_TYPES.ACTIVATION_SCHEDULES_LIST_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.ACTIVATION_SCHEDULES_CREATE_REQUEST) {
        const result = await activationCreateSchedule({
          chromeApi: chrome,
          permissionManager,
          input: message?.payload?.input
        });
        sendResponse({
          type: MESSAGE_TYPES.ACTIVATION_SCHEDULES_CREATE_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.ACTIVATION_SCHEDULES_UPDATE_REQUEST) {
        const result = await activationUpdateSchedule({
          chromeApi: chrome,
          permissionManager,
          scheduleId: message?.payload?.scheduleId,
          updates: message?.payload?.updates
        });
        sendResponse({
          type: MESSAGE_TYPES.ACTIVATION_SCHEDULES_UPDATE_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.ACTIVATION_SCHEDULES_TOGGLE_REQUEST) {
        const result = await activationToggleSchedule({
          chromeApi: chrome,
          permissionManager,
          scheduleId: message?.payload?.scheduleId,
          isActive: message?.payload?.isActive
        });
        sendResponse({
          type: MESSAGE_TYPES.ACTIVATION_SCHEDULES_TOGGLE_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.ACTIVATION_SCHEDULES_REMOVE_REQUEST) {
        const result = await activationRemoveSchedule({
          chromeApi: chrome,
          permissionManager,
          scheduleId: message?.payload?.scheduleId
        });
        sendResponse({
          type: MESSAGE_TYPES.ACTIVATION_SCHEDULES_REMOVE_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.ACTIVATION_SCHEDULES_RUN_NOW_REQUEST) {
        const result = await activationRunScheduleNow({
          chromeApi: chrome,
          permissionManager,
          scheduleId: message?.payload?.scheduleId
        });
        sendResponse({
          type: MESSAGE_TYPES.ACTIVATION_SCHEDULES_RUN_NOW_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.ACTIVATION_OBSERVABILITY_DASHBOARD_REQUEST) {
        const result = await activationGetObservabilityDashboard({
          chromeApi: chrome,
          permissionManager,
          observabilityApiKey: message?.payload?.observabilityApiKey
        });
        sendResponse({
          type: MESSAGE_TYPES.ACTIVATION_OBSERVABILITY_DASHBOARD_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.ACTIVATION_OBSERVABILITY_SLO_REQUEST) {
        const result = await activationGetObservabilitySlo({
          chromeApi: chrome,
          permissionManager,
          observabilityApiKey: message?.payload?.observabilityApiKey
        });
        sendResponse({
          type: MESSAGE_TYPES.ACTIVATION_OBSERVABILITY_SLO_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.ACTIVATION_OBSERVABILITY_ERRORS_REQUEST) {
        const result = await activationListObservabilityErrors({
          chromeApi: chrome,
          permissionManager,
          limit: message?.payload?.limit,
          observabilityApiKey: message?.payload?.observabilityApiKey
        });
        sendResponse({
          type: MESSAGE_TYPES.ACTIVATION_OBSERVABILITY_ERRORS_RESPONSE,
          payload: result
        });
        return;
      }

      if (type === MESSAGE_TYPES.ACTIVATION_OBSERVABILITY_JOBS_REQUEST) {
        const result = await activationGetObservabilityJobs({
          chromeApi: chrome,
          permissionManager,
          observabilityApiKey: message?.payload?.observabilityApiKey
        });
        sendResponse({
          type: MESSAGE_TYPES.ACTIVATION_OBSERVABILITY_JOBS_RESPONSE,
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
