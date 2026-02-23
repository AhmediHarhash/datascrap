import {
  AUTOMATION_EVENT_TYPES,
  AUTOMATION_STATES,
  LOAD_MORE_METHODS,
  PICKER_MODES,
  RUNNER_TYPES
} from "../vendor/shared/src/events.mjs";
import { MESSAGE_TYPES } from "../vendor/shared/src/messages.mjs";

const elements = {
  runnerType: document.getElementById("runner-type"),
  startUrl: document.getElementById("start-url"),
  bulkUrlsField: document.getElementById("bulk-urls-field"),
  bulkUrls: document.getElementById("bulk-urls"),
  startBtn: document.getElementById("start-btn"),
  stopBtn: document.getElementById("stop-btn"),
  rerunBtn: document.getElementById("rerun-btn"),
  statusPill: document.getElementById("status-pill"),
  eventLog: document.getElementById("event-log"),
  clearLogBtn: document.getElementById("clear-log-btn"),
  pickerStatus: document.getElementById("picker-status"),
  listConfigPanel: document.getElementById("list-config-panel"),
  containerSelector: document.getElementById("container-selector"),
  pickContainerBtn: document.getElementById("pick-container-btn"),
  fieldList: document.getElementById("field-list"),
  pickFieldsBtn: document.getElementById("pick-fields-btn"),
  clearFieldsBtn: document.getElementById("clear-fields-btn"),
  loadMoreMethod: document.getElementById("load-more-method"),
  speedProfile: document.getElementById("speed-profile"),
  loadMoreAttempts: document.getElementById("load-more-attempts"),
  loadMoreDelayMs: document.getElementById("load-more-delay-ms"),
  loadMoreScrollPx: document.getElementById("load-more-scroll-px"),
  loadMoreNoChangeThreshold: document.getElementById("load-more-no-change-threshold"),
  loadMoreButtonSelector: document.getElementById("load-more-button-selector"),
  pickLoadMoreBtn: document.getElementById("pick-load-more-btn"),
  loadMoreNextSelector: document.getElementById("load-more-next-selector")
};

const state = {
  currentAutomationId: null,
  lastTerminalAutomationId: null,
  currentStatus: AUTOMATION_STATES.IDLE,
  selectedFields: [],
  pickerSessionPurposeById: new Map(),
  runnerCatalog: []
};

