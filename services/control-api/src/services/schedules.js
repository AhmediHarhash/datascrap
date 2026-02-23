"use strict";

const { randomUUID } = require("crypto");
const { config } = require("../config");
const { hasDatabase, query, withTransaction } = require("../db/pool");
const { isValidTimeZone, nextCronRun, parseCronExpression } = require("./cron");

function toSchedule(row) {
  return {
    id: row.id,
    accountId: row.account_id,
    createdByUserId: row.created_by_user_id || null,
    name: row.name,
    isActive: Boolean(row.is_active),
    scheduleKind: row.schedule_kind,
    intervalMinutes: row.interval_minutes !== null ? Number(row.interval_minutes) : null,
    cronExpr: row.cron_expr || null,
    timezone: row.timezone || "UTC",
    targetJobType: row.target_job_type,
    targetPayload: row.target_payload_json || {},
    maxAttempts: Number(row.max_attempts || config.jobMaxAttemptsDefault),
    nextRunAt: row.next_run_at,
    lastRunAt: row.last_run_at || null,
    lastJobId: row.last_job_id || null,
    lastError: row.last_error || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeScheduleKind(value) {
  const kind = String(value || "").trim().toLowerCase();
  if (!kind) return null;
  if (kind !== "interval" && kind !== "cron") return null;
  return kind;
}

function normalizeTargetJobType(value) {
  const jobType = String(value || "").trim().toLowerCase();
  if (!jobType) return null;
  if (!/^[a-z0-9._-]{3,80}$/.test(jobType)) return null;
  return jobType;
}

function normalizeMaxAttempts(value, fallback = config.jobMaxAttemptsDefault) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(10, Math.floor(parsed)));
}

function normalizeIntervalMinutes(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const rounded = Math.floor(parsed);
  if (rounded < 1 || rounded > 10080) return null;
  return rounded;
}

function normalizeTimezone(value) {
  const timezone = String(value || "UTC").trim();
  return timezone || "UTC";
}

function nextRunForSchedule({
  scheduleKind,
  intervalMinutes,
  cronExpr,
  timezone,
  fromDate
}) {
  const now = fromDate ? new Date(fromDate) : new Date();
  if (scheduleKind === "interval") {
    return new Date(now.getTime() + intervalMinutes * 60_000);
  }

  const parsedCron = parseCronExpression(cronExpr);
  const next = nextCronRun({
    parsedCron,
    timeZone: timezone,
    fromDate: now,
    maxLookAheadMinutes: config.cronMaxLookAheadMinutes
  });
  if (!next) {
    const error = new Error("Unable to calculate next cron run");
    error.code = "CRON_NEXT_RUN_NOT_FOUND";
    throw error;
  }
  return next;
}

function buildScheduleInput(input, { current } = {}) {
  const nameValue = input?.name !== undefined ? String(input.name || "").trim() : current?.name;
  const name = String(nameValue || "").trim();
  if (!name || name.length > 120) {
    const error = new Error("name is required and must be <= 120 chars");
    error.code = "INVALID_SCHEDULE_NAME";
    throw error;
  }

  const scheduleKind = normalizeScheduleKind(input?.scheduleKind ?? current?.scheduleKind);
  if (!scheduleKind) {
    const error = new Error("scheduleKind must be interval or cron");
    error.code = "INVALID_SCHEDULE_KIND";
    throw error;
  }

  const timezone = normalizeTimezone(input?.timezone ?? current?.timezone ?? "UTC");
  if (!isValidTimeZone(timezone)) {
    const error = new Error("timezone is invalid");
    error.code = "INVALID_TIMEZONE";
    throw error;
  }

  const targetJobType = normalizeTargetJobType(input?.targetJobType ?? current?.targetJobType);
  if (!targetJobType) {
    const error = new Error("targetJobType is invalid");
    error.code = "INVALID_TARGET_JOB_TYPE";
    throw error;
  }

  const targetPayloadRaw = input?.targetPayload !== undefined ? input.targetPayload : current?.targetPayload || {};
  const targetPayload =
    targetPayloadRaw && typeof targetPayloadRaw === "object" && !Array.isArray(targetPayloadRaw)
      ? targetPayloadRaw
      : null;
  if (!targetPayload) {
    const error = new Error("targetPayload must be an object");
    error.code = "INVALID_TARGET_PAYLOAD";
    throw error;
  }

  const maxAttempts = normalizeMaxAttempts(input?.maxAttempts, current?.maxAttempts);
  const intervalMinutesInput = input?.intervalMinutes !== undefined ? input.intervalMinutes : current?.intervalMinutes;
  const cronExprInput = input?.cronExpr !== undefined ? input.cronExpr : current?.cronExpr;

  let intervalMinutes = null;
  let cronExpr = null;
  if (scheduleKind === "interval") {
    intervalMinutes = normalizeIntervalMinutes(intervalMinutesInput);
    if (!intervalMinutes) {
      const error = new Error("intervalMinutes must be between 1 and 10080");
      error.code = "INVALID_INTERVAL_MINUTES";
      throw error;
    }
  } else {
    cronExpr = String(cronExprInput || "").trim();
    if (!cronExpr) {
      const error = new Error("cronExpr is required for cron schedules");
      error.code = "INVALID_CRON_EXPR";
      throw error;
    }
    parseCronExpression(cronExpr);
  }

  return {
    name,
    scheduleKind,
    intervalMinutes,
    cronExpr,
    timezone,
    targetJobType,
    targetPayload,
    maxAttempts
  };
}

