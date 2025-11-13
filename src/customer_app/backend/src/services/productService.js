const buildSort = (sort) => {
  switch (sort) {
    case "price_asc":
      return "ORDER BY MIN(v.price) ASC";
    case "price_desc":
      return "ORDER BY MIN(v.price) DESC";
    case "newest":
      return "ORDER BY p.created_at DESC";
    default:
      return "ORDER BY p.name ASC";
  }
};

export const listProducts = async (pool, filters = {}) => {
  const conditions = [];
  const params = [];

  if (filters.category) {
    conditions.push("p.category = ?");
    params.push(filters.category);
  }
  if (filters.color) {
    conditions.push("v.color = ?");
    params.push(filters.color);
  }
  if (filters.size) {
    conditions.push("v.size = ?");
    params.push(filters.size);
  }
  if (filters.minPrice) {
    conditions.push("v.price >= ?");
    params.push(Number(filters.minPrice));
  }
  if (filters.maxPrice) {
    conditions.push("v.price <= ?");
    params.push(Number(filters.maxPrice));
  }
  if (filters.search) {
    conditions.push("(p.name LIKE ? OR p.description LIKE ?)");
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const sortClause = buildSort(filters.sort);

  const [rows] = await pool.query(
  `SELECT
      p.id,
      p.slug,
      p.name,
      p.category,
      p.description,
      p.hero_image,
      p.rating,
      p.review_count,
      JSON_ARRAYAGG(
        JSON_OBJECT(
          'id', v.id,
          'color', v.color,
          'size', v.size,
          'price', v.price,
          'inventory', v.inventory
        )
      ) AS variants
    FROM products p
    JOIN product_variants v ON v.product_id = p.id
    ${whereClause}
    GROUP BY p.id
    ${sortClause}
    LIMIT ? OFFSET ?`,
  [...params, Number(filters.limit || 20), Number(filters.offset || 0)]
  );

return rows.map((row) => ({
  ...row,
  variants:
    typeof row.variants === "string"
      ? JSON.parse(row.variants || "[]")
      : row.variants || [],
}));
};

export const getProductById = async (pool, productId) => {
  const [products] = await pool.query(
    `SELECT
        p.id,
        p.slug,
        p.name,
        p.category,
        p.description,
        p.hero_image,
        p.rating,
        p.review_count,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', v.id,
            'color', v.color,
            'size', v.size,
            'price', v.price,
            'inventory', v.inventory
          )
        ) AS variants
      FROM products p
      JOIN product_variants v ON v.product_id = p.id
      WHERE p.id = ?
      GROUP BY p.id`,
    [productId]
  );

  if (!products.length) {
    return null;
  }

  const product = products[0];
  return {
    ...product,
    variants: JSON.parse(product.variants || "[]"),
  };
};

export const getProductReviews = async (pool, productId, { limit = 10, offset = 0 } = {}) => {
  const [rows] = await pool.query(
    `SELECT id, customer_name, rating, comment, created_at
     FROM reviews
     WHERE product_id = ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [productId, Number(limit), Number(offset)]
  );
  return rows;
};

export const createProductReview = async (
  pool,
  { productId, userId, customerName, rating, comment }
) => {
  const [result] = await pool.query(
    `INSERT INTO reviews (product_id, user_id, customer_name, rating, comment)
     VALUES (?, ?, ?, ?, ?)`,
    [productId, userId, customerName, rating, comment]
  );
  return { id: result.insertId };
};
