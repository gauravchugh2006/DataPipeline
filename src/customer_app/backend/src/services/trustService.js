import { queryTrustDb } from "../config/postgres.js";

const DEFAULT_LIMIT = Number.parseInt(
  process.env.TRUST_REPORT_LIMIT || "30",
  10
);
const TRUST_TABLE = process.env.TRUST_TARGET_TABLE || "analytics.mart_trust_scores";

const TRUST_COLUMNS = [
  "metric_date",
  "orders_count",
  "deliveries_count",
  "on_time_delivery_rate",
  "on_time_rate_rolling_7d",
  "on_time_rate_rolling_30d",
  "on_time_below_threshold",
  "csr_badge_coverage",
  "csr_badge_coverage_rolling_30d",
  "csr_badge_below_threshold",
  "avg_resolution_minutes",
  "avg_resolution_minutes_rolling_30d",
  "resolution_above_threshold",
  "resolution_success_rate",
  "resolution_success_rate_rolling_30d",
  "overall_trust_score",
  "trust_score_rolling_30d",
  "trust_health_status",
  "breach_flag",
  "delivery_data_available",
  "csr_data_available",
  "support_data_available",
  "last_refreshed_at",
];

const mapRow = (row) => {
  const mapped = {};
  for (const column of TRUST_COLUMNS) {
    const value = row[column];
    if (value instanceof Date) {
      mapped[column] = value.toISOString();
    } else {
      mapped[column] = value;
    }
  }
  return mapped;
};

const resolveLimit = (limit) => {
  const parsed = Number.parseInt(limit, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return DEFAULT_LIMIT;
};

const escapeCsv = (value) => {
  if (value === null || value === undefined) {
    return "";
  }
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

export const fetchTrustScores = async (limit) => {
  const safeLimit = resolveLimit(limit ?? DEFAULT_LIMIT);
  const query = `SELECT ${TRUST_COLUMNS.join(", ")} FROM ${TRUST_TABLE} ORDER BY metric_date DESC LIMIT $1`;
  const { rows } = await queryTrustDb(query, [safeLimit]);
  return rows.map(mapRow);
};

export const fetchTrustScoresCsv = async (limit) => {
  const rows = await fetchTrustScores(limit);
  const header = TRUST_COLUMNS.join(",");
  const lines = rows.map((row) =>
    TRUST_COLUMNS.map((column) => escapeCsv(row[column])).join(",")
  );
  return [header, ...lines].join("\n");
};
