import { createId } from "../../core/src/utils.mjs";
import { STORE_NAMES, STORAGE_DB_NAME, STORAGE_DB_VERSION } from "./constants.mjs";
import { buildDedupeKey, hashRowData } from "./hash.mjs";
import { STORAGE_MIGRATIONS } from "./migrations.mjs";

function requestPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed"));
  });
}

function transactionPromise(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("IndexedDB transaction failed"));
    transaction.onabort = () => reject(transaction.error || new Error("IndexedDB transaction aborted"));
  });
}

function toRange(matchValue) {
  if (matchValue === undefined) return null;
  if (globalThis.IDBKeyRange?.only) {
    return globalThis.IDBKeyRange.only(matchValue);
  }
  return matchValue;
}

async function listByCursor(source, { matchValue, direction = "prev", limit = 100 } = {}) {
  const range = toRange(matchValue);
  const items = [];

  await new Promise((resolve, reject) => {
    const request = source.openCursor(range, direction);
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve();
        return;
      }

      items.push(cursor.value);
      if (items.length >= limit) {
        resolve();
        return;
      }
      cursor.continue();
    };
    request.onerror = () => reject(request.error || new Error("Failed reading cursor"));
  });

  return items;
}

function applyMigrations({ db, oldVersion, transaction }) {
  for (const migration of STORAGE_MIGRATIONS) {
    if (migration.version > oldVersion) {
      migration.up({
        db,
        transaction,
        oldVersion,
        newVersion: migration.version
      });
    }
  }
}

async function openDb({ indexedDbFactory, dbName, dbVersion }) {
  const request = indexedDbFactory.open(dbName, dbVersion);
  request.onupgradeneeded = (event) => {
    applyMigrations({
      db: request.result,
      transaction: request.transaction,
      oldVersion: Number(event.oldVersion || 0)
    });
  };
  return requestPromise(request);
}

async function putRecord(db, storeName, record) {
  const transaction = db.transaction(storeName, "readwrite");
  const store = transaction.objectStore(storeName);
  await requestPromise(store.put(record));
  await transactionPromise(transaction);
  return record;
}

async function getRecord(db, storeName, key) {
  const transaction = db.transaction(storeName, "readonly");
  const store = transaction.objectStore(storeName);
  const result = await requestPromise(store.get(key));
  await transactionPromise(transaction);
  return result || null;
}

async function deleteRecord(db, storeName, key) {
  const transaction = db.transaction(storeName, "readwrite");
  const store = transaction.objectStore(storeName);
  await requestPromise(store.delete(key));
  await transactionPromise(transaction);
  return true;
}

async function clearStore(db, storeName) {
  const transaction = db.transaction(storeName, "readwrite");
  const store = transaction.objectStore(storeName);
  await requestPromise(store.clear());
  await transactionPromise(transaction);
}

async function listRecords(db, storeName, options = {}) {
  const transaction = db.transaction(storeName, "readonly");
  const store = transaction.objectStore(storeName);
  const source = options.indexName ? store.index(options.indexName) : store;
  const items = await listByCursor(source, {
    matchValue: options.matchValue,
    direction: options.direction || "prev",
    limit: options.limit || 100
  });
  await transactionPromise(transaction);
  return items;
}

