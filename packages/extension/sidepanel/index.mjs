import {
  AUTOMATION_EVENT_TYPES,
  AUTOMATION_STATES,
  LOAD_MORE_METHODS,
  PAGE_ACTION_TYPES,
  PICKER_MODES,
  RUNNER_TYPES,
  URL_SOURCE_MODES
} from "../vendor/shared/src/events.mjs";
import { MESSAGE_TYPES } from "../vendor/shared/src/messages.mjs";

const elements = {
  runnerType: document.getElementById("runner-type"),
  startUrl: document.getElementById("start-url"),
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
  loadMoreNextSelector: document.getElementById("load-more-next-selector"),

  pageConfigPanel: document.getElementById("page-config-panel"),
  pageUrlSourceMode: document.getElementById("page-url-source-mode"),
  pageActionType: document.getElementById("page-action-type"),
  pageManualUrlsField: document.getElementById("page-manual-urls-field"),
  pageManualUrls: document.getElementById("page-manual-urls"),
  pageCsvField: document.getElementById("page-csv-field"),
  pageCsvFile: document.getElementById("page-csv-file"),
  pageCsvCount: document.getElementById("page-csv-count"),
  pageDatasourceField: document.getElementById("page-datasource-field"),
  pageDatasourceSelect: document.getElementById("page-datasource-select"),
  refreshDatasourcesBtn: document.getElementById("refresh-datasources-btn"),
  loadDatasourceUrlsBtn: document.getElementById("load-datasource-urls-btn"),
  pageDatasourceColumnRow: document.getElementById("page-datasource-column-row"),
  pageDatasourceColumn: document.getElementById("page-datasource-column"),
  pageDatasourceCount: document.getElementById("page-datasource-count"),
  pageResolvedUrlsPreview: document.getElementById("page-resolved-urls-preview"),
  pageFieldsPanel: document.getElementById("page-fields-panel"),
  pageFieldList: document.getElementById("page-field-list"),
  pickPageFieldsBtn: document.getElementById("pick-page-fields-btn"),
  clearPageFieldsBtn: document.getElementById("clear-page-fields-btn"),
  queueConcurrency: document.getElementById("queue-concurrency"),
  queueDelayMs: document.getElementById("queue-delay-ms"),
  queuePageTimeoutMs: document.getElementById("queue-page-timeout-ms"),
  queueRetries: document.getElementById("queue-retries"),
  queueRetryDelayMs: document.getElementById("queue-retry-delay-ms"),
  queueJitterMs: document.getElementById("queue-jitter-ms"),
  queueWaitSelector: document.getElementById("queue-wait-selector"),
  queueWaitSelectorTimeoutMs: document.getElementById("queue-wait-selector-timeout-ms"),
  queueWaitPageLoad: document.getElementById("queue-wait-page-load"),

  tableRefreshBtn: document.getElementById("table-refresh-btn"),
  tableHistorySelect: document.getElementById("table-history-select"),
  tableLimit: document.getElementById("table-limit"),
  tableSearch: document.getElementById("table-search"),
  tableLoadBtn: document.getElementById("table-load-btn"),
  tableClearFilterBtn: document.getElementById("table-clear-filter-btn"),
  tableFilterColumn: document.getElementById("table-filter-column"),
  tableFilterValue: document.getElementById("table-filter-value"),
  tableRenameFrom: document.getElementById("table-rename-from"),
  tableRenameTo: document.getElementById("table-rename-to"),
  tableRenameBtn: document.getElementById("table-rename-btn"),
  tableDedupeBtn: document.getElementById("table-dedupe-btn"),
  tableStatusLine: document.getElementById("table-status-line"),
  tableGrid: document.getElementById("table-grid")
};

