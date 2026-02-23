import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const html = await readFile(resolve("packages/extension/sidepanel/index.html"), "utf8");
  const js = await readFile(resolve("packages/extension/sidepanel/index.mjs"), "utf8");
  const worker = await readFile(resolve("packages/extension/background/service-worker.mjs"), "utf8");
  const detectService = await readFile(resolve("packages/extension/background/list-autodetect-service.mjs"), "utf8");
  const messages = await readFile(resolve("packages/shared/src/messages.mjs"), "utf8");

  const requiredHtmlIds = [
    "list-autodetect-btn",
    "list-autodetect-status-line",
    "list-autodetect-preview"
  ];
  for (const id of requiredHtmlIds) {
    assert(html.includes(`id="${id}"`), `missing html id: ${id}`);
  }

  const requiredJsTokens = [
    "onListAutoDetect",
    "setListAutoDetectStatus",
    "renderListAutoDetectPreview",
    "createFieldFromAutoDetect",
    "LIST_AUTODETECT_REQUEST"
  ];
  for (const token of requiredJsTokens) {
    assert(js.includes(token), `missing js token: ${token}`);
  }

  const requiredMessageTokens = [
    "LIST_AUTODETECT_REQUEST",
    "LIST_AUTODETECT_RESPONSE"
  ];
  for (const token of requiredMessageTokens) {
    assert(messages.includes(token), `missing message token: ${token}`);
    assert(worker.includes(token), `service worker missing token: ${token}`);
  }

  assert(worker.includes("autodetectListConfig"), "service worker missing list auto-detect handler");
  assert(detectService.includes("export async function autodetectListConfig"), "auto-detect service export missing");
  assert(detectService.includes("No repeating list containers were detected"), "auto-detect service error path missing");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedIds: requiredHtmlIds.length,
        checkedMessages: requiredMessageTokens.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-epic9] failed: ${error.message}`);
  process.exit(1);
});
