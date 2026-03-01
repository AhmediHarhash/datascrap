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

function queryTabs(queryInfo, chromeApi = chrome) {
  return new Promise((resolve, reject) => {
    chromeApi.tabs.query(queryInfo, (tabs) => {
      const lastError = chromeApi.runtime?.lastError;
      if (lastError) {
        reject(new Error(lastError.message || "Failed to query tabs"));
        return;
      }
      resolve(Array.isArray(tabs) ? tabs : []);
    });
  });
}

function isInjectablePickerTabUrl(url) {
  return /^https?:\/\//i.test(String(url || "").trim());
}

function normalizePickerUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return raw;
  }
}

function extractUrlHost(url) {
  try {
    return new URL(String(url || "").trim()).host || "";
  } catch {
    return "";
  }
}

function urlsShareOrigin(a, b) {
  try {
    const left = new URL(String(a || "").trim());
    const right = new URL(String(b || "").trim());
    return left.origin === right.origin;
  } catch {
    return false;
  }
}

function isEligibleTab(tab) {
  return Number.isFinite(Number(tab?.id)) && isInjectablePickerTabUrl(tab?.url);
}

function pickSessionTab({ activeTab, tabs, preferredUrl }) {
  const preferred = normalizePickerUrl(preferredUrl);
  const candidates = Array.isArray(tabs) ? tabs.filter(isEligibleTab) : [];

  if (preferred && candidates.length > 0) {
    const exactMatch = candidates.find((tab) => normalizePickerUrl(tab.url) === preferred);
    if (exactMatch) {
      return exactMatch;
    }
    const originMatch = candidates.find((tab) => urlsShareOrigin(tab.url, preferred));
    if (originMatch) {
      return originMatch;
    }
  }

  if (preferred) {
    if (isEligibleTab(activeTab) && urlsShareOrigin(activeTab.url, preferred)) {
      return activeTab;
    }
    return null;
  }

  if (isEligibleTab(activeTab)) {
    return activeTab;
  }

  if (candidates.length > 0) {
    return candidates[0];
  }

  return activeTab || null;
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
      prompt = "",
      preferredUrl = ""
    }) {
      const tab = await getActiveTab(chromeApi);
      const tabs = await queryTabs({ currentWindow: true }, chromeApi).catch(() => []);
      const selectedTab = pickSessionTab({
        activeTab: tab,
        tabs,
        preferredUrl
      });
      const preferredHost = extractUrlHost(preferredUrl);
      const preferredHostHint = preferredHost ? ` (${preferredHost})` : "";

      if (!selectedTab?.id) {
        if (String(preferredUrl || "").trim()) {
          throw new Error(`Open the target website tab${preferredHostHint} and retry Point & Follow.`);
        }
        throw new Error("No active tab found for picker session");
      }
      if (!isInjectablePickerTabUrl(selectedTab.url)) {
        throw new Error(`Open the target website tab${preferredHostHint} and retry Point & Follow.`);
      }

      const sessionId = createId("picker");
      const session = {
        sessionId,
        tabId: selectedTab.id,
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
        await ensurePickerInjected(selectedTab.id);
        await sendTabMessage({
          tabId: selectedTab.id,
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
