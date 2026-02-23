"use strict";

const { execFile } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const util = require("util");

const execFileAsync = util.promisify(execFile);

function intEnv(name, fallback) {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function run(command, args, options = {}) {
  try {
    return await execFileAsync(command, args, options);
  } catch (error) {
    const stderr = String(error.stderr || error.message || "").trim();
    throw new Error(`${command} failed: ${stderr || "unknown error"}`);
  }
}

async function main() {
  const databaseUrl = String(process.env.BACKUP_DATABASE_URL || process.env.DATABASE_URL || "").trim();
  if (!databaseUrl) {
    throw new Error("Missing BACKUP_DATABASE_URL (or DATABASE_URL fallback).");
  }

  const pgDumpBin = process.env.PG_DUMP_BIN || "pg_dump";
  const pgRestoreBin = process.env.PG_RESTORE_BIN || "pg_restore";
  const minBackupBytes = intEnv("MIN_BACKUP_BYTES", 10_000);
  const minBackupEntries = intEnv("MIN_BACKUP_ENTRIES", 20);
  const label = String(process.env.BACKUP_LABEL || "default").trim();

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "datascrap-backup-"));
  const backupPath = path.join(tempDir, `backup-${Date.now()}.dump`);
  const startedAt = Date.now();

  try {
    await run(pgDumpBin, [
      "--format=custom",
      "--no-owner",
      "--no-acl",
      "--file",
      backupPath,
      databaseUrl
    ]);

    const stats = fs.statSync(backupPath);
    if (stats.size < minBackupBytes) {
      throw new Error(`Backup file too small (${stats.size} bytes < ${minBackupBytes}).`);
    }

    const { stdout } = await run(pgRestoreBin, ["--list", backupPath]);
    const entries = String(stdout)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith(";"));

    if (entries.length < minBackupEntries) {
      throw new Error(`Backup catalog too small (${entries.length} entries < ${minBackupEntries}).`);
    }

    const durationMs = Date.now() - startedAt;
    const summary = {
      ok: true,
      label,
      bytes: stats.size,
      catalogEntries: entries.length,
      durationMs,
      timestamp: new Date().toISOString()
    };
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`[backup-verify] failed: ${error.message}`);
  process.exit(1);
});
