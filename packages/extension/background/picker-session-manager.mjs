import { createId } from "../vendor/core/src/utils.mjs";
import { executeInTab, getActiveTab, sendTabMessage } from "./chrome-utils.mjs";

const PICKER_MESSAGE_TYPES = Object.freeze({
  START: "datascrap.picker.start",
  CANCEL: "datascrap.picker.cancel",
  PROGRESS: "datascrap.picker.session.progress",
  COMPLETED: "datascrap.picker.session.completed",
  CANCELED: "datascrap.picker.session.canceled"
});

function cloneSession(session) {
  return {
    sessionId: session.sessionId,
    tabId: session.tabId,
    mode: session.mode,
    status: session.status,
    multiSelect: session.multiSelect,
    anchorSelector: session.anchorSelector,
    selections: [...(session.selections || [])],
    startedAt: session.startedAt,
    updatedAt: session.updatedAt,
    completedAt: session.completedAt || null,
    error: session.error || null
  };
}

function nowIso() {
  return new Date().toISOString();
}

export function createPickerSessionManager({
  chromeApi = chrome,
  onSessionEvent = () => {}
} = {}) {
  const sessions = new Map();

  async function ensurePickerInjected(tabId) {
    await executeInTab({
      tabId,
      files: ["content/picker-overlay.js"],
      chromeApi
    });
  }

  function emitSessionEvent(eventType, session) {
    onSessionEvent(eventType, cloneSession(session));
  }

  return {
    async startSession({
      mode,
      multiSelect = false,
      anchorSelector = "",
      prompt = ""
    }) {
      const tab = await getActiveTab(chromeApi);
      if (!tab?.id) {
        throw new Error("No active tab found for picker session");
      }

      const sessionId = createId("picker");
      const session = {
        sessionId,
        tabId: tab.id,
        mode: String(mode || "").trim(),
        status: "starting",
        multiSelect: Boolean(multiSelect),
        anchorSelector: String(anchorSelector || "").trim(),
        selections: [],
        startedAt: nowIso(),
        updatedAt: nowIso(),
        completedAt: null,
        error: null
      };
      sessions.set(sessionId, session);

      try {
        await ensurePickerInjected(tab.id);
        await sendTabMessage({
          tabId: tab.id,
          message: {
            type: PICKER_MESSAGE_TYPES.START,
            payload: {
              sessionId,
              mode: session.mode,
              multiSelect: session.multiSelect,
              anchorSelector: session.anchorSelector,
              prompt: String(prompt || "").trim()
            }
          },
          chromeApi
        });
        session.status = "running";
        session.updatedAt = nowIso();
        emitSessionEvent("started", session);
      } catch (error) {
        session.status = "error";
        session.error = error.message || "Failed to start picker";
        session.updatedAt = nowIso();
        emitSessionEvent("error", session);
        throw error;
      }

      return cloneSession(session);
    },

    async cancelSession(sessionId) {
      const session = sessions.get(sessionId);
      if (!session) {
        return null;
      }

      if (session.status !== "running" && session.status !== "starting") {
        return cloneSession(session);
      }

      try {
        await sendTabMessage({
          tabId: session.tabId,
          message: {
            type: PICKER_MESSAGE_TYPES.CANCEL,
            payload: {
              sessionId
            }
          },
          chromeApi
        });
      } catch (_error) {
        // Tab might be gone; still mark as canceled.
      }

      session.status = "canceled";
      session.updatedAt = nowIso();
      session.completedAt = nowIso();
      emitSessionEvent("canceled", session);
      return cloneSession(session);
    },

    getSession(sessionId) {
      const session = sessions.get(sessionId);
      if (!session) return null;
      return cloneSession(session);
    },

    handleIncomingMessage(message) {
      const type = String(message?.type || "").trim();
      if (
        type !== PICKER_MESSAGE_TYPES.PROGRESS &&
        type !== PICKER_MESSAGE_TYPES.COMPLETED &&
        type !== PICKER_MESSAGE_TYPES.CANCELED
      ) {
        return {
          handled: false
        };
      }

      const sessionId = String(message?.payload?.sessionId || "").trim();
      if (!sessionId || !sessions.has(sessionId)) {
        return {
          handled: true,
          session: null
        };
      }

      const session = sessions.get(sessionId);
      const incomingSelections = Array.isArray(message?.payload?.selections) ? message.payload.selections : [];
      if (incomingSelections.length > 0) {
        session.selections = incomingSelections;
      }

      session.updatedAt = nowIso();
      if (type === PICKER_MESSAGE_TYPES.PROGRESS) {
        session.status = "running";
        emitSessionEvent("progress", session);
      } else if (type === PICKER_MESSAGE_TYPES.COMPLETED) {
        session.status = "completed";
        session.completedAt = nowIso();
        emitSessionEvent("completed", session);
      } else if (type === PICKER_MESSAGE_TYPES.CANCELED) {
        session.status = "canceled";
        session.completedAt = nowIso();
        emitSessionEvent("canceled", session);
      }

      return {
        handled: true,
        session: cloneSession(session)
      };
    }
  };
}
