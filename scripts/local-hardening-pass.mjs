import "dotenv/config";

import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

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
  const baseUrl = process.env.API_BASE_URL || "http://127.0.0.1:3000";
  const hasDatabase = hasValue(process.env.DATABASE_URL);
  const runCloudPass = hasDatabase && !toBool(process.env.SKIP_CLOUD_HARDENING);
  const runExtensionE2EMaps = toBool(process.env.RUN_EXTENSION_E2E_MAPS);
  const runExtensionE2E = toBool(process.env.RUN_EXTENSION_E2E) || runExtensionE2EMaps;

  const baseEnv = {
    ...process.env,
    API_BASE_URL: baseUrl,
    REQUIRE_DB: process.env.REQUIRE_DB || "false"
  };

  const summary = {
    ok: false,
    baseUrl,
    hasDatabase,
    extensionSmoke: false,
    extensionE2E: false,
    extensionE2EMaps: false,
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