const state = {
  currentAutomationId: null,
  lastTerminalAutomationId: null,
  currentStatus: AUTOMATION_STATES.IDLE,
  pickerSessionPurposeById: new Map(),
  runnerCatalog: [],
  listFields: [],
  pageFields: [],
  csvUrls: [],
  dataSources: [],
  dataSourceColumns: [],
  dataSourceUrls: [],
  tableHistory: [],
  tableColumns: [],
  tableRows: [],
  activeTableDataId: null
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

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toCellText(value) {
  return String(value === undefined || value === null ? "" : value);
}

function normalizeColumnName(value, fallback = "") {
  const raw = String(value || "").trim().toLowerCase();
  const normalized = raw
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || fallback;
}

function formatRelativeTimestamp(value) {
  const iso = String(value || "").trim();
  if (!iso) return "unknown";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
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

function createFieldFromSelection(selection, targetListLength, index) {
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

  const name = normalizeFieldName(baseName || `field_${targetListLength + index + 1}`, targetListLength + index);
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

function setStatus(status) {
  state.currentStatus = String(status || AUTOMATION_STATES.IDLE);
  elements.statusPill.textContent = state.currentStatus;
  elements.statusPill.classList.toggle(
    "status-running",
    state.currentStatus === AUTOMATION_STATES.RUNNING || state.currentStatus === AUTOMATION_STATES.STOPPING
  );
  elements.statusPill.classList.toggle("status-error", state.currentStatus === AUTOMATION_STATES.ERROR);
}

function setPickerStatus(text) {
  elements.pickerStatus.textContent = `picker: ${text}`;
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

function renderFieldList({ target, fields }) {
  target.innerHTML = "";
  if (fields.length === 0) {
    const empty = document.createElement("div");
    empty.className = "field-empty";
    empty.textContent = "No fields selected yet.";
    target.appendChild(empty);
    return;
  }

  for (const field of fields) {
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
      const index = fields.findIndex((item) => item.id === field.id);
      if (index >= 0) {
        fields.splice(index, 1);
      }
      renderFieldList({
        target,
        fields
      });
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
      renderFieldList({
        target,
        fields
      });
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

    target.appendChild(wrapper);
  }
}

function renderListFields() {
  renderFieldList({
    target: elements.fieldList,
    fields: state.listFields
  });
}

function renderPageFields() {
  renderFieldList({
    target: elements.pageFieldList,
    fields: state.pageFields
  });
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
  elements.pageConfigPanel.style.display = isPageRunner ? "grid" : "none";
}

function updatePageSourceUi() {
  const mode = String(elements.pageUrlSourceMode.value || URL_SOURCE_MODES.MANUAL).trim();
  elements.pageManualUrlsField.style.display = mode === URL_SOURCE_MODES.MANUAL ? "grid" : "none";
  elements.pageCsvField.style.display = mode === URL_SOURCE_MODES.CSV ? "grid" : "none";
  const showDatasource = mode === URL_SOURCE_MODES.DATASOURCE;
  elements.pageDatasourceField.style.display = showDatasource ? "grid" : "none";
  elements.pageDatasourceColumnRow.style.display = showDatasource ? "grid" : "none";
}

function updatePageActionUi() {
  const actionType = String(elements.pageActionType.value || PAGE_ACTION_TYPES.EXTRACT_PAGES).trim();
  const isCustomFieldMode = actionType === PAGE_ACTION_TYPES.EXTRACT_PAGES;
  elements.pageFieldsPanel.style.display = isCustomFieldMode ? "grid" : "none";
}

function setResolvedUrlsPreview(urls) {
  const list = Array.isArray(urls) ? urls : [];
  elements.pageResolvedUrlsPreview.value = list.slice(0, 25).join("\n");
}

function setTableStatus(text, { error = false } = {}) {
  elements.tableStatusLine.textContent = String(text || "");
  elements.tableStatusLine.classList.toggle("status-error", Boolean(error));
}

function getSelectedTableDataId() {
  return String(elements.tableHistorySelect.value || "").trim();
}

function parseTableLimit() {
  return clamp(parseNumber(elements.tableLimit.value, 300), 20, 2000);
}

function renderTableHistoryOptions(items, preferredTableDataId = "") {
  const list = Array.isArray(items) ? items : [];
  const preferred = String(preferredTableDataId || "").trim();
  const current = getSelectedTableDataId();
  const desired = preferred || current || String(state.activeTableDataId || "");

  elements.tableHistorySelect.innerHTML = "";
  if (list.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No table history yet";
    elements.tableHistorySelect.append(option);
    state.activeTableDataId = null;
    return;
  }

  for (const item of list) {
    const tableDataId = String(item?.tableDataId || "").trim();
    if (!tableDataId) continue;
    const option = document.createElement("option");
    option.value = tableDataId;
    const runner = String(item?.runnerType || "unknown");
    const rowCount = Number(item?.rowCount || 0);
    const updatedAt = formatRelativeTimestamp(item?.updatedAt || item?.createdAt);
    option.textContent = `${tableDataId.slice(0, 8)}... | ${runner} | rows ${rowCount} | ${updatedAt}`;
    elements.tableHistorySelect.append(option);
  }

  const hasDesired = list.some((item) => String(item?.tableDataId || "").trim() === desired);
  if (hasDesired) {
    elements.tableHistorySelect.value = desired;
  }
  state.activeTableDataId = getSelectedTableDataId() || String(list[0]?.tableDataId || "").trim() || null;
}

function renderTableColumnOptions(columns) {
  const list = Array.isArray(columns) ? columns : [];
  const filterValue = String(elements.tableFilterColumn.value || "").trim();
  const renameValue = String(elements.tableRenameFrom.value || "").trim();
  state.tableColumns = list;

  elements.tableFilterColumn.innerHTML = "";
  const allColumnsOption = document.createElement("option");
  allColumnsOption.value = "";
  allColumnsOption.textContent = "All columns";
  elements.tableFilterColumn.append(allColumnsOption);

  elements.tableRenameFrom.innerHTML = "";
  const renamePlaceholder = document.createElement("option");
  renamePlaceholder.value = "";
  renamePlaceholder.textContent = "Select column";
  elements.tableRenameFrom.append(renamePlaceholder);

  for (const columnName of list) {
    const filterOption = document.createElement("option");
    filterOption.value = columnName;
    filterOption.textContent = columnName;
    elements.tableFilterColumn.append(filterOption);

    const renameOption = document.createElement("option");
    renameOption.value = columnName;
    renameOption.textContent = columnName;
    elements.tableRenameFrom.append(renameOption);
  }

  if (list.includes(filterValue)) {
    elements.tableFilterColumn.value = filterValue;
  }
  if (list.includes(renameValue)) {
    elements.tableRenameFrom.value = renameValue;
  }
}

async function onTableCellBlur(cell) {
  if (!(cell instanceof HTMLElement)) return;

  const tableDataId = String(state.activeTableDataId || "").trim();
  const dedupeKey = String(cell.dataset.rowKey || "").trim();
  const columnName = String(cell.dataset.columnName || "").trim();
  if (!tableDataId || !dedupeKey || !columnName) return;

  const previousValue = toCellText(cell.dataset.value || "");
  const nextValue = toCellText(cell.textContent || "");
  if (nextValue === previousValue || cell.dataset.saving === "1") return;

  cell.dataset.saving = "1";
  cell.style.opacity = "0.6";
  try {
    const response = await sendMessage(MESSAGE_TYPES.TABLE_UPDATE_CELL_REQUEST, {
      tableDataId,
      dedupeKey,
      columnName,
      value: nextValue
    });
    const committedValue = toCellText(response?.rowData?.[columnName] ?? nextValue);
    cell.textContent = committedValue;
    cell.dataset.value = committedValue;

    const targetRow = state.tableRows.find((item) => item?.dedupeKey === dedupeKey);
    if (targetRow) {
      targetRow.rowData = {
        ...(targetRow.rowData || {}),
        [columnName]: committedValue
      };
      targetRow.updatedAt = response?.updatedAt || new Date().toISOString();
    }

    setTableStatus(`Saved cell: ${columnName}`);
  } catch (error) {
    cell.textContent = previousValue;
    setTableStatus(`Cell update failed: ${error.message}`, {
      error: true
    });
    appendLog("table cell update failed", {
      tableDataId,
      dedupeKey,
      columnName,
      message: error.message
    });
  } finally {
    delete cell.dataset.saving;
    cell.style.opacity = "";
  }
}

function renderTableGrid(rows, columns) {
  const dataRows = Array.isArray(rows) ? rows : [];
  const dataColumns = Array.isArray(columns) ? columns : [];
  elements.tableGrid.innerHTML = "";

  if (dataRows.length === 0 || dataColumns.length === 0) {
    elements.tableGrid.className = "table-grid-empty";
    elements.tableGrid.textContent = "No rows found for this table and filter.";
    return;
  }

  elements.tableGrid.className = "";
  const table = document.createElement("table");
  table.className = "table-grid-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  const indexHead = document.createElement("th");
  indexHead.textContent = "#";
  headRow.append(indexHead);
  for (const columnName of dataColumns) {
    const th = document.createElement("th");
    th.textContent = columnName;
    headRow.append(th);
  }
  thead.append(headRow);
  table.append(thead);

  const tbody = document.createElement("tbody");
  dataRows.forEach((row, rowIndex) => {
    const tr = document.createElement("tr");
    if (row?.sourceUrl) {
      tr.title = `source: ${row.sourceUrl}`;
    }

    const indexCell = document.createElement("td");
    indexCell.className = "table-grid-meta";
    indexCell.textContent = String(rowIndex + 1);
    tr.append(indexCell);

    for (const columnName of dataColumns) {
      const td = document.createElement("td");
      td.className = "table-grid-cell";
      td.contentEditable = "true";
      td.spellcheck = false;
      const cellValue = toCellText(row?.rowData?.[columnName]);
      td.textContent = cellValue;
      td.dataset.value = cellValue;
      td.dataset.rowKey = String(row?.dedupeKey || "");
      td.dataset.columnName = columnName;
      td.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          td.blur();
        }
      });
      td.addEventListener("blur", () => {
        void onTableCellBlur(td);
      });
      tr.append(td);
    }

    tbody.append(tr);
  });
  table.append(tbody);
  elements.tableGrid.append(table);
}

async function hydrateTableHistory({ preserveSelection = true } = {}) {
  const preferredTableDataId = preserveSelection ? getSelectedTableDataId() || String(state.activeTableDataId || "") : "";
  const response = await sendMessage(MESSAGE_TYPES.TABLE_HISTORY_LIST_REQUEST, {
    limit: 160
  });
  const items = Array.isArray(response.items) ? response.items : [];
  state.tableHistory = items;
  renderTableHistoryOptions(items, preferredTableDataId);
}

async function loadSelectedTableRows({ silent = false } = {}) {
  const tableDataId = getSelectedTableDataId();
  if (!tableDataId) {
    state.activeTableDataId = null;
    state.tableRows = [];
    renderTableColumnOptions([]);
    renderTableGrid([], []);
    setTableStatus("No table selected");
    return;
  }

  state.activeTableDataId = tableDataId;
  if (!silent) {
    setTableStatus("Loading rows...");
  }

  const payload = {
    tableDataId,
    limit: parseTableLimit(),
    search: String(elements.tableSearch.value || "").trim(),
    filterColumn: String(elements.tableFilterColumn.value || "").trim(),
    filterValue: String(elements.tableFilterValue.value || "").trim()
  };

  try {
    const response = await sendMessage(MESSAGE_TYPES.TABLE_ROWS_REQUEST, payload);
    const rows = Array.isArray(response.rows) ? response.rows : [];
    const columns = Array.isArray(response.columns) ? response.columns : [];
    state.tableRows = rows;
    renderTableColumnOptions(columns);
    renderTableGrid(rows, columns);

    setTableStatus(
      `Rows loaded: ${Number(response.filteredRows || rows.length)}/${Number(response.totalRows || rows.length)}`
    );
    appendLog("table rows loaded", {
      tableDataId,
      totalRows: Number(response.totalRows || rows.length),
      filteredRows: Number(response.filteredRows || rows.length),
      columns: columns.length
    });
  } catch (error) {
    state.tableRows = [];
    renderTableGrid([], []);
    setTableStatus(`Table load failed: ${error.message}`, {
      error: true
    });
    appendLog("table rows load failed", {
      tableDataId,
      message: error.message
    });
  }
}

function clearTableFilters() {
  elements.tableSearch.value = "";
  elements.tableFilterColumn.value = "";
  elements.tableFilterValue.value = "";
}

async function onRenameTableColumn() {
  const tableDataId = getSelectedTableDataId();
  const fromColumn = String(elements.tableRenameFrom.value || "").trim();
  const toColumn = normalizeColumnName(elements.tableRenameTo.value, "");
  if (!tableDataId) {
    setTableStatus("Pick a table before renaming", {
      error: true
    });
    return;
  }
  if (!fromColumn || !toColumn) {
    setTableStatus("Both source and target column names are required", {
      error: true
    });
    return;
  }

  setTableStatus(`Renaming ${fromColumn} -> ${toColumn}...`);
  try {
    const response = await sendMessage(MESSAGE_TYPES.TABLE_RENAME_COLUMN_REQUEST, {
      tableDataId,
      fromColumn,
      toColumn
    });
    await hydrateDataSources();
    await hydrateTableHistory({
      preserveSelection: true
    });
    await loadSelectedTableRows({
      silent: true
    });
    elements.tableRenameTo.value = "";
    elements.tableRenameFrom.value = toColumn;
    setTableStatus(`Column renamed. Updated rows: ${Number(response.renamedRows || 0)}`);
    appendLog("table column renamed", response);
  } catch (error) {
    setTableStatus(`Rename failed: ${error.message}`, {
      error: true
    });
    appendLog("table column rename failed", {
      tableDataId,
      fromColumn,
      toColumn,
      message: error.message
    });
  }
}

async function onDedupeTableRows() {
  const tableDataId = getSelectedTableDataId();
  if (!tableDataId) {
    setTableStatus("Pick a table before dedupe", {
      error: true
    });
    return;
  }

  setTableStatus("Deduping rows...");
  try {
    const response = await sendMessage(MESSAGE_TYPES.TABLE_DEDUPE_REQUEST, {
      tableDataId
    });
    await hydrateDataSources();
    await hydrateTableHistory({
      preserveSelection: true
    });
    await loadSelectedTableRows({
      silent: true
    });
    setTableStatus(
      `Dedupe done. Removed: ${Number(response.removed || 0)}, Remaining: ${Number(response.remaining || 0)}`
    );
    appendLog("table dedupe complete", response);
  } catch (error) {
    setTableStatus(`Dedupe failed: ${error.message}`, {
      error: true
    });
    appendLog("table dedupe failed", {
      tableDataId,
      message: error.message
    });
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
    void hydrateDataSources().catch(() => {
      appendLog("datasource refresh failed after terminal event");
    });
    void hydrateTableHistory({
      preserveSelection: true
    }).catch(() => {
      appendLog("table history refresh failed after terminal event");
    });
  }

  appendLog(`event: ${eventPayload.eventType}`, eventPayload.payload || {});
}

function applyPickerSessionResult(session, purpose) {
  const selections = Array.isArray(session?.selections) ? session.selections : [];
  if (purpose === "list_container" && selections.length > 0) {
    const selected = selections[0];
    elements.containerSelector.value = selected.selector || "";
    appendLog("container selected", selected);
    return;
  }

  if (purpose === "list_fields" && selections.length > 0) {
    const fields = selections.map((selection, index) => createFieldFromSelection(selection, state.listFields.length, index));
    state.listFields = [...state.listFields, ...fields];
    renderListFields();
    appendLog("list fields selected", {
      added: fields.length
    });
    return;
  }

  if (purpose === "list_load_more_button" && selections.length > 0) {
    elements.loadMoreButtonSelector.value = selections[0].selector || "";
    appendLog("load more button selected", selections[0]);
    return;
  }

  if (purpose === "page_fields" && selections.length > 0) {
    const fields = selections.map((selection, index) => createFieldFromSelection(selection, state.pageFields.length, index));
    state.pageFields = [...state.pageFields, ...fields];
    renderPageFields();
    appendLog("page fields selected", {
      added: fields.length
    });
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

async function hydrateDataSources() {
  const response = await sendMessage(MESSAGE_TYPES.DATA_SOURCE_LIST_REQUEST, {
    limit: 100
  });
  const items = Array.isArray(response.items) ? response.items : [];
  state.dataSources = items;
  const currentValue = String(elements.pageDatasourceSelect.value || "").trim();

  elements.pageDatasourceSelect.innerHTML = "";
  if (items.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No table data yet";
    elements.pageDatasourceSelect.append(option);
    return;
  }

  for (const item of items) {
    const option = document.createElement("option");
    option.value = item.tableDataId;
    const runner = item.runnerType || "unknown";
    const rows = Number(item.rowCount || 0);
    option.textContent = `${item.tableDataId.slice(0, 8)}... (${runner}, rows: ${rows})`;
    if (currentValue && currentValue === item.tableDataId) {
      option.selected = true;
    }
    elements.pageDatasourceSelect.append(option);
  }
}

function renderDatasourceColumns(columns, selectedColumn = "") {
  const list = Array.isArray(columns) ? columns : [];
  state.dataSourceColumns = list;
  elements.pageDatasourceColumn.innerHTML = "";

  if (list.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No URL columns detected";
    elements.pageDatasourceColumn.append(option);
    return;
  }

  for (const column of list) {
    const option = document.createElement("option");
    option.value = column.name;
    option.textContent = `${column.name} (url ${column.urlCount}/${column.count})`;
    if (selectedColumn && selectedColumn === column.name) {
      option.selected = true;
    }
    elements.pageDatasourceColumn.append(option);
  }
}

async function loadDataSourceUrls() {
  const tableDataId = String(elements.pageDatasourceSelect.value || "").trim();
  if (!tableDataId) {
    state.dataSourceUrls = [];
    renderDatasourceColumns([], "");
    elements.pageDatasourceCount.value = "0";
    setResolvedUrlsPreview([]);
    return;
  }

  const selectedColumn = String(elements.pageDatasourceColumn.value || "").trim();
  const response = await sendMessage(MESSAGE_TYPES.DATA_SOURCE_URLS_REQUEST, {
    tableDataId,
    selectedColumn,
    limit: 3000
  });

  state.dataSourceUrls = Array.isArray(response.urls) ? response.urls : [];
  renderDatasourceColumns(response.columns || [], response.selectedColumn || "");
  elements.pageDatasourceCount.value = String(state.dataSourceUrls.length);
  setResolvedUrlsPreview(state.dataSourceUrls);
  appendLog("datasource urls loaded", {
    tableDataId,
    selectedColumn: response.selectedColumn,
    urlCount: state.dataSourceUrls.length
  });
}

async function parseCsvFile(file) {
  const text = await file.text();
  const urlRegex = /https?:\/\/[^\s,;"')]+/gi;
  const matches = text.match(urlRegex) || [];
  return Array.from(new Set(matches.map((item) => item.trim()).filter(Boolean)));
}

function parseManualUrls(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
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

function buildListAutomationConfig() {
  const startUrl = String(elements.startUrl.value || "").trim();
  const containerSelector = String(elements.containerSelector.value || "").trim();
  if (!containerSelector) {
    throw new Error("Container selector is required for list extraction");
  }
  if (state.listFields.length === 0) {
    throw new Error("Select at least one field before starting list extraction");
  }

  const fields = state.listFields.map((field, index) => ({
    name: normalizeFieldName(field.name, index),
    selector: String(field.selector || "").trim(),
    relativeSelector: String(field.relativeSelector || "").trim(),
    extractMode: field.extractMode || "text",
    attribute: String(field.attribute || "").trim()
  }));

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
        method: String(elements.loadMoreMethod.value || LOAD_MORE_METHODS.NONE).trim(),
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

function normalizePageFields() {
  return state.pageFields.map((field, index) => ({
    name: normalizeFieldName(field.name, index),
    selector: String(field.selector || "").trim(),
    relativeSelector: String(field.relativeSelector || "").trim(),
    extractMode: field.extractMode || "text",
    attribute: String(field.attribute || "").trim()
  }));
}

async function resolvePageUrlsBySourceMode(mode) {
  if (mode === URL_SOURCE_MODES.CSV) {
    return state.csvUrls;
  }
  if (mode === URL_SOURCE_MODES.DATASOURCE) {
    if (state.dataSourceUrls.length === 0) {
      await loadDataSourceUrls();
    }
    return state.dataSourceUrls;
  }
  return parseManualUrls(elements.pageManualUrls.value);
}

async function buildPageAutomationConfig() {
  const startUrl = String(elements.startUrl.value || "").trim();
  const urlSourceMode = String(elements.pageUrlSourceMode.value || URL_SOURCE_MODES.MANUAL).trim();
  const actionType = String(elements.pageActionType.value || PAGE_ACTION_TYPES.EXTRACT_PAGES).trim();
  const urls = await resolvePageUrlsBySourceMode(urlSourceMode);
  const dedupedUrls = Array.from(new Set(urls.map((item) => String(item || "").trim()).filter(Boolean)));

  if (dedupedUrls.length === 0 && !startUrl) {
    throw new Error("No URLs available for page extraction");
  }

  if (actionType === PAGE_ACTION_TYPES.EXTRACT_PAGES && state.pageFields.length === 0) {
    throw new Error("Select at least one custom field for EXTRACT_PAGES");
  }

  const queue = {
    maxConcurrentTabs: parseNumber(elements.queueConcurrency.value, 3),
    delayBetweenRequestsMs: parseNumber(elements.queueDelayMs.value, 400),
    pageTimeoutMs: parseNumber(elements.queuePageTimeoutMs.value, 25000),
    maxRetries: parseNumber(elements.queueRetries.value, 1),
    retryDelayMs: parseNumber(elements.queueRetryDelayMs.value, 1200),
    jitterMs: parseNumber(elements.queueJitterMs.value, 220),
    waitForPageLoad: Boolean(elements.queueWaitPageLoad.checked),
    waitForSelector: String(elements.queueWaitSelector.value || "").trim(),
    waitForSelectorTimeoutMs: parseNumber(elements.queueWaitSelectorTimeoutMs.value, 4000)
  };

  const actions = [
    {
      type: actionType,
      fields: actionType === PAGE_ACTION_TYPES.EXTRACT_PAGES ? normalizePageFields() : []
    }
  ];

  return {
    startUrl,
    urls: dedupedUrls.length > 0 ? dedupedUrls : [startUrl],
    urlSourceMode,
    pageActionType: actionType,
    actions,
    queue,
    dataSource: {
      tableDataId: String(elements.pageDatasourceSelect.value || "").trim(),
      selectedColumn: String(elements.pageDatasourceColumn.value || "").trim()
    }
  };
}

async function onStart() {
  try {
    const runnerType = elements.runnerType.value;
    const config =
      runnerType === RUNNER_TYPES.LIST_EXTRACTOR
        ? buildListAutomationConfig()
        : await buildPageAutomationConfig();

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
elements.pageUrlSourceMode.addEventListener("change", updatePageSourceUi);
elements.pageActionType.addEventListener("change", updatePageActionUi);
elements.startBtn.addEventListener("click", () => {
  void onStart();
});
elements.stopBtn.addEventListener("click", () => {
  void onStop();
});
elements.rerunBtn.addEventListener("click", () => {
  void onRerun();
});
elements.clearLogBtn.addEventListener("click", () => {
  elements.eventLog.textContent = "";
});

elements.clearFieldsBtn.addEventListener("click", () => {
  state.listFields = [];
  renderListFields();
});
elements.clearPageFieldsBtn.addEventListener("click", () => {
  state.pageFields = [];
  renderPageFields();
});

elements.pickContainerBtn.addEventListener("click", () => {
  void startPicker({
    mode: PICKER_MODES.CONTAINER,
    multiSelect: false,
    prompt: "Click one repeating row container element.",
    purpose: "list_container"
  });
});
elements.pickFieldsBtn.addEventListener("click", () => {
  const anchorSelector = String(elements.containerSelector.value || "").trim();
  void startPicker({
    mode: PICKER_MODES.FIELD,
    multiSelect: true,
    anchorSelector,
    prompt: "Click fields inside the container, then press Finish.",
    purpose: "list_fields"
  });
});
elements.pickLoadMoreBtn.addEventListener("click", () => {
  void startPicker({
    mode: PICKER_MODES.LOAD_MORE_BUTTON,
    multiSelect: false,
    prompt: "Click the Load More button.",
    purpose: "list_load_more_button"
  });
});
elements.pickPageFieldsBtn.addEventListener("click", () => {
  void startPicker({
    mode: PICKER_MODES.FIELD,
    multiSelect: true,
    prompt: "Click fields on this page, then press Finish.",
    purpose: "page_fields"
  });
});

elements.refreshDatasourcesBtn.addEventListener("click", () => {
  void (async () => {
    await hydrateDataSources();
    if (elements.pageDatasourceSelect.value) {
      await loadDataSourceUrls();
    }
    await hydrateTableHistory({
      preserveSelection: true
    });
  })();
});
elements.loadDatasourceUrlsBtn.addEventListener("click", () => {
  void loadDataSourceUrls();
});
elements.pageDatasourceColumn.addEventListener("change", () => {
  void loadDataSourceUrls();
});
elements.pageDatasourceSelect.addEventListener("change", () => {
  void loadDataSourceUrls();
});

elements.tableRefreshBtn.addEventListener("click", () => {
  void (async () => {
    await hydrateDataSources();
    await hydrateTableHistory({
      preserveSelection: true
    });
    if (getSelectedTableDataId()) {
      await loadSelectedTableRows({
        silent: true
      });
    }
  })();
});
elements.tableLoadBtn.addEventListener("click", () => {
  void loadSelectedTableRows();
});
elements.tableHistorySelect.addEventListener("change", () => {
  void loadSelectedTableRows({
    silent: true
  });
});
elements.tableClearFilterBtn.addEventListener("click", () => {
  clearTableFilters();
  void loadSelectedTableRows();
});
elements.tableRenameBtn.addEventListener("click", () => {
  void onRenameTableColumn();
});
elements.tableDedupeBtn.addEventListener("click", () => {
  void onDedupeTableRows();
});
elements.tableFilterColumn.addEventListener("change", () => {
  void loadSelectedTableRows();
});
elements.tableSearch.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    void loadSelectedTableRows();
  }
});
elements.tableFilterValue.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    void loadSelectedTableRows();
  }
});
elements.tableLimit.addEventListener("change", () => {
  elements.tableLimit.value = String(parseTableLimit());
});
elements.tableRenameTo.addEventListener("blur", () => {
  elements.tableRenameTo.value = normalizeColumnName(elements.tableRenameTo.value, "");
});

elements.pageCsvFile.addEventListener("change", () => {
  void (async () => {
    const file = elements.pageCsvFile.files?.[0] || null;
    if (!file) {
      state.csvUrls = [];
      elements.pageCsvCount.value = "0";
      setResolvedUrlsPreview([]);
      return;
    }

    try {
      state.csvUrls = await parseCsvFile(file);
      elements.pageCsvCount.value = String(state.csvUrls.length);
      setResolvedUrlsPreview(state.csvUrls);
      appendLog("csv parsed", {
        fileName: file.name,
        urlCount: state.csvUrls.length
      });
    } catch (error) {
      appendLog(`csv parse failed: ${error.message}`);
      state.csvUrls = [];
      elements.pageCsvCount.value = "0";
      setResolvedUrlsPreview([]);
    }
  })();
});

elements.pageManualUrls.addEventListener("input", () => {
  if (String(elements.pageUrlSourceMode.value || "") !== URL_SOURCE_MODES.MANUAL) return;
  const urls = parseManualUrls(elements.pageManualUrls.value);
  setResolvedUrlsPreview(urls);
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

renderListFields();
renderPageFields();
setPickerStatus("idle");
setTableStatus("No table loaded");
applySpeedProfileDefaults("normal");
updatePageSourceUi();
updatePageActionUi();
await hydrateRunnerCatalog();
await hydrateDataSources().catch(() => {
  appendLog("datasource list failed");
});
await hydrateTableHistory({
  preserveSelection: true
}).catch(() => {
  appendLog("table history list failed");
});
await loadSelectedTableRows({
  silent: true
}).catch(() => {
  setTableStatus("Unable to load table rows", {
    error: true
  });
});
await hydrateSnapshot();
