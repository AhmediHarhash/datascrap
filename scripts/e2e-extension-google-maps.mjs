import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import {
  createRunProfileDir,
  patchPermissionApis,
  parseExtensionId,
  removeDirWithRetries,
  waitForExtensionServiceWorker
} from "./e2e-profile-utils.mjs";

const MAPS_URL =
  "https://www.google.com/maps/search/los+angeles+home+services/@34.1000793,-119.1930544,9z?entry=ttu&g_ep=EgoyMDI2MDIxOC4wIKXMDSoASAFQAw%3D%3D";
const PATCH_PERMISSIONS = String(process.env.E2E_PATCH_PERMISSIONS || "").trim() === "1";
const KEEP_PROFILE = String(process.env.E2E_KEEP_PROFILE || "").trim() === "1";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function snapshotUi(page) {
  return page.evaluate(() => {
    const read = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      return {
        text: String(element.textContent || "").trim(),
        display: getComputedStyle(element).display,
        hidden: Boolean(element.hidden)
      };
    };
    const value = (selector) => {
      const element = document.querySelector(selector);
      return element ? String(element.value || "") : "";
    };
    const selectedText = (selector) => {
      const element = document.querySelector(selector);
      if (!element || !("selectedOptions" in element)) return "";
      const selected = element.selectedOptions?.[0];
      return selected ? String(selected.textContent || "").trim() : "";
    };
    const tailText = (selector, maxChars = 1800) => {
      const element = document.querySelector(selector);
      if (!element) return "";
      const raw = String(element.textContent || "");
      if (raw.length <= maxChars) return raw.trim();
      return raw.slice(raw.length - maxChars).trim();
    };
    const activeNav = Array.from(document.querySelectorAll(".shell-nav-btn.is-active")).map((button) => button.id);
    return {
      activeNav,
      startUrl: value("#start-url"),
      runnerType: value("#runner-type"),
      pageActionType: value("#page-action-type"),
      statusPill: read("#status-pill"),
      selectedHistoryText: selectedText("#table-history-select"),
      eventLogTail: tailText("#event-log", 2200),
      quickFlowStatus: read("#quick-flow-status-line"),
      setupStatus: read("#setup-access-status-line"),
      listStatus: read("#list-autodetect-status-line")
    };
  });
}

async function clickAndWait(page, selector, waitMs = 1500) {
  await page.click(selector);
  await page.waitForTimeout(waitMs);
}

async function waitForTerminalStatus(page, timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const state = await page.evaluate(() => String(document.querySelector("#status-pill")?.textContent || "").trim().toLowerCase());
    if (state.startsWith("completed") || state.startsWith("error") || state.startsWith("stopped")) {
      return state;
    }
    await page.waitForTimeout(600);
  }
  return "timeout";
}

async function main() {
  const extensionPath = resolve("packages/extension");
  const userDataDir = createRunProfileDir("maps");
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
    assert(extensionId, "Could not resolve extension id");

    const mapsPage = await context.newPage();
    await mapsPage.goto(MAPS_URL, {
      waitUntil: "domcontentloaded",
      timeout: 120000
    });
    await mapsPage.bringToFront();
    await mapsPage.waitForTimeout(1000);

    const panelPage = await context.newPage();
    await panelPage.goto(`chrome-extension://${extensionId}/sidepanel/index.html`, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });
    await panelPage.waitForSelector("#quick-extract-btn", {
      state: "attached",
      timeout: 20000
    });
    await panelPage.click("#nav-tools-btn");
    await panelPage.waitForSelector("#start-url", {
      state: "visible",
      timeout: 20000
    });

    await panelPage.fill("#start-url", MAPS_URL);
    const patchResult = PATCH_PERMISSIONS
      ? await patchPermissionApis(panelPage, {
          includeChangeFlags: true
        })
      : {
          patched: false,
          reason: "disabled"
        };

    await clickAndWait(panelPage, "#setup-access-btn", 1400);
    const afterSetup = await snapshotUi(panelPage);

    await clickAndWait(panelPage, "#quick-extract-btn", 4000);
    const afterQuick = await snapshotUi(panelPage);
    const terminalStatus = await waitForTerminalStatus(panelPage, 120000);
    await panelPage.waitForTimeout(1200);
    const afterTerminal = await snapshotUi(panelPage);

    await panelPage.screenshot({
      path: resolve(artifactsDir, "e2e-maps-sidepanel.png"),
      fullPage: true
    });
    await mapsPage.screenshot({
      path: resolve(artifactsDir, "e2e-maps-page.png"),
      fullPage: true
    });

    const checks = {
      mapsUrlSet: afterQuick.startUrl.toLowerCase().includes("google.com/maps/search"),
      switchedToPageRunner: afterQuick.runnerType === "pageExtractor",
      switchedToMapsAction: afterQuick.pageActionType === "EXTRACT_PAGES_GOOGLE_MAPS",
      permissionsPatchedForE2E: Boolean(patchResult?.patched),
      reachedTerminalState: terminalStatus !== "timeout",
      setupHasStatus: Boolean(afterSetup.setupStatus?.text),
      quickHasStatus: Boolean(afterQuick.quickFlowStatus?.text),
      quickFlowEnteredDataView: Array.isArray(afterQuick.activeNav) && afterQuick.activeNav.includes("nav-data-btn")
    };

    assert(checks.mapsUrlSet, "Quick flow did not preserve Google Maps URL");
    assert(checks.switchedToPageRunner, "Quick flow did not switch runner to pageExtractor");
    assert(checks.switchedToMapsAction, "Quick flow did not switch page action to EXTRACT_PAGES_GOOGLE_MAPS");
    assert(checks.reachedTerminalState, "Run did not reach terminal status before timeout");
    assert(checks.setupHasStatus, "Setup access status line was empty after setup");
    assert(checks.quickHasStatus, "Quick flow status line was empty after quick extract");
    assert(checks.quickFlowEnteredDataView, "Quick extract did not route to DATA view");

    const result = {
      ok: true,
      extensionId,
      mapsTitle: await mapsPage.title(),
      afterSetup,
      afterQuick,
      afterTerminal,
      terminalStatus,
      checks,
      patchResult,
      artifacts: {
        sidepanelScreenshot: resolve("dist", "e2e", "e2e-maps-sidepanel.png"),
        mapsScreenshot: resolve("dist", "e2e", "e2e-maps-page.png")
      }
    };

    await writeFile(resolve(artifactsDir, "e2e-maps-result.json"), JSON.stringify(result, null, 2), "utf8");
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
  await writeFile(
    resolve(artifactsDir, "e2e-maps-error.txt"),
    `[e2e-extension-google-maps] failed: ${error.message}\n`,
    "utf8"
  );
  console.error(`[e2e-extension-google-maps] failed: ${error.message}`);
  process.exit(1);
});
