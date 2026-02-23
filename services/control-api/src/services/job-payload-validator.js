"use strict";

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toText(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}

function isValidHttpUrl(value) {
  const input = toText(value);
  if (!input) return false;
  try {
    const parsed = new URL(input);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch (_error) {
    return false;
  }
}

function collectPayloadUrls(payload) {
  const urls = [];
  const targetUrl = toText(payload?.targetUrl);
  if (targetUrl) urls.push(targetUrl);

  if (Array.isArray(payload?.targetUrls)) {
    for (const item of payload.targetUrls) {
      const value = toText(item);
      if (value) urls.push(value);
    }
  }

  return urls;
}

function validateWebhookPayload(payload) {
  if (!isObject(payload)) {
    return "Webhook payload must be an object";
  }
  if (!isValidHttpUrl(payload.targetUrl)) {
    return "Webhook payload targetUrl must be a valid http/https URL";
  }
  if (toText(payload.eventType).length < 2) {
    return "Webhook payload eventType is required";
  }
  return null;
}

function validateExtractionSummaryPayload(payload) {
  if (!isObject(payload)) {
    return "Extraction payload must be an object";
  }

  const urlsToCheck = collectPayloadUrls(payload);
  if (urlsToCheck.length === 0) {
    return "Extraction payload requires targetUrl or targetUrls";
  }

  for (const url of urlsToCheck.slice(0, 10)) {
    if (!isValidHttpUrl(url)) {
      return "Extraction payload URLs must be valid http/https URLs";
    }
  }

  return null;
}

function validateMonitorNotifyWebhookPayload(webhookPayload) {
  if (!isObject(webhookPayload)) {
    return "Monitor notify webhook must be an object";
  }
  if (!isValidHttpUrl(webhookPayload.targetUrl)) {
    return "Monitor notify webhook targetUrl must be a valid http/https URL";
  }

  const eventType = toText(webhookPayload.eventType);
  if (eventType && eventType.length < 2) {
    return "Monitor notify webhook eventType must be at least 2 chars";
  }

  if (
    webhookPayload.timeoutMs !== undefined &&
    (!Number.isFinite(Number(webhookPayload.timeoutMs)) || Number(webhookPayload.timeoutMs) < 1000)
  ) {
    return "Monitor notify webhook timeoutMs must be >= 1000";
  }

  if (webhookPayload.headers !== undefined && !isObject(webhookPayload.headers)) {
    return "Monitor notify webhook headers must be an object";
  }

  if (webhookPayload.body !== undefined && !isObject(webhookPayload.body)) {
    return "Monitor notify webhook body must be an object";
  }

  if (webhookPayload.secretRef !== undefined) {
    if (!isObject(webhookPayload.secretRef)) {
      return "Monitor notify webhook secretRef must be an object";
    }
    const provider = toText(webhookPayload.secretRef.provider);
    const secretName = toText(webhookPayload.secretRef.secretName);
    if (!provider || !secretName) {
      return "Monitor notify webhook secretRef requires provider and secretName";
    }
  }

  return null;
}

function validateMonitorPageDiffPayload(payload) {
  if (!isObject(payload)) {
    return "Monitor payload must be an object";
  }

  const targetUrl = toText(payload.targetUrl);
  if (!targetUrl) {
    return "Monitor payload targetUrl is required";
  }
  if (!isValidHttpUrl(targetUrl)) {
    return "Monitor payload targetUrl must be a valid http/https URL";
  }

  const targetUrls = Array.isArray(payload.targetUrls) ? payload.targetUrls : [];
  if (targetUrls.some((item) => toText(item).length > 0)) {
    return "Monitor payload supports single targetUrl only";
  }

  const monitorKey = toText(payload.monitorKey);
  if (monitorKey && !/^[a-zA-Z0-9._:-]{3,120}$/.test(monitorKey)) {
    return "Monitor payload monitorKey must match [a-zA-Z0-9._:-]{3,120}";
  }

  if (payload.compare !== undefined && !isObject(payload.compare)) {
    return "Monitor payload compare must be an object";
  }

  if (payload.notify !== undefined) {
    if (!isObject(payload.notify)) {
      return "Monitor payload notify must be an object";
    }
    if (payload.notify.webhook !== undefined) {
      const notifyError = validateMonitorNotifyWebhookPayload(payload.notify.webhook);
      if (notifyError) return notifyError;
    }
  }

  return null;
}

function hasMonitorWebhookNotify(payload) {
  if (!isObject(payload?.notify) || !isObject(payload.notify.webhook)) {
    return false;
  }
  return isValidHttpUrl(payload.notify.webhook.targetUrl);
}

function validateJobPayloadByType(jobType, payload) {
  if (jobType === "integration.webhook.deliver") {
    const message = validateWebhookPayload(payload);
    return message
      ? {
          ok: false,
          errorType: "INVALID_WEBHOOK_PAYLOAD",
          message
        }
      : { ok: true };
  }

  if (jobType === "extraction.page.summary") {
    const message = validateExtractionSummaryPayload(payload);
    return message
      ? {
          ok: false,
          errorType: "INVALID_EXTRACTION_PAYLOAD",
          message
        }
      : { ok: true };
  }

  if (jobType === "monitor.page.diff") {
    const message = validateMonitorPageDiffPayload(payload);
    return message
      ? {
          ok: false,
          errorType: "INVALID_MONITOR_PAYLOAD",
          message
        }
      : { ok: true };
  }

  return { ok: true };
}

function requiresWebhookOptIn(jobType, payload) {
  if (jobType === "integration.webhook.deliver") return true;
  if (jobType === "monitor.page.diff") {
    return hasMonitorWebhookNotify(payload);
  }
  return false;
}

module.exports = {
  hasMonitorWebhookNotify,
  isValidHttpUrl,
  requiresWebhookOptIn,
  validateExtractionSummaryPayload,
  validateJobPayloadByType,
  validateMonitorPageDiffPayload,
  validateWebhookPayload
};
