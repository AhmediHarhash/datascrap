function stableSerialize(value) {
  if (value === null || value === undefined) {
    return "null";
  }

  const valueType = typeof value;
  if (valueType === "number" || valueType === "boolean") {
    return String(value);
  }
  if (valueType === "string") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => stableSerialize(item)).join(",");
    return `[${items}]`;
  }

  if (valueType === "object") {
    const keys = Object.keys(value).sort();
    const entries = keys.map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(",");
    return `{${entries}}`;
  }

  return JSON.stringify(String(value));
}

function fnv1a32(input) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = (hash >>> 0) * 0x01000193;
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function hashRowData(rowData) {
  return fnv1a32(stableSerialize(rowData));
}

export function buildDedupeKey(tableDataId, rowData) {
  return `${tableDataId}:${hashRowData(rowData)}`;
}
