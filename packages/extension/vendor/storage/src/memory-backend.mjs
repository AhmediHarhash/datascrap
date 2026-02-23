import { createId } from "../../core/src/utils.mjs";
import { buildDedupeKey, hashRowData } from "./hash.mjs";

function sortByDateDesc(items) {
  return [...items].sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
}

export async function createMemoryBackend() {
  const automations = new Map();
  const tableData = new Map();
  const tableRows = new Map();

  return {
    kind: "memory",
    async destroy() {
      automations.clear();
      tableData.clear();
      tableRows.clear();
    },
    automations: {
      async put(record) {
        automations.set(record.id, { ...record });
        return { ...record };
      },
      async getById(automationId) {
        return automations.get(automationId) || null;
      },
      async list({ limit = 50 } = {}) {
        return sortByDateDesc(Array.from(automations.values())).slice(0, limit);
      },
      async remove(automationId) {
        automations.delete(automationId);
        return true;
      }
    },
    tableData: {
      async put(record) {
        tableData.set(record.id, { ...record });
        return { ...record };
      },
      async getById(tableDataId) {
        return tableData.get(tableDataId) || null;
      },
      async listByAutomationId(automationId, { limit = 100 } = {}) {
        const items = Array.from(tableData.values()).filter((item) => item.automationId === automationId);
        return sortByDateDesc(items).slice(0, limit);
      },
      async remove(tableDataId) {
        tableData.delete(tableDataId);
        return true;
      }
    },
    tableRows: {
      async addMany({ tableDataId, rows, sourceUrl = null }) {
        let inserted = 0;
        let skipped = 0;
        for (const rowData of rows) {
          const dataHash = hashRowData(rowData);
          const dedupeKey = buildDedupeKey(tableDataId, rowData);
          if (tableRows.has(dedupeKey)) {
            skipped += 1;
            continue;
          }

          tableRows.set(dedupeKey, {
            dedupeKey,
            rowId: createId("row"),
            tableDataId,
            dataHash,
            rowData,
            sourceUrl,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          inserted += 1;
        }

        return {
          inserted,
          skipped,
          total: rows.length
        };
      },
      async listByTableDataId(tableDataId, { limit = 100 } = {}) {
        const items = Array.from(tableRows.values()).filter((item) => item.tableDataId === tableDataId);
        return sortByDateDesc(items).slice(0, limit);
      },
      async updateRow({ dedupeKey, patch = {} }) {
        const existing = tableRows.get(dedupeKey);
        if (!existing) return null;
        const next = {
          ...existing,
          ...patch,
          updatedAt: new Date().toISOString()
        };
        tableRows.set(dedupeKey, next);
        return { ...next };
      },
      async removeByTableDataId(tableDataId) {
        let removed = 0;
        for (const [key, value] of tableRows.entries()) {
          if (value.tableDataId === tableDataId) {
            tableRows.delete(key);
            removed += 1;
          }
        }
        return removed;
      }
    },
    async clearAll() {
      automations.clear();
      tableData.clear();
      tableRows.clear();
    }
  };
}
