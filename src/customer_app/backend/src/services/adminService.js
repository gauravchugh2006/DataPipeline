const { getAnalyticsPool, withConnection } = require("../config/postgres");
const { buildWhereClause, buildSortClause, buildPagination } = require("../utils/queryBuilder");

const ENTITY_CONFIG = {
  products: {
    table: "dim_products",
    primaryKey: "product_id",
    columns: ["product_id", "product_name", "category", "status", "price", "updated_at"],
    sortable: ["product_name", "price", "updated_at"],
    writable: ["product_name", "category", "status", "price"]
  },
  customers: {
    table: "dim_customers",
    primaryKey: "customer_id",
    columns: ["customer_id", "customer_name", "email", "loyalty_segment", "status", "updated_at"],
    sortable: ["customer_name", "status", "updated_at"],
    writable: ["customer_name", "email", "loyalty_segment", "status"]
  },
  orders: {
    table: "fct_orders",
    primaryKey: "order_id",
    columns: ["order_id", "customer_id", "order_status", "order_total", "order_date", "updated_at"],
    sortable: ["order_date", "order_total", "order_status"],
    writable: ["order_status"]
  }
};

const resolveEntity = (entity) => {
  const config = ENTITY_CONFIG[entity];
  if (!config) {
    const error = new Error(`Unsupported admin entity: ${entity}`);
    error.status = 400;
    throw error;
  }
  return config;
};

const listEntities = async (entity, filters = {}, options = {}) => {
  const { table, columns, sortable } = resolveEntity(entity);
  const { where, values } = buildWhereClause(filters, columns.reduce((map, column) => ({
    ...map,
    [column]: column
  }), {}));
  const sortClause = buildSortClause(options.sortBy, sortable);
  const { clause: paginationClause } = buildPagination(options.page, options.pageSize);

  const query = `SELECT ${columns.join(", ")} FROM ${table}${where}${sortClause}${paginationClause}`;

  return withConnection(async (client) => {
    const result = await client.query(query, values);
    return result.rows;
  }, getAnalyticsPool());
};

const createEntity = async (entity, payload) => {
  const { table, writable, primaryKey } = resolveEntity(entity);
  const keys = writable.filter((column) => payload[column] !== undefined);
  if (!keys.length) {
    const error = new Error("No writable columns provided");
    error.status = 400;
    throw error;
  }

  const columns = keys.join(", ");
  const placeholders = keys.map((_, index) => `$${index + 1}`).join(", ");
  const values = keys.map((key) => payload[key]);
  const query = `
    INSERT INTO ${table} (${columns})
    VALUES (${placeholders})
    RETURNING ${primaryKey}, ${columns}
  `;

  return withConnection(async (client) => {
    const result = await client.query(query, values);
    return result.rows[0];
  }, getAnalyticsPool());
};

const updateEntity = async (entity, id, payload) => {
  const { table, writable, primaryKey } = resolveEntity(entity);
  const keys = writable.filter((column) => payload[column] !== undefined);
  if (!keys.length) {
    const error = new Error("No writable columns provided");
    error.status = 400;
    throw error;
  }

  const setClauses = keys.map((key, index) => `${key} = $${index + 1}`).join(", ");
  const values = keys.map((key) => payload[key]);
  values.push(id);

  const query = `
    UPDATE ${table}
    SET ${setClauses}, updated_at = CURRENT_TIMESTAMP
    WHERE ${primaryKey} = $${values.length}
    RETURNING ${primaryKey}, ${writable.join(", ")}, updated_at
  `;

  return withConnection(async (client) => {
    const result = await client.query(query, values);
    if (!result.rowCount) {
      const error = new Error(`No ${entity} record found for id ${id}`);
      error.status = 404;
      throw error;
    }
    return result.rows[0];
  }, getAnalyticsPool());
};

const deleteEntity = async (entity, id) => {
  const { table, primaryKey } = resolveEntity(entity);
  const query = `DELETE FROM ${table} WHERE ${primaryKey} = $1`;
  return withConnection(async (client) => {
    const result = await client.query(query, [id]);
    if (!result.rowCount) {
      const error = new Error(`No ${entity} record found for id ${id}`);
      error.status = 404;
      throw error;
    }
    return { success: true };
  }, getAnalyticsPool());
};

module.exports = {
  listEntities,
  createEntity,
  updateEntity,
  deleteEntity
};
