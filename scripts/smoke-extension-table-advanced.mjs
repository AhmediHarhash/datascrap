import { createStorageClient } from "../packages/storage/src/storage-client.mjs";
import {
  cleanupTableRows,
  getTableRows,
  mergeTableColumns
} from "../packages/extension/background/data-table-service.mjs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const storage = await createStorageClient({
    driver: "memory"
  });

  await storage.clearAll();

  await storage.automations.put({
    id: "automation-table-advanced",
    runnerType: "listExtractor",
    status: "completed",
    config: {},
    createdAt: "2026-02-23T00:00:00.000Z",
    updatedAt: "2026-02-23T00:00:00.000Z"
  });

  await storage.tableData.put({
    id: "table-advanced-1",
    automationId: "automation-table-advanced",
    runnerType: "listExtractor",
    status: "completed",
    summary: {
      rowCount: 4
    },
    createdAt: "2026-02-23T00:00:01.000Z",
    updatedAt: "2026-02-23T00:00:01.000Z"
  });

  await storage.tableRows.addMany({
    tableDataId: "table-advanced-1",
    rows: [
      {
        first_name: "Ada",
        last_name: "Lovelace",
        city: "London",
        dup_a: "alpha",
        dup_b: "alpha",
        constant: "always",
        sparse: "",
        image_url: "https://example.com/a.png",
        empty_only: ""
      },
      {
        first_name: "Grace",
        last_name: "Hopper",
        city: "New York",
        dup_a: "beta",
        dup_b: "beta",
        constant: "always",
        sparse: "present",
        image_url: "https://example.com/b.png",
        empty_only: ""
      },
      {
        first_name: "Katherine",
        last_name: "Johnson",
        city: "Hampton",
        dup_a: "gamma",
        dup_b: "gamma",
        constant: "always",
        sparse: "",
        image_url: "https://example.com/c.png",
        empty_only: ""
      },
      {
        first_name: "",
        last_name: "",
        city: "",
        dup_a: "",
        dup_b: "",
        constant: "always",
        sparse: "",
        image_url: "https://example.com/d.png",
        empty_only: ""
      }
    ]
  });

  const merge = await mergeTableColumns({
    storageClient: storage,
    tableDataId: "table-advanced-1",
    sourceColumns: ["first_name", "last_name"],
    mergedColumnName: "full_name",
    separator: " ",
    removeSourceColumns: false
  });
  assert(merge.updatedRows >= 3, "merge updated rows mismatch");

  const cleanup = await cleanupTableRows({
    storageClient: storage,
    tableDataId: "table-advanced-1",
    options: {
      removeEmptyRows: true,
      removeEmptyColumns: true,
      removeRepeatingColumns: true,
      removeDuplicateColumns: true,
      prioritizeDataDensity: true,
      hideMostlyEmptyColumns: true,
      mostlyEmptyThreshold: 0.7,
      includeImages: false
    }
  });

  const rows = await getTableRows({
    storageClient: storage,
    tableDataId: "table-advanced-1",
    limit: 100
  });

  assert(rows.totalRows === 3, "cleanup remove-empty-rows failed");
  assert(rows.columns.includes("full_name"), "merged column missing");
  assert(!rows.columns.includes("dup_b"), "duplicate column should be removed");
  assert(!rows.columns.includes("constant"), "repeating column should be removed");
  assert(!rows.columns.includes("image_url"), "image column should be removed");
  assert(!rows.columns.includes("empty_only"), "empty-only column should be removed");
  assert(cleanup.removedRows === 1, "cleanup removed rows summary mismatch");

  await storage.destroy();

  console.log(
    JSON.stringify(
      {
        ok: true,
        mergeUpdatedRows: merge.updatedRows,
        cleanupRemovedRows: cleanup.removedRows,
        remainingColumns: rows.columns,
        remainingRows: rows.totalRows
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-table-advanced] failed: ${error.message}`);
  process.exit(1);
});