async function addRows(db, { tableDataId, rows, sourceUrl = null }) {
  const transaction = db.transaction(STORE_NAMES.TABLE_ROWS, "readwrite");
  const store = transaction.objectStore(STORE_NAMES.TABLE_ROWS);

  let inserted = 0;
  let skipped = 0;
  for (const rowData of rows) {
    const dataHash = hashRowData(rowData);
    const dedupeKey = buildDedupeKey(tableDataId, rowData);
    const existing = await requestPromise(store.get(dedupeKey));
    if (existing) {
      skipped += 1;
      continue;
    }

    await requestPromise(
      store.add({
        dedupeKey,
        rowId: createId("row"),
        tableDataId,
        dataHash,
        rowData,
        sourceUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    );
    inserted += 1;
  }

  await transactionPromise(transaction);
  return {
    inserted,
    skipped,
    total: rows.length
  };
}

async function removeRowsByTableDataId(db, tableDataId) {
  const transaction = db.transaction(STORE_NAMES.TABLE_ROWS, "readwrite");
  const store = transaction.objectStore(STORE_NAMES.TABLE_ROWS);
  const index = store.index("by_table_data_id");
  const keys = await requestPromise(index.getAllKeys(toRange(tableDataId)));

  for (const key of keys) {
    store.delete(key);
  }

  await transactionPromise(transaction);
  return keys.length;
}

async function updateRowPatch(db, { dedupeKey, patch = {} }) {
  const transaction = db.transaction(STORE_NAMES.TABLE_ROWS, "readwrite");
  const store = transaction.objectStore(STORE_NAMES.TABLE_ROWS);
  const existing = await requestPromise(store.get(dedupeKey));
  if (!existing) {
    await transactionPromise(transaction);
    return null;
  }

  const next = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString()
  };
  await requestPromise(store.put(next));
  await transactionPromise(transaction);
  return next;
}

export async function createIndexedDbBackend(options = {}) {
  const indexedDbFactory = options.indexedDbFactory || globalThis.indexedDB;
  if (!indexedDbFactory) {
    throw new Error("IndexedDB is unavailable in this environment");
  }

  const db = await openDb({
    indexedDbFactory,
    dbName: options.dbName || STORAGE_DB_NAME,
    dbVersion: options.dbVersion || STORAGE_DB_VERSION
  });

  return {
    kind: "indexeddb",
    async destroy() {
      db.close();
    },
    automations: {
      put(record) {
        return putRecord(db, STORE_NAMES.AUTOMATIONS, record);
      },
      getById(automationId) {
        return getRecord(db, STORE_NAMES.AUTOMATIONS, automationId);
      },
      list({ limit = 50 } = {}) {
        return listRecords(db, STORE_NAMES.AUTOMATIONS, {
          indexName: "by_created_at",
          direction: "prev",
          limit
        });
      },
      remove(automationId) {
        return deleteRecord(db, STORE_NAMES.AUTOMATIONS, automationId);
      }
    },
    tableData: {
      put(record) {
        return putRecord(db, STORE_NAMES.TABLE_DATA, record);
      },
      getById(tableDataId) {
        return getRecord(db, STORE_NAMES.TABLE_DATA, tableDataId);
      },
      listByAutomationId(automationId, { limit = 100 } = {}) {
        return listRecords(db, STORE_NAMES.TABLE_DATA, {
          indexName: "by_automation_id",
          matchValue: automationId,
          direction: "prev",
          limit
        });
      },
      remove(tableDataId) {
        return deleteRecord(db, STORE_NAMES.TABLE_DATA, tableDataId);
      }
    },
    tableRows: {
      addMany({ tableDataId, rows, sourceUrl = null }) {
        return addRows(db, {
          tableDataId,
          rows,
          sourceUrl
        });
      },
      listByTableDataId(tableDataId, { limit = 100 } = {}) {
        return listRecords(db, STORE_NAMES.TABLE_ROWS, {
          indexName: "by_table_data_id",
          matchValue: tableDataId,
          direction: "prev",
          limit
        });
      },
      updateRow({ dedupeKey, patch }) {
        return updateRowPatch(db, { dedupeKey, patch });
      },
      async removeByTableDataId(tableDataId) {
        return removeRowsByTableDataId(db, tableDataId);
      }
    },
    async clearAll() {
      await clearStore(db, STORE_NAMES.TABLE_ROWS);
      await clearStore(db, STORE_NAMES.TABLE_DATA);
      await clearStore(db, STORE_NAMES.AUTOMATIONS);
    }
  };
}
