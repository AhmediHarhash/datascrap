const STORAGE_KEY = "datascrap.activation.session.v1";

function createId(prefix = "id") {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toText(value) {
  return String(value === undefined || value === null ? "" : value);
}

function normalizeApiBaseUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  let parsed = null;
  try {
    parsed = new URL(raw);
  } catch (_error) {
    throw new Error("apiBaseUrl must be a valid URL");
  }
  if (!/^https?:$/i.test(parsed.protocol)) {
    throw new Error("apiBaseUrl must start with http:// or https://");
  }
  const normalized = `${parsed.protocol}//${parsed.host}${parsed.pathname || ""}`;
  return normalized.replace(/\/+$/, "");
}

function defaultSession() {
  return {
    apiBaseUrl: "",
    deviceId: "",
    deviceName: "Datascrap Extension",
    licenseKey: "",
    accessToken: "",
    refreshToken: "",
    refreshTokenExpiresAt: "",
    user: null,
    account: null,
    updatedAt: new Date().toISOString()
  };
}

function toPublicSession(session) {
  const normalized = session || defaultSession();
  return {
    apiBaseUrl: toText(normalized.apiBaseUrl),
    deviceId: toText(normalized.deviceId),
    deviceName: toText(normalized.deviceName),
    licenseKey: toText(normalized.licenseKey),
    refreshTokenExpiresAt: toText(normalized.refreshTokenExpiresAt),
    hasAccessToken: Boolean(normalized.accessToken),
    hasRefreshToken: Boolean(normalized.refreshToken),
    user: normalized.user || null,
    account: normalized.account || null,
    updatedAt: normalized.updatedAt || null
  };
}

function storageGet(chromeApi, key) {
  return new Promise((resolve, reject) => {
    chromeApi.storage.local.get(key, (value) => {
      const lastError = chromeApi.runtime?.lastError;
      if (lastError) {
        reject(new Error(lastError.message || "Failed to read extension storage"));
        return;
      }
      resolve(value || {});
    });
  });
}

function storageSet(chromeApi, patch) {
  return new Promise((resolve, reject) => {
    chromeApi.storage.local.set(patch, () => {
      const lastError = chromeApi.runtime?.lastError;
      if (lastError) {
        reject(new Error(lastError.message || "Failed to write extension storage"));
        return;
      }
      resolve(true);
    });
  });
}

async function readSession(chromeApi = chrome) {
  const raw = await storageGet(chromeApi, STORAGE_KEY);
  const current = raw?.[STORAGE_KEY] && typeof raw[STORAGE_KEY] === "object" ? raw[STORAGE_KEY] : {};
  const merged = {
    ...defaultSession(),
    ...current
  };
  if (!merged.deviceId) {
    merged.deviceId = createId("device");
  }
  if (!merged.deviceName) {
    merged.deviceName = "Datascrap Extension";
  }
  return merged;
}

async function writeSession(chromeApi, session) {
  const payload = {
    ...defaultSession(),
    ...(session || {}),
    updatedAt: new Date().toISOString()
  };
  await storageSet(chromeApi, {
    [STORAGE_KEY]: payload
  });
  return payload;
}

function createHeaders(accessToken = "", additionalHeaders = {}) {
  const headers = {
    "content-type": "application/json"
  };
  if (accessToken) {
    headers.authorization = `Bearer ${accessToken}`;
  }
  if (additionalHeaders && typeof additionalHeaders === "object") {
    for (const [key, value] of Object.entries(additionalHeaders)) {
      const headerName = String(key || "").trim();
      if (!headerName) continue;
      const headerValue = value === undefined || value === null ? "" : String(value);
      if (!headerValue) continue;
      headers[headerName] = headerValue;
    }
  }
  return headers;
}

async function requestJson({
  baseUrl,
  path,
  method = "GET",
  body = null,
  accessToken = "",
  additionalHeaders = {}
}) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    method,
    headers: createHeaders(accessToken, additionalHeaders),
    body: body === null || body === undefined ? undefined : JSON.stringify(body)
  });
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  let payload = null;
  if (contentType.includes("application/json")) {
    payload = await response.json().catch(() => ({}));
  } else {
    payload = {
      message: await response.text().catch(() => "")
    };
  }
  return {
    ok: response.ok,
    status: response.status,
    payload
  };
}

