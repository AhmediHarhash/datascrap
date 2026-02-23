"use strict";

const { randomUUID } = require("crypto");
const { config } = require("../config");
const { hasDatabase, query, withTransaction } = require("../db/pool");

const RETRYABLE_JOB_STATUSES = ["queued", "retrying"];

function toJob(row) {
  return {
    id: row.id,
    accountId: row.account_id,
    createdByUserId: row.created_by_user_id || null,
    jobType: row.job_type,
    status: row.status,
    payload: row.payload_json || {},
    result: row.result_json || null,
    attempts: Number(row.attempts || 0),
    maxAttempts: Number(row.max_attempts || 0),
    nextRunAt: row.next_run_at || null,
    lockedBy: row.locked_by || null,
    lockedAt: row.locked_at || null,
    startedAt: row.started_at || null,
    completedAt: row.completed_at || null,
    lastErrorCode: row.last_error_code || null,
    lastError: row.last_error || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeMaxAttempts(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return config.jobMaxAttemptsDefault;
  return Math.max(1, Math.min(10, Math.floor(parsed)));
}

function calculateBackoffSeconds(attempt) {
  const base = Math.max(1, Number(config.jobBackoffBaseSeconds || 15));
  const multiplier = Math.max(1, Number(config.jobBackoffMultiplier || 2));
  const maxSeconds = Math.max(base, Number(config.jobBackoffMaxSeconds || 900));

  const exponential = base * Math.pow(multiplier, Math.max(0, Number(attempt || 1) - 1));
  const jitterCeiling = Math.max(1, Math.floor(exponential * 0.2));
  const jitter = Math.floor(Math.random() * jitterCeiling);
  return Math.min(maxSeconds, Math.max(base, Math.floor(exponential + jitter)));
}

async function enqueueJob({ accountId, userId, jobType, payload, maxAttempts }) {
  const effectiveMaxAttempts = normalizeMaxAttempts(maxAttempts);
  const result = await query(
    `
      INSERT INTO cloud_jobs (
        id,
        account_id,
        created_by_user_id,
        job_type,
        status,
        payload_json,
        max_attempts,
        next_run_at,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        'queued',
        $5::jsonb,
        $6,
        NOW(),
        NOW(),
        NOW()
      )
      RETURNING *
    `,
    [randomUUID(), accountId, userId || null, jobType, JSON.stringify(payload || {}), effectiveMaxAttempts]
  );

  return toJob(result.rows[0]);
}

async function listJobs({ accountId, status, limit }) {
  const normalizedLimit = Math.max(1, Math.min(config.jobListMaxLimit, Number(limit || 50)));
  const statuses = Array.isArray(status)
    ? status.filter(Boolean)
    : String(status || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  const hasStatusFilter = statuses.length > 0;
  const result = await query(
    `
      SELECT *
      FROM cloud_jobs
      WHERE
        account_id = $1
        AND ($2::boolean = FALSE OR status = ANY($3::text[]))
      ORDER BY created_at DESC
      LIMIT $4
    `,
    [accountId, hasStatusFilter, statuses, normalizedLimit]
  );

  return result.rows.map((row) => toJob(row));
}

async function listDeadLetters({ accountId, limit }) {
  const normalizedLimit = Math.max(1, Math.min(config.jobListMaxLimit, Number(limit || 50)));
  const result = await query(
    `
      SELECT
        d.id,
        d.job_id,
        d.account_id,
        d.reason_code,
        d.reason_message,
        d.payload_snapshot,
        d.created_at,
        j.job_type,
        j.attempts,
        j.max_attempts
      FROM cloud_job_dead_letters d
      JOIN cloud_jobs j ON j.id = d.job_id
      WHERE d.account_id = $1
      ORDER BY d.created_at DESC
      LIMIT $2
    `,
    [accountId, normalizedLimit]
  );

  return result.rows.map((row) => ({
    id: row.id,
    jobId: row.job_id,
    accountId: row.account_id,
    jobType: row.job_type,
    attempts: Number(row.attempts || 0),
    maxAttempts: Number(row.max_attempts || 0),
    reasonCode: row.reason_code,
    reasonMessage: row.reason_message || null,
    payloadSnapshot: row.payload_snapshot || {},
    createdAt: row.created_at
  }));
}

async function cancelJob({ accountId, jobId }) {
  const result = await query(
    `
      UPDATE cloud_jobs
      SET
        status = 'canceled',
        completed_at = NOW(),
        locked_by = NULL,
        locked_at = NULL,
        updated_at = NOW()
      WHERE
        id = $1
        AND account_id = $2
        AND status IN ('queued', 'retrying', 'running')
      RETURNING *
    `,
    [jobId, accountId]
  );

  return result.rowCount > 0 ? toJob(result.rows[0]) : null;
}

async function claimDueJob({ workerId, jobTypes }) {
  const picked = await withTransaction(async (client) => {
    const effectiveTypes = Array.isArray(jobTypes) && jobTypes.length > 0 ? jobTypes : null;
    const result = await client.query(
      `
        WITH picked AS (
          SELECT id
          FROM cloud_jobs
          WHERE
            status = ANY($2::text[])
            AND next_run_at <= NOW()
            AND ($3::text[] IS NULL OR job_type = ANY($3::text[]))
          ORDER BY next_run_at ASC, created_at ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        )
        UPDATE cloud_jobs j
        SET
          status = 'running',
          attempts = j.attempts + 1,
          locked_by = $1,
          locked_at = NOW(),
          started_at = COALESCE(j.started_at, NOW()),
          updated_at = NOW()
        FROM picked
        WHERE j.id = picked.id
        RETURNING j.*
      `,
      [workerId, RETRYABLE_JOB_STATUSES, effectiveTypes]
    );

    if (result.rowCount === 0) return null;
    return toJob(result.rows[0]);
  });

  return picked;
}

async function markJobSucceeded({ jobId, result }) {
  const updateResult = await query(
    `
      UPDATE cloud_jobs
      SET
        status = 'succeeded',
        result_json = $2::jsonb,
        completed_at = NOW(),
        locked_by = NULL,
        locked_at = NULL,
        last_error = NULL,
        last_error_code = NULL,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [jobId, JSON.stringify(result || {})]
  );

  return updateResult.rowCount > 0 ? toJob(updateResult.rows[0]) : null;
}

async function markJobFailed({
  jobId,
  errorCode,
  errorMessage,
  retryable = true,
  deadLetterReasonCode,
  deadLetterReasonMessage
}) {
  return withTransaction(async (client) => {
    const lookup = await client.query("SELECT * FROM cloud_jobs WHERE id = $1 FOR UPDATE", [jobId]);
    if (lookup.rowCount === 0) return null;

    const job = toJob(lookup.rows[0]);
    const terminalFailure = !retryable || job.attempts >= job.maxAttempts;

    if (terminalFailure) {
      const deadLetterCode = deadLetterReasonCode || errorCode || "JOB_FAILED";
      const deadLetterMessage = deadLetterReasonMessage || errorMessage || "Job moved to dead letter queue";

      const updated = await client.query(
        `
          UPDATE cloud_jobs
          SET
            status = 'dead_letter',
            completed_at = NOW(),
            locked_by = NULL,
            locked_at = NULL,
            last_error_code = $2,
            last_error = $3,
            updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `,
        [jobId, errorCode || "JOB_FAILED", errorMessage || "Unknown job failure"]
      );

      await client.query(
        `
          INSERT INTO cloud_job_dead_letters (
            id,
            job_id,
            account_id,
            reason_code,
            reason_message,
            payload_snapshot
          )
          VALUES ($1, $2, $3, $4, $5, $6::jsonb)
          ON CONFLICT (job_id)
          DO UPDATE SET
            reason_code = EXCLUDED.reason_code,
            reason_message = EXCLUDED.reason_message,
            payload_snapshot = EXCLUDED.payload_snapshot,
            created_at = NOW()
        `,
        [randomUUID(), jobId, job.accountId, deadLetterCode, deadLetterMessage, JSON.stringify(job.payload || {})]
      );

      return {
        job: toJob(updated.rows[0]),
        deadLetter: true,
        backoffSeconds: null
      };
    }

    const backoffSeconds = calculateBackoffSeconds(job.attempts);
    const updated = await client.query(
      `
        UPDATE cloud_jobs
        SET
          status = 'retrying',
          next_run_at = NOW() + ($2 || ' seconds')::interval,
          locked_by = NULL,
          locked_at = NULL,
          last_error_code = $3,
          last_error = $4,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [jobId, String(backoffSeconds), errorCode || "RETRYABLE_FAILURE", errorMessage || "Retryable job failure"]
    );

    return {
      job: toJob(updated.rows[0]),
      deadLetter: false,
      backoffSeconds
    };
  });
}

async function recoverExpiredLocks() {
  const lockTimeoutSeconds = Math.max(60, Number(config.jobLockTimeoutSeconds || 300));

  return withTransaction(async (client) => {
    const expired = await client.query(
      `
        SELECT *
        FROM cloud_jobs
        WHERE
          status = 'running'
          AND locked_at IS NOT NULL
          AND locked_at < NOW() - ($1 || ' seconds')::interval
        FOR UPDATE
      `,
      [String(lockTimeoutSeconds)]
    );

    let retried = 0;
    let deadLettered = 0;

    for (const row of expired.rows) {
      const job = toJob(row);
      if (job.attempts >= job.maxAttempts) {
        await client.query(
          `
            UPDATE cloud_jobs
            SET
              status = 'dead_letter',
              completed_at = NOW(),
              locked_by = NULL,
              locked_at = NULL,
              last_error_code = 'LOCK_TIMEOUT',
              last_error = 'Job lock expired and attempts exhausted',
              updated_at = NOW()
            WHERE id = $1
          `,
          [job.id]
        );

        await client.query(
          `
            INSERT INTO cloud_job_dead_letters (
              id,
              job_id,
              account_id,
              reason_code,
              reason_message,
              payload_snapshot
            )
            VALUES ($1, $2, $3, 'LOCK_TIMEOUT', 'Job lock expired and attempts exhausted', $4::jsonb)
            ON CONFLICT (job_id)
            DO UPDATE SET
              reason_code = EXCLUDED.reason_code,
              reason_message = EXCLUDED.reason_message,
              payload_snapshot = EXCLUDED.payload_snapshot,
              created_at = NOW()
          `,
          [randomUUID(), job.id, job.accountId, JSON.stringify(job.payload || {})]
        );
        deadLettered += 1;
      } else {
        await client.query(
          `
            UPDATE cloud_jobs
            SET
              status = 'retrying',
              next_run_at = NOW(),
              locked_by = NULL,
              locked_at = NULL,
              last_error_code = 'LOCK_TIMEOUT',
              last_error = 'Recovered from expired lock',
              updated_at = NOW()
            WHERE id = $1
          `,
          [job.id]
        );
        retried += 1;
      }
    }

    return {
      recovered: expired.rowCount,
      retried,
      deadLettered
    };
  });
}

async function getQueueStats() {
  if (!config.enableOptionalCloudFeatures || !hasDatabase()) {
    return {
      enabled: false,
      available: false,
      byStatus: {},
      dueNow: 0,
      deadLetters: 0
    };
  }

  try {
    const byStatusResult = await query(
      `
        SELECT status, COUNT(*)::int AS count
        FROM cloud_jobs
        GROUP BY status
      `
    );
    const dueNowResult = await query(
      `
        SELECT COUNT(*)::int AS count
        FROM cloud_jobs
        WHERE status IN ('queued', 'retrying') AND next_run_at <= NOW()
      `
    );
    const deadLettersResult = await query(
      `
        SELECT COUNT(*)::int AS count
        FROM cloud_job_dead_letters
      `
    );

    const byStatus = {};
    for (const row of byStatusResult.rows) {
      byStatus[row.status] = Number(row.count || 0);
    }

    return {
      enabled: true,
      available: true,
      byStatus,
      dueNow: Number(dueNowResult.rows[0]?.count || 0),
      deadLetters: Number(deadLettersResult.rows[0]?.count || 0)
    };
  } catch (error) {
    return {
      enabled: true,
      available: false,
      error: error.message,
      byStatus: {},
      dueNow: 0,
      deadLetters: 0
    };
  }
}

module.exports = {
  calculateBackoffSeconds,
  cancelJob,
  claimDueJob,
  enqueueJob,
  getQueueStats,
  listDeadLetters,
  listJobs,
  markJobFailed,
  markJobSucceeded,
  recoverExpiredLocks
};
