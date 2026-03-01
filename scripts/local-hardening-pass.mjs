import "dotenv/config";

import { spawn } from "node:child_process";
import net from "node:net";
import { setTimeout as delay } from "node:timers/promises";

const TARGET_RESULTS_MIN = 1;
const TARGET_RESULTS_MAX = 500;
const LONG_TOTAL_ROWS_MIN = 300;
const LONG_TOTAL_ROWS_MAX = 5000;
const LONG_BATCH_SIZE_MIN = 1;
const LONG_BATCH_SIZE_MAX = 24;

function npmCommand() {
  return "npm";
}

function toBool(value) {
  if (typeof value === "boolean") return value;
  const raw = String(value || "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

function hasValue(value) {
  return String(value || "").trim().length > 0;
}

async function allocateLocalPort(host = "127.0.0.1") {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, host, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? Number(address.port) : NaN;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        if (!Number.isFinite(port) || port <= 0) {
          reject(new Error("Unable to allocate local control-api port"));
          return;
        }
        resolve(port);
      });
    });
  });
}

function parseTargetedResultsEnv(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return null;
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
  return String(parsed);
}

function parseLongTotalRowsEnv(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) {
    throw new Error(
      `E2E_LONG_TOTAL_ROWS must be an integer in ${LONG_TOTAL_ROWS_MIN}-${LONG_TOTAL_ROWS_MAX}, received "${raw}"`
    );
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < LONG_TOTAL_ROWS_MIN || parsed > LONG_TOTAL_ROWS_MAX) {
    throw new Error(
      `E2E_LONG_TOTAL_ROWS must be in ${LONG_TOTAL_ROWS_MIN}-${LONG_TOTAL_ROWS_MAX}, received "${raw}"`
    );
  }
  return String(parsed);
}

function parseLongBatchSizeEnv(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) {
    throw new Error(
      `E2E_LONG_BATCH_SIZE must be an integer in ${LONG_BATCH_SIZE_MIN}-${LONG_BATCH_SIZE_MAX}, received "${raw}"`
    );
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < LONG_BATCH_SIZE_MIN || parsed > LONG_BATCH_SIZE_MAX) {
    throw new Error(
      `E2E_LONG_BATCH_SIZE must be in ${LONG_BATCH_SIZE_MIN}-${LONG_BATCH_SIZE_MAX}, received "${raw}"`
    );
  }
  return String(parsed);
}

async function runCommand({ label, command, args, env = process.env, cwd = process.cwd() }) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: "inherit",
      shell: process.platform === "win32"
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${label} failed with exit code ${code}`));
    });
  });
}

function startServer({ env = process.env, cwd = process.cwd() }) {
  const child = spawn("node", ["services/control-api/src/server.js"], {
    cwd,
    env,
    stdio: "inherit",
    shell: false
  });
  return child;
}

async function stopServer(child) {
  if (!child || child.killed) return;
  child.kill("SIGTERM");
  for (let i = 0; i < 20; i += 1) {
    if (child.exitCode !== null) return;
    await delay(150);
  }
  if (child.exitCode === null) {
    child.kill("SIGKILL");
  }
}

async function waitForHealth(baseUrl, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  const target = `${String(baseUrl || "").replace(/\/+$/, "")}/healthz`;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(target);
      if (response.ok) return;
      lastError = new Error(`healthz status ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(300);
  }
  throw new Error(`Server did not become healthy: ${lastError?.message || "timeout"}`);
}

async function runBasicApiPass({ baseEnv, baseUrl }) {
  const server = startServer({ env: baseEnv });
  try {
    await waitForHealth(baseUrl);
    await runCommand({
      label: "control-api smoke",
      command: npmCommand(),
      args: ["run", "smoke:control-api"],
      env: {
        ...baseEnv,
        API_BASE_URL: baseUrl
      }
    });
  } finally {
    await stopServer(server);
  }
}

async function runCloudApiPass({ baseEnv, baseUrl }) {
  await runCommand({
    label: "control-api migrate",
    command: npmCommand(),
    args: ["run", "migrate:control-api"],
    env: {
      ...baseEnv,
      DATABASE_URL: baseEnv.DATABASE_URL
    }
  });

  const cloudEnv = {
    ...baseEnv,
    ENABLE_OPTIONAL_CLOUD_FEATURES: "true",
    VAULT_MASTER_KEY: hasValue(baseEnv.VAULT_MASTER_KEY) ? baseEnv.VAULT_MASTER_KEY : "local-hardening-vault-key",
    API_BASE_URL: baseUrl
  };

  const server = startServer({ env: cloudEnv });
  try {
    await waitForHealth(baseUrl);
    await runCommand({
      label: "phase5 optional cloud smoke",
      command: npmCommand(),
      args: ["run", "phase5:smoke:control-api"],
      env: cloudEnv
    });
    await runCommand({
      label: "phase5 schedule smoke",
      command: npmCommand(),
      args: ["run", "phase5:schedule:smoke:control-api"],
      env: cloudEnv
    });
    await runCommand({
      label: "phase9 monitor smoke",
      command: npmCommand(),
      args: ["run", "phase9:monitor:smoke:control-api"],
      env: cloudEnv
    });
  } finally {
    await stopServer(server);
  }
}

