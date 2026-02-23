import { STORE_NAMES } from "./constants.mjs";

function ensureIndex(store, name, keyPath, options = {}) {
  if (!store.indexNames.contains(name)) {
    store.createIndex(name, keyPath, options);
  }
}

function migrationV1({ db }) {
  if (!db.objectStoreNames.contains(STORE_NAMES.AUTOMATIONS)) {
    const store = db.createObjectStore(STORE_NAMES.AUTOMATIONS, {
      keyPath: "id"
    });
    ensureIndex(store, "by_status", "status");
    ensureIndex(store, "by_runner_type", "runnerType");
    ensureIndex(store, "by_created_at", "createdAt");
  }

  if (!db.objectStoreNames.contains(STORE_NAMES.TABLE_DATA)) {
    const store = db.createObjectStore(STORE_NAMES.TABLE_DATA, {
      keyPath: "id"
    });
    ensureIndex(store, "by_automation_id", "automationId");
    ensureIndex(store, "by_created_at", "createdAt");
  }

  if (!db.objectStoreNames.contains(STORE_NAMES.TABLE_ROWS)) {
    const store = db.createObjectStore(STORE_NAMES.TABLE_ROWS, {
      keyPath: "dedupeKey"
    });
    ensureIndex(store, "by_table_data_id", "tableDataId");
    ensureIndex(store, "by_created_at", "createdAt");
  }
}

export const STORAGE_MIGRATIONS = Object.freeze([
  {
    version: 1,
    up: migrationV1
  }
]);
