import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const sidepanelHtml = await readFile(resolve("packages/extension/sidepanel/index.html"), "utf8");
  const sidepanelCss = await readFile(resolve("packages/extension/sidepanel/styles.css"), "utf8");
  const sidepanelJs = await readFile(resolve("packages/extension/sidepanel/index.mjs"), "utf8");

  const requiredHtmlTokens = [
    "id=\"quick-flow-progress\"",
    "id=\"quick-flow-progress-ring\"",
    "id=\"quick-flow-progress-pct\"",
    "id=\"quick-flow-progress-phase\""
  ];

  for (const token of requiredHtmlTokens) {
    assert(sidepanelHtml.includes(token), `missing quick-flow html token: ${token}`);
  }

  const requiredCssTokens = [
    ".quick-flow-progress-ring",
    ".quick-flow-progress-ring.is-running",
    ".quick-flow-progress-ring.is-error",
    ".quick-flow-progress-ring.is-complete",
    "@keyframes quick-flow-pulse"
  ];

  for (const token of requiredCssTokens) {
    assert(sidepanelCss.includes(token), `missing quick-flow css token: ${token}`);
  }

  const requiredJsTokens = [
    "quickFlowProgressRing: document.getElementById(\"quick-flow-progress-ring\")",
    "function renderQuickFlowProgress()",
    "elements.quickFlowProgressRing.style.setProperty(\"--progress-pct\"",
    "elements.quickFlowProgressRing.classList.toggle(\"is-running\", isRunning);",
    "renderQuickFlowProgress();"
  ];

  for (const token of requiredJsTokens) {
    assert(sidepanelJs.includes(token), `missing quick-flow js token: ${token}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedHtmlTokens: requiredHtmlTokens.length,
        checkedCssTokens: requiredCssTokens.length,
        checkedJsTokens: requiredJsTokens.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-epic17] failed: ${error.message}`);
  process.exit(1);
});
