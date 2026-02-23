import { executeInTab, getActiveTab } from "./chrome-utils.mjs";

function toText(value) {
  return String(value === undefined || value === null ? "" : value);
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

function detectImageExt(urlValue) {
  const url = String(urlValue || "").trim();
  if (!url) return "img";
  try {
    const parsed = new URL(url);
    const name = parsed.pathname.split("/").pop() || "";
    const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
    if (ext) return ext.replace(/[^a-z0-9]/g, "") || "img";
    return "img";
  } catch (_error) {
    const fallback = url.split("?")[0].split("#")[0];
    const ext = fallback.includes(".") ? fallback.split(".").pop().toLowerCase() : "";
    return ext.replace(/[^a-z0-9]/g, "") || "img";
  }
}

function sizeCategory(width, height) {
  const w = Number(width || 0);
  const h = Number(height || 0);
  const area = Math.max(0, w) * Math.max(0, h);
  if (area < 50_000) return "small";
  if (area < 250_000) return "medium";
  return "large";
}

function sanitizeSegment(value, fallback = "item") {
  const cleaned = toText(value)
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]+/g, "_")
    .replace(/\s+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || fallback;
}

function renderNamingPattern(pattern, image, index) {
  const template = String(pattern || "image_{index}_{width}x{height}.{ext}");
  const host = (() => {
    try {
      return new URL(String(image?.url || "")).host || "site";
    } catch (_error) {
      return "site";
    }
  })();

  const replacements = Object.freeze({
    "{index}": String(index),
    "{width}": String(Math.max(0, Number(image?.width || 0))),
    "{height}": String(Math.max(0, Number(image?.height || 0))),
    "{ext}": sanitizeSegment(image?.ext || detectImageExt(image?.url || ""), "img"),
    "{host}": sanitizeSegment(host, "site"),
    "{alt}": sanitizeSegment(image?.alt || "", "image")
  });

  let output = template;
  for (const [token, value] of Object.entries(replacements)) {
    output = output.split(token).join(value);
  }

  output = sanitizeSegment(output, `image_${index}`);
  if (!/\.[a-z0-9]{2,5}$/i.test(output)) {
    output = `${output}.${replacements["{ext}"]}`;
  }

  return output.slice(0, 170);
}

function normalizeScannedImages(images) {
  const seen = new Set();
  const output = [];
  for (const image of Array.isArray(images) ? images : []) {
    const url = toText(image?.url).trim();
    if (!url || seen.has(url)) continue;
    if (!/^https?:\/\//i.test(url)) continue;
    seen.add(url);
    const width = Math.max(0, Number(image?.width || 0));
    const height = Math.max(0, Number(image?.height || 0));
    const ext = detectImageExt(url);
    output.push({
      url,
      alt: toText(image?.alt).trim(),
      width,
      height,
      ext,
      sizeCategory: sizeCategory(width, height),
      type: toText(image?.type).trim() || "img"
    });
  }
  return output;
}

export async function scanActiveTabImages({
  chromeApi = chrome,
  permissionManager
}) {
  const tab = await getActiveTab(chromeApi);
  if (!tab?.id) {
    throw new Error("No active tab found");
  }

  const access = await permissionManager.ensureOperation("extract.page", {
    url: tab.url
  });
  if (!access?.allowed) {
    throw new Error("Host permission denied by user");
  }

  const injected = await executeInTab({
    tabId: tab.id,
    chromeApi,
    world: "MAIN",
    func: () => {
      const list = [];
      const seen = new Set();
      for (const node of Array.from(document.images || [])) {
        const url = String(node.currentSrc || node.src || "").trim();
        if (!url || seen.has(url)) continue;
        seen.add(url);
        list.push({
          url,
          alt: String(node.alt || "").trim(),
          width: Number(node.naturalWidth || node.width || 0),
          height: Number(node.naturalHeight || node.height || 0),
          type: node.tagName.toLowerCase()
        });
      }
      return {
        pageUrl: String(location.href || ""),
        pageTitle: String(document.title || ""),
        images: list
      };
    }
  });

  const result = injected?.[0]?.result || {};
  const images = normalizeScannedImages(result.images);
  return {
    pageUrl: toText(result.pageUrl),
    pageTitle: toText(result.pageTitle),
    count: images.length,
    images
  };
}

export async function downloadImages({
  chromeApi = chrome,
  permissionManager,
  images,
  namingPattern = "image_{index}_{width}x{height}.{ext}",
  onProgress = null
}) {
  const access = await permissionManager.ensureOperation("download.images");
  if (!access?.allowed) {
    throw new Error("Downloads permission denied by user");
  }

  const selected = normalizeScannedImages(images);
  const total = selected.length;
  let completed = 0;
  const failures = [];
  const downloadIds = [];

  for (let index = 0; index < selected.length; index += 1) {
    const image = selected[index];
    const filename = renderNamingPattern(namingPattern, image, index + 1);
    try {
      const downloadId = await callChromeApi(chromeApi.downloads.download.bind(chromeApi.downloads), {
        url: image.url,
        filename,
        saveAs: false,
        conflictAction: "uniquify"
      });
      completed += 1;
      downloadIds.push({
        url: image.url,
        filename,
        downloadId
      });
      if (typeof onProgress === "function") {
        onProgress({
          index: index + 1,
          total,
          completed,
          failed: failures.length,
          currentUrl: image.url,
          currentFilename: filename,
          status: "success"
        });
      }
    } catch (error) {
      failures.push({
        url: image.url,
        filename,
        message: error.message
      });
      if (typeof onProgress === "function") {
        onProgress({
          index: index + 1,
          total,
          completed,
          failed: failures.length,
          currentUrl: image.url,
          currentFilename: filename,
          status: "failed",
          message: error.message
        });
      }
    }
  }

  return {
    total,
    completed,
    failed: failures.length,
    failures,
    downloads: downloadIds
  };
}
