const textEncoder = new TextEncoder();

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let j = 0; j < 8; j += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toText(value) {
  return String(value === undefined || value === null ? "" : value);
}

function csvEscape(value) {
  const text = toText(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, "\"\"")}"`;
}

function tsvEscape(value) {
  return toText(value).replace(/\r?\n/g, " ").replace(/\t/g, " ");
}

function xmlEscape(value) {
  return toText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function concatBytes(chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

function uint16LE(value) {
  const buffer = new ArrayBuffer(2);
  const view = new DataView(buffer);
  view.setUint16(0, value, true);
  return new Uint8Array(buffer);
}

function uint32LE(value) {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setUint32(0, value >>> 0, true);
  return new Uint8Array(buffer);
}

function columnIndexToName(columnIndexZeroBased) {
  let index = Number(columnIndexZeroBased) + 1;
  let result = "";
  while (index > 0) {
    const remainder = (index - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    index = Math.floor((index - 1) / 26);
  }
  return result || "A";
}

function zipStore(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = textEncoder.encode(file.name);
    const data = file.data instanceof Uint8Array ? file.data : textEncoder.encode(String(file.data || ""));
    const checksum = crc32(data);
    const localHeader = concatBytes([
      uint32LE(0x04034b50),
      uint16LE(20),
      uint16LE(0),
      uint16LE(0),
      uint16LE(0),
      uint16LE(0),
      uint32LE(checksum),
      uint32LE(data.length),
      uint32LE(data.length),
      uint16LE(nameBytes.length),
      uint16LE(0),
      nameBytes
    ]);
    localParts.push(localHeader, data);

    const centralHeader = concatBytes([
      uint32LE(0x02014b50),
      uint16LE(20),
      uint16LE(20),
      uint16LE(0),
      uint16LE(0),
      uint16LE(0),
      uint16LE(0),
      uint32LE(checksum),
      uint32LE(data.length),
      uint32LE(data.length),
      uint16LE(nameBytes.length),
      uint16LE(0),
      uint16LE(0),
      uint16LE(0),
      uint16LE(0),
      uint32LE(0),
      uint32LE(offset),
      nameBytes
    ]);
    centralParts.push(centralHeader);

    offset += localHeader.length + data.length;
  }

  const centralDir = concatBytes(centralParts);
  const localDir = concatBytes(localParts);
  const endRecord = concatBytes([
    uint32LE(0x06054b50),
    uint16LE(0),
    uint16LE(0),
    uint16LE(files.length),
    uint16LE(files.length),
    uint32LE(centralDir.length),
    uint32LE(localDir.length),
    uint16LE(0)
  ]);
  return concatBytes([localDir, centralDir, endRecord]);
}

function toColumns(rows) {
  const columns = [];
  const seen = new Set();
  for (const row of rows) {
    const data = row?.rowData && typeof row.rowData === "object" ? row.rowData : {};
    for (const key of Object.keys(data)) {
      if (seen.has(key)) continue;
      seen.add(key);
      columns.push(key);
    }
  }
  return columns;
}

function filterRows(rows, { search = "", filterColumn = "", filterValue = "" } = {}) {
  const searchQuery = String(search || "").trim().toLowerCase();
  const columnName = String(filterColumn || "").trim();
  const columnQuery = String(filterValue || "").trim().toLowerCase();

  return (Array.isArray(rows) ? rows : []).filter((row) => {
    const data = row?.rowData && typeof row.rowData === "object" ? row.rowData : {};
    const matchesSearch =
      !searchQuery ||
      Object.values(data).some((value) => toText(value).toLowerCase().includes(searchQuery));
    const matchesColumn = !columnName || !columnQuery || toText(data[columnName]).toLowerCase().includes(columnQuery);
    return matchesSearch && matchesColumn;
  });
}

function toCsv(columns, rows) {
  const lines = [];
  lines.push(columns.map((column) => csvEscape(column)).join(","));
  for (const row of rows) {
    const data = row?.rowData && typeof row.rowData === "object" ? row.rowData : {};
    lines.push(columns.map((column) => csvEscape(data[column])).join(","));
  }
  return `\uFEFF${lines.join("\n")}`;
}

function toTsv(columns, rows) {
  const lines = [];
  lines.push(columns.map((column) => tsvEscape(column)).join("\t"));
  for (const row of rows) {
    const data = row?.rowData && typeof row.rowData === "object" ? row.rowData : {};
    lines.push(columns.map((column) => tsvEscape(data[column])).join("\t"));
  }
  return lines.join("\n");
}

function toJson(rows) {
  const values = rows.map((row) => (row?.rowData && typeof row.rowData === "object" ? row.rowData : {}));
  return JSON.stringify(values, null, 2);
}

function createXlsxCellXml(cellRef, value) {
  if (value === null || value === undefined || value === "") {
    return `<c r="${cellRef}" t="inlineStr"><is><t></t></is></c>`;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${cellRef}"><v>${value}</v></c>`;
  }
  if (typeof value === "boolean") {
    return `<c r="${cellRef}" t="b"><v>${value ? 1 : 0}</v></c>`;
  }
  const text = toText(value);
  const preserve = /^\s|\s$/.test(text) ? ' xml:space="preserve"' : "";
  return `<c r="${cellRef}" t="inlineStr"><is><t${preserve}>${xmlEscape(text)}</t></is></c>`;
}

function toXlsx(columns, rows) {
  const sheetRowsXml = [];
  const headerCells = columns
    .map((column, columnIndex) => createXlsxCellXml(`${columnIndexToName(columnIndex)}1`, column))
    .join("");
  sheetRowsXml.push(`<row r="1">${headerCells}</row>`);

  rows.forEach((row, rowIndex) => {
    const data = row?.rowData && typeof row.rowData === "object" ? row.rowData : {};
    const rowNumber = rowIndex + 2;
    const cellXml = columns
      .map((column, columnIndex) =>
        createXlsxCellXml(`${columnIndexToName(columnIndex)}${rowNumber}`, data[column])
      )
      .join("");
    sheetRowsXml.push(`<row r="${rowNumber}">${cellXml}</row>`);
  });

  const worksheetXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    "<sheetData>" +
    sheetRowsXml.join("") +
    "</sheetData>" +
    "</worksheet>";

  const workbookXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    "<sheets>" +
    '<sheet name="Sheet1" sheetId="1" r:id="rId1"/>' +
    "</sheets>" +
    "</workbook>";

  const stylesXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>' +
    '<fills count="1"><fill><patternFill patternType="none"/></fill></fills>' +
    '<borders count="1"><border/></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>' +
    "</styleSheet>";

  const workbookRelsXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    "</Relationships>";

  const rootRelsXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    "</Relationships>";

  const contentTypesXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    "</Types>";

  return zipStore([
    { name: "[Content_Types].xml", data: textEncoder.encode(contentTypesXml) },
    { name: "_rels/.rels", data: textEncoder.encode(rootRelsXml) },
    { name: "xl/workbook.xml", data: textEncoder.encode(workbookXml) },
    { name: "xl/_rels/workbook.xml.rels", data: textEncoder.encode(workbookRelsXml) },
    { name: "xl/worksheets/sheet1.xml", data: textEncoder.encode(worksheetXml) },
    { name: "xl/styles.xml", data: textEncoder.encode(stylesXml) }
  ]);
}

function buildFilename(tableDataId, extension) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeTable = String(tableDataId || "table").slice(0, 8);
  return `datascrap_${safeTable}_${stamp}.${extension}`;
}

function callChromeApi(fn, ...args) {
  return new Promise((resolve, reject) => {
    fn(...args, (result) => {
      const lastError = globalThis.chrome?.runtime?.lastError;
      if (lastError) {
        reject(new Error(lastError.message || "Chrome API error"));
        return;
      }
      resolve(result);
    });
  });
}

async function triggerDownload({ chromeApi = chrome, filename, mimeType, bytes }) {
  const blob = new Blob([bytes], {
    type: mimeType
  });
  const url = URL.createObjectURL(blob);
  try {
    return await callChromeApi(chromeApi.downloads.download.bind(chromeApi.downloads), {
      url,
      filename,
      saveAs: false,
      conflictAction: "uniquify"
    });
  } finally {
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60_000);
  }
}

