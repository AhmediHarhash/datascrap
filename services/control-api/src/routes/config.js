"use strict";

const { Router } = require("express");
const { config } = require("../config");

const router = Router();

router.get("/api/config", (_req, res) => {
  return res.status(200).json({
    isClipboardProOnly: false,
    isNewPricingEnabled: false,
    isLifetimeV2Enabled: false,
    showBlackFridayBanner: false,
    optionalCloudFeaturesEnabled: config.enableOptionalCloudFeatures,
    metadataOnlyEnforced: true
  });
});

module.exports = { configRouter: router };
