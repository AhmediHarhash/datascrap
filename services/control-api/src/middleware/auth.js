"use strict";

const { verifyAccessToken } = require("../utils/security");

function requireAuth(req, res, next) {
  const authHeader = String(req.headers.authorization || "");
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  try {
    const payload = verifyAccessToken(token);
    req.auth = {
      userId: payload.sub,
      accountId: payload.accountId
    };
    return next();
  } catch (_error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = {
  requireAuth
};

