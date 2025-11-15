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