function getApiErrorMessage(result, fallback = "Request failed") {
  const payload = result?.payload || {};
  return (
    toText(payload.message || payload.error || payload.errorType || "").trim() ||
    `${fallback} (${Number(result?.status || 0)})`
  );
}

async function ensureApiAccess({ permissionManager, apiBaseUrl }) {
  const check = await permissionManager.ensureOperation("network.api", {
    apiBaseUrl
  });
  if (!check?.allowed) {
    throw new Error("API host permission denied by user");
  }
}

function requireApiBaseUrl(session, overrideValue = "") {
  const value = overrideValue ? normalizeApiBaseUrl(overrideValue) : normalizeApiBaseUrl(session.apiBaseUrl || "");
  if (!value) {
    throw new Error("apiBaseUrl is required");
  }
  return value;
}

function requireLicenseKey(session, overrideValue = "") {
  const key = toText(overrideValue || session.licenseKey || "").trim();
  if (!key) throw new Error("licenseKey is required");
  return key;
}

async function requestWithAuth({
  chromeApi,
  session,
  baseUrl,
  path,
  method = "GET",
  body = null,
  additionalHeaders = {}
}) {
  let current = { ...session };
  let result = await requestJson({
    baseUrl,
    path,
    method,
    body,
    accessToken: current.accessToken,
    additionalHeaders
  });

  if (result.status === 401 && current.refreshToken) {
    const refresh = await requestJson({
      baseUrl,
      path: "/api/auth/refresh",
      method: "POST",
      body: {
        refreshToken: current.refreshToken
      }
    });
    if (!refresh.ok) {
      throw new Error(getApiErrorMessage(refresh, "Session refresh failed"));
    }
    current = await writeSession(chromeApi, {
      ...current,
      accessToken: toText(refresh.payload?.accessToken),
      refreshToken: toText(refresh.payload?.refreshToken),
      refreshTokenExpiresAt: toText(refresh.payload?.refreshTokenExpiresAt),
      user: refresh.payload?.user || current.user || null,
      account: refresh.payload?.account || current.account || null
    });

    result = await requestJson({
      baseUrl,
      path,
      method,
      body,
      accessToken: current.accessToken,
      additionalHeaders
    });
  }

  if (!result.ok) {
    throw new Error(getApiErrorMessage(result));
  }
  return {
    session: current,
    result
  };
}

export async function getActivationSession({
  chromeApi = chrome
}) {
  const session = await readSession(chromeApi);
  const persisted = await writeSession(chromeApi, session);
  return {
    session: toPublicSession(persisted)
  };
}

export async function setActivationConfig({
  chromeApi = chrome,
  apiBaseUrl = "",
  deviceName = "",
  licenseKey = ""
}) {
  const current = await readSession(chromeApi);
  const next = await writeSession(chromeApi, {
    ...current,
    apiBaseUrl: apiBaseUrl ? normalizeApiBaseUrl(apiBaseUrl) : current.apiBaseUrl,
    deviceName: deviceName ? toText(deviceName).trim() : current.deviceName,
    licenseKey: licenseKey ? toText(licenseKey).trim() : current.licenseKey
  });
  return {
    session: toPublicSession(next)
  };
}

export async function activationRegister({
  chromeApi = chrome,
  permissionManager,
  apiBaseUrl = "",
  email = "",
  password = "",
  displayName = ""
}) {
  const current = await readSession(chromeApi);
  const baseUrl = requireApiBaseUrl(current, apiBaseUrl);
  await ensureApiAccess({
    permissionManager,
    apiBaseUrl: baseUrl
  });

  const result = await requestJson({
    baseUrl,
    path: "/api/auth/register",
    method: "POST",
    body: {
      email: toText(email).trim(),
      password: toText(password),
      displayName: toText(displayName).trim() || undefined
    }
  });
  if (!result.ok) {
    throw new Error(getApiErrorMessage(result, "Registration failed"));
  }

  const persisted = await writeSession(chromeApi, {
    ...current,
    apiBaseUrl: baseUrl
  });
  return {
    session: toPublicSession(persisted),
    registration: result.payload
  };
}

