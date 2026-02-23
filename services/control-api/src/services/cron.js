"use strict";

const FORMATTER_CACHE = new Map();

const WEEKDAY_TO_INDEX = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6
};

function intOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.floor(parsed) : null;
}

function normalizeDayOfWeek(value) {
  if (value === 7) return 0;
  return value;
}

function expandBase(baseToken, min, max, normalizer) {
  const token = String(baseToken || "").trim();
  if (!token) {
    throw new Error("Invalid cron token");
  }

  if (token === "*") {
    const values = [];
    for (let value = min; value <= max; value += 1) {
      values.push(normalizer ? normalizer(value) : value);
    }
    return values;
  }

  if (token.includes("-")) {
    const [startRaw, endRaw] = token.split("-");
    const start = intOrNull(startRaw);
    const end = intOrNull(endRaw);
    if (start === null || end === null || start > end) {
      throw new Error(`Invalid cron range: ${token}`);
    }
    if (start < min || end > max) {
      throw new Error(`Cron range out of bounds: ${token}`);
    }
    const values = [];
    for (let value = start; value <= end; value += 1) {
      values.push(normalizer ? normalizer(value) : value);
    }
    return values;
  }

  const single = intOrNull(token);
  if (single === null) {
    throw new Error(`Invalid cron value: ${token}`);
  }
  if (single < min || single > max) {
    throw new Error(`Cron value out of bounds: ${token}`);
  }
  return [normalizer ? normalizer(single) : single];
}

function parseCronField(field, min, max, { normalizer } = {}) {
  const token = String(field || "").trim();
  if (!token) {
    throw new Error("Cron field is required");
  }

  const values = new Set();
  const segments = token.split(",").map((item) => item.trim());

  for (const segment of segments) {
    if (!segment) continue;

    if (segment.includes("/")) {
      const [baseRaw, stepRaw] = segment.split("/");
      const step = intOrNull(stepRaw);
      if (!step || step <= 0) {
        throw new Error(`Invalid cron step: ${segment}`);
      }

      const expanded = expandBase(baseRaw || "*", min, max, normalizer);
      if (expanded.length === 0) continue;

      const uniqueExpanded = Array.from(new Set(expanded)).sort((a, b) => a - b);
      for (let index = 0; index < uniqueExpanded.length; index += step) {
        values.add(uniqueExpanded[index]);
      }
      continue;
    }

    const expanded = expandBase(segment, min, max, normalizer);
    for (const value of expanded) {
      values.add(value);
    }
  }

  if (values.size === 0) {
    throw new Error("Cron field produced no values");
  }

  return Array.from(values).sort((a, b) => a - b);
}

function parseCronExpression(expr) {
  const expression = String(expr || "").trim();
  const fields = expression.split(/\s+/);
  if (fields.length !== 5) {
    throw new Error("Cron expression must contain exactly 5 fields");
  }

  const [minuteField, hourField, dayField, monthField, dowField] = fields;
  const minute = parseCronField(minuteField, 0, 59);
  const hour = parseCronField(hourField, 0, 23);
  const day = parseCronField(dayField, 1, 31);
  const month = parseCronField(monthField, 1, 12);
  const dow = parseCronField(dowField, 0, 7, { normalizer: normalizeDayOfWeek });

  return {
    expression,
    minute,
    hour,
    day,
    month,
    dow
  };
}

function isValidTimeZone(timeZone) {
  try {
    new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone || "UTC"
    });
    return true;
  } catch (_error) {
    return false;
  }
}

function getFormatter(timeZone) {
  const key = timeZone || "UTC";
  if (FORMATTER_CACHE.has(key)) {
    return FORMATTER_CACHE.get(key);
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: key,
    hourCycle: "h23",
    weekday: "short",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric"
  });
  FORMATTER_CACHE.set(key, formatter);
  return formatter;
}

function getZonedParts(date, timeZone) {
  const formatter = getFormatter(timeZone);
  const rawParts = formatter.formatToParts(date);
  const parts = {};
  for (const part of rawParts) {
    if (part.type !== "literal") {
      parts[part.type] = part.value;
    }
  }

  const weekdayRaw = String(parts.weekday || "").trim().toLowerCase().slice(0, 3);
  const dow = WEEKDAY_TO_INDEX[weekdayRaw];

  return {
    minute: intOrNull(parts.minute),
    hour: intOrNull(parts.hour),
    day: intOrNull(parts.day),
    month: intOrNull(parts.month),
    dow: Number.isFinite(dow) ? dow : null
  };
}

function includesValue(values, value) {
  return Array.isArray(values) && values.includes(value);
}

function matchesCronParts(parsedCron, parts) {
  if (!includesValue(parsedCron.minute, parts.minute)) return false;
  if (!includesValue(parsedCron.hour, parts.hour)) return false;
  if (!includesValue(parsedCron.day, parts.day)) return false;
  if (!includesValue(parsedCron.month, parts.month)) return false;
  if (!includesValue(parsedCron.dow, parts.dow)) return false;
  return true;
}

function nextCronRun({ parsedCron, cronExpr, timeZone = "UTC", fromDate = new Date(), maxLookAheadMinutes = 525600 }) {
  const effectiveCron = parsedCron || parseCronExpression(cronExpr);
  const lookAhead = Math.max(1, Number(maxLookAheadMinutes || 1));

  const start = new Date(fromDate);
  start.setUTCSeconds(0, 0);
  const first = new Date(start.getTime() + 60_000);

  for (let index = 0; index < lookAhead; index += 1) {
    const candidate = new Date(first.getTime() + index * 60_000);
    const parts = getZonedParts(candidate, timeZone);
    if (matchesCronParts(effectiveCron, parts)) {
      return candidate;
    }
  }

  return null;
}

module.exports = {
  isValidTimeZone,
  nextCronRun,
  parseCronExpression
};
