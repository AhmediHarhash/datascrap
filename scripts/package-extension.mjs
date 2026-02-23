import { spawn } from "node:child_process";
import { copyFile, mkdir, readFile, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, "..");
const extensionDir = resolve(rootDir, "packages", "extension");
const manifestPath = resolve(extensionDir, "manifest.json");
const outputDir = resolve(rootDir, "dist", "extension");

function sanitizeSlug(value, fallback) {
  const slug = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

function assertSemver(version) {
  const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/;
  if (!semverPattern.test(String(version || ""))) {
    throw new Error(`manifest version must be semver. got "${version}"`);
  }
}

function runCommand(command, args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      stdio: "inherit",
      shell: false
    });
    child.on("error", rejectRun);
    child.on("exit", (code) => {
      if (code === 0) {
        resolveRun();
        return;
      }
      rejectRun(new Error(`${command} exited with code ${code}`));
    });
  });
}

function runCommandCapture(command, args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", rejectRun);
    child.on("exit", (code) => {
      if (code === 0) {
        resolveRun(stdout);
        return;
      }
      rejectRun(new Error(`${command} exited with code ${code}: ${stderr.trim()}`));
    });
  });
}

async function validateArchive(zipPath) {
  const tarBinary = process.platform === "win32" ? "tar.exe" : "tar";
  const rawList = await runCommandCapture(tarBinary, ["-tf", zipPath]);
  const entries = rawList
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^\.\//, ""))
    .filter(Boolean);

  const requiredEntries = [
    "manifest.json",
    "background/service-worker.mjs",
    "sidepanel/index.html",
    "sidepanel/index.mjs",
    "content/picker-overlay.js",
    "vendor/shared/src/messages.mjs"
  ];

  const missing = requiredEntries.filter((entry) => !entries.includes(entry));
  if (missing.length > 0) {
    throw new Error(`archive missing required files: ${missing.join(", ")}`);
  }

  return entries.length;
}

async function packageExtension() {
  const manifestRaw = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(manifestRaw);
  assertSemver(manifest.version);

  const extensionName = sanitizeSlug(manifest.name, "datascrap");
  const version = manifest.version;
  const releaseName = `${extensionName}-v${version}.zip`;
  const releasePath = resolve(outputDir, releaseName);
  const latestPath = resolve(outputDir, `${extensionName}-latest.zip`);

  await mkdir(outputDir, { recursive: true });
  await rm(releasePath, { force: true });
  await rm(latestPath, { force: true });

  const tarBinary = process.platform === "win32" ? "tar.exe" : "tar";
  await runCommand(tarBinary, ["-a", "-cf", releasePath, "-C", extensionDir, "."]);
  await copyFile(releasePath, latestPath);
  const entryCount = await validateArchive(releasePath);

  const summary = {
    ok: true,
    manifest: manifestPath,
    version,
    artifact: releasePath,
    latestArtifact: latestPath,
    archiveEntries: entryCount
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

packageExtension().catch((error) => {
  process.stderr.write(`[package-extension] failed: ${error.message}\n`);
  process.exitCode = 1;
});
