export function delay(ms) {
  const waitMs = Number.isFinite(Number(ms)) ? Number(ms) : 0;
  if (waitMs <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, waitMs));
}

export function createAbortError(message = "Automation stopped") {
  const error = new Error(message);
  error.code = "AUTOMATION_ABORTED";
  return error;
}

export function throwIfAborted(signal, message = "Automation stopped") {
  if (signal?.aborted) {
    throw createAbortError(message);
  }
}

export function createId(prefix = "id") {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  const suffix = Math.random().toString(16).slice(2);
  return `${prefix}-${Date.now()}-${suffix}`;
}