export async function activationLogin({
  chromeApi = chrome,
  permissionManager,
  apiBaseUrl = "",
  email = "",
  password = "",
  deviceName = ""
}) {
  const current = await readSession(chromeApi);
  const baseUrl = requireApiBaseUrl(current, apiBaseUrl);
  await ensureApiAccess({
    permissionManager,
    apiBaseUrl: baseUrl
  });

  const resolvedDeviceName = toText(deviceName).trim() || current.deviceName || "Datascrap Extension";
  const result = await requestJson({
    baseUrl,
    path: "/api/auth/login",
    method: "POST",
    body: {
      email: toText(email).trim(),
      password: toText(password),
      deviceId: current.deviceId,
      deviceName: resolvedDeviceName
    }
  });
  if (!result.ok) {
    throw new Error(getApiErrorMessage(result, "Login failed"));
  }

  const persisted = await writeSession(chromeApi, {
    ...current,
    apiBaseUrl: baseUrl,
    deviceName: resolvedDeviceName,
    accessToken: toText(result.payload?.accessToken),
    refreshToken: toText(result.payload?.refreshToken),
    refreshTokenExpiresAt: toText(result.payload?.refreshTokenExpiresAt),
    user: result.payload?.user || null,
    account: result.payload?.account || null
  });
  return {
    session: toPublicSession(persisted)
  };
}

export async function activationLogout({
  chromeApi = chrome,
  permissionManager
}) {
  const current = await readSession(chromeApi);
  const baseUrl = current.apiBaseUrl ? normalizeApiBaseUrl(current.apiBaseUrl) : "";
  if (baseUrl && current.refreshToken) {
    await ensureApiAccess({
      permissionManager,
      apiBaseUrl: baseUrl
    });
    await requestJson({
      baseUrl,
      path: "/api/auth/logout",
      method: "POST",
      body: {
        refreshToken: current.refreshToken
      }
    }).catch(() => null);
  }

  const persisted = await writeSession(chromeApi, {
    ...current,
    accessToken: "",
    refreshToken: "",
    refreshTokenExpiresAt: "",
    user: null,
    account: null
  });
  return {
    session: toPublicSession(persisted)
  };
}

export async function activationRefreshProfile({
  chromeApi = chrome,
  permissionManager
}) {
  const current = await readSession(chromeApi);
  const baseUrl = requireApiBaseUrl(current, "");
  await ensureApiAccess({
    permissionManager,
    apiBaseUrl: baseUrl
  });

  const { session, result } = await requestWithAuth({
    chromeApi,
    session: current,
    baseUrl,
    path: "/api/auth/me",
    method: "GET"
  });

  const persisted = await writeSession(chromeApi, {
    ...session,
    user: result.payload?.user || session.user || null,
    account: result.payload?.account || session.account || null
  });
  return {
    session: toPublicSession(persisted),
    profile: result.payload
  };
}

export async function activationRegisterLicense({
  chromeApi = chrome,
  permissionManager,
  licenseKey = ""
}) {
  const current = await readSession(chromeApi);
  const baseUrl = requireApiBaseUrl(current, "");
  await ensureApiAccess({
    permissionManager,
    apiBaseUrl: baseUrl
  });
  const resolvedLicenseKey = requireLicenseKey(current, licenseKey);
  const { session, result } = await requestWithAuth({
    chromeApi,
    session: current,
    baseUrl,
    path: "/api/license/register",
    method: "POST",
    body: {
      licenseKey: resolvedLicenseKey
    }
  });

  const persisted = await writeSession(chromeApi, {
    ...session,
    licenseKey: resolvedLicenseKey
  });
  return {
    session: toPublicSession(persisted),
    license: result.payload
  };
}

export async function activationLicenseStatus({
  chromeApi = chrome,
  permissionManager
}) {
  const current = await readSession(chromeApi);
  const baseUrl = requireApiBaseUrl(current, "");
  await ensureApiAccess({
    permissionManager,
    apiBaseUrl: baseUrl
  });

  const { session, result } = await requestWithAuth({
    chromeApi,
    session: current,
    baseUrl,
    path: "/api/license/status",
    method: "GET"
  });

  const persisted = await writeSession(chromeApi, {
    ...session,
    account: {
      ...(session.account || {}),
      ...(result.payload || {})
    }
  });

  return {
    session: toPublicSession(persisted),
    licenseStatus: result.payload
  };
}

