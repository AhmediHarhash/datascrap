import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { createRunProfileDir, removeDirWithRetries, waitForExtensionServiceWorker } from "./e2e-profile-utils.mjs";

const TARGET_URL = "https://example.com";
const FALLBACK_COMMAND = String(process.env.E2E_FALLBACK_COMMAND || "maps https://example.com").trim();
const KEEP_PROFILE = String(process.env.E2E_KEEP_PROFILE || "").trim() === "1";
const PATCH_PERMISSIONS = String(process.env.E2E_PATCH_PERMISSIONS || "1").trim() !== "0";

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

async function patchPermissionApis(page) {
  return page.evaluate(() => {
    if (!globalThis.chrome?.permissions) {
      return {
        patched: false,
        reason: "chrome.permissions unavailable"
      };
    }
    try {
      globalThis.chrome.permissions.contains = (_details, callback) => {
        if (typeof callback === "function") callback(true);
      };
      globalThis.chrome.permissions.request = (_details, callback) => {
        if (typeof callback === "function") callback(true);
      };
      return {
        patched: true
      };
    } catch (error) {
      return {
        patched: false,
        reason: String(error?.message || error)
      };
    }
  });
}

async function snapshotUi(page) {
  return page.evaluate(() => {
    const text = (selector) => String(document.querySelector(selector)?.textContent || "").trim();
    const value = (selector) => String(document.querySelector(selector)?.value || "");
    const activeNav = Array.from(document.querySelectorAll(".shell-nav-btn.is-active")).map((button) => button.id);
    const eventLogRaw = String(document.querySelector("#event-log")?.textContent || "");
    const eventLogTail = eventLogRaw.length > 2600 ? eventLogRaw.slice(eventLogRaw.length - 2600) : eventLogRaw;
    return {
      activeNav,
      statusPill: text("#status-pill"),
      quickFlowStatus: text("#quick-flow-status-line"),
      quickFlowProgressPhase: text("#quick-flow-progress-phase"),
      quickFlowProgressPct: text("#quick-flow-progress-pct"),
      runnerType: value("#runner-type"),
      pageActionType: value("#page-action-type"),
      startUrl: value("#start-url"),
      intentCommand: value("#intent-command-input"),
      eventLogTail
    };
  });
}

async function waitForFallbackSignal(page, timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;
  let last = await snapshotUi(page);
  while (Date.now() < deadline) {
    last = await snapshotUi(page);
    const haystack = [
      last.quickFlowStatus,
      last.quickFlowProgressPhase,
      last.statusPill,
      last.eventLogTail
    ]
      .join("\n")
      .toLowerCase();

    const matched =
      haystack.includes("fallback") ||
      haystack.includes("point & follow") ||
      haystack.includes("point and follow") ||
      haystack.includes("quick_extract_fallback");
    if (matched) {
      return {
        matched: true,
        snapshot: last
      };
    }
    await page.waitForTimeout(700);
  }
  return {
    matched: false,
    snapshot: last
  };
}

async function main() {
  const extensionPath = resolve("packages/extension");
  const userDataDir = createRunProfileDir("fallback");
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

    const targetPage = await context.newPage();
    await targetPage.goto(TARGET_URL, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });
    await targetPage.bringToFront();
    await targetPage.waitForTimeout(700);

    const panelPage = await context.newPage();
    await panelPage.goto(`chrome-extension://${extensionId}/sidepanel/index.html`, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });
    await panelPage.waitForSelector("#intent-command-input", {
      state: "attached",
      timeout: 20000
    });
    await panelPage.click("#nav-tools-btn");
    await panelPage.waitForSelector("#intent-command-input", {
      state: "visible",
      timeout: 20000
    });
    await panelPage.waitForSelector("#start-url", {
      state: "visible",
      timeout: 20000
    });

    await panelPage.fill("#start-url", TARGET_URL);
    await panelPage.fill("#intent-command-input", FALLBACK_COMMAND);

    const patchResult = PATCH_PERMISSIONS
      ? await patchPermissionApis(panelPage)
      : {
          patched: false,
          reason: "disabled"
        };

    await panelPage.click("#intent-run-btn");
    const fallbackSignal = await waitForFallbackSignal(panelPage, 90000);
    const afterRun = await snapshotUi(panelPage);

    const checks = {
      commandSet: afterRun.intentCommand === FALLBACK_COMMAND,
      startUrlSet: afterRun.startUrl.toLowerCase().startsWith("https://"),
      planLoggedMaps: afterRun.eventLogTail.toLowerCase().includes("maps_autopilot"),
      fallbackDetected: fallbackSignal.matched,
      quickFlowHasPhaseText: String(afterRun.quickFlowProgressPhase || "").trim().length > 0
    };

    assert(checks.commandSet, "Fallback command not applied");
    assert(checks.startUrlSet, "Start URL was not set");
    assert(checks.planLoggedMaps, "Intent plan did not log maps_autopilot strategy");
    assert(checks.fallbackDetected, "Fallback transition was not detected in UI/log state");
    assert(checks.quickFlowHasPhaseText, "Quick flow phase text was empty");

    await panelPage.screenshot({
      path: resolve(artifactsDir, "e2e-fallback-sidepanel.png"),
      fullPage: true
    });

    const result = {
      ok: true,
      extensionId,
      patchResult,
      checks,
      fallbackSignal,
      afterRun,
      artifacts: {
        sidepanelScreenshot: resolve("dist", "e2e", "e2e-fallback-sidepanel.png")
      }
    };

    await writeFile(resolve(artifactsDir, "e2e-fallback-result.json"), JSON.stringify(result, null, 2), "utf8");
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
  await writeFile(resolve(artifactsDir, "e2e-fallback-error.txt"), `[e2e-extension-fallback] failed: ${error.message}\n`, "utf8");
  console.error(`[e2e-extension-fallback] failed: ${error.message}`);
  process.exit(1);
});
