const SORT_MAP = {
  price_asc: "p.price ASC",
  price_desc: "p.price DESC",
  newest: "p.created_at DESC",
  popular: "COALESCE(order_stats.total_quantity, 0) DESC",
  name: "p.name ASC",
};

const buildProductFilters = ({ category, minPrice, maxPrice, search }) => {
  const conditions = [];
  const params = [];

  if (category) {
    conditions.push("p.category = ?");
    params.push(category);
  }

  if (minPrice !== undefined && minPrice !== null && minPrice !== "") {
    conditions.push("p.price >= ?");
    params.push(Number(minPrice));
  }

  if (maxPrice !== undefined && maxPrice !== null && maxPrice !== "") {
    conditions.push("p.price <= ?");
    params.push(Number(maxPrice));
  }

  if (search) {
    conditions.push("p.name LIKE ?");
    params.push(`%${search}%`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return { whereClause, params };
};

export const listProducts = async (pool, filters = {}) => {
  const page = Math.max(Number(filters.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(filters.pageSize) || 25, 1), 50);
  const offset = (page - 1) * pageSize;

  const sortKey = filters.sort || "name";
  const sortClause = SORT_MAP[sortKey] || SORT_MAP.name;

  const { whereClause, params } = buildProductFilters(filters);

  const baseQuery = `
    FROM products p
    LEFT JOIN (
      SELECT product_id, SUM(quantity) AS total_quantity
      FROM order_items
      GROUP BY product_id
    ) AS order_stats ON order_stats.product_id = p.id
    LEFT JOIN (
      SELECT product_id, AVG(rating) AS avg_rating, COUNT(*) AS review_count
      FROM reviews
      GROUP BY product_id
    ) AS review_stats ON review_stats.product_id = p.id
    ${whereClause}
  `;

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM products p ${whereClause}`,
    params
  );
  const total = Number(countRows[0]?.total || 0);

  const [rows] = await pool.query(
    `SELECT
        p.id,
        p.name,
        p.category,
        p.price,
        p.image_url,
        p.created_at,
        COALESCE(order_stats.total_quantity, 0) AS total_sold,
        COALESCE(review_stats.avg_rating, 0) AS average_rating,
        COALESCE(review_stats.review_count, 0) AS review_count
      ${baseQuery}
      ORDER BY ${sortClause}
      LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  const items = rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    imageUrl: row.image_url,
    createdAt: row.created_at,
    totalSold: Number(row.total_sold || 0),
    averageRating: Number(row.average_rating || 0),
    reviewCount: Number(row.review_count || 0),
  }));

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  return {
    items,
    page,
    pageSize,
    total,
    totalPages,
  };
};

export const getProductById = async (pool, productId) => {
  const [products] = await pool.query(
    `SELECT
        p.id,
        p.name,
        p.category,
        p.price,
        p.image_url,
        p.created_at,
        COALESCE(order_stats.total_quantity, 0) AS total_sold,
        COALESCE(review_stats.avg_rating, 0) AS average_rating,
        COALESCE(review_stats.review_count, 0) AS review_count
      FROM products p
      LEFT JOIN (
        SELECT product_id, SUM(quantity) AS total_quantity
        FROM order_items
        GROUP BY product_id
      ) AS order_stats ON order_stats.product_id = p.id
      LEFT JOIN (
        SELECT product_id, AVG(rating) AS avg_rating, COUNT(*) AS review_count
        FROM reviews
        GROUP BY product_id
      ) AS review_stats ON review_stats.product_id = p.id
      WHERE p.id = ?
      LIMIT 1`,
    [productId]
  );

  if (!products.length) {
    return null;
  }

  const product = products[0];

  const [recentOrders] = await pool.query(
    `SELECT o.id, o.order_date, o.total_amount, o.payment_status
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE oi.product_id = ?
       ORDER BY o.order_date DESC
       LIMIT 5`,
    [productId]
  );

  return {
    id: product.id,
    name: product.name,
    category: product.category,
    price: Number(product.price),
    imageUrl: product.image_url,
    createdAt: product.created_at,
    totalSold: Number(product.total_sold || 0),
    averageRating: Number(product.average_rating || 0),
    reviewCount: Number(product.review_count || 0),
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      date: order.order_date,
      totalAmount: Number(order.total_amount),
      status: order.payment_status,
    })),
  };
};

export const getProductReviews = async (
  pool,
  productId,
  { limit = 10, offset = 0 } = {}
) => {
  const [rows] = await pool.query(
    `SELECT
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        c.first_name,
        c.last_name
      FROM reviews r
      LEFT JOIN customers c ON c.id = r.customer_id
      WHERE r.product_id = ?
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?`,
    [productId, Number(limit), Number(offset)]
  );

  return rows.map((row) => ({
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    created_at: row.created_at,
    customer_name: `${row.first_name || ""} ${row.last_name || ""}`.trim() || "Customer",
  }));
};

export const createProductReview = async (
  pool,
  { productId, userId, rating, comment }
) => {
  const [customerRows] = await pool.query(
    `SELECT first_name, last_name FROM customers WHERE id = ?`,
    [userId]
  );
  const customer = customerRows[0];
  const [result] = await pool.query(
    `INSERT INTO reviews (product_id, customer_id, rating, comment)
     VALUES (?, ?, ?, ?)`,
    [productId, userId, rating, comment]
  );
  return {
    id: result.insertId,
    customer_name: `${customer?.first_name || ""} ${customer?.last_name || ""}`.trim() || "Customer",
  };
};
