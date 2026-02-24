import { spawn } from "node:child_process";

function parseArgs(argv = []) {
  const options = {
    target: "local",
    maps: false
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
    }
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
