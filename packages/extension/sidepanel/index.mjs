import { AUTOMATION_EVENT_TYPES, AUTOMATION_STATES } from "../vendor/shared/src/events.mjs";
import { MESSAGE_TYPES } from "../vendor/shared/src/messages.mjs";

const elements = {
  runnerType: document.getElementById("runner-type"),
  startUrl: document.getElementById("start-url"),
  bulkUrls: document.getElementById("bulk-urls"),
  startBtn: document.getElementById("start-btn"),
  stopBtn: document.getElementById("stop-btn"),
  rerunBtn: document.getElementById("rerun-btn"),
  statusPill: document.getElementById("status-pill"),
  eventLog: document.getElementById("event-log"),
  clearLogBtn: document.getElementById("clear-log-btn")
};

const state = {
  currentAutomationId: null,
  lastTerminalAutomationId: null,
  currentStatus: AUTOMATION_STATES.IDLE
};

function appendLog(line, payload = null) {
  const timestamp = new Date().toISOString();
  const text = payload ? `${timestamp} ${line}\n${JSON.stringify(payload, null, 2)}` : `${timestamp} ${line}`;
  const next = elements.eventLog.textContent ? `${elements.eventLog.textContent}\n${text}` : text;
  elements.eventLog.textContent = next;
  elements.eventLog.scrollTop = elements.eventLog.scrollHeight;
}

function setStatus(status) {
  state.currentStatus = String(status || AUTOMATION_STATES.IDLE);
  elements.statusPill.textContent = state.currentStatus;
  elements.statusPill.classList.toggle("status-running", state.currentStatus === AUTOMATION_STATES.RUNNING || state.currentStatus === AUTOMATION_STATES.STOPPING);
  elements.statusPill.classList.toggle("status-error", state.currentStatus === AUTOMATION_STATES.ERROR);
}

function sendMessage(type, payload = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, payload }, (response) => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message || "Failed to send message"));
        return;
      }

      if (!response) {
        reject(new Error("No response from background"));
        return;
      }

      if (response.type === MESSAGE_TYPES.ERROR) {
        reject(new Error(response.payload?.message || "Background error"));
        return;
      }

      resolve(response.payload || {});
    });
  });
}

function getPayloadConfig() {
  const startUrl = String(elements.startUrl.value || "").trim();
  const urls = String(elements.bulkUrls.value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    startUrl,
    urls,
    stepDelayMs: 260
  };
}

async function hydrateRunnerCatalog() {
  const result = await sendMessage(MESSAGE_TYPES.LIST_RUNNERS_REQUEST);
  const runners = Array.isArray(result.runners) ? result.runners : [];
  elements.runnerType.innerHTML = "";
  for (const runner of runners) {
    const option = document.createElement("option");
    option.value = runner.type;
    option.textContent = runner.label;
    elements.runnerType.append(option);
  }
}

function resolveStatusFromEvent(eventPayload) {
  const eventType = eventPayload.eventType;
  if (eventType === AUTOMATION_EVENT_TYPES.STARTED) return AUTOMATION_STATES.RUNNING;
  if (eventType === AUTOMATION_EVENT_TYPES.STOP_REQUESTED) return AUTOMATION_STATES.STOPPING;
  if (eventType === AUTOMATION_EVENT_TYPES.STOPPED) return AUTOMATION_STATES.STOPPED;
  if (eventType === AUTOMATION_EVENT_TYPES.COMPLETED) return AUTOMATION_STATES.COMPLETED;
  if (eventType === AUTOMATION_EVENT_TYPES.FAILED) return AUTOMATION_STATES.ERROR;
  return state.currentStatus;
}

function handleRuntimeEvent(eventPayload) {
  const automationId = eventPayload?.payload?.automationId || null;
  if (automationId) {
    state.currentAutomationId = automationId;
  }

  const nextStatus = resolveStatusFromEvent(eventPayload);
  setStatus(nextStatus);

  if (
    nextStatus === AUTOMATION_STATES.COMPLETED ||
    nextStatus === AUTOMATION_STATES.STOPPED ||
    nextStatus === AUTOMATION_STATES.ERROR
  ) {
    state.lastTerminalAutomationId = automationId || state.lastTerminalAutomationId;
  }

  appendLog(`event: ${eventPayload.eventType}`, eventPayload.payload || {});
}

async function hydrateSnapshot() {
  const snapshot = await sendMessage(MESSAGE_TYPES.SNAPSHOT_REQUEST);
  const events = Array.isArray(snapshot.recentEvents) ? snapshot.recentEvents : [];
  if (events.length > 0) {
    for (const event of events.slice(-20)) {
      appendLog(`snapshot: ${event.eventType}`, event.payload || {});
    }

    const lastEvent = events[events.length - 1];
    const automationId = lastEvent?.payload?.automationId || null;
    state.currentAutomationId = automationId;
    if (automationId) {
      state.lastTerminalAutomationId = automationId;
    }
    setStatus(resolveStatusFromEvent(lastEvent));
    return;
  }

  setStatus(AUTOMATION_STATES.IDLE);
}

async function onStart() {
  try {
    const payload = await sendMessage(MESSAGE_TYPES.START_REQUEST, {
      runnerType: elements.runnerType.value,
      config: getPayloadConfig()
    });
    state.currentAutomationId = payload.automationId || null;
    appendLog("start accepted", payload);
  } catch (error) {
    appendLog(`start failed: ${error.message}`);
    setStatus(AUTOMATION_STATES.ERROR);
  }
}

async function onStop() {
  if (!state.currentAutomationId) {
    appendLog("stop ignored: no active automation id");
    return;
  }

  try {
    const payload = await sendMessage(MESSAGE_TYPES.STOP_REQUEST, {
      automationId: state.currentAutomationId
    });
    appendLog("stop requested", payload);
  } catch (error) {
    appendLog(`stop failed: ${error.message}`);
    setStatus(AUTOMATION_STATES.ERROR);
  }
}

async function onRerun() {
  const automationId = state.lastTerminalAutomationId || state.currentAutomationId;
  if (!automationId) {
    appendLog("rerun ignored: no automation id");
    return;
  }

  try {
    const payload = await sendMessage(MESSAGE_TYPES.RERUN_REQUEST, {
      automationId
    });
    state.currentAutomationId = payload.automationId || null;
    appendLog("rerun accepted", payload);
  } catch (error) {
    appendLog(`rerun failed: ${error.message}`);
    setStatus(AUTOMATION_STATES.ERROR);
  }
}

elements.startBtn.addEventListener("click", onStart);
elements.stopBtn.addEventListener("click", onStop);
elements.rerunBtn.addEventListener("click", onRerun);
elements.clearLogBtn.addEventListener("click", () => {
  elements.eventLog.textContent = "";
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === MESSAGE_TYPES.EVENT) {
    handleRuntimeEvent(message.payload || {});
  }
});

await hydrateRunnerCatalog();
await hydrateSnapshot();