async function createSchedule({
  accountId,
  userId,
  name,
  scheduleKind,
  intervalMinutes,
  cronExpr,
  timezone,
  targetJobType,
  targetPayload,
  maxAttempts,
  isActive = true
}) {
  const input = buildScheduleInput({
    name,
    scheduleKind,
    intervalMinutes,
    cronExpr,
    timezone,
    targetJobType,
    targetPayload,
    maxAttempts
  });
  const active = Boolean(isActive);

  const nextRunAt = active
    ? nextRunForSchedule({
        scheduleKind: input.scheduleKind,
        intervalMinutes: input.intervalMinutes,
        cronExpr: input.cronExpr,
        timezone: input.timezone,
        fromDate: new Date()
      })
    : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  const result = await query(
    `
      INSERT INTO cloud_schedules (
        id,
        account_id,
        created_by_user_id,
        name,
        is_active,
        schedule_kind,
        interval_minutes,
        cron_expr,
        timezone,
        target_job_type,
        target_payload_json,
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
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11::jsonb,
        $12,
        $13,
        NOW(),
        NOW()
      )
      RETURNING *
    `,
    [
      randomUUID(),
      accountId,
      userId || null,
      input.name,
      active,
      input.scheduleKind,
      input.intervalMinutes,
      input.cronExpr,
      input.timezone,
      input.targetJobType,
      JSON.stringify(input.targetPayload),
      input.maxAttempts,
      nextRunAt.toISOString()
    ]
  );

  return toSchedule(result.rows[0]);
}

async function listSchedules({ accountId, activeOnly = false, limit = 50 }) {
  const normalizedLimit = Math.max(1, Math.min(config.scheduleListMaxLimit, Number(limit || 50)));
  const result = await query(
    `
      SELECT *
      FROM cloud_schedules
      WHERE
        account_id = $1
        AND ($2::boolean = FALSE OR is_active = TRUE)
      ORDER BY created_at DESC
      LIMIT $3
    `,
    [accountId, Boolean(activeOnly), normalizedLimit]
  );

  return result.rows.map((row) => toSchedule(row));
}

async function getScheduleById({ accountId, scheduleId, forUpdate = false, client = null }) {
  const executor = client || { query };
  const locking = forUpdate ? " FOR UPDATE" : "";
  const result = await executor.query(
    `
      SELECT *
      FROM cloud_schedules
      WHERE id = $1 AND account_id = $2
      LIMIT 1${locking}
    `,
    [scheduleId, accountId]
  );
  if (result.rowCount === 0) return null;
  return toSchedule(result.rows[0]);
}

