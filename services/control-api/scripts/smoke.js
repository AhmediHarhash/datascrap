"use strict";

const baseUrl = process.env.API_BASE_URL || "http://127.0.0.1:3000";

async function hit(path) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url);
  const body = await response.json();
  return { path, status: response.status, body };
}

async function main() {
  const checks = ["/healthz", "/readyz"];
  for (const path of checks) {
    const result = await hit(path);
    console.log(`${result.path}: ${result.status}`);
    console.log(JSON.stringify(result.body, null, 2));
  }
}

main().catch((error) => {
  console.error("[smoke] failed:", error.message);
  process.exit(1);
});

