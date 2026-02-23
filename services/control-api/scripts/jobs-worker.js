"use strict";

require("dotenv").config();

const { randomUUID } = require("crypto");
const { config } = require("../src/config");
const { closePool } = require("../src/db/pool");
const { executeJob } = require("../src/services/job-processor");
const {
  claimDueJob,
  markJobFailed,
  markJobSucceeded,
  recoverExpiredLocks
} = require("../src/services/jobs");
const { triggerDueSchedules } = require("../src/services/schedules");
const { logError, logInfo, logWarn } = require("../src/utils/logger");

const workerId = config.jobWorkerId || `jobs-worker-${randomUUID().slice(0, 8)}`;
const pollIntervalMs = Math.max(250, Number(config.jobPollIntervalMs || 2000));

let stopping = false;
let lockRecoveryAt = 0;
let scheduleSweepAt = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRunLockRecovery() {
  const now = Date.now();
  if (now - lockRecoveryAt < Math.max(15_000, pollIntervalMs * 5)) {
    return false;
  }
  lockRecoveryAt = now;
  return true;
}

function shouldRunScheduleSweep() {
  const now = Date.now();
  const cadenceMs = Math.max(1_000, Number(config.scheduleSweepIntervalMs || 5_000));
  if (now - scheduleSweepAt < cadenceMs) {
    return false;
  }
  scheduleSweepAt = now;
  return true;
}

async function sweepSchedules() {
  const result = await triggerDueSchedules({
    workerId,
    limit: config.scheduleSweepMaxBatch
  });

  if ((result.triggered || []).length > 0) {
    logInfo("jobs.worker.schedules.triggered", {
      workerId,
      scanned: result.scanned,
      triggered: result.triggered.length
    });
  }

  if ((result.errors || []).length > 0) {
    logWarn("jobs.worker.schedules.errors", {
      workerId,
      scanned: result.scanned,
      errors: result.errors
    });
  }
}

async function processOneJob() {
  const job = await claimDueJob({ workerId });
  if (!job) return false;

  logInfo("jobs.worker.claimed", {
    workerId,
    jobId: job.id,
    jobType: job.jobType,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts
  });

  try {
    const result = await executeJob(job);
    const completed = await markJobSucceeded({
      jobId: job.id,
      result
    });

    logInfo("jobs.worker.succeeded", {
      workerId,
      jobId: job.id,
      status: completed?.status || "succeeded"
    });
  } catch (error) {
    const retryable = error.retryable !== false;
    const failed = await markJobFailed({
      jobId: job.id,
      errorCode: error.code || "JOB_EXECUTION_FAILED",
      errorMessage: error.message || "Unknown job execution error",
      retryable
    });

    if (failed?.deadLetter) {
      logWarn("jobs.worker.dead_letter", {
        workerId,
        jobId: job.id,
        errorCode: error.code || "JOB_EXECUTION_FAILED",
        errorMessage: error.message || "Unknown job execution error"
      });
    } else {
      logWarn("jobs.worker.retrying", {
        workerId,
        jobId: job.id,
        errorCode: error.code || "JOB_EXECUTION_FAILED",
        backoffSeconds: failed?.backoffSeconds || null
      });
    }
  }

  return true;
}

async function runLoop() {
  logInfo("jobs.worker.started", {
    workerId,
    pollIntervalMs
  });

  while (!stopping) {
    try {
      if (shouldRunLockRecovery()) {
        const recovered = await recoverExpiredLocks();
        if ((recovered.retried || 0) > 0 || (recovered.deadLettered || 0) > 0) {
          logWarn("jobs.worker.lock_recovery", {
            workerId,
            recovered: recovered.recovered,
            retried: recovered.retried,
            deadLettered: recovered.deadLettered
          });
        }
      }

      if (shouldRunScheduleSweep()) {
        await sweepSchedules();
      }

      const processed = await processOneJob();
      if (!processed) {
        await sleep(pollIntervalMs);
      }
    } catch (error) {
      logError("jobs.worker.loop.error", error, {
        workerId
      });
      await sleep(Math.max(1_000, pollIntervalMs));
    }
  }

  logInfo("jobs.worker.stopped", { workerId });
}

async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  logInfo("jobs.worker.shutdown", {
    workerId,
    signal
  });
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

async function main() {
  if (!config.enableOptionalCloudFeatures) {
    logWarn("jobs.worker.disabled", {
      reason: "ENABLE_OPTIONAL_CLOUD_FEATURES=false"
    });
    process.exit(0);
  }

  await runLoop();
}

main()
  .then(async () => {
    await closePool();
    process.exit(0);
  })
  .catch(async (error) => {
    logError("jobs.worker.crash", error, {
      workerId
    });
    await closePool();
    process.exit(1);
  });
