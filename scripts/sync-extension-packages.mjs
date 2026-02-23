import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");
const vendorDir = resolve(rootDir, "packages", "extension", "vendor");

async function syncPackage(packageName) {
  const source = resolve(rootDir, "packages", packageName);
  const destination = resolve(vendorDir, packageName);
  await cp(source, destination, {
    recursive: true,
    force: true
  });
}

async function main() {
  await rm(vendorDir, { recursive: true, force: true });
  await mkdir(vendorDir, { recursive: true });

  for (const packageName of ["shared", "core", "storage"]) {
    await syncPackage(packageName);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        vendorDir,
        synced: ["shared", "core", "storage"]
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[sync-extension-packages] failed: ${error.message}`);
  process.exit(1);
});
