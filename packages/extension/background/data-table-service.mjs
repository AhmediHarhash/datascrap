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
  return Array.from(set);
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

function normalizeColumnList(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const output = [];
  for (const item of value) {
    const next = String(item || "").trim();
    if (!next || seen.has(next)) continue;
    seen.add(next);
    output.push(next);
  }
  return output;
}

function isEmptyValue(value) {
  return String(value === undefined || value === null ? "" : value).trim().length === 0;
}

function normalizeCleanupOptions(options = {}) {
  const mostlyEmptyThresholdRaw = Number(options.mostlyEmptyThreshold);
  const mostlyEmptyThreshold = Number.isFinite(mostlyEmptyThresholdRaw)
    ? Math.max(0.5, Math.min(0.99, mostlyEmptyThresholdRaw))
    : 0.9;
  return {
    removeEmptyRows: Boolean(options.removeEmptyRows),
    removeEmptyColumns: Boolean(options.removeEmptyColumns),
    removeRepeatingColumns: Boolean(options.removeRepeatingColumns),
    removeDuplicateColumns: Boolean(options.removeDuplicateColumns),
    prioritizeDataDensity: Boolean(options.prioritizeDataDensity),
    hideMostlyEmptyColumns: Boolean(options.hideMostlyEmptyColumns),
    mostlyEmptyThreshold,
    includeImages: Boolean(options.includeImages !== false)
  };
}

