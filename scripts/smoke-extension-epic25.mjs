import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const sidepanelJs = await readFile(resolve("packages/extension/sidepanel/index.mjs"), "utf8");

  const requiredTokens = [
    "pointFollowStartOptions: null,",
    "async function onPointAndFollow(options = {}) {",
    "state.pointFollowStartOptions = startOptions;",
    "const runPointFollowFallback = async ({ fromStrategy = \"\", reasonText = \"\", startOptions = null } = {}) => {",
    "const guidedReady = await onPointAndFollow({",
    "const started = await onStart(state.pointFollowStartOptions || {});",
    "state.pointFollowStartOptions = null;"
  ];

  for (const token of requiredTokens) {
    assert(sidepanelJs.includes(token), `missing guided fallback override token: ${token}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedTokens: requiredTokens.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-epic25] failed: ${error.message}`);
  process.exit(1);
});
