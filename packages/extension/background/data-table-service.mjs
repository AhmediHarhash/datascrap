function stableSerialize(value) {
  if (value === null || value === undefined) return "null";
  const type = typeof value;
  if (type === "number" || type === "boolean") return String(value);
  if (type === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }
  if (type === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(String(value));
}

function toText(value) {
  return String(value === undefined || value === null ? "" : value);
}

function normalizeRows(rows = []) {
  return Array.isArray(rows) ? rows : [];
}

function includesSearch(rowData, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  return Object.values(rowData || {}).some((value) => toText(value).toLowerCase().includes(q));
}

function passesColumnFilter(rowData, { column = "", value = "" } = {}) {
  const columnName = String(column || "").trim();
  const filterValue = String(value || "").trim().toLowerCase();
  if (!columnName || !filterValue) return true;
  return toText(rowData?.[columnName]).toLowerCase().includes(filterValue);
}

function toColumns(rows) {
  const set = new Set();
  for (const row of rows) {
    const rowData = row?.rowData && typeof row.rowData === "object" ? row.rowData : {};
    for (const key of Object.keys(rowData)) {
      set.add(key);
    }
  }
  return Array.from(set).sort((left, right) => left.localeCompare(right));
}

async function refreshTableSummary({ storageClient, tableDataId }) {
  const tableData = await storageClient.tableData.getById(tableDataId);
  if (!tableData) return null;

  const rows = await storageClient.tableRows.listByTableDataId(tableDataId, {
    limit: 5000
  });
  const next = {
    ...tableData,
    summary: {
      ...(tableData.summary || {}),
      rowCount: rows.length,
      lastEditedAt: new Date().toISOString()
    },
    updatedAt: new Date().toISOString()
  };
  await storageClient.tableData.put(next);
  return next;
}

export async function listTableHistory({ storageClient, limit = 100 }) {
  const tables = await storageClient.tableData.list({
    limit: Math.max(1, Math.min(500, Number(limit || 100)))
  });

  const items = [];
  for (const table of tables) {
    const automation = await storageClient.automations.getById(table.automationId).catch(() => null);
    items.push({
      tableDataId: table.id,
      automationId: table.automationId,
      runnerType: table.runnerType || automation?.runnerType || null,
      status: table.status || automation?.status || null,
      createdAt: table.createdAt || null,
      updatedAt: table.updatedAt || null,
      rowCount: Number(table?.summary?.rowCount || 0),
      summary: table.summary || {}
    });
  }

  return items;
}

export async function getTableRows({
  storageClient,
  tableDataId,
  limit = 300,
  search = "",
  filterColumn = "",
  filterValue = ""
}) {
  const rows = await storageClient.tableRows.listByTableDataId(tableDataId, {
    limit: Math.max(1, Math.min(5000, Number(limit || 300)))
  });

  const filtered = normalizeRows(rows).filter((row) => {
    const rowData = row?.rowData && typeof row.rowData === "object" ? row.rowData : {};
    return includesSearch(rowData, search) && passesColumnFilter(rowData, { column: filterColumn, value: filterValue });
  });

  const columns = toColumns(rows);

  return {
    tableDataId,
    totalRows: rows.length,
    filteredRows: filtered.length,
    columns,
    rows: filtered.map((row) => ({
      dedupeKey: row.dedupeKey,
      rowId: row.rowId,
      rowData: row.rowData || {},
      sourceUrl: row.sourceUrl || null,
      createdAt: row.createdAt || null,
      updatedAt: row.updatedAt || null
    }))
  };
}

export async function updateTableCell({
  storageClient,
  tableDataId,
  dedupeKey,
  columnName,
  value
}) {
  const row = await storageClient.tableRows.getByDedupeKey(dedupeKey);
  if (!row || row.tableDataId !== tableDataId) {
    throw new Error("Row not found for update");
  }

  const nextRowData = {
    ...(row.rowData || {}),
    [columnName]: toText(value)
  };
  const updated = await storageClient.tableRows.updateRow({
    dedupeKey,
    patch: {
      rowData: nextRowData
    }
  });

  await refreshTableSummary({
    storageClient,
    tableDataId
  });

  return {
    dedupeKey: updated?.dedupeKey || dedupeKey,
    rowData: updated?.rowData || nextRowData,
    updatedAt: updated?.updatedAt || new Date().toISOString()
  };
}

export async function renameTableColumn({
  storageClient,
  tableDataId,
  fromColumn,
  toColumn
}) {
  const fromName = String(fromColumn || "").trim();
  const toName = String(toColumn || "").trim();
  if (!fromName || !toName) {
    throw new Error("fromColumn and toColumn are required");
  }
  if (fromName === toName) {
    return {
      tableDataId,
      renamedRows: 0
    };
  }

  const rows = await storageClient.tableRows.listByTableDataId(tableDataId, {
    limit: 5000
  });

  let renamedRows = 0;
  for (const row of rows) {
    const rowData = row?.rowData && typeof row.rowData === "object" ? row.rowData : {};
    if (!Object.prototype.hasOwnProperty.call(rowData, fromName)) {
      continue;
    }

    const next = {
      ...rowData,
      [toName]: rowData[fromName]
    };
    delete next[fromName];

    await storageClient.tableRows.updateRow({
      dedupeKey: row.dedupeKey,
      patch: {
        rowData: next
      }
    });
    renamedRows += 1;
  }

  await refreshTableSummary({
    storageClient,
    tableDataId
  });

  return {
    tableDataId,
    fromColumn: fromName,
    toColumn: toName,
    renamedRows
  };
}

export async function dedupeTableRows({
  storageClient,
  tableDataId
}) {
  const rows = await storageClient.tableRows.listByTableDataId(tableDataId, {
    limit: 5000
  });

  const seen = new Set();
  let removed = 0;
  for (const row of rows) {
    const signature = stableSerialize(row?.rowData || {});
    if (seen.has(signature)) {
      await storageClient.tableRows.removeRow(row.dedupeKey);
      removed += 1;
      continue;
    }
    seen.add(signature);
  }

  const tableData = await refreshTableSummary({
    storageClient,
    tableDataId
  });

  return {
    tableDataId,
    removed,
    remaining: Number(tableData?.summary?.rowCount || 0)
  };
}
