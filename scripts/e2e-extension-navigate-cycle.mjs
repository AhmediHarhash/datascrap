import { createServer } from "node:http";
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

const KEEP_PROFILE = String(process.env.E2E_KEEP_PROFILE || "").trim() === "1";
const PATCH_PERMISSIONS = String(process.env.E2E_PATCH_PERMISSIONS || "1").trim() !== "0";
const EVENT_LOG_TAIL_MAX = 160_000;
const LEGACY_RESULT_CAP = 120;

const FIXTURE_PAGE_COUNT = parseIntegerEnv(process.env.E2E_NAV_PAGE_COUNT, {
  name: "E2E_NAV_PAGE_COUNT",
  min: 3,
  max: 80,
  fallback: 24
});
const FIXTURE_ROWS_PER_PAGE = parseIntegerEnv(process.env.E2E_NAV_ROWS_PER_PAGE, {
  name: "E2E_NAV_ROWS_PER_PAGE",
  min: 2,
  max: 20,
  fallback: 6
});
const FIXTURE_TOTAL_ROWS = FIXTURE_PAGE_COUNT * FIXTURE_ROWS_PER_PAGE;

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

function parseHistoryRowCount(historyText, tableRowCount = 0) {
  const raw = String(historyText || "");
  const byPipe = raw.match(/\brows\s+(\d+)\b/i);
  if (byPipe?.[1]) return Number(byPipe[1]);
  const byParen = raw.match(/\((\d+)\s+rows\)/i);
  if (byParen?.[1]) return Number(byParen[1]);
  return Math.max(0, Number(tableRowCount || 0));
}