function randomId(prefix = "id") {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function appendLog(line, payload = null) {
  const timestamp = new Date().toISOString();
  const text = payload ? `${timestamp} ${line}\n${JSON.stringify(payload, null, 2)}` : `${timestamp} ${line}`;
  const next = elements.eventLog.textContent ? `${elements.eventLog.textContent}\n${text}` : text;
  elements.eventLog.textContent = next;
  elements.eventLog.scrollTop = elements.eventLog.scrollHeight;
}

function setPickerStatus(text) {
  elements.pickerStatus.textContent = `picker: ${text}`;
}

function setStatus(status) {
  state.currentStatus = String(status || AUTOMATION_STATES.IDLE);
  elements.statusPill.textContent = state.currentStatus;
  elements.statusPill.classList.toggle(
    "status-running",
    state.currentStatus === AUTOMATION_STATES.RUNNING || state.currentStatus === AUTOMATION_STATES.STOPPING
  );
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

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeFieldName(value, index) {
  const fallback = `field_${index + 1}`;
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "") || fallback;
}

function preferredExtractMode(selection) {
  const hints = Array.isArray(selection?.attributeHints) ? selection.attributeHints : [];
  if (hints.some((hint) => hint.mode === "image_url")) return "image_url";
  if (hints.some((hint) => hint.mode === "link_url")) return "link_url";
  return "text";
}

function createFieldFromSelection(selection, index) {
  const preview = String(selection?.textPreview || "").trim();
  const baseName = preview
    ? preview
        .toLowerCase()
        .replace(/[^a-z0-9 ]+/g, " ")
        .trim()
        .split(/\s+/)
        .slice(0, 3)
        .join("_")
    : "";
  const name = normalizeFieldName(baseName || `field_${state.selectedFields.length + index + 1}`, state.selectedFields.length + index);
  const extractMode = preferredExtractMode(selection);

  const attributeHint = (Array.isArray(selection?.attributeHints) ? selection.attributeHints : []).find(
    (hint) => hint.mode === "attribute" && hint.attribute
  );

  return {
    id: randomId("field"),
    name,
    selector: String(selection?.selector || "").trim(),
    relativeSelector: String(selection?.relativeSelector || "").trim(),
    extractMode,
    attribute: attributeHint?.attribute || ""
  };
}

function renderFieldList() {
  elements.fieldList.innerHTML = "";
  if (state.selectedFields.length === 0) {
    const empty = document.createElement("div");
    empty.className = "field-empty";
    empty.textContent = "No fields selected yet.";
    elements.fieldList.appendChild(empty);
    return;
  }

  for (const field of state.selectedFields) {
    const wrapper = document.createElement("div");
    wrapper.className = "field-item";

    const header = document.createElement("div");
    header.className = "field-item-head";

    const nameInput = document.createElement("input");
    nameInput.className = "field-name-input";
    nameInput.value = field.name;
    nameInput.placeholder = "field_name";
    nameInput.addEventListener("input", () => {
      field.name = normalizeFieldName(nameInput.value, 0);
    });

    const removeButton = document.createElement("button");
    removeButton.className = "btn btn-ghost";
    removeButton.type = "button";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => {
      state.selectedFields = state.selectedFields.filter((item) => item.id !== field.id);
      renderFieldList();
    });

    header.appendChild(nameInput);
    header.appendChild(removeButton);

    const modeSelect = document.createElement("select");
    modeSelect.innerHTML = `
      <option value="text">text</option>
      <option value="link_url">link_url</option>
      <option value="image_url">image_url</option>
      <option value="attribute">attribute</option>
    `;
    modeSelect.value = field.extractMode || "text";
    modeSelect.addEventListener("change", () => {
      field.extractMode = modeSelect.value;
      renderFieldList();
    });

    const modeLabel = document.createElement("label");
    modeLabel.className = "field";
    modeLabel.innerHTML = "<span>Extract Mode</span>";
    modeLabel.appendChild(modeSelect);

    wrapper.appendChild(header);
    wrapper.appendChild(modeLabel);

    if (field.extractMode === "attribute") {
      const attrInput = document.createElement("input");
      attrInput.className = "field-name-input";
      attrInput.placeholder = "attribute name (e.g. data-id)";
      attrInput.value = field.attribute || "";
      attrInput.addEventListener("input", () => {
        field.attribute = attrInput.value.trim();
      });

      const attrLabel = document.createElement("label");
      attrLabel.className = "field";
      attrLabel.innerHTML = "<span>Attribute</span>";
      attrLabel.appendChild(attrInput);
      wrapper.appendChild(attrLabel);
    }

    const selectorLine = document.createElement("div");
    selectorLine.className = "field-meta";
    selectorLine.textContent = `selector: ${field.selector}`;
    wrapper.appendChild(selectorLine);

    if (field.relativeSelector) {
      const relativeLine = document.createElement("div");
      relativeLine.className = "field-meta";
      relativeLine.textContent = `relative: ${field.relativeSelector}`;
      wrapper.appendChild(relativeLine);
    }

    elements.fieldList.appendChild(wrapper);
  }
}

function applySpeedProfileDefaults(profileName) {
  const profile = String(profileName || "normal").toLowerCase();
  if (profile === "fast") {
    elements.loadMoreAttempts.value = "3";
    elements.loadMoreDelayMs.value = "450";
    elements.loadMoreNoChangeThreshold.value = "1";
    return;
  }
  if (profile === "slow") {
    elements.loadMoreAttempts.value = "8";
    elements.loadMoreDelayMs.value = "1600";
    elements.loadMoreNoChangeThreshold.value = "3";
    return;
  }

  elements.loadMoreAttempts.value = "5";
  elements.loadMoreDelayMs.value = "900";
  elements.loadMoreNoChangeThreshold.value = "2";
}

