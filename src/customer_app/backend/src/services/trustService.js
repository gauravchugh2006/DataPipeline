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
const { getAnalyticsPool, withConnection } = require("../config/postgres");
const { buildWhereClause, buildSortClause, buildPagination } = require("../utils/queryBuilder");

const FILTER_MAP = {
  customerId: "customer_id",
  badge: "csr_badge",
  breachFlag: "breach_flag",
  minScore: "composite_trust_score >=",
  maxScore: "composite_trust_score <="
};

const SORTABLE_COLUMNS = [
  "score_date",
  "composite_trust_score",
  "customer_id"
];

const BASE_QUERY = `
  SELECT
    customer_id,
    score_date,
    delivery_score,
    support_score,
    csr_badge,
    composite_trust_score,
    breach_flag,
    breach_reason,
    goodwill_actions
  FROM mart_trust_scores
`;

const normalizeFilters = (filters = {}) => {
  const normalized = { ...filters };
  if (filters.minScore) {
    normalized.minScore = Number(filters.minScore);
  }
  if (filters.maxScore) {
    normalized.maxScore = Number(filters.maxScore);
  }
  if (filters.startDate || filters.endDate) {
    normalized.dateRange = [filters.startDate, filters.endDate];
  }
  return normalized;
};

const buildRangeClause = (filters, values) => {
  if (!filters.dateRange) {
    return "";
  }

  const [start, end] = filters.dateRange;
  const clauses = [];
  if (start) {
    clauses.push(`score_date >= $${values.length + 1}`);
    values.push(start);
  }
  if (end) {
    clauses.push(`score_date <= $${values.length + 1}`);
    values.push(end);
  }
  if (!clauses.length) {
    return "";
  }
  return clauses.join(" AND ");
};

const listTrustScores = async (filters = {}, options = {}) => {
  const normalizedFilters = normalizeFilters(filters);
  const { where, values } = buildWhereClause(normalizedFilters, {
    customerId: FILTER_MAP.customerId,
    badge: FILTER_MAP.badge,
    breachFlag: FILTER_MAP.breachFlag
  });

  const rangeClause = buildRangeClause(normalizedFilters, values);
  const clauses = [];
  if (where) {
    clauses.push(where.replace(" WHERE ", ""));
  }
  if (rangeClause) {
    clauses.push(rangeClause);
  }
  if (normalizedFilters.minScore) {
    clauses.push(`composite_trust_score >= $${values.length + 1}`);
    values.push(normalizedFilters.minScore);
  }
  if (normalizedFilters.maxScore) {
    clauses.push(`composite_trust_score <= $${values.length + 1}`);
    values.push(normalizedFilters.maxScore);
  }

  const finalWhere = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
  const sortClause = buildSortClause(options.sortBy, SORTABLE_COLUMNS);
  const { clause: paginationClause } = buildPagination(options.page, options.pageSize);

  const query = `${BASE_QUERY}${finalWhere}${sortClause || " ORDER BY score_date DESC"}${paginationClause}`;

  return withConnection(async (client) => {
    const result = await client.query(query, values);
    return result.rows;
  }, getAnalyticsPool());
};

module.exports = {
  listTrustScores
};
