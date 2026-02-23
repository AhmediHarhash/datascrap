function looksLikeUrl(value) {
  const text = String(value || "").trim();
  if (!text) return false;
  try {
    const parsed = new URL(text);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (_error) {
    return false;
  }
}

function firstN(items, count) {
  return items.slice(0, Math.max(0, count));
}

export async function listDataSources({ storageClient, limit = 50 }) {
  const tables = await storageClient.tableData.list({
    limit
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
      rowCount: Number(table?.summary?.rowCount || 0),
      summary: table.summary || {}
    });
  }

  return items;
}

export async function resolveDataSourceUrls({
  storageClient,
  tableDataId,
  selectedColumn = "",
  limit = 2000
}) {
  const rows = await storageClient.tableRows.listByTableDataId(tableDataId, {
    limit
  });

  const columnCounts = new Map();
  const columnUrlValues = new Map();
  for (const row of rows) {
    const rowData = row?.rowData && typeof row.rowData === "object" ? row.rowData : {};
    for (const [key, value] of Object.entries(rowData)) {
      const keyName = String(key || "").trim();
      if (!keyName) continue;

      if (!columnCounts.has(keyName)) {
        columnCounts.set(keyName, 0);
      }
      columnCounts.set(keyName, columnCounts.get(keyName) + 1);

      const text = String(value || "").trim();
      if (!looksLikeUrl(text)) continue;
      if (!columnUrlValues.has(keyName)) {
        columnUrlValues.set(keyName, new Set());
      }
      columnUrlValues.get(keyName).add(text);
    }
  }

  const columns = Array.from(columnCounts.entries())
    .map(([name, count]) => ({
      name,
      count,
      urlCount: (columnUrlValues.get(name) || new Set()).size
    }))
    .sort((left, right) => right.urlCount - left.urlCount || right.count - left.count);

  const preferredColumn =
    String(selectedColumn || "").trim() ||
    columns.find((item) => item.urlCount > 0)?.name ||
    "";

  const urlsSet = preferredColumn && columnUrlValues.has(preferredColumn)
    ? columnUrlValues.get(preferredColumn)
    : new Set();
  const urls = firstN(Array.from(urlsSet), limit);

  return {
    tableDataId,
    selectedColumn: preferredColumn,
    urlCount: urls.length,
    urls,
    columns
  };
}
