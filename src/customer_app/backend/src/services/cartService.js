const createHttpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const mapCartItems = (rows) =>
  rows.map((row) => ({
    productId: row.product_id,
    productName: row.product_name,
    price: Number(row.price),
    quantity: Number(row.quantity),
    category: row.category,
    imageUrl: row.image_url,
  }));

const getCartRows = async (pool, customerId) => {
  const [rows] = await pool.query(
    `SELECT
        ci.product_id,
        ci.quantity,
        p.name AS product_name,
        p.price,
        p.category,
        p.image_url
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      WHERE ci.customer_id = ?
      ORDER BY ci.updated_at DESC, ci.product_id DESC`,
    [customerId]
  );
  return mapCartItems(rows);
};

const getWishlistRows = async (pool, customerId) => {
  const [rows] = await pool.query(
    `SELECT
        wi.product_id,
        wi.desired_quantity AS quantity,
        p.name AS product_name,
        p.price,
        p.category,
        p.image_url
      FROM wishlist_items wi
      JOIN products p ON p.id = wi.product_id
      WHERE wi.customer_id = ?
      ORDER BY wi.updated_at DESC, wi.product_id DESC`,
    [customerId]
  );
  return mapCartItems(rows);
};

export const getCartSnapshot = async (pool, customerId) => {
  const [items, wishlist] = await Promise.all([
    getCartRows(pool, customerId),
    getWishlistRows(pool, customerId),
  ]);

  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.quantity),
    0
  );
  const totalQuantity = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  return {
    items,
    wishlist,
    summary: {
      subtotal,
      totalItems: totalQuantity,
    },
  };
};

const ensureProductExists = async (pool, productId) => {
  const [rows] = await pool.query(`SELECT id FROM products WHERE id = ? LIMIT 1`, [
    productId,
  ]);
  if (!rows.length) {
    throw createHttpError(404, "Product not found");
  }
};

export const addCartItem = async (pool, customerId, { productId, quantity = 1 }) => {
  await ensureProductExists(pool, productId);
  const normalizedQty = Math.max(Number(quantity) || 1, 1);
  await pool.query(
    `INSERT INTO cart_items (customer_id, product_id, quantity)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE quantity = LEAST(quantity + VALUES(quantity), 999), updated_at = CURRENT_TIMESTAMP`,
    [customerId, productId, normalizedQty]
  );
  await pool.query(
    `DELETE FROM wishlist_items WHERE customer_id = ? AND product_id = ?`,
    [customerId, productId]
  );
  return getCartSnapshot(pool, customerId);
};

export const updateCartItemQuantity = async (
  pool,
  customerId,
  productId,
  quantity
) => {
  const normalizedQty = Math.max(Number(quantity) || 0, 0);
  if (normalizedQty <= 0) {
    await pool.query(
      `DELETE FROM cart_items WHERE customer_id = ? AND product_id = ?`,
      [customerId, productId]
    );
    return getCartSnapshot(pool, customerId);
  }

  const [result] = await pool.query(
    `UPDATE cart_items
       SET quantity = ?, updated_at = CURRENT_TIMESTAMP
     WHERE customer_id = ? AND product_id = ?`,
    [normalizedQty, customerId, productId]
  );
  if (result.affectedRows === 0) {
    throw createHttpError(404, "Cart item not found");
  }
  return getCartSnapshot(pool, customerId);
};

export const removeCartItem = async (pool, customerId, productId) => {
  const [result] = await pool.query(
    `DELETE FROM cart_items WHERE customer_id = ? AND product_id = ?`,
    [customerId, productId]
  );
  if (result.affectedRows === 0) {
    throw createHttpError(404, "Cart item not found");
  }
  return getCartSnapshot(pool, customerId);
};

export const clearCart = async (pool, customerId) => {
  await pool.query(`DELETE FROM cart_items WHERE customer_id = ?`, [customerId]);
  return getCartSnapshot(pool, customerId);
};

export const moveCartItemToWishlist = async (pool, customerId, productId) => {
  const [rows] = await pool.query(
    `SELECT quantity FROM cart_items WHERE customer_id = ? AND product_id = ?`,
    [customerId, productId]
  );
  if (!rows.length) {
    throw createHttpError(404, "Cart item not found");
  }
  const desiredQty = Math.max(Number(rows[0].quantity) || 1, 1);
  await pool.query(
    `INSERT INTO wishlist_items (customer_id, product_id, desired_quantity)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE desired_quantity = VALUES(desired_quantity), updated_at = CURRENT_TIMESTAMP`,
    [customerId, productId, desiredQty]
  );
  await pool.query(
    `DELETE FROM cart_items WHERE customer_id = ? AND product_id = ?`,
    [customerId, productId]
  );
  return getCartSnapshot(pool, customerId);
};

export const moveWishlistItemToCart = async (pool, customerId, productId) => {
  const [rows] = await pool.query(
    `SELECT desired_quantity FROM wishlist_items WHERE customer_id = ? AND product_id = ?`,
    [customerId, productId]
  );
  if (!rows.length) {
    throw createHttpError(404, "Wishlist item not found");
  }
  const quantity = Math.max(Number(rows[0].desired_quantity) || 1, 1);
  await ensureProductExists(pool, productId);
  await pool.query(
    `INSERT INTO cart_items (customer_id, product_id, quantity)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE quantity = LEAST(quantity + VALUES(quantity), 999), updated_at = CURRENT_TIMESTAMP`,
    [customerId, productId, quantity]
  );
  await pool.query(
    `DELETE FROM wishlist_items WHERE customer_id = ? AND product_id = ?`,
    [customerId, productId]
  );
  return getCartSnapshot(pool, customerId);
};

export const removeWishlistItem = async (pool, customerId, productId) => {
  await pool.query(
    `DELETE FROM wishlist_items WHERE customer_id = ? AND product_id = ?`,
    [customerId, productId]
  );
  return getCartSnapshot(pool, customerId);
};

export const validateCouponCode = async (pool, code, subtotal = 0) => {
  if (!code) {
    return null;
  }
  const normalizedCode = code.trim().toUpperCase();
  const [rows] = await pool.query(
    `SELECT code, description, discount_type, discount_value, min_subtotal, success_message
       FROM discount_coupons
      WHERE UPPER(code) = ?
        AND is_active = TRUE
        AND (starts_at IS NULL OR starts_at <= NOW())
        AND (expires_at IS NULL OR expires_at >= NOW())
      LIMIT 1`,
    [normalizedCode]
  );
  if (!rows.length) {
    return null;
  }
  const coupon = rows[0];
  const minimum = coupon.min_subtotal ? Number(coupon.min_subtotal) : 0;
  if (minimum && Number(subtotal || 0) < minimum) {
    throw createHttpError(
      400,
      `A minimum order value of €${minimum.toFixed(2)} is required for this coupon.`
    );
  }
  return {
    code: coupon.code,
    description: coupon.description,
    discountType: coupon.discount_type,
    discountValue: Number(coupon.discount_value),
    minSubtotal: minimum || null,
    message: coupon.success_message || `${coupon.code} is applied to your order`,
  };
};