function buildFixtureHtml({ page, pageCount, rowsPerPage }) {
  const nextPage = page >= pageCount ? 1 : page + 1;
  const rows = Array.from({ length: rowsPerPage }, (_, index) => {
    const globalIndex = (page - 1) * rowsPerPage + index + 1;
    const city = ["Austin", "Dallas", "Houston", "Miami", "Phoenix", "Denver"][globalIndex % 6];
    return {
      id: globalIndex,
      name: `Cycle Directory Company ${globalIndex}`,
      city,
      phone: `+1-555-03${String(1000 + globalIndex)}`
    };
  });

  const cards = rows
    .map(
      (row) => `<article class="result-card" data-id="${row.id}">
        <h2 class="result-name">${row.name}</h2>
        <p class="result-city">City: ${row.city}</p>
        <p class="result-phone">Phone: ${row.phone}</p>
      </article>`
    )
    .join("\n");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Datascrap Navigate Cycle Fixture</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 24px; background: #f7f8fb; color: #111827; }
    h1 { font-size: 22px; margin-bottom: 6px; }
    .meta { color: #4b5563; margin-bottom: 16px; }
    #results-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; }
    .result-card { background: #fff; border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; }
    .result-name { font-size: 15px; margin: 0 0 6px; color: #111827; }
    .result-city { margin: 0 0 6px; color: #374151; }
    .result-phone { margin: 0; color: #1f2937; }
    .pager { margin-top: 18px; display: flex; gap: 12px; align-items: center; }
    #fixture-next { color: #1d4ed8; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <h1>Directory Search Results</h1>
  <p class="meta">
    Page <strong>${page}</strong> of <strong>${pageCount}</strong>,
    rows per page <strong>${rowsPerPage}</strong>
  </p>
  <section id="results-grid" aria-label="search results">
    ${cards}
  </section>
  <nav class="pager" aria-label="pagination">
    <a id="fixture-next" class="fixture-next-link" rel="next" href="/search?page=${nextPage}" aria-label="Next page">Next page</a>
  </nav>
</body>
</html>`;
}

async function startFixtureServer() {
  const server = createServer((req, res) => {
    const url = new URL(String(req?.url || "/"), "http://127.0.0.1");
    const path = String(url.pathname || "/");
    if (path === "/" || path === "/search") {
      const page = Math.max(1, Math.min(FIXTURE_PAGE_COUNT, Number(url.searchParams.get("page") || "1")));
      const html = buildFixtureHtml({
        page,
        pageCount: FIXTURE_PAGE_COUNT,
        rowsPerPage: FIXTURE_ROWS_PER_PAGE
      });
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
    url: `http://127.0.0.1:${port}/search?page=1`,
    pageCount: FIXTURE_PAGE_COUNT,
    rowsPerPage: FIXTURE_ROWS_PER_PAGE,
    totalRows: FIXTURE_TOTAL_ROWS
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

function parseLastVisitedNavigationUrlCount(logText = "") {
  const raw = String(logText || "");
  const pattern = /"visitedNavigationUrlCount"\s*:\s*(\d+)/g;
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

async function waitForAutoDetect(page, timeoutMs = 25000) {
  const deadline = Date.now() + timeoutMs;
  let lastStatus = "";
  while (Date.now() < deadline) {
    lastStatus = await page.evaluate(() => String(document.querySelector("#list-autodetect-status-line")?.textContent || "").trim());
    const lower = lastStatus.toLowerCase();
    if (lower.includes("auto-detect applied")) {
      return {
        ok: true,
        status: lastStatus
      };
    }
    if (lower.includes("auto-detect failed")) {
      return {
        ok: false,
        status: lastStatus
      };
    }
    await page.waitForTimeout(300);
  }
  return {
    ok: false,
    status: lastStatus || "Auto-detect timed out"
  };
}

async function waitForTerminalAndRows(page, timeoutMs = 180000) {
  const deadline = Date.now() + timeoutMs;
  let lastSnapshot = await snapshotUi(page);
  while (Date.now() < deadline) {
    lastSnapshot = await snapshotUi(page);
    const statusLower = String(lastSnapshot.statusPill || "").trim().toLowerCase();
    const rowCount = parseHistoryRowCount(lastSnapshot.selectedHistoryText, lastSnapshot.tableRowCount);
    const terminal =
      statusLower.startsWith("completed") || statusLower.startsWith("error") || statusLower.startsWith("stopped");
    if (terminal) {
      return {
        reached: true,
        statusLower,
        rowCount,
        snapshot: lastSnapshot
      };
    }
    await page.waitForTimeout(600);
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
  const userDataDir = createRunProfileDir("navigate-cycle");
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

    const patchResult = PATCH_PERMISSIONS
      ? await patchPermissionApis(panelPage)
      : {
          patched: false,
          reason: "disabled"
        };

    await panelPage.evaluate(() => {
      const runnerType = document.querySelector("#runner-type");
      if (runnerType) {
        runnerType.value = "listExtractor";
        runnerType.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    const autodetect = {
      ok: null,
      status: "skipped (intent quick-flow detection path)"
    };

    await panelPage.evaluate(() => {
      const method = document.querySelector("#load-more-method");
      if (method) {
        method.value = "navigate";
        method.dispatchEvent(new Event("change", { bubbles: true }));
      }
      const nextSelector = document.querySelector("#load-more-next-selector");
      if (nextSelector) {
        nextSelector.value = "#fixture-next";
        nextSelector.dispatchEvent(new Event("input", { bubbles: true }));
        nextSelector.dispatchEvent(new Event("change", { bubbles: true }));
      }
      const delayInput = document.querySelector("#load-more-delay-ms");
      if (delayInput) {
        delayInput.value = "100";
        delayInput.dispatchEvent(new Event("input", { bubbles: true }));
        delayInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    await targetPage.bringToFront();
    await panelPage.evaluate(() => {
      document.querySelector("#intent-run-btn")?.click();
    });

    const terminal = await waitForTerminalAndRows(panelPage, 180000);
    await panelPage.waitForTimeout(1200);
    const afterRun = await snapshotUi(panelPage);
    const finalRowCount = parseHistoryRowCount(afterRun.selectedHistoryText, afterRun.tableRowCount);
    const terminationReason = parseLastTerminationReason(afterRun.eventLogTail);
    const visitedNavigationUrlCount = parseLastVisitedNavigationUrlCount(afterRun.eventLogTail);

    await panelPage.screenshot({
      path: resolve(artifactsDir, "e2e-navigate-cycle-sidepanel.png"),
      fullPage: true
    });
    await targetPage.screenshot({
      path: resolve(artifactsDir, "e2e-navigate-cycle-target-page.png"),
      fullPage: true
    });

    const checks = {
      commandSet: afterRun.intentCommand === commandText,
      statusCompleted: String(terminal.statusLower || "").startsWith("completed"),
      reachedTerminal: terminal.reached,
      rowCountPositive: finalRowCount > 0,
      rowCountMatchesExpected: finalRowCount === fixture.totalRows,
      rowCountOverLegacyCap: finalRowCount > LEGACY_RESULT_CAP,
      terminationReasonExactCycle: terminationReason === "next_link_cycle",
      eventLogHasCycleToken: String(afterRun.eventLogTail || "").toLowerCase().includes("next_link_cycle"),
      visitedNavigationCoverage: visitedNavigationUrlCount >= fixture.pageCount,
      quickFlowHasPhaseText: String(afterRun.quickFlowProgressPhase || "").trim().length > 0
    };

    assert(checks.commandSet, "Navigate-cycle command not applied");
    assert(checks.statusCompleted, `Expected completed status, received: ${afterRun.statusPill || "unknown"}`);
    assert(checks.reachedTerminal, "Run did not reach terminal state before timeout");
    assert(checks.rowCountPositive, "Navigate-cycle run produced zero rows");
    assert(
      checks.rowCountMatchesExpected,
      `Expected row count ${fixture.totalRows}, received ${finalRowCount}`
    );
    assert(
      checks.rowCountOverLegacyCap,
      `Expected row count > ${LEGACY_RESULT_CAP}, received ${finalRowCount}`
    );
    assert(
      checks.terminationReasonExactCycle,
      `Expected terminationReason next_link_cycle, received: ${terminationReason || "empty"}`
    );
    assert(checks.eventLogHasCycleToken, "Event log did not include next_link_cycle token");
    assert(
      checks.visitedNavigationCoverage,
      `Expected visitedNavigationUrlCount >= ${fixture.pageCount}, received ${visitedNavigationUrlCount}`
    );
    assert(checks.quickFlowHasPhaseText, "Quick flow phase text was empty");

    const result = {
      ok: true,
      extensionId,
      targetUrl,
      fixture: {
        pageCount: fixture.pageCount,
        rowsPerPage: fixture.rowsPerPage,
        totalRows: fixture.totalRows
      },
      legacyResultCap: LEGACY_RESULT_CAP,
      finalRowCount,
      terminationReason,
      visitedNavigationUrlCount,
      autodetect,
      patchResult,
      terminal,
      afterRun,
      checks,
      artifacts: {
        sidepanelScreenshot: resolve("dist", "e2e", "e2e-navigate-cycle-sidepanel.png"),
        targetPageScreenshot: resolve("dist", "e2e", "e2e-navigate-cycle-target-page.png"),
        metadata: resolve("dist", "e2e", "e2e-navigate-cycle-meta.json")
      }
    };

    await writeFile(resolve(artifactsDir, "e2e-navigate-cycle-result.json"), JSON.stringify(result, null, 2), "utf8");
    await writeFile(
      resolve(artifactsDir, "e2e-navigate-cycle-meta.json"),
      JSON.stringify(
        {
          ok: true,
          pageCount: fixture.pageCount,
          rowsPerPage: fixture.rowsPerPage,
          totalRows: fixture.totalRows,
          finalRowCount,
          terminationReason,
          visitedNavigationUrlCount
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
    resolve(artifactsDir, "e2e-navigate-cycle-error.txt"),
    `[e2e-extension-navigate-cycle] failed: ${error.message}\n`,
    "utf8"
  );
  console.error(`[e2e-extension-navigate-cycle] failed: ${error.message}`);
  process.exit(1);
});