async function updateSchedule({
  accountId,
  scheduleId,
  updates
}) {
  return withTransaction(async (client) => {
    const existing = await getScheduleById({
      accountId,
      scheduleId,
      forUpdate: true,
      client
    });
    if (!existing) return null;

    const input = buildScheduleInput(updates || {}, { current: existing });
    const nextRunAt =
      existing.isActive
        ? nextRunForSchedule({
            scheduleKind: input.scheduleKind,
            intervalMinutes: input.intervalMinutes,
            cronExpr: input.cronExpr,
            timezone: input.timezone,
            fromDate: new Date()
          })
        : new Date(existing.nextRunAt);

    const result = await client.query(
      `
        UPDATE cloud_schedules
        SET
          name = $3,
          schedule_kind = $4,
          interval_minutes = $5,
          cron_expr = $6,
          timezone = $7,
          target_job_type = $8,
          target_payload_json = $9::jsonb,
          max_attempts = $10,
          next_run_at = $11,
          updated_at = NOW()
        WHERE id = $1 AND account_id = $2
        RETURNING *
      `,
      [
        scheduleId,
        accountId,
        input.name,
        input.scheduleKind,
        input.intervalMinutes,
        input.cronExpr,
        input.timezone,
        input.targetJobType,
        JSON.stringify(input.targetPayload),
        input.maxAttempts,
        nextRunAt.toISOString()
      ]
    );

    return toSchedule(result.rows[0]);
  });
}

async function toggleSchedule({
  accountId,
  scheduleId,
  isActive
}) {
  const active = Boolean(isActive);
  return withTransaction(async (client) => {
    const existing = await getScheduleById({
      accountId,
      scheduleId,
      forUpdate: true,
      client
    });
    if (!existing) return null;

    let nextRunAt = new Date(existing.nextRunAt);
    if (active) {
      nextRunAt = nextRunForSchedule({
        scheduleKind: existing.scheduleKind,
        intervalMinutes: existing.intervalMinutes,
        cronExpr: existing.cronExpr,
        timezone: existing.timezone,
        fromDate: new Date()
      });
    }

    const result = await client.query(
      `
        UPDATE cloud_schedules
        SET
          is_active = $3,
          next_run_at = $4,
          updated_at = NOW()
        WHERE id = $1 AND account_id = $2
        RETURNING *
      `,
      [scheduleId, accountId, active, nextRunAt.toISOString()]
    );

    return toSchedule(result.rows[0]);
  });
}

async function removeSchedule({ accountId, scheduleId }) {
  const result = await query(
    `
      DELETE FROM cloud_schedules
      WHERE id = $1 AND account_id = $2
    `,
    [scheduleId, accountId]
  );

  return result.rowCount > 0;
}

