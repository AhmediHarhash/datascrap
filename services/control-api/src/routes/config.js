"use strict";

const { Router } = require("express");

const router = Router();

router.get("/api/config", (_req, res) => {
  return res.status(200).json({
    isClipboardProOnly: false,
    isNewPricingEnabled: false,
    isLifetimeV2Enabled: false,
    showBlackFridayBanner: false
  });
});

module.exports = { configRouter: router };

