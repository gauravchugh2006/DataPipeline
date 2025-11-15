const SORT_COLUMNS = {
  order_date: "o.order_date",
  total: "o.total_amount",
  status: "o.payment_status",
  payment: "p.transaction_status",
};

const buildFilters = ({
  status,
  paymentMethod,
  transactionStatus,
  search,
  startDate,
  endDate,
  customerId,
}, role, requesterId) => {
  const conditions = [];
  const params = [];

  if (role !== "admin") {
    conditions.push("o.customer_id = ?");
    params.push(requesterId);
  } else if (customerId) {
    conditions.push("o.customer_id = ?");
    params.push(Number(customerId));
  }

  if (status) {
    conditions.push("o.payment_status = ?");
    params.push(status);
  }

  if (paymentMethod) {
    conditions.push("p.payment_method = ?");
    params.push(paymentMethod);
  }

  if (transactionStatus) {
    conditions.push("p.transaction_status = ?");
    params.push(transactionStatus);
  }

  if (startDate) {
    conditions.push("o.order_date >= ?");
    params.push(startDate);
  }

  if (endDate) {
    conditions.push("o.order_date <= ?");
    params.push(endDate);
  }

  if (search) {
    conditions.push("(o.id = ? OR pr.name LIKE ?)");
    params.push(Number.isNaN(Number(search)) ? 0 : Number(search));
    params.push(`%${search}%`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return { whereClause, params };
};

const parseItems = (raw) => {
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    return [];
  }
};

export const listOrders = async (
  pool,
  { userId, role, filters = {}, unlimited = false }
) => {
  const page = Math.max(Number(filters.page) || 1, 1);
  const rawPageSize = Math.max(Number(filters.pageSize) || 10, 1);
  const pageSize = unlimited ? rawPageSize : Math.min(rawPageSize, 100);
  const offset = unlimited ? 0 : (page - 1) * pageSize;

  const sortColumn = SORT_COLUMNS[filters.sortBy] || SORT_COLUMNS.order_date;
  const sortDirection = (filters.sortDir || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";

  const { whereClause, params } = buildFilters(filters, role, userId);

  const baseQuery = `
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    LEFT JOIN payments p ON p.order_id = o.id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    LEFT JOIN products pr ON pr.id = oi.product_id
    ${whereClause}
  `;

  const [countRows] = await pool.query(
    `SELECT COUNT(DISTINCT o.id) AS total ${baseQuery}`,
    params
  );
  const total = Number(countRows[0]?.total || 0);

  const limitClause = unlimited ? "" : "LIMIT ? OFFSET ?";
  const paginationParams = unlimited ? [] : [pageSize, offset];

  const [rows] = await pool.query(
    `SELECT
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
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'productId', oi.product_id,
            'productName', oi.product_name,
            'category', oi.category,
            'price', oi.price,
            'quantity', oi.quantity,
            'imageUrl', pr.image_url
          )
        ) AS items
      ${baseQuery}
      GROUP BY o.id
      ORDER BY ${sortColumn} ${sortDirection}
      ${limitClause}`,
    [...params, ...paginationParams]
  );

  const items = rows.map((row) => ({
    id: row.id,
    customerId: row.customer_id,
    orderDate: row.order_date,
    totalAmount: Number(row.total_amount),
    paymentStatus: row.payment_status,
    customer: {
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
    },
    payment: row.payment_id
      ? {
          id: row.payment_id,
          method: row.payment_method,
          status: row.transaction_status,
        }
      : null,
    items: parseItems(row.items),
  }));

  const totalPages = unlimited
    ? 1
    : Math.max(Math.ceil(total / pageSize), 1);

  return {
    items,
    page: unlimited ? 1 : page,
    pageSize: unlimited ? items.length : pageSize,
    total,
    totalPages,
  };
};

export const getOrderById = async (pool, orderId, { userId, role }) => {
  const filters = { search: String(orderId) };
  const { whereClause, params } = buildFilters(filters, role, userId);
  params.push(Number(orderId));

  const [rows] = await pool.query(
    `SELECT
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
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'productId', oi.product_id,
            'productName', oi.product_name,
            'category', oi.category,
            'price', oi.price,
            'quantity', oi.quantity,
            'imageUrl', pr.image_url
          )
        ) AS items
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      LEFT JOIN payments p ON p.order_id = o.id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN products pr ON pr.id = oi.product_id
      ${whereClause ? `${whereClause} AND o.id = ?` : "WHERE o.id = ?"}
      GROUP BY o.id`,
    params
  );

  if (!rows.length) {
    return null;
  }

  const row = rows[0];
  return {
    id: row.id,
    customerId: row.customer_id,
    orderDate: row.order_date,
    totalAmount: Number(row.total_amount),
    paymentStatus: row.payment_status,
    customer: {
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
    },
    payment: row.payment_id
      ? {
          id: row.payment_id,
          method: row.payment_method,
          status: row.transaction_status,
        }
      : null,
    items: parseItems(row.items),
  };
};

export const createOrder = async (
  pool,
  { customerId, items, totalAmount, paymentStatus = "Pending", payment }
) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const orderDate = new Date();
    const [result] = await connection.query(
      `INSERT INTO orders (id, customer_id, order_date, total_amount, payment_status)
       VALUES (NULL, ?, ?, ?, ?)`,
      [customerId, orderDate, totalAmount, paymentStatus]
    );
    const orderId = result.insertId;

    for (const item of items) {
      await connection.query(
        `INSERT INTO order_items (order_id, product_id, product_name, category, price, quantity)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE price = VALUES(price), quantity = VALUES(quantity)`,
        [
          orderId,
          item.productId,
          item.productName,
          item.category,
          item.price,
          item.quantity || 1,
        ]
      );
    }

    if (payment && payment.method) {
      await connection.query(
        `INSERT INTO payments (id, order_id, payment_method, transaction_status)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE payment_method = VALUES(payment_method), transaction_status = VALUES(transaction_status)`,
        [
          payment.id || null,
          orderId,
          payment.method,
          payment.status || paymentStatus,
        ]
      );
    }

    await connection.commit();
    return getOrderById(pool, orderId, { userId: customerId, role: "customer" });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const updateOrderStatus = async (
  pool,
  orderId,
  status,
  paymentStatus
) => {
  const [result] = await pool.query(
    `UPDATE orders SET payment_status = ?, updated_at = NOW() WHERE id = ?`,
    [status, orderId]
  );

  if (paymentStatus) {
    await pool.query(
      `UPDATE payments SET transaction_status = ?, recorded_at = NOW() WHERE order_id = ?`,
      [paymentStatus, orderId]
    );
  }

  return result.affectedRows > 0;
};