async function enqueueScheduleNow({
  accountId,
  scheduleId,
  userId
}) {
  return withTransaction(async (client) => {
    const schedule = await getScheduleById({
      accountId,
      scheduleId,
      forUpdate: true,
      client
    });
    if (!schedule) return null;

    const payload = {
      ...schedule.targetPayload,
      schedule: {
        id: schedule.id,
        name: schedule.name,
        manualTrigger: true,
        triggeredAt: new Date().toISOString()
      }
    };

    const jobResult = await client.query(
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
        RETURNING id, account_id, job_type, status, attempts, max_attempts, next_run_at, created_at, updated_at
      `,
      [randomUUID(), schedule.accountId, userId || null, schedule.targetJobType, JSON.stringify(payload), schedule.maxAttempts]
    );

    const job = {
      id: jobResult.rows[0].id,
      accountId: jobResult.rows[0].account_id,
      jobType: jobResult.rows[0].job_type,
      status: jobResult.rows[0].status,
      attempts: Number(jobResult.rows[0].attempts || 0),
      maxAttempts: Number(jobResult.rows[0].max_attempts || 0),
      nextRunAt: jobResult.rows[0].next_run_at,
      createdAt: jobResult.rows[0].created_at,
      updatedAt: jobResult.rows[0].updated_at
    };

    await client.query(
      `
        UPDATE cloud_schedules
        SET
          last_run_at = NOW(),
          last_job_id = $3,
          last_error = NULL,
          updated_at = NOW()
        WHERE id = $1 AND account_id = $2
      `,
      [scheduleId, accountId, job.id]
    );

    return {
      schedule,
      job
    };
  });
}

async function triggerDueSchedules({ workerId, limit = null }) {
  const maxBatch = Math.max(1, Math.min(50, Number(limit || config.scheduleSweepMaxBatch || 10)));
  return withTransaction(async (client) => {
    const dueResult = await client.query(
      `
        SELECT *
        FROM cloud_schedules
        WHERE
          is_active = TRUE
          AND next_run_at <= NOW()
        ORDER BY next_run_at ASC, created_at ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      `,
      [maxBatch]
    );

    const triggered = [];
    const errors = [];

    for (const row of dueResult.rows) {
      const schedule = toSchedule(row);

      try {
        const payload = {
          ...schedule.targetPayload,
          schedule: {
            id: schedule.id,
            name: schedule.name,
            workerId,
            triggeredAt: new Date().toISOString()
          }
        };

        const jobResult = await client.query(
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
            RETURNING id
          `,
          [randomUUID(), schedule.accountId, schedule.createdByUserId, schedule.targetJobType, JSON.stringify(payload), schedule.maxAttempts]
        );
        const jobId = jobResult.rows[0].id;

        const nextRunAt = nextRunForSchedule({
          scheduleKind: schedule.scheduleKind,
          intervalMinutes: schedule.intervalMinutes,
          cronExpr: schedule.cronExpr,
          timezone: schedule.timezone,
          fromDate: new Date()
        });

        await client.query(
          `
            UPDATE cloud_schedules
            SET
              next_run_at = $3,
              last_run_at = NOW(),
              last_job_id = $4,
              last_error = NULL,
              updated_at = NOW()
            WHERE id = $1 AND account_id = $2
          `,
          [schedule.id, schedule.accountId, nextRunAt.toISOString(), jobId]
        );

        triggered.push({
          scheduleId: schedule.id,
          jobId
        });
      } catch (error) {
        const fallbackNextRun = new Date(Date.now() + 5 * 60_000);
        await client.query(
          `
            UPDATE cloud_schedules
            SET
              next_run_at = $3,
              last_error = $4,
              updated_at = NOW()
            WHERE id = $1 AND account_id = $2
          `,
          [schedule.id, schedule.accountId, fallbackNextRun.toISOString(), error.message || "Schedule trigger failed"]
        );
        errors.push({
          scheduleId: schedule.id,
          error: error.message || "Schedule trigger failed"
        });
      }
    }

    return {
      scanned: dueResult.rowCount,
      triggered,
      errors
    };
  });
}

async function getScheduleStats() {
  if (!config.enableOptionalCloudFeatures || !hasDatabase()) {
    return {
      enabled: false,
      available: false,
      total: 0,
      active: 0,
      dueNow: 0,
      byKind: {}
    };
  }

  try {
    const summaryResult = await query(
      `
        SELECT
          COUNT(*)::int AS total,
          COALESCE(SUM(CASE WHEN is_active THEN 1 ELSE 0 END), 0)::int AS active,
          COALESCE(SUM(CASE WHEN is_active AND next_run_at <= NOW() THEN 1 ELSE 0 END), 0)::int AS due_now
        FROM cloud_schedules
      `
    );

    const byKindResult = await query(
      `
        SELECT schedule_kind, COUNT(*)::int AS count
        FROM cloud_schedules
        GROUP BY schedule_kind
      `
    );

    const byKind = {};
    for (const row of byKindResult.rows) {
      byKind[row.schedule_kind] = Number(row.count || 0);
    }

    return {
      enabled: true,
      available: true,
      total: Number(summaryResult.rows[0]?.total || 0),
      active: Number(summaryResult.rows[0]?.active || 0),
      dueNow: Number(summaryResult.rows[0]?.due_now || 0),
      byKind
    };
  } catch (error) {
    return {
      enabled: true,
      available: false,
      total: 0,
      active: 0,
      dueNow: 0,
      byKind: {},
      error: error.message
    };
  }
}

module.exports = {
  createSchedule,
  enqueueScheduleNow,
  getScheduleById,
  getScheduleStats,
  listSchedules,
  removeSchedule,
  toggleSchedule,
  triggerDueSchedules,
  updateSchedule
};
