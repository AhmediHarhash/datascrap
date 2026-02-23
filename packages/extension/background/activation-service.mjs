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

function createHeaders(accessToken = "") {
  const headers = {
    "content-type": "application/json"
  };
  if (accessToken) {
    headers.authorization = `Bearer ${accessToken}`;
  }
  return headers;
}

async function requestJson({
  baseUrl,
  path,
  method = "GET",
  body = null,
  accessToken = ""
}) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    method,
    headers: createHeaders(accessToken),
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
  body = null
}) {
  let current = { ...session };
  let result = await requestJson({
    baseUrl,
    path,
    method,
    body,
    accessToken: current.accessToken
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
      accessToken: current.accessToken
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
