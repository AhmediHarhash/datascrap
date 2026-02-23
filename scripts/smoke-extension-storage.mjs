import { createStorageClient } from "../packages/storage/src/storage-client.mjs";

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

  const automation = await storage.automations.put({
    id: "automation-smoke-1",
    runnerType: "listExtractor",
    status: "completed",
    config: {
      startUrl: "https://example.com"
    },
    createdAt: "2026-02-23T00:00:00.000Z",
    updatedAt: "2026-02-23T00:00:00.000Z"
  });

  assert(automation.id === "automation-smoke-1", "automation create failed");

  const tableData = await storage.tableData.put({
    id: "table-smoke-1",
    automationId: automation.id,
    runnerType: automation.runnerType,
    status: "completed",
    summary: {
      rowCount: 2
    },
    createdAt: "2026-02-23T00:00:01.000Z",
    updatedAt: "2026-02-23T00:00:01.000Z"
  });
  assert(tableData.id === "table-smoke-1", "tableData create failed");

  const rows = [
    { name: "Alpha", price: "10" },
    { name: "Beta", price: "20" },
    { name: "Alpha", price: "10" }
  ];
  const insertSummary = await storage.tableRows.addMany({
    tableDataId: tableData.id,
    rows
  });

  assert(insertSummary.inserted === 2, "dedupe insert count mismatch");
  assert(insertSummary.skipped === 1, "dedupe skip count mismatch");

  const storedRows = await storage.tableRows.listByTableDataId(tableData.id);
  assert(storedRows.length === 2, "stored rows count mismatch");

  const firstRow = storedRows[0];
  const patchedRow = await storage.tableRows.updateRow({
    dedupeKey: firstRow.dedupeKey,
    patch: {
      rowData: {
        ...firstRow.rowData,
        status: "updated"
      }
    }
  });
  assert(patchedRow?.rowData?.status === "updated", "row patch failed");

  const removed = await storage.tableRows.removeByTableDataId(tableData.id);
  assert(removed === 2, "row removal count mismatch");

  await storage.destroy();

  console.log(
    JSON.stringify(
      {
        ok: true,
        backend: "memory",
        insertSummary
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-storage] failed: ${error.message}`);
  process.exit(1);
});
