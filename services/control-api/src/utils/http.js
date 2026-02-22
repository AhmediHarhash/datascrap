"use strict";

function getRequestIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (xff) {
    return String(xff).split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || null;
}

function getUserAgent(req) {
  return req.headers["user-agent"] ? String(req.headers["user-agent"]) : null;
}

module.exports = {
  getRequestIp,
  getUserAgent
};

