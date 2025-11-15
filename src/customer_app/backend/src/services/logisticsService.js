const { getAnalyticsPool, withConnection } = require("../config/postgres");
const { buildWhereClause, buildSortClause, buildPagination } = require("../utils/queryBuilder");

const FILTER_MAP = {
  distributorId: "distributor_id",
  stockistId: "stockist_id",
  region: "region",
  slaBreach: "sla_breach_flag"
};

const SORTABLE_COLUMNS = [
  "snapshot_date",
  "sla_breach_flag",
  "inventory_days_on_hand",
  "on_time_percentage"
];

const BASE_QUERY = `
  SELECT
    snapshot_date,
    distributor_id,
    distributor_name,
    stockist_id,
    stockist_name,
    region,
    on_time_percentage,
    penalty_amount,
    sla_breach_flag,
    breach_reason,
    inventory_days_on_hand
  FROM mart_logistics_sla
`;

const listLogisticsSnapshots = async (filters = {}, options = {}) => {
  const { where, values } = buildWhereClause(filters, FILTER_MAP);
  const sortClause = buildSortClause(options.sortBy, SORTABLE_COLUMNS);
  const { clause: paginationClause } = buildPagination(options.page, options.pageSize);

  const query = `${BASE_QUERY}${where}${sortClause || " ORDER BY snapshot_date DESC"}${paginationClause}`;

  return withConnection(async (client) => {
    const result = await client.query(query, values);
    return result.rows;
  }, getAnalyticsPool());
};

module.exports = {
  listLogisticsSnapshots
};
