"use strict";

function num(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

function parseDailySeries() {
  const raw = String(process.env.DAILY_COST_SERIES_USD || "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item >= 0);
}

function monthBounds() {
  const now = new Date();
  const dayOfMonth = num("CURRENT_DAY_OF_MONTH", now.getUTCDate());
  const daysInMonth = num(
    "DAYS_IN_MONTH",
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate()
  );
  return {
    dayOfMonth: Math.max(1, dayOfMonth),
    daysInMonth: Math.max(28, daysInMonth)
  };
}

function average(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stddev(values, mean) {
  if (values.length <= 1) return 0;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) * (value - mean), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function projectedMonthEndCost({ monthToDateCostUsd, dayOfMonth, daysInMonth }) {
  const dailyBurn = monthToDateCostUsd / dayOfMonth;
  return dailyBurn * daysInMonth;
}

function detectDailyAnomaly(dailySeries) {
  if (dailySeries.length < 4) {
    return {
      isAnomaly: false,
      reason: "not_enough_samples"
    };
  }

  const latest = dailySeries[dailySeries.length - 1];
  const baseline = dailySeries.slice(0, -1);
  const mean = average(baseline);
  const sigma = stddev(baseline, mean);
  if (sigma === 0) {
    return {
      isAnomaly: latest > mean * 1.5 && latest > 0,
      zScore: null,
      latest,
      mean,
      sigma
    };
  }

  const zScore = (latest - mean) / sigma;
  return {
    isAnomaly: zScore >= 2.5,
    zScore: Number(zScore.toFixed(2)),
    latest,
    mean: Number(mean.toFixed(4)),
    sigma: Number(sigma.toFixed(4))
  };
}

async function postAlert(payload) {
  const webhookUrl = String(process.env.ALERT_WEBHOOK_URL || "").trim();
  if (!webhookUrl) return;

  const headers = {
    "Content-Type": "application/json"
  };
  const bearer = String(process.env.ALERT_WEBHOOK_BEARER_TOKEN || "").trim();
  if (bearer) {
    headers.Authorization = `Bearer ${bearer}`;
  }

  await fetch(webhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
}

async function main() {
  const budgetUsd = num("MONTHLY_BUDGET_USD", 5);
  const monthToDateCostUsd = num("MONTH_TO_DATE_COST_USD", 0);
  const alertThresholdPercent = num("COST_ALERT_THRESHOLD_PERCENT", 80);
  const hardCapPercent = num("COST_HARD_CAP_PERCENT", 100);
  const { dayOfMonth, daysInMonth } = monthBounds();

  const dailySeries = parseDailySeries();
  const projectedCostUsd = projectedMonthEndCost({
    monthToDateCostUsd,
    dayOfMonth,
    daysInMonth
  });
  const usagePercent = budgetUsd > 0 ? (monthToDateCostUsd / budgetUsd) * 100 : 0;
  const projectedPercent = budgetUsd > 0 ? (projectedCostUsd / budgetUsd) * 100 : 0;
  const anomaly = detectDailyAnomaly(dailySeries);

  const breaches = [];
  if (usagePercent >= hardCapPercent) {
    breaches.push(`month-to-date usage ${usagePercent.toFixed(2)}% >= hard cap ${hardCapPercent}%`);
  }
  if (projectedPercent >= hardCapPercent) {
    breaches.push(`projected usage ${projectedPercent.toFixed(2)}% >= hard cap ${hardCapPercent}%`);
  }
  if (usagePercent >= alertThresholdPercent) {
    breaches.push(`month-to-date usage ${usagePercent.toFixed(2)}% >= alert threshold ${alertThresholdPercent}%`);
  }
  if (projectedPercent >= alertThresholdPercent) {
    breaches.push(`projected usage ${projectedPercent.toFixed(2)}% >= alert threshold ${alertThresholdPercent}%`);
  }
  if (anomaly.isAnomaly) {
    breaches.push("daily spend anomaly detected");
  }

  const report = {
    event: "cost.monitor.result",
    timestamp: new Date().toISOString(),
    budgetUsd,
    monthToDateCostUsd: Number(monthToDateCostUsd.toFixed(4)),
    projectedCostUsd: Number(projectedCostUsd.toFixed(4)),
    usagePercent: Number(usagePercent.toFixed(2)),
    projectedPercent: Number(projectedPercent.toFixed(2)),
    alertThresholdPercent,
    hardCapPercent,
    dayOfMonth,
    daysInMonth,
    dailySeries,
    anomaly,
    breaches
  };

  if (breaches.length > 0) {
    console.error(JSON.stringify(report));
    await postAlert({
      event: "cost.monitor.failed",
      timestamp: report.timestamp,
      breaches,
      report
    }).catch(() => {});
    process.exit(1);
  }

  console.log(JSON.stringify(report));
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      event: "cost.monitor.crash",
      timestamp: new Date().toISOString(),
      error: error.message
    })
  );
  process.exit(1);
});

