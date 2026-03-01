const TARGET_RESULTS_MIN = 1;
const TARGET_RESULTS_MAX = 500;

function parseTargetedResults(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) {
    throw new Error("Missing targeted results input");
  }
  if (!/^\d+$/.test(raw)) {
    throw new Error(
      `targeted_results must be an integer in ${TARGET_RESULTS_MIN}-${TARGET_RESULTS_MAX}, received "${raw}"`
    );
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < TARGET_RESULTS_MIN || parsed > TARGET_RESULTS_MAX) {
    throw new Error(`targeted_results must be in ${TARGET_RESULTS_MIN}-${TARGET_RESULTS_MAX}, received "${raw}"`);
  }
  return parsed;
}

function main() {
  const sourceRaw = process.env.TARGETED_RESULTS_INPUT || process.env.E2E_TARGET_RESULTS;
  const targetedResults = parseTargetedResults(sourceRaw);
  console.log(
    JSON.stringify(
      {
        ok: true,
        targetedResults
      },
      null,
      2
    )
  );
}

main();
