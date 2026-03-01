import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

export function createRunProfileDir(tag = "e2e") {
  const safeTag = String(tag || "e2e")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "e2e";
  const runId = `${Date.now()}-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
  return resolve(".tmp", `pw-extension-profile-${safeTag}-${runId}`);
}

export function parseExtensionId(serviceWorkerUrl) {
  const raw = String(serviceWorkerUrl || "").trim();
  const match = raw.match(/^chrome-extension:\/\/([^/]+)\//i);
  return match ? match[1] : "";
}

export async function patchPermissionApis(page, options = {}) {
  const includeChangeFlags = Boolean(options?.includeChangeFlags);
  return page.evaluate(({ includeChangeFlags: includeFlags }) => {
    if (!globalThis.chrome?.permissions) {
      return {
        patched: false,
        reason: "chrome.permissions unavailable"
      };
    }
    try {
      const originalContains = globalThis.chrome.permissions.contains;
      const originalRequest = globalThis.chrome.permissions.request;
      globalThis.chrome.permissions.contains = (_details, callback) => {
        if (typeof callback === "function") callback(true);
      };
      globalThis.chrome.permissions.request = (_details, callback) => {
        if (typeof callback === "function") callback(true);
      };
      const result = {
        patched: true
      };
      if (includeFlags) {
        result.containsChanged = originalContains !== globalThis.chrome.permissions.contains;
        result.requestChanged = originalRequest !== globalThis.chrome.permissions.request;
      }
      return result;
    } catch (error) {
      return {
        patched: false,
        reason: String(error?.message || error)
      };
    }
  }, { includeChangeFlags });
}

export function parseHistoryRowCount(historyText, tableRowCount = 0) {
  const raw = String(historyText || "");
  const byPipe = raw.match(/\brows\s+(\d+)\b/i);
  if (byPipe?.[1]) return Number(byPipe[1]);
  const byParen = raw.match(/\((\d+)\s+rows\)/i);
  if (byParen?.[1]) return Number(byParen[1]);
  return Math.max(0, Number(tableRowCount || 0));
}

export function parseIntegerEnv(rawValue, { name, min, max, fallback }) {
  const raw = String(rawValue || "").trim();
  if (!raw) return fallback;
  if (!/^\d+$/.test(raw)) {
    throw new Error(`${name} must be an integer in ${min}-${max}, received "${raw}"`);
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be in ${min}-${max}, received "${raw}"`);
  }
  return parsed;
}

export async function removeDirWithRetries(dirPath, attempts = 6) {
  const totalAttempts = Number.isFinite(Number(attempts)) ? Math.max(1, Number(attempts)) : 6;
  for (let index = 0; index < totalAttempts; index += 1) {
    try {
      await rm(dirPath, {
        recursive: true,
        force: true
      });
      return;
    } catch (error) {
      const code = String(error?.code || "");
      const canRetry = code === "EBUSY" || code === "EPERM" || code === "ENOTEMPTY";
      if (!canRetry || index === totalAttempts - 1) {
        throw error;
      }
      await delay(120 * (index + 1));
    }
  }
}

export async function waitForExtensionServiceWorker(context, timeoutMs = 60000) {
  const deadline = Date.now() + Math.max(1, Number(timeoutMs) || 60000);
  const existing = context?.serviceWorkers?.()?.[0];
  if (existing) {
    return existing;
  }

  while (Date.now() < deadline) {
    const remainingMs = Math.max(1, deadline - Date.now());
    const waitMs = Math.min(5000, remainingMs);
    try {
      const serviceWorker = await context.waitForEvent("serviceworker", {
        timeout: waitMs
      });
      if (serviceWorker) {
        return serviceWorker;
      }
    } catch {
      // Retry until deadline; waitForEvent timeout is expected in sparse startup windows.
    }
    const snapshot = context?.serviceWorkers?.()?.[0];
    if (snapshot) {
      return snapshot;
    }
  }

  throw new Error(`Timed out waiting for extension service worker after ${timeoutMs}ms`);
}