function updateRunnerUi() {
  const runnerType = elements.runnerType.value;
  const isListRunner = runnerType === RUNNER_TYPES.LIST_EXTRACTOR;
  const isPageRunner = runnerType === RUNNER_TYPES.PAGE_EXTRACTOR;

  elements.listConfigPanel.style.display = isListRunner ? "grid" : "none";
  elements.bulkUrlsField.style.display = isPageRunner ? "grid" : "none";
}

async function hydrateRunnerCatalog() {
  const result = await sendMessage(MESSAGE_TYPES.LIST_RUNNERS_REQUEST);
  const runners = Array.isArray(result.runners) ? result.runners : [];
  state.runnerCatalog = runners;

  elements.runnerType.innerHTML = "";
  for (const runner of runners) {
    const option = document.createElement("option");
    option.value = runner.type;
    option.textContent = runner.label;
    elements.runnerType.append(option);
  }
  updateRunnerUi();
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

function applyPickerSessionResult(session, purpose) {
  const selections = Array.isArray(session?.selections) ? session.selections : [];
  if (purpose === "container" && selections.length > 0) {
    const selected = selections[0];
    elements.containerSelector.value = selected.selector || "";
    appendLog("container selected", selected);
    return;
  }

  if (purpose === "fields" && selections.length > 0) {
    const fields = selections.map((selection, index) => createFieldFromSelection(selection, index));
    state.selectedFields = [...state.selectedFields, ...fields];
    renderFieldList();
    appendLog("fields selected", {
      added: fields.length
    });
    return;
  }

  if (purpose === "load_more_button" && selections.length > 0) {
    elements.loadMoreButtonSelector.value = selections[0].selector || "";
    appendLog("load more button selected", selections[0]);
  }
}

function handlePickerEvent(payload) {
  const eventType = String(payload?.eventType || "").trim();
  const session = payload?.session || null;
  if (!session?.sessionId) return;

  const purpose = state.pickerSessionPurposeById.get(session.sessionId);
  if (eventType === "started") {
    setPickerStatus(`${session.mode} running`);
    appendLog("picker started", {
      sessionId: session.sessionId,
      mode: session.mode
    });
    return;
  }

  if (eventType === "progress") {
    setPickerStatus(`${session.mode} selecting (${session.selections.length})`);
    return;
  }

  if (eventType === "completed") {
    setPickerStatus("completed");
    appendLog("picker completed", {
      sessionId: session.sessionId,
      count: session.selections.length
    });
    if (purpose) {
      applyPickerSessionResult(session, purpose);
    }
    state.pickerSessionPurposeById.delete(session.sessionId);
    return;
  }

  if (eventType === "canceled") {
    setPickerStatus("canceled");
    appendLog("picker canceled", {
      sessionId: session.sessionId
    });
    state.pickerSessionPurposeById.delete(session.sessionId);
    return;
  }

  if (eventType === "error") {
    setPickerStatus("error");
    appendLog("picker error", session);
    state.pickerSessionPurposeById.delete(session.sessionId);
  }
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

function buildListAutomationConfig() {
  const startUrl = String(elements.startUrl.value || "").trim();
  const containerSelector = String(elements.containerSelector.value || "").trim();
  if (!containerSelector) {
    throw new Error("Container selector is required for list extraction");
  }
  if (state.selectedFields.length === 0) {
    throw new Error("Select at least one field before starting list extraction");
  }

  const fields = state.selectedFields.map((field, index) => ({
    name: normalizeFieldName(field.name, index),
    selector: String(field.selector || "").trim(),
    relativeSelector: String(field.relativeSelector || "").trim(),
    extractMode: field.extractMode || "text",
    attribute: String(field.attribute || "").trim()
  }));

  const method = String(elements.loadMoreMethod.value || LOAD_MORE_METHODS.NONE).trim();
  return {
    startUrl,
    speedProfile: String(elements.speedProfile.value || "normal"),
    actions: [
      {
        type: "EXTRACT_LIST",
        containerSelector,
        fields
      },
      {
        type: "LOAD_MORE",
        method,
        attempts: parseNumber(elements.loadMoreAttempts.value, 5),
        delayMs: parseNumber(elements.loadMoreDelayMs.value, 900),
        scrollPx: parseNumber(elements.loadMoreScrollPx.value, 1800),
        noChangeThreshold: parseNumber(elements.loadMoreNoChangeThreshold.value, 2),
        buttonSelector: String(elements.loadMoreButtonSelector.value || "").trim(),
        nextLinkSelector: String(elements.loadMoreNextSelector.value || "").trim()
      }
    ]
  };
}

function buildPageAutomationConfig() {
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

async function startPicker({ mode, multiSelect, anchorSelector = "", prompt = "", purpose }) {
  try {
    const response = await sendMessage(MESSAGE_TYPES.PICKER_START_REQUEST, {
      mode,
      multiSelect,
      anchorSelector,
      prompt
    });
    const session = response?.session || null;
    if (!session?.sessionId) {
      throw new Error("Picker did not return session id");
    }
    state.pickerSessionPurposeById.set(session.sessionId, purpose);
    setPickerStatus(`${mode} requested`);
    appendLog("picker request accepted", {
      mode,
      sessionId: session.sessionId
    });
  } catch (error) {
    setPickerStatus("error");
    appendLog(`picker start failed: ${error.message}`);
  }
}

async function onStart() {
  try {
    const runnerType = elements.runnerType.value;
    const config =
      runnerType === RUNNER_TYPES.LIST_EXTRACTOR
        ? buildListAutomationConfig()
        : buildPageAutomationConfig();

    const payload = await sendMessage(MESSAGE_TYPES.START_REQUEST, {
      runnerType,
      config
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

elements.runnerType.addEventListener("change", updateRunnerUi);
elements.speedProfile.addEventListener("change", () => {
  applySpeedProfileDefaults(elements.speedProfile.value);
});
elements.startBtn.addEventListener("click", onStart);
elements.stopBtn.addEventListener("click", onStop);
elements.rerunBtn.addEventListener("click", onRerun);
elements.clearFieldsBtn.addEventListener("click", () => {
  state.selectedFields = [];
  renderFieldList();
});
elements.clearLogBtn.addEventListener("click", () => {
  elements.eventLog.textContent = "";
});

elements.pickContainerBtn.addEventListener("click", () => {
  void startPicker({
    mode: PICKER_MODES.CONTAINER,
    multiSelect: false,
    prompt: "Click one repeating row container element.",
    purpose: "container"
  });
});

elements.pickFieldsBtn.addEventListener("click", () => {
  const anchorSelector = String(elements.containerSelector.value || "").trim();
  void startPicker({
    mode: PICKER_MODES.FIELD,
    multiSelect: true,
    anchorSelector,
    prompt: "Click fields inside the container, then press Finish.",
    purpose: "fields"
  });
});

elements.pickLoadMoreBtn.addEventListener("click", () => {
  void startPicker({
    mode: PICKER_MODES.LOAD_MORE_BUTTON,
    multiSelect: false,
    prompt: "Click the Load More button.",
    purpose: "load_more_button"
  });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === MESSAGE_TYPES.EVENT) {
    handleRuntimeEvent(message.payload || {});
    return;
  }
  if (message?.type === MESSAGE_TYPES.PICKER_EVENT) {
    handlePickerEvent(message.payload || {});
  }
});

renderFieldList();
setPickerStatus("idle");
applySpeedProfileDefaults("normal");
await hydrateRunnerCatalog();
await hydrateSnapshot();
