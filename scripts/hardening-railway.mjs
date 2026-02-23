import { spawn } from "node:child_process";

function shellOnWindows() {
  return process.platform === "win32";
}

function npmCommand() {
  return "npm";
}

function railwayCommand() {
  return "railway";
}

async function runCommandCapture({ label, command, args, env = process.env, cwd = process.cwd() }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      shell: shellOnWindows(),
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(`${label} failed with exit code ${code}${stderr ? `: ${stderr.trim()}` : ""}`));
    });
  });
}

async function runCommandInherit({ label, command, args, env = process.env, cwd = process.cwd() }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      shell: shellOnWindows(),
      stdio: "inherit"
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

function parseKv(raw) {
  const result = new Map();
  const lines = String(raw || "").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!key) continue;
    result.set(key, value);
  }
  return result;
}

function redactUrlHost(value) {
  try {
    const parsed = new URL(value);
    return parsed.host;
  } catch {
    return "unknown";
  }
}

async function fetchRailwayVars(serviceName) {
  const { stdout } = await runCommandCapture({
    label: `railway variable list (${serviceName})`,
    command: railwayCommand(),
    args: ["variable", "list", "-s", serviceName, "-k"]
  });
  const vars = parseKv(stdout);
  if (vars.size === 0) {
    throw new Error(`No variables were returned for service "${serviceName}"`);
  }
  return vars;
}

async function main() {
  const postgresService = process.env.RAILWAY_POSTGRES_SERVICE || "Postgres";
  const controlApiService = process.env.RAILWAY_CONTROL_API_SERVICE || "control-api";
  const databaseVar = process.env.RAILWAY_DATABASE_VAR || "DATABASE_PUBLIC_URL";

  console.log(
    `[hardening:railway] Loading Railway variables (postgres="${postgresService}", controlApi="${controlApiService}")`
  );

  const postgresVars = await fetchRailwayVars(postgresService);
  const controlApiVars = await fetchRailwayVars(controlApiService);

  const databaseUrl = postgresVars.get(databaseVar);
  if (!databaseUrl) {
    const availableKeys = Array.from(postgresVars.keys()).join(", ");
    throw new Error(
      `Missing "${databaseVar}" on Railway service "${postgresService}". Available keys: ${availableKeys}`
    );
  }

  const exportedEnv = {
    ...process.env,
    DATABASE_URL: databaseUrl
  };

  const copiedControlVars = ["VAULT_MASTER_KEY", "JWT_ACCESS_SECRET", "OBSERVABILITY_API_KEY"];
  const appliedVars = ["DATABASE_URL"];

  for (const key of copiedControlVars) {
    const value = controlApiVars.get(key);
    if (!value) continue;
    exportedEnv[key] = value;
    appliedVars.push(key);
  }

  console.log(
    `[hardening:railway] Using ${databaseVar} from "${postgresService}" (host=${redactUrlHost(databaseUrl)})`
  );
  console.log(`[hardening:railway] Applied env keys: ${appliedVars.join(", ")}`);

  await runCommandInherit({
    label: "test:local:hardening",
    command: npmCommand(),
    args: ["run", "test:local:hardening"],
    env: exportedEnv
  });

  console.log("[hardening:railway] Completed successfully.");
}

main().catch((error) => {
  console.error(`[hardening:railway] failed: ${error.message}`);
  process.exit(1);
});
