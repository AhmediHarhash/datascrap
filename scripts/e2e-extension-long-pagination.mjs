import { createServer } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import {
  createRunProfileDir,
  patchPermissionApis,
  parseHistoryRowCount,
  parseExtensionId,
  removeDirWithRetries,
  waitForExtensionServiceWorker
} from "./e2e-profile-utils.mjs";

const KEEP_PROFILE = String(process.env.E2E_KEEP_PROFILE || "").trim() === "1";
const PATCH_PERMISSIONS = String(process.env.E2E_PATCH_PERMISSIONS || "1").trim() !== "0";
const LOAD_MORE_DELAY_OVERRIDE_MS = 100;
const REQUIRED_ROUNDS_FOR_SEGMENT = 230;
const LEGACY_RESULT_CAP = 120;
const EVENT_LOG_TAIL_MAX = 600_000;

const FIXTURE_TOTAL_ROWS_MIN = 300;
const FIXTURE_TOTAL_ROWS_MAX = 5000;
const FIXTURE_TOTAL_ROWS_DEFAULT = 1500;

const FIXTURE_BATCH_SIZE_MIN = 1;
const FIXTURE_BATCH_SIZE_MAX = 24;
const FIXTURE_BATCH_SIZE_DEFAULT = 6;

const FIXTURE_BATCH_SIZE = parseIntegerEnv(
  process.env.E2E_LONG_BATCH_SIZE,
  {
    name: "E2E_LONG_BATCH_SIZE",
    min: FIXTURE_BATCH_SIZE_MIN,
    max: FIXTURE_BATCH_SIZE_MAX,
    fallback: FIXTURE_BATCH_SIZE_DEFAULT
  }
);
const FIXTURE_TOTAL_ROWS_BASE = parseIntegerEnv(
  process.env.E2E_LONG_TOTAL_ROWS,
  {
    name: "E2E_LONG_TOTAL_ROWS",
    min: FIXTURE_TOTAL_ROWS_MIN,
    max: FIXTURE_TOTAL_ROWS_MAX,
    fallback: FIXTURE_TOTAL_ROWS_DEFAULT
  }
);
const FIXTURE_TOTAL_ROWS = Math.max(FIXTURE_TOTAL_ROWS_BASE, FIXTURE_BATCH_SIZE * REQUIRED_ROUNDS_FOR_SEGMENT);
const EXPECTED_ROUNDS = Math.ceil(FIXTURE_TOTAL_ROWS / FIXTURE_BATCH_SIZE);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function parseIntegerEnv(rawValue, { name, min, max, fallback }) {
  const raw = String(rawValue || "").trim();
  if (!raw) return fallback;
  if (!/^\d+$/.test(raw)) {
    throw new Error(`${name} must be an integer in ${min}-${max}, received "${raw}"`);
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be in ${min}-${max}, received "${raw}"`);
  }
  return parsed;
}

function buildFixtureHtml(totalRows, batchSize) {
  const safeTotal = Math.max(FIXTURE_TOTAL_ROWS_MIN, Math.min(FIXTURE_TOTAL_ROWS_MAX, Math.floor(Number(totalRows) || 0)));
  const safeBatch = Math.max(FIXTURE_BATCH_SIZE_MIN, Math.min(safeTotal, Math.floor(Number(batchSize) || 0)));
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Datascrap Long Pagination Fixture</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 24px; background: #f7f8fb; color: #111827; }
    h1 { font-size: 22px; margin-bottom: 6px; }
    .meta { color: #4b5563; margin-bottom: 16px; }
    #results-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; }
    .result-card { background: #fff; border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; }
    .result-name { font-size: 15px; margin: 0 0 6px; color: #111827; }
    .result-city { margin: 0 0 6px; color: #374151; }
    .result-phone { margin: 0 0 6px; color: #1f2937; }
    .result-link { color: #1d4ed8; text-decoration: none; font-size: 12px; }
    .controls { margin-top: 18px; display: flex; gap: 10px; align-items: center; }
    #load-more-results { background: #111827; color: #fff; border: 0; border-radius: 6px; padding: 8px 12px; cursor: pointer; }
    #fixture-status { color: #4b5563; font-size: 13px; }
  </style>
</head>
<body>
  <h1>Directory Search Results</h1>
  <p class="meta">
    Fixture rows: <strong id="fixture-total">${safeTotal}</strong>,
    batch size: <strong id="fixture-batch">${safeBatch}</strong>
  </p>
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
        name: "Long Run Service Company " + n,
        city: city,
        phone: "+1-555-02" + String(100 + n),
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
      if (loadMoreBtn.disabled) return;
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
    fixtureRows: FIXTURE_TOTAL_ROWS,
    batchSize: FIXTURE_BATCH_SIZE,
    expectedRounds: EXPECTED_ROUNDS
  };
}

async function stopFixtureServer(server) {
  if (!server) return;
  await new Promise((resolve) => {
    server.close(() => resolve());
  });
}

async function snapshotUi(page) {
  return page.evaluate(({ eventTailLimit }) => {
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
    const eventLogTail =
      eventLogRaw.length > eventTailLimit ? eventLogRaw.slice(eventLogRaw.length - eventTailLimit) : eventLogRaw;
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
  }, { eventTailLimit: EVENT_LOG_TAIL_MAX });
}

function parseLastTerminationReason(logText = "") {
  const raw = String(logText || "");
  const pattern = /"terminationReason"\s*:\s*"([^"]+)"/g;
  let match = null;
  let last = "";
  while ((match = pattern.exec(raw)) !== null) {
    last = String(match[1] || "").trim().toLowerCase();
  }
  return last;
}

function parseLastAutoContinueSegmentsUsed(logText = "") {
  const raw = String(logText || "");
  const pattern = /"autoContinueSegmentsUsed"\s*:\s*(\d+)/g;
  let match = null;
  let last = 0;
  while ((match = pattern.exec(raw)) !== null) {
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed)) {
      last = parsed;
    }
  }
  return last;
}

async function waitForTerminalAndRows(page, timeoutMs = 360000) {
  const deadline = Date.now() + timeoutMs;
  let lastSnapshot = await snapshotUi(page);
  let segmentedSeen = false;
  while (Date.now() < deadline) {
    lastSnapshot = await snapshotUi(page);
    const segmentSignal = [
      lastSnapshot.quickFlowProgressPhase,
      lastSnapshot.quickFlowStatus,
      lastSnapshot.listStatus,
      lastSnapshot.eventLogTail
    ]
      .join("\n")
      .toLowerCase()
      .includes("auto-continuing pagination segment");
    if (segmentSignal) {
      segmentedSeen = true;
    }
    const statusLower = String(lastSnapshot.statusPill || "").trim().toLowerCase();
    const rowCount = parseHistoryRowCount(lastSnapshot.selectedHistoryText, lastSnapshot.tableRowCount);
    const terminal =
      statusLower.startsWith("completed") || statusLower.startsWith("error") || statusLower.startsWith("stopped");
    if (terminal && rowCount > 0) {
      return {
        reached: true,
        statusLower,
        rowCount,
        segmentedSeen,
        snapshot: lastSnapshot
      };
    }
    if (terminal && (statusLower.startsWith("error") || statusLower.startsWith("stopped"))) {
      return {
        reached: true,
        statusLower,
        rowCount,
        segmentedSeen,
        snapshot: lastSnapshot
      };
    }
    await page.waitForTimeout(800);
  }
  return {
    reached: false,
    statusLower: String(lastSnapshot.statusPill || "").trim().toLowerCase(),
    rowCount: parseHistoryRowCount(lastSnapshot.selectedHistoryText, lastSnapshot.tableRowCount),
    segmentedSeen,
    snapshot: lastSnapshot
  };
}

async function main() {
  const extensionPath = resolve("packages/extension");
  const userDataDir = createRunProfileDir("long-pagination");
  const artifactsDir = resolve("dist", "e2e");
  let fixture = null;

  if (!KEEP_PROFILE) {
    await removeDirWithRetries(userDataDir);
  }
  await mkdir(artifactsDir, {
    recursive: true
  });

  fixture = await startFixtureServer();
  const targetUrl = fixture.url;
  const commandText = `extract all results from ${targetUrl} until no more across whole website`;

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
    await targetPage.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });
    await targetPage.bringToFront();
    await targetPage.waitForTimeout(500);

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
    await panelPage.evaluate(({ delayMs }) => {
      const speed = document.querySelector("#speed-profile");
      if (speed) {
        speed.value = "fast";
      }
      const delayInput = document.querySelector("#load-more-delay-ms");
      if (delayInput) {
        delayInput.value = String(delayMs);
      }
    }, { delayMs: LOAD_MORE_DELAY_OVERRIDE_MS });

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

    const terminal = await waitForTerminalAndRows(panelPage, 360000);
    await panelPage.waitForTimeout(1500);
    const afterRun = await snapshotUi(panelPage);
    const finalRowCount = parseHistoryRowCount(afterRun.selectedHistoryText, afterRun.tableRowCount);
    const terminationReason = parseLastTerminationReason(afterRun.eventLogTail);
    const autoContinueSegmentsUsed = parseLastAutoContinueSegmentsUsed(afterRun.eventLogTail);
    const hardCapConfigured = /"hardCapAutoContinue"\s*:\s*true/i.test(afterRun.eventLogTail);

    await panelPage.screenshot({
      path: resolve(artifactsDir, "e2e-long-pagination-sidepanel.png"),
      fullPage: true
    });
    await targetPage.screenshot({
      path: resolve(artifactsDir, "e2e-long-pagination-target-page.png"),
      fullPage: true
    });

    const checks = {
      commandSet: afterRun.intentCommand === commandText,
      statusCompleted: String(terminal.statusLower || "").startsWith("completed"),
      reachedTerminalAndRows: terminal.reached,
      rowCountPositive: finalRowCount > 0,
      rowCountOverLegacyCap: finalRowCount > LEGACY_RESULT_CAP,
      rowCountMatchesFixture: finalRowCount === fixture.fixtureRows,
      strategyLoggedList: String(afterRun.eventLogTail || "").toLowerCase().includes("list_autodetect_autopilot"),
      segmentedContinuationObserved:
        Boolean(terminal.segmentedSeen) ||
        autoContinueSegmentsUsed > 0 ||
        String(afterRun.eventLogTail || "").includes("Auto-continuing pagination segment"),
      hardCapAutoResumeConfigured: hardCapConfigured,
      terminationReasonCaptured: terminationReason.length > 0,
      quickFlowHasPhaseText: String(afterRun.quickFlowProgressPhase || "").trim().length > 0
    };

    assert(checks.commandSet, "Long-pagination command not applied");
    assert(checks.statusCompleted, `Expected completed status, received: ${afterRun.statusPill || "unknown"}`);
    assert(checks.reachedTerminalAndRows, "Run did not reach terminal state with visible rows before timeout");
    assert(checks.rowCountPositive, "Long-pagination run produced zero rows");
    assert(checks.rowCountOverLegacyCap, `Expected row count > ${LEGACY_RESULT_CAP}, got ${finalRowCount}`);
    assert(
      checks.rowCountMatchesFixture,
      `Expected full fixture extraction (${fixture.fixtureRows}), got ${finalRowCount}`
    );
    assert(checks.segmentedContinuationObserved, "Segmented auto-continue evidence was not observed");
    assert(checks.hardCapAutoResumeConfigured, "Hard-cap auto-resume config was not observed in event/log payload");
    assert(checks.terminationReasonCaptured, "Terminal reason was not captured in event/log payload");
    assert(checks.quickFlowHasPhaseText, "Quick flow phase text was empty");

    const result = {
      ok: true,
      extensionId,
      targetUrl,
      fixtureRows: fixture.fixtureRows,
      fixtureBatchSize: fixture.batchSize,
      expectedRounds: fixture.expectedRounds,
      requiredRoundsForSegment: REQUIRED_ROUNDS_FOR_SEGMENT,
      loadMoreDelayOverrideMs: LOAD_MORE_DELAY_OVERRIDE_MS,
      legacyResultCap: LEGACY_RESULT_CAP,
      finalRowCount,
      terminationReason,
      autoContinueSegmentsUsed,
      patchResult,
      terminal,
      afterRun,
      checks,
      artifacts: {
        sidepanelScreenshot: resolve("dist", "e2e", "e2e-long-pagination-sidepanel.png"),
        targetPageScreenshot: resolve("dist", "e2e", "e2e-long-pagination-target-page.png"),
        metadata: resolve("dist", "e2e", "e2e-long-pagination-meta.json")
      }
    };

    await writeFile(resolve(artifactsDir, "e2e-long-pagination-result.json"), JSON.stringify(result, null, 2), "utf8");
    await writeFile(
      resolve(artifactsDir, "e2e-long-pagination-meta.json"),
      JSON.stringify(
        {
          ok: true,
          fixtureRows: fixture.fixtureRows,
          fixtureBatchSize: fixture.batchSize,
          expectedRounds: fixture.expectedRounds,
          finalRowCount,
          autoContinueSegmentsUsed,
          terminationReason
        },
        null,
        2
      ),
      "utf8"
    );
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
    await stopFixtureServer(fixture?.server);
  }
}

main().catch(async (error) => {
  const artifactsDir = resolve("dist", "e2e");
  await mkdir(artifactsDir, {
    recursive: true
  });
  await writeFile(
    resolve(artifactsDir, "e2e-long-pagination-error.txt"),
    `[e2e-extension-long-pagination] failed: ${error.message}\n`,
    "utf8"
  );
  console.error(`[e2e-extension-long-pagination] failed: ${error.message}`);
  process.exit(1);
});
