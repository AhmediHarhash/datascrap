import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const queueWorkflow = await readFile(resolve(".github/workflows/job-queue-monitor.yml"), "utf8");
  const queueMonitor = await readFile(resolve("services/control-api/scripts/job-queue-monitor.js"), "utf8");
  const controlApiReadme = await readFile(resolve("services/control-api/README.md"), "utf8");
  const packageJson = await readFile(resolve("package.json"), "utf8");

  const requiredWorkflowTokens = ['cron: "0 * * * *"'];
  for (const token of requiredWorkflowTokens) {
    assert(queueWorkflow.includes(token), `missing queue workflow cadence token: ${token}`);
  }

  const requiredMonitorTokens = ['maxDeadLetterJobs: numberEnv("MAX_DEAD_LETTER_JOBS", 3)'];
  for (const token of requiredMonitorTokens) {
    assert(queueMonitor.includes(token), `missing queue monitor threshold token: ${token}`);
  }

  const requiredReadmeTokens = ["MAX_DEAD_LETTER_JOBS` (default `3`)"];
  for (const token of requiredReadmeTokens) {
    assert(controlApiReadme.includes(token), `missing control-api readme queue token: ${token}`);
  }

  const requiredPackageTokens = ['"smoke:extension:epic29"'];
  for (const token of requiredPackageTokens) {
    assert(packageJson.includes(token), `missing package epic29 token: ${token}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedWorkflowTokens: requiredWorkflowTokens.length,
        checkedMonitorTokens: requiredMonitorTokens.length,
        checkedReadmeTokens: requiredReadmeTokens.length,
        checkedPackageTokens: requiredPackageTokens.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-epic29] failed: ${error.message}`);
  process.exit(1);
});
