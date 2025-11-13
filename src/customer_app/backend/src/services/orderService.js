export const createOrder = async (pool, { userId, status = "pending", items }) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const subtotal = items.reduce(
      (acc, item) => acc + Number(item.unitPrice) * Number(item.quantity),
      0
    );
    const tax = subtotal * 0.08;
    const total = subtotal + tax;

    const [orderResult] = await connection.query(
      `INSERT INTO orders (user_id, status, subtotal, tax, total) VALUES (?, ?, ?, ?, ?)`,
      [userId, status, subtotal, tax, total]
    );

    const orderId = orderResult.insertId;

    for (const item of items) {
      await connection.query(
        `INSERT INTO order_items (order_id, product_variant_id, quantity, unit_price)
         VALUES (?, ?, ?, ?)`,
        [orderId, item.variantId, item.quantity, item.unitPrice]
      );
    }

    await connection.commit();
    return { id: orderId, subtotal, tax, total };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const listOrders = async (pool, { userId, role }) => {
  const params = [];
  let whereClause = "";
  if (role !== "admin") {
    whereClause = "WHERE o.user_id = ?";
    params.push(userId);
  }

  const [rows] = await pool.query(
    `SELECT
        o.id,
        o.status,
        o.subtotal,
        o.tax,
        o.total,
        o.created_at,
        u.name AS customer_name,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'variantId', oi.product_variant_id,
            'quantity', oi.quantity,
            'unitPrice', oi.unit_price,
            'productName', p.name,
            'color', v.color,
            'size', v.size
          )
        ) AS items
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN product_variants v ON v.id = oi.product_variant_id
      JOIN products p ON p.id = v.product_id
      JOIN users u ON u.id = o.user_id
      ${whereClause}
      GROUP BY o.id
      ORDER BY o.created_at DESC`,
    params
  );

  return rows.map((row) => ({
    ...row,
    customer_name: row.customer_name,
    items: JSON.parse(row.items || "[]"),
  }));
};

export const getOrderById = async (pool, orderId, { userId, role }) => {
  const params = [orderId];
  let accessClause = "";
  if (role !== "admin") {
    accessClause = "AND o.user_id = ?";
    params.push(userId);
  }

  const [rows] = await pool.query(
    `SELECT
        o.id,
        o.status,
        o.subtotal,
        o.tax,
        o.total,
        o.created_at,
        o.user_id,
        u.name AS customer_name,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'variantId', oi.product_variant_id,
            'quantity', oi.quantity,
            'unitPrice', oi.unit_price,
            'productName', p.name,
            'color', v.color,
            'size', v.size
          )
        ) AS items
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN product_variants v ON v.id = oi.product_variant_id
      JOIN products p ON p.id = v.product_id
      JOIN users u ON u.id = o.user_id
      WHERE o.id = ?
      ${accessClause}
      GROUP BY o.id`,
    params
  );

  if (!rows.length) {
    return null;
  }

  const order = rows[0];
  return {
    ...order,
    customer_name: order.customer_name,
    items: JSON.parse(order.items || "[]"),
  };
};

export const updateOrderStatus = async (pool, orderId, status) => {
  const [result] = await pool.query(
    `UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?`,
    [status, orderId]
  );
  return result.affectedRows > 0;
};
