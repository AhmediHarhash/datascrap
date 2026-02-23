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

  const requiredHtmlIds = [
    "template-source-domains",
    "template-schema-lock-enabled",
    "template-export-selected-btn",
    "template-export-all-btn",
    "template-import-btn",
    "template-import-file"
  ];
  for (const id of requiredHtmlIds) {
    assert(html.includes(`id="${id}"`), `missing html id: ${id}`);
  }

  const requiredJsTokens = [
    "buildTemplateSchemaLockFromCurrent",
    "validateTemplateSchemaLock",
    "buildTemplateBundle",
    "onTemplateExportSelected",
    "onTemplateExportAll",
    "onTemplateImportFromFile",
    "TEMPLATE_BUNDLE_TYPE",
    "TEMPLATE_BUNDLE_VERSION"
  ];
  for (const token of requiredJsTokens) {
    assert(js.includes(token), `missing js token: ${token}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedIds: requiredHtmlIds.length,
        checkedTokens: requiredJsTokens.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-epic10] failed: ${error.message}`);
  process.exit(1);
});
