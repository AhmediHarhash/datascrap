"use strict";

const crypto = require("crypto");

function main() {
  const bytes = Number(process.env.JWT_SECRET_BYTES || 48);
  const size = Number.isFinite(bytes) && bytes >= 32 ? bytes : 48;

  const secret = crypto.randomBytes(size).toString("base64url");
  const kid = String(process.env.JWT_NEW_KID || "").trim() || `k${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;

  console.log(JSON.stringify({ kid, secret }, null, 2));
}

main();
