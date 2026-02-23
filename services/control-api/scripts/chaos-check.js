"use strict";

const crypto = require("crypto");

const baseUrl = process.env.API_BASE_URL || "https://control-api-staging-98c0.up.railway.app";
const emailEnv = String(process.env.CHAOS_EMAIL || "").trim().toLowerCase();
const passwordEnv = String(process.env.CHAOS_PASSWORD || "").trim();
const deviceId = String(process.env.CHAOS_DEVICE_ID || "chaos-drill-device").trim();
const deviceName = String(process.env.CHAOS_DEVICE_NAME || "Chaos Drill Device").trim();
const licenseKeyEnv = String(process.env.CHAOS_LICENSE_KEY || "").trim();

function randomEmail() {
  return `chaos-${Date.now()}-${crypto.randomBytes(4).toString("hex")}@example.com`;
}

function randomPassword() {
  return `Pw-${crypto.randomBytes(12).toString("base64url")}!`;
}

async function post(path, body, headers = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function get(path, headers = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function ensureAccount(email, password) {
  const register = await post("/api/auth/register", {
    email,
    password,
    displayName: "Chaos Drill"
  });

  if (![201, 409].includes(register.response.status)) {
    throw new Error(`register failed (${register.response.status}): ${JSON.stringify(register.payload)}`);
  }
}

async function main() {
  const email = emailEnv || randomEmail();
  const password = passwordEnv || randomPassword();

  await ensureAccount(email, password);

  const login = await post("/api/auth/login", {
    email,
    password,
    deviceId,
    deviceName
  });

  if (login.response.status !== 200) {
    throw new Error(`login failed (${login.response.status}): ${JSON.stringify(login.payload)}`);
  }

  const accessToken = String(login.payload.accessToken || "");
  if (!accessToken) {
    throw new Error("Missing access token after login.");
  }

  const authHeaders = { authorization: `Bearer ${accessToken}` };
  const licenseKey =
    licenseKeyEnv || `CHAOS-${email.replace(/[^a-z0-9]/g, "").slice(0, 16)}-${deviceId.replace(/[^a-z0-9]/gi, "").slice(0, 8)}`;

  const licenseRegister = await post(
    "/api/license/register",
    {
      licenseKey
    },
    authHeaders
  );

  if (licenseRegister.response.status !== 200) {
    throw new Error(
      `/api/license/register failed (${licenseRegister.response.status}): ${JSON.stringify(licenseRegister.payload)}`
    );
  }

  const me = await get("/api/auth/me", authHeaders);
  const devices = await post("/api/devices", { key: licenseKey }, authHeaders);

  if (me.response.status !== 200) {
    throw new Error(`/api/auth/me failed (${me.response.status}): ${JSON.stringify(me.payload)}`);
  }

  if (devices.response.status !== 200) {
    throw new Error(`/api/devices failed (${devices.response.status}): ${JSON.stringify(devices.payload)}`);
  }

  const summary = {
    ok: true,
    baseUrl,
    email,
    accountId: me.payload?.account?.id || null,
    licenseKeyLast4: licenseKey.slice(-4),
    currentDevicesFromMe: me.payload?.account?.currentDevices ?? null,
    listedDevices: Array.isArray(devices.payload?.devices) ? devices.payload.devices.length : 0,
    timestamp: new Date().toISOString()
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(`[chaos-check] failed: ${error.message}`);
  process.exit(1);
});