export async function activationValidateDevice({
  chromeApi = chrome,
  permissionManager,
  licenseKey = ""
}) {
  const current = await readSession(chromeApi);
  const baseUrl = requireApiBaseUrl(current, "");
  await ensureApiAccess({
    permissionManager,
    apiBaseUrl: baseUrl
  });
  const resolvedLicenseKey = requireLicenseKey(current, licenseKey);

  const result = await requestJson({
    baseUrl,
    path: "/api/devices/validate-devices",
    method: "POST",
    body: {
      key: resolvedLicenseKey,
      deviceId: current.deviceId,
      deviceName: current.deviceName
    }
  });
  if (!result.ok) {
    throw new Error(getApiErrorMessage(result, "Device validation failed"));
  }

  const persisted = await writeSession(chromeApi, {
    ...current,
    licenseKey: resolvedLicenseKey
  });

  return {
    session: toPublicSession(persisted),
    validation: result.payload
  };
}

export async function activationListDevices({
  chromeApi = chrome,
  permissionManager,
  licenseKey = ""
}) {
  const current = await readSession(chromeApi);
  const baseUrl = requireApiBaseUrl(current, "");
  await ensureApiAccess({
    permissionManager,
    apiBaseUrl: baseUrl
  });
  const resolvedLicenseKey = requireLicenseKey(current, licenseKey);
  const result = await requestJson({
    baseUrl,
    path: "/api/devices",
    method: "POST",
    body: {
      key: resolvedLicenseKey
    }
  });
  if (!result.ok) {
    throw new Error(getApiErrorMessage(result, "Failed to list devices"));
  }

  const persisted = await writeSession(chromeApi, {
    ...current,
    licenseKey: resolvedLicenseKey
  });
  return {
    session: toPublicSession(persisted),
    devices: result.payload
  };
}

export async function activationRemoveDevice({
  chromeApi = chrome,
  permissionManager,
  licenseKey = "",
  deviceId = ""
}) {
  const current = await readSession(chromeApi);
  const baseUrl = requireApiBaseUrl(current, "");
  await ensureApiAccess({
    permissionManager,
    apiBaseUrl: baseUrl
  });
  const resolvedLicenseKey = requireLicenseKey(current, licenseKey);
  const resolvedDeviceId = toText(deviceId).trim();
  if (!resolvedDeviceId) {
    throw new Error("deviceId is required");
  }
  const result = await requestJson({
    baseUrl,
    path: "/api/devices/remove",
    method: "POST",
    body: {
      key: resolvedLicenseKey,
      deviceId: resolvedDeviceId
    }
  });
  if (!result.ok) {
    throw new Error(getApiErrorMessage(result, "Failed to remove device"));
  }

  const persisted = await writeSession(chromeApi, {
    ...current,
    licenseKey: resolvedLicenseKey
  });
  return {
    session: toPublicSession(persisted),
    result: result.payload
  };
}

export async function activationRenameDevice({
  chromeApi = chrome,
  permissionManager,
  licenseKey = "",
  deviceId = "",
  deviceName = ""
}) {
  const current = await readSession(chromeApi);
  const baseUrl = requireApiBaseUrl(current, "");
  await ensureApiAccess({
    permissionManager,
    apiBaseUrl: baseUrl
  });
  const resolvedLicenseKey = requireLicenseKey(current, licenseKey);
  const resolvedDeviceId = toText(deviceId).trim();
  const resolvedDeviceName = toText(deviceName).trim();
  if (!resolvedDeviceId || !resolvedDeviceName) {
    throw new Error("deviceId and deviceName are required");
  }
  const result = await requestJson({
    baseUrl,
    path: "/api/devices/rename",
    method: "POST",
    body: {
      key: resolvedLicenseKey,
      deviceId: resolvedDeviceId,
      deviceName: resolvedDeviceName
    }
  });
  if (!result.ok) {
    throw new Error(getApiErrorMessage(result, "Failed to rename device"));
  }

  const persisted = await writeSession(chromeApi, {
    ...current,
    licenseKey: resolvedLicenseKey,
    deviceName: resolvedDeviceId === current.deviceId ? resolvedDeviceName : current.deviceName
  });
  return {
    session: toPublicSession(persisted),
    result: result.payload
  };
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
}

function normalizeObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value;
}

async function requireCloudSession({
  chromeApi = chrome,
  permissionManager
}) {
  const current = await readSession(chromeApi);
  const baseUrl = requireApiBaseUrl(current, "");
  await ensureApiAccess({
    permissionManager,
    apiBaseUrl: baseUrl
  });
  return {
    current,
    baseUrl
  };
}

async function requestCloud({
  chromeApi = chrome,
  permissionManager,
  path,
  method = "GET",
  body = null,
  additionalHeaders = {}
}) {
  const { current, baseUrl } = await requireCloudSession({
    chromeApi,
    permissionManager
  });

  const { session, result } = await requestWithAuth({
    chromeApi,
    session: current,
    baseUrl,
    path,
    method,
    body,
    additionalHeaders
  });

  return {
    session: toPublicSession(session),
    payload: result.payload
  };
}

export async function activationGetCloudPolicy({
  chromeApi = chrome,
  permissionManager
}) {
  const response = await requestCloud({
    chromeApi,
    permissionManager,
    path: "/api/data-handling/policy",
    method: "GET"
  });
  return {
    session: response.session,
    policy: response.payload?.policy || null,
    policyVersion: response.payload?.policyVersion || null
  };
}

export async function activationSetCloudPolicy({
  chromeApi = chrome,
  permissionManager,
  cloudFeaturesOptIn = false,
  webhookDeliveryOptIn = false,
  consentVersion = ""
}) {
  const response = await requestCloud({
    chromeApi,
    permissionManager,
    path: "/api/data-handling/policy",
    method: "POST",
    body: {
      cloudFeaturesOptIn: normalizeBoolean(cloudFeaturesOptIn, false),
      webhookDeliveryOptIn: normalizeBoolean(webhookDeliveryOptIn, false),
      metadataOnlyEnforced: true,
      consentVersion: toText(consentVersion).trim() || undefined
    }
  });
  return {
    session: response.session,
    policy: response.payload?.policy || null
  };
}

export async function activationListIntegrationSecrets({
  chromeApi = chrome,
  permissionManager
}) {
  const response = await requestCloud({
    chromeApi,
    permissionManager,
    path: "/api/integrations/secrets",
    method: "GET"
  });
  return {
    session: response.session,
    policy: response.payload?.policy || null,
    items: Array.isArray(response.payload?.items) ? response.payload.items : []
  };
}

export async function activationUpsertIntegrationSecret({
  chromeApi = chrome,
  permissionManager,
  provider = "",
  secretName = "",
  secretValue = "",
  label = ""
}) {
  const response = await requestCloud({
    chromeApi,
    permissionManager,
    path: "/api/integrations/secrets/upsert",
    method: "POST",
    body: {
      provider: toText(provider).trim(),
      secretName: toText(secretName).trim(),
      secretValue: toText(secretValue),
      label: toText(label).trim() || undefined
    }
  });
  return {
    session: response.session,
    item: response.payload?.item || null,
    success: Boolean(response.payload?.success)
  };
}

export async function activationRemoveIntegrationSecret({
  chromeApi = chrome,
  permissionManager,
  id = "",
  provider = "",
  secretName = ""
}) {
  const response = await requestCloud({
    chromeApi,
    permissionManager,
    path: "/api/integrations/secrets/remove",
    method: "POST",
    body: {
      id: toText(id).trim() || undefined,
      provider: toText(provider).trim() || undefined,
      secretName: toText(secretName).trim() || undefined
    }
  });
  return {
    session: response.session,
    removed: Boolean(response.payload?.removed),
    success: Boolean(response.payload?.success)
  };
}

