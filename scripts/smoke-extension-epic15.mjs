import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const sidepanelJs = await readFile(resolve("packages/extension/sidepanel/index.mjs"), "utf8");
  const sidepanelHtml = await readFile(resolve("packages/extension/sidepanel/index.html"), "utf8");

  const requiredJsTokens = [
    "if (state.simpleMode && toolId === \"list\")",
    "action: \"menu_card_quick_extract\"",
    "void onQuickExtract();",
    "applyToolPreset(\"list\", {\n      navigate: false,",
    "elements.listConfigPanel.style.display = state.simpleMode ? \"none\" : isListRunner ? \"grid\" : \"none\";",
    "elements.pageConfigPanel.style.display = \"none\";",
    "elements.tableAdvancedControls.style.display = showAdvanced ? \"\" : \"none\";",
    "elements.exportClipboardBtn.style.display = showAdvanced ? \"\" : \"none\";",
    "const imageOnlyTool = state.activeTool === \"image\";",
    "elements.dataTablePanel.style.display = imageOnlyTool ? \"none\" : \"\";",
    "elements.imagePanel.style.display = imageOnlyTool ? \"\" : \"none\";",
    "preferFullHostAccess: true"
  ];

  for (const token of requiredJsTokens) {
    assert(sidepanelJs.includes(token), `missing sidepanel simple-flow token: ${token}`);
  }

  const requiredHtmlTokens = [
    "id=\"quick-extract-btn\"",
    "id=\"setup-access-btn\"",
    "id=\"point-follow-btn\"",
    "id=\"list-config-panel\"",
    "id=\"page-config-panel\"",
    "id=\"list-advanced-controls\"",
    "id=\"queue-advanced-controls\"",
    "id=\"table-advanced-controls\"",
    "id=\"data-table-panel\"",
    "id=\"export-panel\"",
    "id=\"image-panel\""
  ];

  for (const token of requiredHtmlTokens) {
    assert(sidepanelHtml.includes(token), `missing sidepanel html token: ${token}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedSidepanelTokens: requiredJsTokens.length,
        checkedHtmlTokens: requiredHtmlTokens.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-epic15] failed: ${error.message}`);
  process.exit(1);
});
