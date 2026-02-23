"use strict";

const { query } = require("../db/pool");
const { config } = require("../config");

function normalizePolicyRow(accountId, row = null) {
  if (!row) {
    return {
      accountId,
      cloudFeaturesOptIn: false,
      webhookDeliveryOptIn: false,
      metadataOnlyEnforced: true,
      consentVersion: null,
      consentText: null,
      optedInAt: null,
      optedOutAt: null,
      updatedAt: null
    };
  }

  return {
    accountId,
    cloudFeaturesOptIn: Boolean(row.cloud_features_opt_in),
    webhookDeliveryOptIn: Boolean(row.webhook_delivery_opt_in),
    metadataOnlyEnforced: Boolean(row.metadata_only_enforced),
    consentVersion: row.consent_version || null,
    consentText: row.consent_text || null,
    optedInAt: row.opted_in_at || null,
    optedOutAt: row.opted_out_at || null,
    updatedAt: row.updated_at || null
  };
}

async function getCloudPolicy(accountId) {
  const result = await query(
    `
      SELECT
        account_id,
        cloud_features_opt_in,
        webhook_delivery_opt_in,
        metadata_only_enforced,
        consent_version,
        consent_text,
        opted_in_at,
        opted_out_at,
        updated_at
      FROM account_cloud_policies
      WHERE account_id = $1
      LIMIT 1
    `,
    [accountId]
  );

  if (result.rowCount === 0) {
    return normalizePolicyRow(accountId, null);
  }

  return normalizePolicyRow(accountId, result.rows[0]);
}

async function upsertCloudPolicy({
  accountId,
  cloudFeaturesOptIn,
  webhookDeliveryOptIn,
  metadataOnlyEnforced = true,
  consentVersion,
  consentText
}) {
  if (metadataOnlyEnforced !== true) {
    const error = new Error("metadataOnlyEnforced must remain true");
    error.code = "METADATA_POLICY_LOCKED";
    throw error;
  }

  const effectiveConsentVersion = cloudFeaturesOptIn ? consentVersion || config.optInPolicyVersion : null;
  const effectiveConsentText = cloudFeaturesOptIn ? consentText || "User accepted optional cloud features (metadata-only)." : null;

  const result = await query(
    `
      INSERT INTO account_cloud_policies (
        account_id,
        cloud_features_opt_in,
        webhook_delivery_opt_in,
        metadata_only_enforced,
        consent_version,
        consent_text,
        opted_in_at,
        opted_out_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        TRUE,
        $4,
        $5,
        CASE WHEN $2 THEN NOW() ELSE NULL END,
        CASE WHEN $2 THEN NULL ELSE NOW() END,
        NOW()
      )
      ON CONFLICT (account_id)
      DO UPDATE SET
        cloud_features_opt_in = EXCLUDED.cloud_features_opt_in,
        webhook_delivery_opt_in = EXCLUDED.webhook_delivery_opt_in,
        metadata_only_enforced = TRUE,
        consent_version = EXCLUDED.consent_version,
        consent_text = EXCLUDED.consent_text,
        opted_in_at = CASE
          WHEN EXCLUDED.cloud_features_opt_in AND account_cloud_policies.opted_in_at IS NULL THEN NOW()
          WHEN EXCLUDED.cloud_features_opt_in THEN account_cloud_policies.opted_in_at
          ELSE account_cloud_policies.opted_in_at
        END,
        opted_out_at = CASE
          WHEN EXCLUDED.cloud_features_opt_in THEN NULL
          ELSE NOW()
        END,
        updated_at = NOW()
      RETURNING
        account_id,
        cloud_features_opt_in,
        webhook_delivery_opt_in,
        metadata_only_enforced,
        consent_version,
        consent_text,
        opted_in_at,
        opted_out_at,
        updated_at
    `,
    [
      accountId,
      Boolean(cloudFeaturesOptIn),
      Boolean(webhookDeliveryOptIn),
      effectiveConsentVersion,
      effectiveConsentText
    ]
  );

  return normalizePolicyRow(accountId, result.rows[0]);
}

function assertCloudOptIn(policy, { requireWebhook = false } = {}) {
  if (!policy.cloudFeaturesOptIn) {
    const error = new Error("Cloud features are not enabled for this account");
    error.code = "CLOUD_OPT_IN_REQUIRED";
    throw error;
  }
  if (!policy.metadataOnlyEnforced) {
    const error = new Error("Metadata-only enforcement is required");
    error.code = "METADATA_POLICY_REQUIRED";
    throw error;
  }
  if (requireWebhook && !policy.webhookDeliveryOptIn) {
    const error = new Error("Webhook delivery is not enabled for this account");
    error.code = "WEBHOOK_OPT_IN_REQUIRED";
    throw error;
  }
}

module.exports = {
  assertCloudOptIn,
  getCloudPolicy,
  upsertCloudPolicy
};
