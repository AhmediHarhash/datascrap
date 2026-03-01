import { createServer } from "node:http";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const KEEP_PROFILE = String(process.env.E2E_KEEP_PROFILE || "").trim() === "1";
const PATCH_PERMISSIONS = String(process.env.E2E_PATCH_PERMISSIONS || "1").trim() !== "0";
const TARGET_RESULTS_MIN = 1;
const TARGET_RESULTS_MAX = 500;
const TARGET_RESULTS_DEFAULT = 12;
const EVENT_LOG_POLL_INTERVAL_MS = 250;
const EVENT_LOG_SIGNAL_TIMEOUT_MS = 15000;
const { value: TARGET_RESULTS, source: TARGET_RESULTS_SOURCE, raw: TARGET_RESULTS_RAW } = parseTargetResultsFromEnv(
  process.env.E2E_TARGET_RESULTS
);
const FIXTURE_TOTAL_ROWS = Math.max(TARGET_RESULTS + 8, 60);
const FIXTURE_BATCH_SIZE = Math.max(TARGET_RESULTS + 4, 24);

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

function parseTargetResultsFromEnv(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) {
    return {
      value: TARGET_RESULTS_DEFAULT,
      source: "default",
      raw: ""
    };
  }
  if (!/^\d+$/.test(raw)) {
    throw new Error(
      `E2E_TARGET_RESULTS must be an integer in ${TARGET_RESULTS_MIN}-${TARGET_RESULTS_MAX}, received "${raw}"`
    );
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < TARGET_RESULTS_MIN || parsed > TARGET_RESULTS_MAX) {
    throw new Error(
      `E2E_TARGET_RESULTS must be in ${TARGET_RESULTS_MIN}-${TARGET_RESULTS_MAX}, received "${raw}"`
    );
  }
  return {
    value: parsed,
    source: "env",
    raw
  };
}

