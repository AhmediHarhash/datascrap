import { spawn } from "node:child_process";

const TARGET_RESULTS_MIN = 1;
const TARGET_RESULTS_MAX = 500;

function parseTargetResults(rawValue, argName = "--target-results") {
  const raw = String(rawValue || "").trim();
  if (!raw) {
    throw new Error(`${argName} requires a numeric value in ${TARGET_RESULTS_MIN}-${TARGET_RESULTS_MAX}`);
  }
  if (!/^\d+$/.test(raw)) {
    throw new Error(`${argName} must be an integer in ${TARGET_RESULTS_MIN}-${TARGET_RESULTS_MAX}`);
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < TARGET_RESULTS_MIN || parsed > TARGET_RESULTS_MAX) {
    throw new Error(`${argName} must be in ${TARGET_RESULTS_MIN}-${TARGET_RESULTS_MAX}`);
  }
  return String(parsed);
}

function parseArgs(argv = []) {
  const options = {
    target: "local",
    maps: false,
    fallback: false,
    targeted: false,
    longPagination: false,
    navigateCycle: false,
    targetResults: "",
    hasTargetResultsOverride: false
  };
  for (const arg of argv) {
    const value = String(arg || "").trim();
    if (!value) continue;
    if (value.startsWith("--target=")) {
      const parsed = value.slice("--target=".length).trim().toLowerCase();
      if (parsed === "local" || parsed === "railway") {
        options.target = parsed;
      }
      continue;
    }
    if (value === "--maps") {
      options.maps = true;
      continue;
    }
    if (value === "--fallback") {
      options.fallback = true;
      continue;
    }
    if (value === "--targeted") {
      options.targeted = true;
      continue;
    }
    if (value === "--long-pagination") {
      options.longPagination = true;
      continue;
    }
    if (value === "--navigate-cycle") {
      options.navigateCycle = true;
      continue;
    }
    if (value.startsWith("--target-results=")) {
      const raw = value.slice("--target-results=".length).trim();
      options.targetResults = parseTargetResults(raw, "--target-results");
      options.hasTargetResultsOverride = true;
    }
  }
  if (options.hasTargetResultsOverride && !options.targeted) {
    throw new Error("--target-results can only be used together with --targeted");
  }
  return options;
}

function resolveScriptPath(target) {
  if (target === "railway") {
    return "scripts/hardening-railway.mjs";
  }
  return "scripts/local-hardening-pass.mjs";
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const scriptPath = resolveScriptPath(options.target);

  const env = {
    ...process.env,
    RUN_EXTENSION_E2E: "true"
  };
  if (options.maps) {
    env.RUN_EXTENSION_E2E_MAPS = "true";
  }
  if (options.fallback) {
    env.RUN_EXTENSION_E2E_FALLBACK = "true";
  }
  if (options.targeted) {
    env.RUN_EXTENSION_E2E_TARGETED = "true";
    if (options.targetResults) {
      env.E2E_TARGET_RESULTS = String(options.targetResults);
    }
  }
  if (options.longPagination) {
    env.RUN_EXTENSION_E2E_LONG_PAGINATION = "true";
  }
  if (options.navigateCycle) {
    env.RUN_EXTENSION_E2E_NAVIGATE_CYCLE = "true";
  }

  await new Promise((resolve, reject) => {
    const child = spawn("node", [scriptPath], {
      stdio: "inherit",
      env,
      shell: false
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`hardening wrapper failed with exit code ${code}`));
    });
  });
}

run().catch((error) => {
  console.error(`[run-hardening-with-flags] failed: ${error.message}`);
  process.exit(1);
});