export async function activationTestIntegrationSecret({
  chromeApi = chrome,
  permissionManager,
  provider = "",
  secretName = "",
  targetUrl = "",
  method = "POST",
  timeoutMs = 8000,
  secretPlacement = "authorization_bearer",
  headerName = "x-api-key",
  headers = {},
  body = {}
}) {
  const response = await requestCloud({
    chromeApi,
    permissionManager,
    path: "/api/integrations/secrets/test",
    method: "POST",
    body: {
      provider: toText(provider).trim(),
      secretName: toText(secretName).trim(),
      targetUrl: toText(targetUrl).trim(),
      method: toText(method).trim().toUpperCase() || "POST",
      timeoutMs: Number(timeoutMs || 8000),
      secretPlacement: toText(secretPlacement).trim().toLowerCase() || "authorization_bearer",
      headerName: toText(headerName).trim() || "x-api-key",
      headers: normalizeObject(headers),
      body: normalizeObject(body)
    }
  });
  return {
    session: response.session,
    success: Boolean(response.payload?.success),
    result: response.payload?.result || null
  };
}

export async function activationGetJobsPolicy({
  chromeApi = chrome,
  permissionManager
}) {
  const response = await requestCloud({
    chromeApi,
    permissionManager,
    path: "/api/jobs/policy",
    method: "GET"
  });
  return {
    session: response.session,
    policy: response.payload?.policy || null,
    queue: response.payload?.queue || null,
    supportedJobTypes: Array.isArray(response.payload?.supportedJobTypes) ? response.payload.supportedJobTypes : []
  };
}

export async function activationEnqueueJob({
  chromeApi = chrome,
  permissionManager,
  jobType = "",
  payload = {},
  maxAttempts = null
}) {
  const response = await requestCloud({
    chromeApi,
    permissionManager,
    path: "/api/jobs/enqueue",
    method: "POST",
    body: {
      jobType: toText(jobType).trim(),
      payload: normalizeObject(payload),
      maxAttempts: maxAttempts === null || maxAttempts === undefined ? undefined : Number(maxAttempts)
    }
  });
  return {
    session: response.session,
    success: Boolean(response.payload?.success),
    job: response.payload?.job || null
  };
}

export async function activationListJobs({
  chromeApi = chrome,
  permissionManager,
  status = "",
  limit = 50
}) {
  const params = new URLSearchParams();
  if (toText(status).trim()) params.set("status", toText(status).trim());
  params.set("limit", String(Math.max(1, Number(limit || 50))));
  const response = await requestCloud({
    chromeApi,
    permissionManager,
    path: `/api/jobs?${params.toString()}`,
    method: "GET"
  });
  return {
    session: response.session,
    success: Boolean(response.payload?.success),
    items: Array.isArray(response.payload?.items) ? response.payload.items : []
  };
}

export async function activationListDeadLetterJobs({
  chromeApi = chrome,
  permissionManager,
  limit = 50
}) {
  const params = new URLSearchParams();
  params.set("limit", String(Math.max(1, Number(limit || 50))));
  const response = await requestCloud({
    chromeApi,
    permissionManager,
    path: `/api/jobs/dead-letter?${params.toString()}`,
    method: "GET"
  });
  return {
    session: response.session,
    success: Boolean(response.payload?.success),
    items: Array.isArray(response.payload?.items) ? response.payload.items : []
  };
}

export async function activationCancelJob({
  chromeApi = chrome,
  permissionManager,
  jobId = ""
}) {
  const response = await requestCloud({
    chromeApi,
    permissionManager,
    path: "/api/jobs/cancel",
    method: "POST",
    body: {
      jobId: toText(jobId).trim()
    }
  });
  return {
    session: response.session,
    success: Boolean(response.payload?.success),
    canceled: Boolean(response.payload?.canceled),
    job: response.payload?.job || null
  };
}

export async function activationListSchedules({
  chromeApi = chrome,
  permissionManager,
  activeOnly = false,
  limit = 50
}) {
  const params = new URLSearchParams();
  params.set("activeOnly", String(Boolean(activeOnly)));
  params.set("limit", String(Math.max(1, Number(limit || 50))));
  const response = await requestCloud({
    chromeApi,
    permissionManager,
    path: `/api/schedules?${params.toString()}`,
    method: "GET"
  });
  return {
    session: response.session,
    success: Boolean(response.payload?.success),
    items: Array.isArray(response.payload?.items) ? response.payload.items : []
  };
}

export async function activationCreateSchedule({
  chromeApi = chrome,
  permissionManager,
  input = {}
}) {
  const payload = normalizeObject(input);
  const response = await requestCloud({
    chromeApi,
    permissionManager,
    path: "/api/schedules/create",
    method: "POST",
    body: payload
  });
  return {
    session: response.session,
    success: Boolean(response.payload?.success),
    schedule: response.payload?.schedule || null
  };
}

