import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import {
  createRunProfileDir,
  removeDirWithRetries,
  waitForExtensionServiceWorker
} from "./e2e-profile-utils.mjs";

const KEEP_PROFILE = String(process.env.E2E_KEEP_PROFILE || "").trim() === "1";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function parseExtensionId(serviceWorkerUrl) {
  const raw = String(serviceWorkerUrl || "").trim();
  const match = raw.match(/^chrome-extension:\/\/([^/]+)\//i);
  return match ? match[1] : "";
}

async function readUiState(page) {
  return page.evaluate(() => {
    const node = (selector) => document.querySelector(selector);
    const panel = (selector) => {
      const element = node(selector);
      if (!element) {
        return {
          exists: false,
          hidden: true,
          display: null
        };
      }
      return {
        exists: true,
        hidden: Boolean(element.hidden),
        display: getComputedStyle(element).display
      };
    };
    const activeNav = Array.from(document.querySelectorAll(".shell-nav-btn.is-active")).map((button) => button.id);
    return {
      activeNav,
      listConfig: panel("#list-config-panel"),
      pageConfig: panel("#page-config-panel"),
      queueAdvanced: panel("#queue-advanced-controls"),
      tableAdvanced: panel("#table-advanced-controls"),
      dataTablePanel: panel("#data-table-panel"),
      exportPanel: panel("#export-panel"),
      imagePanel: panel("#image-panel"),
      quickFlowStatus: String(node("#quick-flow-status-line")?.textContent || "").trim()
    };
  });
}

async function main() {
  const extensionPath = resolve("packages/extension");
  const userDataDir = createRunProfileDir();
  const artifactsDir = resolve("dist", "e2e");
  if (!KEEP_PROFILE) {
    await removeDirWithRetries(userDataDir);
  }
  await mkdir(artifactsDir, {
    recursive: true
  });

  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: "chromium",
    headless: true,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`]
  });

  try {
    const serviceWorker = await waitForExtensionServiceWorker(context, 60000);

    const extensionId = parseExtensionId(serviceWorker?.url?.());
    assert(extensionId, "Could not resolve extension id from service worker URL");

    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/sidepanel/index.html`, {
      waitUntil: "domcontentloaded"
    });
    await page.waitForSelector("#quick-extract-btn", {
      timeout: 20000,
      state: "attached"
    });

    const initial = await readUiState(page);
    assert(initial.listConfig.exists, "List config panel missing");
    assert(initial.listConfig.display === "none", "List config panel should be hidden in simple mode");
    assert(initial.pageConfig.display === "none", "Page config panel should be hidden in simple mode");
    assert(initial.queueAdvanced.display === "none", "Queue advanced controls should be hidden in simple mode");
    assert(initial.tableAdvanced.display === "none", "Data table advanced controls should be hidden in simple mode");

    await page.click('[data-tool="list"]');
    await page.waitForTimeout(600);
    const afterListCard = await readUiState(page);
    assert(
      afterListCard.activeNav.includes("nav-menu-btn"),
      "List tool card should stay on MENU view in simple mode quick flow"
    );
    assert(
      !afterListCard.activeNav.includes("nav-tools-btn"),
      "List tool card should not redirect to TOOLS view in simple mode"
    );

    await page.click('[data-tool="image"]');
    await page.waitForTimeout(600);
    const afterImageCard = await readUiState(page);
    assert(afterImageCard.activeNav.includes("nav-data-btn"), "Image tool card should navigate to DATA view");
    assert(afterImageCard.imagePanel.hidden === false, "Image panel should be visible when image tool is selected");
    assert(afterImageCard.imagePanel.display !== "none", "Image panel display should not be none for image tool");
    assert(afterImageCard.dataTablePanel.display === "none", "Data table panel should be hidden for image tool");
    assert(afterImageCard.exportPanel.display === "none", "Export panel should be hidden for image tool");

    await page.screenshot({
      path: resolve(artifactsDir, "e2e-simple-sidepanel.png"),
      fullPage: true
    });

    const result = {
      ok: true,
      extensionId,
      checks: {
        initialSimpleModeHidden: true,
        listCardNoToolsRedirect: true,
        imageToolDataViewSwitch: true
      },
      snapshot: {
        initial,
        afterListCard,
        afterImageCard
      },
      artifacts: {
        sidepanelScreenshot: resolve("dist", "e2e", "e2e-simple-sidepanel.png")
      }
    };

    await writeFile(resolve(artifactsDir, "e2e-simple-result.json"), JSON.stringify(result, null, 2), "utf8");
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await context.close();
    if (!KEEP_PROFILE) {
      try {
        await removeDirWithRetries(userDataDir);
      } catch {
        // Non-fatal cleanup errors should not fail the run after assertions completed.
      }
    }
  }
}

main().catch(async (error) => {
  const artifactsDir = resolve("dist", "e2e");
  await mkdir(artifactsDir, {
    recursive: true
  });
  await writeFile(resolve(artifactsDir, "e2e-simple-error.txt"), `[e2e-extension-simple] failed: ${error.message}\n`, "utf8");
  console.error(`[e2e-extension-simple] failed: ${error.message}`);
  process.exit(1);
});
