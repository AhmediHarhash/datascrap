import { __internal } from "../packages/extension/background/export-service.mjs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function bytesContainAscii(bytes, text) {
  const target = new TextEncoder().encode(text);
  if (target.length === 0) return true;
  for (let i = 0; i <= bytes.length - target.length; i += 1) {
    let ok = true;
    for (let j = 0; j < target.length; j += 1) {
      if (bytes[i + j] !== target[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

async function main() {
  const rows = [
    {
      rowData: {
        name: "Alpha Gadget",
        price: 99.5,
        inStock: true,
        notes: 'Line "A"\nLine "B"'
      }
    },
    {
      rowData: {
        name: "Beta Widget",
        price: 120,
        inStock: false,
        notes: ""
      }
    }
  ];

  const columns = __internal.toColumns(rows);
  assert(columns.length === 4, "column detection failed");

  const csv = __internal.toCsv(columns, rows);
  assert(csv.includes("Alpha Gadget"), "csv missing row value");
  assert(csv.includes('\"Line \"\"A\"\"'), "csv escaping failed");

  const json = __internal.toJson(rows);
  const parsed = JSON.parse(json);
  assert(Array.isArray(parsed) && parsed.length === 2, "json row count mismatch");
  assert(parsed[0].name === "Alpha Gadget", "json first row mismatch");

  const tsv = __internal.toTsv(columns, rows);
  assert(tsv.split("\n").length === 3, "tsv line count mismatch");
  assert(tsv.includes("Beta Widget"), "tsv missing value");

  const xlsxBytes = __internal.toXlsx(columns, rows);
  assert(xlsxBytes[0] === 0x50 && xlsxBytes[1] === 0x4b, "xlsx zip signature missing");
  assert(bytesContainAscii(xlsxBytes, "xl/worksheets/sheet1.xml"), "xlsx worksheet entry missing");
  assert(bytesContainAscii(xlsxBytes, "Alpha Gadget"), "xlsx cell text missing");
  assert(bytesContainAscii(xlsxBytes, "[Content_Types].xml"), "xlsx content types missing");

  console.log(
    JSON.stringify(
      {
        ok: true,
        columns,
        csvLength: csv.length,
        jsonLength: json.length,
        xlsxBytes: xlsxBytes.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-epic5] failed: ${error.message}`);
  process.exit(1);
});
