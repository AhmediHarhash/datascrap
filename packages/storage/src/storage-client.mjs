import { createIndexedDbBackend } from "./indexeddb-backend.mjs";
import { createMemoryBackend } from "./memory-backend.mjs";
import { STORAGE_DB_NAME, STORAGE_DB_VERSION } from "./constants.mjs";

export async function createStorageClient(options = {}) {
  const requestedDriver = String(options.driver || "auto").trim().toLowerCase();
  const hasIndexedDb = Boolean(options.indexedDbFactory || globalThis.indexedDB);

  let backend = null;
  if (requestedDriver === "memory") {
    backend = await createMemoryBackend();
  } else if (requestedDriver === "indexeddb") {
    backend = await createIndexedDbBackend({
      indexedDbFactory: options.indexedDbFactory || globalThis.indexedDB,
      dbName: options.dbName || STORAGE_DB_NAME,
      dbVersion: options.dbVersion || STORAGE_DB_VERSION
    });
  } else {
    backend = hasIndexedDb
      ? await createIndexedDbBackend({
          indexedDbFactory: options.indexedDbFactory || globalThis.indexedDB,
          dbName: options.dbName || STORAGE_DB_NAME,
          dbVersion: options.dbVersion || STORAGE_DB_VERSION
        })
      : await createMemoryBackend();
  }

  return {
    kind: backend.kind,
    async init() {
      return null;
    },
    async destroy() {
      await backend.destroy();
    },
    automations: backend.automations,
    tableData: backend.tableData,
    tableRows: backend.tableRows,
    async clearAll() {
      await backend.clearAll();
    }
  };
}
