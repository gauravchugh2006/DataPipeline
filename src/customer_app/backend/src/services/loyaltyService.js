const { getLoyaltyPool, withConnection } = require("../config/postgres");
const { buildWhereClause, buildSortClause, buildPagination } = require("../utils/queryBuilder");

const FILTER_MAP = {
  customerId: "customer_id",
  customerEmail: "customer_email",
  segment: "loyalty_segment",
  status: "recommendation_status",
  productId: "product_id"
};

const SORTABLE_COLUMNS = [
  "customer_id",
  "recommendation_score",
  "loyalty_segment",
  "recommendation_created_at"
];

const BASE_QUERY = `
  SELECT
    recommendation_id,
    customer_id,
    customer_email,
    loyalty_segment,
    product_id,
    product_name,
    recommendation_score,
    recommendation_status,
    reminder_frequency,
    discount_tier,
    next_best_action,
    recommendation_created_at
  FROM mart_loyalty_recommendations
`;

const listRecommendations = async (filters = {}, options = {}) => {
  const { where, values } = buildWhereClause(filters, FILTER_MAP);
  const sortClause = buildSortClause(options.sortBy, SORTABLE_COLUMNS);
  const { clause: paginationClause } = buildPagination(options.page, options.pageSize);

  const query = `${BASE_QUERY}${where}${sortClause || " ORDER BY recommendation_score DESC"}${paginationClause}`;

  return withConnection(async (client) => {
    const result = await client.query(query, values);
    return result.rows;
  }, getLoyaltyPool());
};

const getCustomerSummary = async (customerId) => {
  if (!customerId) {
    const error = new Error("customerId is required");
    error.status = 400;
    throw error;
  }

  const query = `
    SELECT
      customer_id,
      customer_email,
      loyalty_segment,
      COUNT(*) AS recommendation_count,
      SUM(CASE WHEN recommendation_status = 'accepted' THEN 1 ELSE 0 END) AS accepted_count,
      AVG(recommendation_score) AS average_score,
      MAX(recommendation_created_at) AS last_recommended_at
    FROM mart_loyalty_recommendations
    WHERE customer_id = $1
    GROUP BY customer_id, customer_email, loyalty_segment
  `;

  return withConnection(async (client) => {
    const result = await client.query(query, [customerId]);
    return result.rows[0] || null;
  }, getLoyaltyPool());
};

module.exports = {
  listRecommendations,
  getCustomerSummary
};
