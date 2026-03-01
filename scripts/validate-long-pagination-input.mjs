const LONG_TOTAL_ROWS_MIN = 300;
const LONG_TOTAL_ROWS_MAX = 5000;
const LONG_BATCH_SIZE_MIN = 1;
const LONG_BATCH_SIZE_MAX = 24;

function parseIntegerInput(rawValue, { label, min, max }) {
  const raw = String(rawValue || "").trim();
  if (!raw) {
    throw new Error(`Missing ${label} input`);
  }
  if (!/^\d+$/.test(raw)) {
    throw new Error(`${label} must be an integer in ${min}-${max}, received "${raw}"`);
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${label} must be in ${min}-${max}, received "${raw}"`);
  }
  return parsed;
}

function main() {
  const totalRowsRaw = process.env.LONG_TOTAL_ROWS_INPUT || process.env.E2E_LONG_TOTAL_ROWS;
  const batchSizeRaw = process.env.LONG_BATCH_SIZE_INPUT || process.env.E2E_LONG_BATCH_SIZE;

  const longTotalRows = parseIntegerInput(totalRowsRaw, {
    label: "long_total_rows",
    min: LONG_TOTAL_ROWS_MIN,
    max: LONG_TOTAL_ROWS_MAX
  });
  const longBatchSize = parseIntegerInput(batchSizeRaw, {
    label: "long_batch_size",
    min: LONG_BATCH_SIZE_MIN,
    max: LONG_BATCH_SIZE_MAX
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        longTotalRows,
        longBatchSize
      },
      null,
      2
    )
  );
}

main();