function buildFixtureHtml(totalRows = 60, batchSize = 24) {
  const safeTotal = Math.max(20, Math.min(1000, Math.floor(Number(totalRows) || 60)));
  const safeBatch = Math.max(8, Math.min(safeTotal, Math.floor(Number(batchSize) || 24)));
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Datascrap Targeted Fixture</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 24px; background: #f7f8fb; color: #111827; }
    h1 { font-size: 22px; margin-bottom: 6px; }
    .meta { color: #4b5563; margin-bottom: 16px; }
    #results-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
    .result-card { background: #fff; border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; }
    .result-name { font-size: 16px; margin: 0 0 8px; color: #111827; }
    .result-city { margin: 0 0 8px; color: #374151; }
    .result-phone { margin: 0 0 8px; color: #1f2937; }
    .result-link { color: #1d4ed8; text-decoration: none; font-size: 13px; }
    .controls { margin-top: 18px; display: flex; gap: 10px; align-items: center; }
    #load-more-results { background: #111827; color: #fff; border: 0; border-radius: 6px; padding: 8px 12px; cursor: pointer; }
    #fixture-status { color: #4b5563; font-size: 13px; }
  </style>
</head>
<body>
  <h1>Directory Search Results</h1>
  <p class="meta">Fixture rows: <strong id="fixture-total">${safeTotal}</strong></p>
  <section id="results-grid" aria-label="search results"></section>
  <div class="controls">
    <button id="load-more-results" type="button">Load more results</button>
    <span id="fixture-status">Rendered 0 of ${safeTotal}</span>
  </div>
  <script>
    const TOTAL = ${safeTotal};
    const BATCH_SIZE = ${safeBatch};
    const rows = Array.from({ length: TOTAL }, (_, index) => {
      const n = index + 1;
      const city = ["Austin", "Dallas", "Houston", "Miami", "Phoenix", "Denver"][index % 6];
      return {
        name: "Service Company " + n,
        city: city,
        phone: "+1-555-01" + String(100 + n),
        url: "https://example.com/company/" + n
      };
    });

    const grid = document.getElementById("results-grid");
    const status = document.getElementById("fixture-status");
    const loadMoreBtn = document.getElementById("load-more-results");
    let offset = 0;

    function renderNextBatch() {
      const next = rows.slice(offset, offset + BATCH_SIZE);
      for (const row of next) {
        const card = document.createElement("article");
        card.className = "result-card";
        card.innerHTML = [
          '<h2 class="result-name">' + row.name + "</h2>",
          '<p class="result-city">City: ' + row.city + "</p>",
          '<p class="result-phone">Phone: ' + row.phone + "</p>",
          '<a class="result-link" href="' + row.url + '">Website</a>'
        ].join("");
        grid.append(card);
      }
      offset += next.length;
      status.textContent = "Rendered " + offset + " of " + TOTAL;
      if (offset >= TOTAL) {
        loadMoreBtn.disabled = true;
        loadMoreBtn.style.opacity = "0.5";
        loadMoreBtn.textContent = "No more results";
      }
    }

    loadMoreBtn.addEventListener("click", () => {
      renderNextBatch();
    });

    renderNextBatch();
  </script>
</body>
</html>`;
}

async function startFixtureServer() {
  const html = buildFixtureHtml(FIXTURE_TOTAL_ROWS, FIXTURE_BATCH_SIZE);
  const server = createServer((req, res) => {
    const path = String(req?.url || "/").split("?")[0];
    if (path === "/" || path === "/search") {
      res.statusCode = 200;
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.end(html);
      return;
    }
    if (path === "/favicon.ico") {
      res.statusCode = 204;
      res.end();
      return;
    }
    res.statusCode = 404;
    res.end("not found");
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const port = Number(address?.port || 0);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("Could not start fixture server");
  }
  return {
    server,
    url: `http://127.0.0.1:${port}/search`,
    fixtureRows: FIXTURE_TOTAL_ROWS
  };
}

async function stopFixtureServer(server) {
  if (!server) return;
  await new Promise((resolve) => {
    server.close(() => resolve());
  });
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
    const selectedText = (selector) => {
      const element = document.querySelector(selector);
      if (!element || !("selectedOptions" in element)) return "";
      const selected = element.selectedOptions?.[0];
      return selected ? String(selected.textContent || "").trim() : "";
    };
    const activeNav = Array.from(document.querySelectorAll(".shell-nav-btn.is-active")).map((button) => button.id);
    const eventLogRaw = String(document.querySelector("#event-log")?.textContent || "");
    const eventLogTail = eventLogRaw.length > 3200 ? eventLogRaw.slice(eventLogRaw.length - 3200) : eventLogRaw;
    const tableRowCount = document.querySelectorAll("#table-grid tbody tr").length;
    return {
      activeNav,
      statusPill: text("#status-pill"),
      quickFlowStatus: text("#quick-flow-status-line"),
      quickFlowProgressPhase: text("#quick-flow-progress-phase"),
      quickFlowProgressPct: text("#quick-flow-progress-pct"),
      listStatus: text("#list-autodetect-status-line"),
      runnerType: value("#runner-type"),
      pageActionType: value("#page-action-type"),
      startUrl: value("#start-url"),
      intentCommand: value("#intent-command-input"),
      selectedHistoryText: selectedText("#table-history-select"),
      tableRowCount,
      eventLogTail
    };
  });
}

async function waitForEventLogSignal(page, signal, timeoutMs = EVENT_LOG_SIGNAL_TIMEOUT_MS) {
  const expected = String(signal || "").trim().toLowerCase();
  if (!expected) return false;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const hasSignal = await page.evaluate((token) => {
      const raw = String(document.querySelector("#event-log")?.textContent || "").toLowerCase();
      return raw.includes(token);
    }, expected);
    if (hasSignal) return true;
    await page.waitForTimeout(EVENT_LOG_POLL_INTERVAL_MS);
  }
  return false;
}

function parseHistoryRowCount(historyText, tableRowCount = 0) {
  const raw = String(historyText || "");
  const byPipe = raw.match(/\brows\s+(\d+)\b/i);
  if (byPipe?.[1]) return Number(byPipe[1]);
  const byParen = raw.match(/\((\d+)\s+rows\)/i);
  if (byParen?.[1]) return Number(byParen[1]);
  return Math.max(0, Number(tableRowCount || 0));
}

async function waitForTerminalAndRows(page, timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;
  let lastSnapshot = await snapshotUi(page);
  while (Date.now() < deadline) {
    lastSnapshot = await snapshotUi(page);
    const statusLower = String(lastSnapshot.statusPill || "").trim().toLowerCase();
    const rowCount = parseHistoryRowCount(lastSnapshot.selectedHistoryText, lastSnapshot.tableRowCount);
    const terminal =
      statusLower.startsWith("completed") || statusLower.startsWith("error") || statusLower.startsWith("stopped");
    if (terminal && rowCount > 0) {
      return {
        reached: true,
        statusLower,
        rowCount,
        snapshot: lastSnapshot
      };
    }
    if (terminal && (statusLower.startsWith("error") || statusLower.startsWith("stopped"))) {
      return {
        reached: true,
        statusLower,
        rowCount,
        snapshot: lastSnapshot
      };
    }
    await page.waitForTimeout(700);
  }
  return {
    reached: false,
    statusLower: String(lastSnapshot.statusPill || "").trim().toLowerCase(),
    rowCount: parseHistoryRowCount(lastSnapshot.selectedHistoryText, lastSnapshot.tableRowCount),
    snapshot: lastSnapshot
  };
}

async function main() {
  const extensionPath = resolve("packages/extension");
  const userDataDir = resolve(".tmp", "pw-extension-profile-targeted");
  const artifactsDir = resolve("dist", "e2e");
  let fixture = null;

  if (!KEEP_PROFILE) {
    await rm(userDataDir, {
      recursive: true,
      force: true
    });
  }
  await mkdir(artifactsDir, {
    recursive: true
  });

  fixture = await startFixtureServer();
  const targetUrl = fixture.url;
  const commandText = `extract ${TARGET_RESULTS} results from ${targetUrl}`;

  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: "chromium",
    headless: true,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`]
  });

  try {
    let serviceWorker = context.serviceWorkers()[0];
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent("serviceworker", {
        timeout: 20000
      });
    }
    const extensionId = parseExtensionId(serviceWorker?.url?.());
    assert(extensionId, "Could not resolve extension id");

    const targetPage = await context.newPage();
    await targetPage.goto(targetUrl, {
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
    await panelPage.waitForSelector("#start-url", {
      state: "visible",
      timeout: 20000
    });

    await panelPage.fill("#start-url", targetUrl);
    await panelPage.fill("#intent-command-input", commandText);

    const patchResult = PATCH_PERMISSIONS
      ? await patchPermissionApis(panelPage)
      : {
          patched: false,
          reason: "disabled"
        };

    await targetPage.bringToFront();
    await panelPage.evaluate(() => {
      document.querySelector("#intent-run-btn")?.click();
    });

    const strategySignalSeen = await waitForEventLogSignal(panelPage, "list_autodetect_autopilot");
    const terminal = await waitForTerminalAndRows(panelPage, 120000);
    await panelPage.waitForTimeout(1200);
    const afterRun = await snapshotUi(panelPage);
    const finalRowCount = parseHistoryRowCount(afterRun.selectedHistoryText, afterRun.tableRowCount);
    const expectedRowCount = Math.min(TARGET_RESULTS, fixture.fixtureRows);

    await panelPage.screenshot({
      path: resolve(artifactsDir, "e2e-targeted-sidepanel.png"),
      fullPage: true
    });
    await targetPage.screenshot({
      path: resolve(artifactsDir, "e2e-targeted-target-page.png"),
      fullPage: true
    });

    const checks = {
      commandSet: afterRun.intentCommand === commandText,
      statusCompleted: String(terminal.statusLower || "").startsWith("completed"),
      reachedTerminalAndRows: terminal.reached,
      rowCountPositive: finalRowCount > 0,
      rowCountCapped: finalRowCount <= TARGET_RESULTS,
      rowCountExactTarget: finalRowCount === expectedRowCount,
      strategyLoggedList:
        strategySignalSeen || String(afterRun.eventLogTail || "").toLowerCase().includes("list_autodetect_autopilot"),
      dataViewActive: Array.isArray(afterRun.activeNav) && afterRun.activeNav.includes("nav-data-btn"),
      quickFlowHasPhaseText: String(afterRun.quickFlowProgressPhase || "").trim().length > 0
    };

    assert(checks.commandSet, "Targeted command not applied");
    assert(checks.statusCompleted, `Expected completed status, received: ${afterRun.statusPill || "unknown"}`);
    assert(checks.reachedTerminalAndRows, "Run did not reach terminal state with visible rows before timeout");
    assert(checks.rowCountPositive, "Targeted run produced zero rows");
    assert(
      checks.rowCountCapped,
      `Targeted run exceeded cap: expected <= ${TARGET_RESULTS}, got ${finalRowCount}`
    );
    assert(
      checks.rowCountExactTarget,
      `Targeted run did not hit exact target: expected ${expectedRowCount}, got ${finalRowCount}`
    );
    assert(checks.strategyLoggedList, "Intent plan did not log list_autodetect_autopilot strategy");
    assert(checks.dataViewActive, "Simple mode did not switch to DATA view after completion");
    assert(checks.quickFlowHasPhaseText, "Quick flow phase text was empty");

    const result = {
      ok: true,
      extensionId,
      targetUrl,
      fixtureRows: fixture.fixtureRows,
      targetResults: TARGET_RESULTS,
      targetResultsSource: TARGET_RESULTS_SOURCE,
      targetResultsRaw: TARGET_RESULTS_RAW,
      expectedRowCount,
      finalRowCount,
      patchResult,
      strategySignalSeen,
      terminal,
      afterRun,
      checks,
      artifacts: {
        sidepanelScreenshot: resolve("dist", "e2e", "e2e-targeted-sidepanel.png"),
        targetPageScreenshot: resolve("dist", "e2e", "e2e-targeted-target-page.png"),
        metadata: resolve("dist", "e2e", "e2e-targeted-meta.json")
      }
    };

    await writeFile(resolve(artifactsDir, "e2e-targeted-result.json"), JSON.stringify(result, null, 2), "utf8");
    await writeFile(
      resolve(artifactsDir, "e2e-targeted-meta.json"),
      JSON.stringify(
        {
          ok: true,
          targetResults: TARGET_RESULTS,
          targetResultsSource: TARGET_RESULTS_SOURCE,
          expectedRowCount,
          finalRowCount
        },
        null,
        2
      ),
      "utf8"
    );
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await context.close();
    await stopFixtureServer(fixture?.server);
  }
}

main().catch(async (error) => {
  const artifactsDir = resolve("dist", "e2e");
  await mkdir(artifactsDir, {
    recursive: true
  });
  await writeFile(resolve(artifactsDir, "e2e-targeted-error.txt"), `[e2e-extension-targeted] failed: ${error.message}\n`, "utf8");
  console.error(`[e2e-extension-targeted] failed: ${error.message}`);
  process.exit(1);
});