async function loadRowsForExport({
  storageClient,
  tableDataId,
  search = "",
  filterColumn = "",
  filterValue = "",
  limit = 5000
}) {
  const rows = await storageClient.tableRows.listByTableDataId(tableDataId, {
    limit: clamp(Number(limit || 5000), 1, 20000)
  });
  const filteredRows = filterRows(rows, {
    search,
    filterColumn,
    filterValue
  });
  const columns = toColumns(filteredRows);
  return {
    columns,
    rows: filteredRows
  };
}

export async function buildClipboardExport({
  storageClient,
  tableDataId,
  search = "",
  filterColumn = "",
  filterValue = "",
  limit = 5000
}) {
  const { columns, rows } = await loadRowsForExport({
    storageClient,
    tableDataId,
    search,
    filterColumn,
    filterValue,
    limit
  });
  return {
    tableDataId,
    rowCount: rows.length,
    columnCount: columns.length,
    columns,
    text: toTsv(columns, rows)
  };
}

export async function exportTableToFile({
  storageClient,
  permissionManager,
  chromeApi = chrome,
  tableDataId,
  format = "csv",
  search = "",
  filterColumn = "",
  filterValue = "",
  limit = 5000
}) {
  const allowed = await permissionManager.ensureOperation("export.file");
  if (!allowed?.allowed) {
    throw new Error("Download permission denied by user");
  }

  const { columns, rows } = await loadRowsForExport({
    storageClient,
    tableDataId,
    search,
    filterColumn,
    filterValue,
    limit
  });

  const normalizedFormat = String(format || "csv").trim().toLowerCase();
  let extension = "csv";
  let mimeType = "text/csv;charset=utf-8";
  let bytes = textEncoder.encode(toCsv(columns, rows));

  if (normalizedFormat === "json") {
    extension = "json";
    mimeType = "application/json;charset=utf-8";
    bytes = textEncoder.encode(toJson(rows));
  } else if (normalizedFormat === "xlsx") {
    extension = "xlsx";
    mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    bytes = toXlsx(columns, rows);
  }

  const filename = buildFilename(tableDataId, extension);
  const downloadId = await triggerDownload({
    chromeApi,
    filename,
    mimeType,
    bytes
  });

  return {
    tableDataId,
    format: normalizedFormat,
    filename,
    downloadId,
    rowCount: rows.length,
    columnCount: columns.length,
    columns
  };
}

export const __internal = Object.freeze({
  toCsv,
  toJson,
  toXlsx,
  toColumns,
  filterRows,
  toTsv
});
