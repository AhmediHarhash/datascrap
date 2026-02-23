import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function countMatches(haystack, needle) {
  if (!needle) return 0;
  let index = 0;
  let count = 0;
  while (index < haystack.length) {
    const found = haystack.indexOf(needle, index);
    if (found < 0) break;
    count += 1;
    index = found + needle.length;
  }
  return count;
}

async function main() {
  const htmlPath = resolve("packages/extension/sidepanel/index.html");
  const jsPath = resolve("packages/extension/sidepanel/index.mjs");
  const cssPath = resolve("packages/extension/sidepanel/styles.css");

  const [html, js, css] = await Promise.all([
    readFile(htmlPath, "utf8"),
    readFile(jsPath, "utf8"),
    readFile(cssPath, "utf8")
  ]);

  const requiredHtmlLabels = [
    "MENU",
    "HISTORY",
    "DATA",
    "Tools",
    "latest changes",
    "LIST EXTRACTOR",
    "PAGE DETAILS EXTRACTOR",
    "EMAIL EXTRACTOR",
    "IMAGE DOWNLOADER",
    "PAGE TEXT EXTRACTOR",
    "Roadmap 2026",
    "Scheduling",
    "Integrations",
    "Notify",
    "START EXTRACTING",
    "This welcome screen will show for your first 3 visits"
  ];
  for (const label of requiredHtmlLabels) {
    assert(html.includes(label), `missing html label: ${label}`);
  }

  const requiredHtmlIds = [
    "tool-welcome-panel",
    "tool-welcome-start-btn",
    "tool-welcome-skip-btn",
    "open-welcome-btn",
    "roadmap-scheduling-notify-btn",
    "roadmap-integrations-notify-btn",
    "nav-menu-btn",
    "nav-history-btn",
    "nav-data-btn",
    "nav-tools-btn",
    "nav-latest-btn"
  ];
  for (const id of requiredHtmlIds) {
    assert(html.includes(`id="${id}"`), `missing html id: ${id}`);
  }

  const requiredJsTokens = [
    "const SHELL_VIEWS",
    "const TOOL_PRESETS",
    "const WELCOME_VISIT_LIMIT = 3",
    "roadmap_notify_clicked",
    "welcome_shown",
    "applyToolPreset",
    "setShellView",
    "updateWelcomeVisibility"
  ];
  for (const token of requiredJsTokens) {
    assert(js.includes(token), `missing js token: ${token}`);
  }

  const requiredCssTokens = [
    ".shell-nav",
    ".tool-card",
    ".roadmap-grid",
    ".welcome-grid",
    ".app-view-panel[hidden]"
  ];
  for (const token of requiredCssTokens) {
    assert(css.includes(token), `missing css token: ${token}`);
  }

  const navButtonCount = countMatches(html, 'data-shell-view="');
  const toolCardCount = countMatches(html, 'class="tool-card"');
  assert(navButtonCount >= 5, "expected at least 5 shell nav buttons");
  assert(toolCardCount >= 5, "expected at least 5 tool cards");

  console.log(
    JSON.stringify(
      {
        ok: true,
        navButtonCount,
        toolCardCount,
        welcomeVisitLimit: 3
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-epic7] failed: ${error.message}`);
  process.exit(1);
});