export async function activationUpdateSchedule({
  chromeApi = chrome,
  permissionManager,
  scheduleId = "",
  updates = {}
}) {
  const response = await requestCloud({
    chromeApi,
    permissionManager,
    path: "/api/schedules/update",
    method: "POST",
    body: {
      scheduleId: toText(scheduleId).trim(),
      ...normalizeObject(updates)
    }
  });
  return {
    session: response.session,
    success: Boolean(response.payload?.success),
    schedule: response.payload?.schedule || null
  };
}

export async function activationToggleSchedule({
  chromeApi = chrome,
  permissionManager,
  scheduleId = "",
  isActive = false
}) {
  const response = await requestCloud({
    chromeApi,
    permissionManager,
    path: "/api/schedules/toggle",
    method: "POST",
    body: {
      scheduleId: toText(scheduleId).trim(),
      isActive: Boolean(isActive)
    }
  });
  return {
    session: response.session,
    success: Boolean(response.payload?.success),
    schedule: response.payload?.schedule || null
  };
}

export async function activationRemoveSchedule({
  chromeApi = chrome,
  permissionManager,
  scheduleId = ""
}) {
  const response = await requestCloud({
    chromeApi,
    permissionManager,
    path: "/api/schedules/remove",
    method: "POST",
    body: {
      scheduleId: toText(scheduleId).trim()
    }
  });
  return {
    session: response.session,
    success: Boolean(response.payload?.success),
    removed: Boolean(response.payload?.removed)
  };
}

export async function activationRunScheduleNow({
  chromeApi = chrome,
  permissionManager,
  scheduleId = ""
}) {
  const response = await requestCloud({
    chromeApi,
    permissionManager,
    path: "/api/schedules/run-now",
    method: "POST",
    body: {
      scheduleId: toText(scheduleId).trim()
    }
  });
  return {
    session: response.session,
    success: Boolean(response.payload?.success),
    schedule: response.payload?.schedule || null,
    job: response.payload?.job || null
  };
}

async function requestObservability({
  chromeApi = chrome,
  permissionManager,
  path,
  observabilityApiKey = ""
}) {
  const response = await requestCloud({
    chromeApi,
    permissionManager,
    path,
    method: "GET",
    additionalHeaders: observabilityApiKey
      ? {
          "x-observability-key": toText(observabilityApiKey).trim()
        }
      : {}
  });
  return response;
}

export async function activationGetObservabilityDashboard({
  chromeApi = chrome,
  permissionManager,
  observabilityApiKey = ""
}) {
  const response = await requestObservability({
    chromeApi,
    permissionManager,
    path: "/api/observability/dashboard",
    observabilityApiKey
  });
  return {
    session: response.session,
    dashboard: response.payload || null
  };
}

export async function activationGetObservabilitySlo({
  chromeApi = chrome,
  permissionManager,
  observabilityApiKey = ""
}) {
  const response = await requestObservability({
    chromeApi,
    permissionManager,
    path: "/api/observability/slo",
    observabilityApiKey
  });
  return {
    session: response.session,
    slo: response.payload || null
  };
}

export async function activationListObservabilityErrors({
  chromeApi = chrome,
  permissionManager,
  limit = 50,
  observabilityApiKey = ""
}) {
  const params = new URLSearchParams();
  params.set("limit", String(Math.max(1, Number(limit || 50))));
  const response = await requestObservability({
    chromeApi,
    permissionManager,
    path: `/api/observability/errors/recent?${params.toString()}`,
    observabilityApiKey
  });
  return {
    session: response.session,
    summary: response.payload?.summary || null,
    items: Array.isArray(response.payload?.items) ? response.payload.items : []
  };
}

export async function activationGetObservabilityJobs({
  chromeApi = chrome,
  permissionManager,
  observabilityApiKey = ""
}) {
  const response = await requestObservability({
    chromeApi,
    permissionManager,
    path: "/api/observability/jobs",
    observabilityApiKey
  });
  return {
    session: response.session,
    jobs: response.payload || null
  };
}
