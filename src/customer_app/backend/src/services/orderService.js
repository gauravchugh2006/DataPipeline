const { getOrderPool } = require("../config/mysql");

const ITEMS_SUBQUERY = `
  SELECT JSON_ARRAYAGG(
    JSON_OBJECT(
      'productId', oi.product_id,
      'productName', oi.product_name,
      'category', oi.category,
      'price', oi.price,
      'quantity', oi.quantity,
      'imageUrl', pr.image_url
    )
  )
  FROM order_items oi
  LEFT JOIN products pr ON pr.id = oi.product_id
  WHERE oi.order_id = o.id
`;

const BASE_QUERY = `
  SELECT
    o.id,
    o.customer_id,
    o.order_date,
    o.total_amount,
    o.payment_status,
    c.first_name,
    c.last_name,
    c.email,
    p.id AS payment_id,
    p.payment_method,
    p.transaction_status,
    (${ITEMS_SUBQUERY}) AS items
  FROM orders o
  JOIN customers c ON c.id = o.customer_id
  LEFT JOIN payments p ON p.order_id = o.id
`;

const normalizeItems = (items) => {
  if (Buffer.isBuffer(items)) {
    items = items.toString("utf-8");
  }
  if (!items) {
    return [];
  }
  if (Array.isArray(items)) {
    return items.filter(Boolean);
  }
  if (typeof items === "string") {
    try {
      const parsed = JSON.parse(items);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch (error) {
      return [];
    }
  }
  return [];
};

const listOrders = async ({ customerId, paymentStatus, limit, offset }) => {
  if (!customerId) {
    const error = new Error("customerId is required to list orders");
    error.status = 400;
    throw error;
  }

  const pool = getOrderPool();
  const conditions = ["o.customer_id = ?"];
  const params = [customerId];

  if (paymentStatus) {
    conditions.push("o.payment_status = ?");
    params.push(paymentStatus);
  }

  let query = `${BASE_QUERY} WHERE ${conditions.join(" AND ")} ORDER BY o.order_date DESC, o.id DESC`;

  if (typeof limit === "number" && Number.isFinite(limit)) {
    query += " LIMIT ?";
    params.push(Math.max(1, Math.floor(limit)));
  }
  if (typeof offset === "number" && Number.isFinite(offset) && offset > 0) {
    query += " OFFSET ?";
    params.push(Math.max(0, Math.floor(offset)));
  }

  const [rows] = await pool.query(query, params);
  return rows.map((row) => ({
    ...row,
    items: normalizeItems(row.items)
  }));
};

module.exports = {
  listOrders
};