function isImageLikeValue(value) {
  const text = String(value === undefined || value === null ? "" : value).trim().toLowerCase();
  if (!text) return false;
  if (text.startsWith("data:image/")) return true;
  if (/\.(png|jpe?g|gif|webp|svg|bmp|avif)(\?|#|$)/.test(text)) return true;
  if (text.includes("images/") || text.includes("/image/") || text.includes("img")) return true;
  return false;
}

function isImageLikeColumnName(columnName) {
  const normalized = String(columnName || "").trim().toLowerCase();
  if (!normalized) return false;
  return ["image", "img", "photo", "thumbnail", "picture", "logo", "icon"].some((token) =>
    normalized.includes(token)
  );
}

function buildColumnStats(rows, columns) {
  const rowCount = rows.length;
  const stats = new Map();

  for (const column of columns) {
    const values = rows.map((row) => row?.rowData?.[column]);
    let nonEmptyCount = 0;
    let imageLikeCount = 0;
    const distinctNonEmpty = new Set();
    const signatureParts = [];
    for (const rawValue of values) {
      const text = toText(rawValue);
      signatureParts.push(text.trim());
      if (!isEmptyValue(text)) {
        nonEmptyCount += 1;
        distinctNonEmpty.add(text.trim());
        if (isImageLikeValue(text)) {
          imageLikeCount += 1;
        }
      }
    }
    const density = rowCount > 0 ? nonEmptyCount / rowCount : 0;
    const emptyRatio = 1 - density;
    stats.set(column, {
      values,
      nonEmptyCount,
      distinctNonEmptyCount: distinctNonEmpty.size,
      signature: signatureParts.join("\u0001"),
      density,
      emptyRatio,
      imageLikeRatio: nonEmptyCount > 0 ? imageLikeCount / nonEmptyCount : 0
    });
  }

  return stats;
}

function buildColumnOrder(columns, columnStats, prioritizeDataDensity) {
  if (!prioritizeDataDensity) return columns;
  return [...columns].sort((left, right) => {
    const leftDensity = Number(columnStats.get(left)?.density || 0);
    const rightDensity = Number(columnStats.get(right)?.density || 0);
    if (rightDensity !== leftDensity) return rightDensity - leftDensity;
    return left.localeCompare(right);
  });
}

export async function mergeTableColumns({
  storageClient,
  tableDataId,
  sourceColumns,
  mergedColumnName,
  separator = " ",
  removeSourceColumns = false
}) {
  const tableId = String(tableDataId || "").trim();
  const mergeTarget = String(mergedColumnName || "").trim();
  const columns = normalizeColumnList(sourceColumns);
  if (!tableId) {
    throw new Error("tableDataId is required");
  }
  if (columns.length < 2) {
    throw new Error("Select at least two source columns to merge");
  }
  if (!mergeTarget) {
    throw new Error("mergedColumnName is required");
  }

  const rows = await storageClient.tableRows.listByTableDataId(tableId, {
    limit: 5000
  });

  let updatedRows = 0;
  const delimiter = String(separator === undefined || separator === null ? " " : separator);

  for (const row of rows) {
    const rowData = row?.rowData && typeof row.rowData === "object" ? row.rowData : {};
    const mergeParts = columns
      .map((column) => toText(rowData[column]).trim())
      .filter((value) => value.length > 0);
    const mergedValue = mergeParts.join(delimiter);

    const nextRowData = {
      ...rowData,
      [mergeTarget]: mergedValue
    };
    if (removeSourceColumns) {
      for (const column of columns) {
        if (column === mergeTarget) continue;
        delete nextRowData[column];
      }
    }

    if (stableSerialize(nextRowData) === stableSerialize(rowData)) {
      continue;
    }

    await storageClient.tableRows.updateRow({
      dedupeKey: row.dedupeKey,
      patch: {
        rowData: nextRowData
      }
    });
    updatedRows += 1;
  }

  const tableData = await refreshTableSummary({
    storageClient,
    tableDataId: tableId
  });

  return {
    tableDataId: tableId,
    sourceColumns: columns,
    mergedColumnName: mergeTarget,
    separator: delimiter,
    removeSourceColumns: Boolean(removeSourceColumns),
    updatedRows,
    remainingRows: Number(tableData?.summary?.rowCount || 0)
  };
}

export async function cleanupTableRows({
  storageClient,
  tableDataId,
  options = {}
}) {
  const tableId = String(tableDataId || "").trim();
  if (!tableId) {
    throw new Error("tableDataId is required");
  }

  const cleanup = normalizeCleanupOptions(options);
  const rows = await storageClient.tableRows.listByTableDataId(tableId, {
    limit: 5000
  });
  const columns = toColumns(rows);
  const columnStats = buildColumnStats(rows, columns);
  const removedColumns = new Set();

  if (cleanup.removeEmptyColumns) {
    for (const column of columns) {
      if (Number(columnStats.get(column)?.nonEmptyCount || 0) === 0) {
        removedColumns.add(column);
      }
    }
  }

  if (cleanup.removeRepeatingColumns) {
    for (const column of columns) {
      const stats = columnStats.get(column);
      if (!stats) continue;
      if (stats.nonEmptyCount > 0 && stats.distinctNonEmptyCount <= 1) {
        removedColumns.add(column);
      }
    }
  }

  if (cleanup.hideMostlyEmptyColumns) {
    for (const column of columns) {
      const stats = columnStats.get(column);
      if (!stats) continue;
      if (stats.emptyRatio >= cleanup.mostlyEmptyThreshold) {
        removedColumns.add(column);
      }
    }
  }

  if (!cleanup.includeImages) {
    for (const column of columns) {
      const stats = columnStats.get(column);
      if (!stats) continue;
      const byName = isImageLikeColumnName(column);
      const byValues = stats.imageLikeRatio >= 0.7;
      if (byName || byValues) {
        removedColumns.add(column);
      }
    }
  }

  if (cleanup.removeDuplicateColumns) {
    const seenSignatures = new Map();
    for (const column of columns) {
      if (removedColumns.has(column)) continue;
      const signature = String(columnStats.get(column)?.signature || "");
      if (!signature) continue;
      if (seenSignatures.has(signature)) {
        removedColumns.add(column);
      } else {
        seenSignatures.set(signature, column);
      }
    }
  }

  const retainedColumns = buildColumnOrder(
    columns.filter((column) => !removedColumns.has(column)),
    columnStats,
    cleanup.prioritizeDataDensity
  );

  if (columns.length > 0 && retainedColumns.length === 0) {
    throw new Error("Cleanup would remove all columns. Adjust cleanup options.");
  }

  let updatedRows = 0;
  let removedRows = 0;

  for (const row of rows) {
    const rowData = row?.rowData && typeof row.rowData === "object" ? row.rowData : {};
    const nextRowData = {};
    for (const column of retainedColumns) {
      if (Object.prototype.hasOwnProperty.call(rowData, column)) {
        nextRowData[column] = rowData[column];
      }
    }

    const hasData = Object.values(nextRowData).some((value) => !isEmptyValue(value));
    if (cleanup.removeEmptyRows && !hasData) {
      await storageClient.tableRows.removeRow(row.dedupeKey);
      removedRows += 1;
      continue;
    }

    if (stableSerialize(nextRowData) === stableSerialize(rowData)) {
      continue;
    }

    await storageClient.tableRows.updateRow({
      dedupeKey: row.dedupeKey,
      patch: {
        rowData: nextRowData
      }
    });
    updatedRows += 1;
  }

  const tableData = await refreshTableSummary({
    storageClient,
    tableDataId: tableId
  });

  return {
    tableDataId: tableId,
    updatedRows,
    removedRows,
    removedColumns: Array.from(removedColumns),
    remainingColumns: retainedColumns,
    remainingRows: Number(tableData?.summary?.rowCount || 0),
    appliedOptions: cleanup
  };
}
