"use strict";

const { config } = require("../config");

function requireOptionalCloudFeatures(req, res, next) {
  if (!config.enableOptionalCloudFeatures) {
    return res.status(404).json({
      error: "Optional cloud features are disabled"
    });
  }

  return next();
}

module.exports = {
  requireOptionalCloudFeatures
};