async function main() {
  const configuredBaseUrl = String(process.env.API_BASE_URL || "").trim();
  const baseUrl = configuredBaseUrl || `http://127.0.0.1:${await allocateLocalPort()}`;
  const baseOrigin = new URL(baseUrl);
  const basePort = Number(baseOrigin.port || (baseOrigin.protocol === "https:" ? "443" : "80"));
  const hasDatabase = hasValue(process.env.DATABASE_URL);
  const runCloudPass = hasDatabase && !toBool(process.env.SKIP_CLOUD_HARDENING);
  const runExtensionE2EMaps = toBool(process.env.RUN_EXTENSION_E2E_MAPS);
  const runExtensionE2EFallback = toBool(process.env.RUN_EXTENSION_E2E_FALLBACK);
  const runExtensionE2ETargeted = toBool(process.env.RUN_EXTENSION_E2E_TARGETED);
  const runExtensionE2ELongPagination = toBool(process.env.RUN_EXTENSION_E2E_LONG_PAGINATION);
  const runExtensionE2ENavigateCycle = toBool(process.env.RUN_EXTENSION_E2E_NAVIGATE_CYCLE);
  const targetedResultsOverride = runExtensionE2ETargeted
    ? parseTargetedResultsEnv(process.env.E2E_TARGET_RESULTS)
    : null;
  const longTotalRowsOverride = runExtensionE2ELongPagination
    ? parseLongTotalRowsEnv(process.env.E2E_LONG_TOTAL_ROWS)
    : null;
  const longBatchSizeOverride = runExtensionE2ELongPagination
    ? parseLongBatchSizeEnv(process.env.E2E_LONG_BATCH_SIZE)
    : null;
  const runExtensionE2E =
    toBool(process.env.RUN_EXTENSION_E2E) ||
    runExtensionE2EMaps ||
    runExtensionE2ETargeted ||
    runExtensionE2ELongPagination ||
    runExtensionE2ENavigateCycle;

  const baseEnv = {
    ...process.env,
    API_BASE_URL: baseUrl,
    PORT: hasValue(process.env.PORT) ? process.env.PORT : String(basePort),
    REQUIRE_DB: process.env.REQUIRE_DB || "false"
  };

  const summary = {
    ok: false,
    baseUrl,
    hasDatabase,
    extensionSmoke: false,
    extensionE2E: false,
    extensionE2EMaps: false,
    extensionE2EFallback: false,
    extensionE2ETargeted: false,
    extensionE2ETargetResults: null,
    extensionE2ELongPagination: false,
    extensionE2ELongTotalRows: null,
    extensionE2ELongBatchSize: null,
    extensionE2ENavigateCycle: false,
    skippedE2EReason: null,
    controlApiSmoke: false,
    cloudSmoke: false,
    skippedCloudReason: null
  };

  await runCommand({
    label: "extension smoke",
    command: npmCommand(),
    args: ["run", "smoke:extension"],
    env: baseEnv
  });
  summary.extensionSmoke = true;

  if (runExtensionE2E) {
    await runCommand({
      label: "extension e2e simple",
      command: npmCommand(),
      args: ["run", "e2e:extension:simple"],
      env: baseEnv
    });
    summary.extensionE2E = true;
  } else {
    summary.skippedE2EReason = "RUN_EXTENSION_E2E not set";
  }

  if (runExtensionE2EMaps) {
    await runCommand({
      label: "extension e2e maps",
      command: npmCommand(),
      args: ["run", "e2e:extension:maps"],
      env: baseEnv
    });
    summary.extensionE2EMaps = true;
  }

  if (runExtensionE2EFallback) {
    await runCommand({
      label: "extension e2e fallback",
      command: npmCommand(),
      args: ["run", "e2e:extension:fallback"],
      env: baseEnv
    });
    summary.extensionE2EFallback = true;
  }

  if (runExtensionE2ETargeted) {
    const targetedEnv = targetedResultsOverride
      ? {
          ...baseEnv,
          E2E_TARGET_RESULTS: targetedResultsOverride
        }
      : baseEnv;
    await runCommand({
      label: "extension e2e targeted",
      command: npmCommand(),
      args: ["run", "e2e:extension:targeted"],
      env: targetedEnv
    });
    summary.extensionE2ETargeted = true;
    summary.extensionE2ETargetResults = targetedResultsOverride ? Number(targetedResultsOverride) : 12;
  }

  if (runExtensionE2ELongPagination) {
    const longEnv = {
      ...baseEnv
    };
    if (longTotalRowsOverride) {
      longEnv.E2E_LONG_TOTAL_ROWS = longTotalRowsOverride;
    }
    if (longBatchSizeOverride) {
      longEnv.E2E_LONG_BATCH_SIZE = longBatchSizeOverride;
    }
    await runCommand({
      label: "extension e2e long pagination",
      command: npmCommand(),
      args: ["run", "e2e:extension:long-pagination"],
      env: longEnv
    });
    summary.extensionE2ELongPagination = true;
    summary.extensionE2ELongTotalRows = longTotalRowsOverride ? Number(longTotalRowsOverride) : 1500;
    summary.extensionE2ELongBatchSize = longBatchSizeOverride ? Number(longBatchSizeOverride) : 6;
  }

  if (runExtensionE2ENavigateCycle) {
    await runCommand({
      label: "extension e2e navigate cycle",
      command: npmCommand(),
      args: ["run", "e2e:extension:navigate-cycle"],
      env: baseEnv
    });
    summary.extensionE2ENavigateCycle = true;
  }

  await runBasicApiPass({
    baseEnv,
    baseUrl
  });
  summary.controlApiSmoke = true;

  if (runCloudPass) {
    await runCloudApiPass({
      baseEnv,
      baseUrl
    });
    summary.cloudSmoke = true;
  } else {
    summary.skippedCloudReason = hasDatabase
      ? "SKIP_CLOUD_HARDENING=true"
      : "DATABASE_URL not set (cloud endpoints require DB)";
  }

  summary.ok = true;
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(`[local-hardening-pass] failed: ${error.message}`);
  process.exit(1);
});
