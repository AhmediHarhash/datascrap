"use strict";

require("dotenv").config();

const { closePool } = require("../src/db/pool");
const { runMigrations } = require("../src/db/migrations");

async function main() {
  const result = await runMigrations();
  console.log(`[migrate] done. applied=${result.applied} total=${result.totalFiles}`);
}

main()
  .then(async () => {
    await closePool();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("[migrate] failed:", error.message);
    await closePool();
    process.exit(1);
  });

