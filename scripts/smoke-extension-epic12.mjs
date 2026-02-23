import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  buildFailureReportCsv,
  buildFailureReportEntries,
  generatePatternUrls,
  generateRangeUrls,
  generateSeedUrls,
  resolveResumeUrls,
  resolveRetryFailedUrls
} from "../packages/extension/sidepanel/page-recovery.mjs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const rangeUrls = generateRangeUrls({
    template: "https://example.com/page/{n}",
    start: 1,
    end: 3
  });
  assert(rangeUrls.length === 3, "range url generation failed");

  const seedUrls = generateSeedUrls({
    template: "https://example.com/{seed}",
    seeds: ["plumbers", "roofers"]
  });
  assert(seedUrls.length === 2, "seed url generation failed");

  const patternUrls = generatePatternUrls({
    template: "https://example.com/{seed}/page/{n}",
    seeds: ["a", "b"],
    start: 1,
    end: 2
  });
  assert(patternUrls.length === 4, "pattern url generation failed");

  const summary = {
    failures: [
      {
        url: "https://example.com/a",
        error: "Timeout",
        code: "TIMEOUT",
        attempts: 2
      },
      {
        url: "https://example.com/b",
        error: "Blocked",
        code: "BLOCKED_HOST",
        attempts: 1
      }
    ],
    checkpoint: {
      unresolvedUrls: ["https://example.com/c"]
    }
  };

  const failureEntries = buildFailureReportEntries(summary);
  assert(failureEntries.length === 2, "failure entries should be 2");

  const retryUrls = resolveRetryFailedUrls(summary);
  assert(retryUrls.length === 2, "retry urls should be 2");

  const resumeUrls = resolveResumeUrls(summary);
  assert(resumeUrls.length === 1 && resumeUrls[0] === "https://example.com/c", "resume urls should use checkpoint unresolved");

  const csv = buildFailureReportCsv(failureEntries);
  assert(csv.includes("url,error,code,attempts"), "failure CSV header missing");
  assert(csv.includes("https://example.com/a"), "failure CSV row missing");

  const html = await readFile(resolve("packages/extension/sidepanel/index.html"), "utf8");
  const js = await readFile(resolve("packages/extension/sidepanel/index.mjs"), "utf8");
  const pageEngine = await readFile(resolve("packages/extension/background/page-extraction-engine.mjs"), "utf8");

  const requiredHtmlIds = [
    "urlgen-template",
    "urlgen-generate-range-btn",
    "urlgen-generate-seeds-btn",
    "urlgen-generate-pattern-btn",
    "urlgen-clear-btn",
    "page-retry-failed-btn",
    "page-resume-checkpoint-btn",
    "page-failure-report-csv-btn",
    "page-failure-report-json-btn",
    "page-recovery-preview"
  ];
  for (const id of requiredHtmlIds) {
    assert(html.includes(`id="${id}"`), `missing html id: ${id}`);
  }

  const requiredJsTokens = [
    "onGenerateRangeUrls",
    "onGenerateSeedUrls",
    "onGeneratePatternUrls",
    "onRetryFailedOnly",
    "onResumeCheckpoint",
    "onDownloadFailureReport",
    "updatePageRecoveryPreview"
  ];
  for (const token of requiredJsTokens) {
    assert(js.includes(token), `missing js token: ${token}`);
  }

  const requiredEngineTokens = [
    "inputUrls",
    "successfulUrls",
    "failedUrls",
    "checkpoint",
    "unresolvedUrls"
  ];
  for (const token of requiredEngineTokens) {
    assert(pageEngine.includes(token), `missing page engine token: ${token}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        rangeUrls: rangeUrls.length,
        seedUrls: seedUrls.length,
        patternUrls: patternUrls.length,
        failureEntries: failureEntries.length,
        retryUrls: retryUrls.length,
        resumeUrls: resumeUrls.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-epic12] failed: ${error.message}`);
  process.exit(1);
});
