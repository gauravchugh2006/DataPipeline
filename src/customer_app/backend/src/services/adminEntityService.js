import bcrypt from "bcryptjs";

import { createOrder, getOrderById, listOrders } from "./orderService.js";

const parsePagination = (query = {}) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(query.pageSize) || 10, 1), 100);
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
};

const parseSorting = (querySort, queryDir, allowed) => {
  const sortKey = allowed[querySort] ? querySort : Object.keys(allowed)[0];
  const sortDir = queryDir && queryDir.toLowerCase() === "asc" ? "ASC" : "DESC";
  return { column: allowed[sortKey], direction: sortDir, sortKey };
};

const cleanFilters = (filters) =>
  Object.fromEntries(
    Object.entries(filters || {}).filter(([, value]) =>
      value !== undefined && value !== null && value !== ""
    )
  );

const PRODUCT_SORT_COLUMNS = {
  createdAt: "p.created_at",
  updatedAt: "p.updated_at",
  name: "p.name",
  category: "p.category",
  price: "p.price",
};

const CUSTOMER_SORT_COLUMNS = {
  createdAt: "c.signup_date",
  updatedAt: "c.updated_at",
  email: "c.email",
  firstName: "c.first_name",
  lastName: "c.last_name",
};

const mapCustomerSummary = (row) => ({
  id: row.id,
  email: row.email,
  firstName: row.first_name,
  lastName: row.last_name,
  phone: row.phone,
  address: row.address,
  gender: row.gender,
  role: row.role,
  theme: row.theme_preference,
  signupDate: row.signup_date,
  updatedAt: row.updated_at,
});

const buildProductFilters = (filters) => {
  const conditions = [];
  const params = [];

  if (filters.category) {
    conditions.push("p.category = ?");
    params.push(filters.category);
  }

  if (filters.search) {
    conditions.push("(p.name LIKE ? OR p.id = ?)");
    params.push(`%${filters.search}%`, Number(filters.search) || 0);
  }

  if (filters.minPrice !== undefined) {
    conditions.push("p.price >= ?");
    params.push(Number(filters.minPrice));
  }

  if (filters.maxPrice !== undefined) {
    conditions.push("p.price <= ?");
    params.push(Number(filters.maxPrice));
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return { where, params };
};

const mapProductRow = (row) => ({
  id: row.id,
  name: row.name,
  category: row.category,
  price: Number(row.price),
  imageUrl: row.image_url,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const listAdminProducts = async (pool, query = {}, { includeAll = false } = {}) => {
  const filters = cleanFilters({
    category: query.category,
    search: query.search,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
  });

  const { where, params } = buildProductFilters(filters);
  const { page, pageSize, offset } = parsePagination(query);
  const { column, direction, sortKey } = parseSorting(
    query.sortBy,
    query.sortDir,
    PRODUCT_SORT_COLUMNS
  );

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM products p ${where}`,
    params
  );
  const total = Number(countRows[0]?.total || 0);

  let limitClause = "";
  let limitParams = [];
  if (!includeAll) {
    limitClause = "LIMIT ? OFFSET ?";
    limitParams = [pageSize, offset];
  }

  const [rows] = await pool.query(
    `SELECT p.id, p.name, p.category, p.price, p.image_url, p.created_at, p.updated_at
       FROM products p
       ${where}
       ORDER BY ${column} ${direction}
       ${limitClause}`,
    [...params, ...limitParams]
  );

  const items = rows.map(mapProductRow);
  const totalPages = includeAll ? 1 : Math.max(Math.ceil(total / pageSize), 1);

  return {
    items,
    page: includeAll ? 1 : page,
    pageSize: includeAll ? items.length : pageSize,
    total,
    totalPages,
    sort: { key: sortKey, direction },
  };
};

export const createAdminProduct = async (pool, payload) => {
  const [result] = await pool.query(
    `INSERT INTO products (name, category, price, image_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, NOW(), NOW())`,
    [payload.name, payload.category, payload.price, payload.imageUrl || null]
  );
  const [rows] = await pool.query(
    `SELECT p.id, p.name, p.category, p.price, p.image_url, p.created_at, p.updated_at
       FROM products p WHERE p.id = ?`,
    [result.insertId]
  );
  return mapProductRow(rows[0]);
};

export const updateAdminProduct = async (pool, id, updates) => {
  const assignments = [];
  const params = [];

  if (updates.name !== undefined) {
    assignments.push("name = ?");
    params.push(updates.name);
  }
  if (updates.category !== undefined) {
    assignments.push("category = ?");
    params.push(updates.category);
  }
  if (updates.price !== undefined) {
    assignments.push("price = ?");
    params.push(updates.price);
  }
  if (updates.imageUrl !== undefined) {
    assignments.push("image_url = ?");
    params.push(updates.imageUrl || null);
  }

  if (!assignments.length) {
    const [rows] = await pool.query(
      `SELECT p.id, p.name, p.category, p.price, p.image_url, p.created_at, p.updated_at
         FROM products p WHERE p.id = ?`,
      [id]
    );
    return rows.length ? mapProductRow(rows[0]) : null;
  }

  params.push(id);
  const [result] = await pool.query(
    `UPDATE products SET ${assignments.join(", ")}, updated_at = NOW() WHERE id = ?`,
    params
  );

  if (result.affectedRows === 0) {
    return null;
  }

  const [rows] = await pool.query(
    `SELECT p.id, p.name, p.category, p.price, p.image_url, p.created_at, p.updated_at
       FROM products p WHERE p.id = ?`,
    [id]
  );
  return rows.length ? mapProductRow(rows[0]) : null;
};

export const deleteAdminProduct = async (pool, id) => {
  const [result] = await pool.query(`DELETE FROM products WHERE id = ?`, [id]);
  return result.affectedRows > 0;
};

const buildCustomerFilters = (filters) => {
  const conditions = [];
  const params = [];

  if (filters.role) {
    conditions.push("c.role = ?");
    params.push(filters.role);
  }

  if (filters.search) {
    conditions.push("(c.email LIKE ? OR c.first_name LIKE ? OR c.last_name LIKE ?)");
    const likeValue = `%${filters.search}%`;
    params.push(likeValue, likeValue, likeValue);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return { where, params };
};

export const listAdminCustomers = async (
  pool,
  query = {},
  { includeAll = false } = {}
) => {
  const filters = cleanFilters({ role: query.role, search: query.search });
  const { where, params } = buildCustomerFilters(filters);
  const { page, pageSize, offset } = parsePagination(query);
  const { column, direction, sortKey } = parseSorting(
    query.sortBy,
    query.sortDir,
    CUSTOMER_SORT_COLUMNS
  );

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM customers c ${where}`,
    params
  );
  const total = Number(countRows[0]?.total || 0);

  let limitClause = "";
  let limitParams = [];
  if (!includeAll) {
    limitClause = "LIMIT ? OFFSET ?";
    limitParams = [pageSize, offset];
  }

  const [rows] = await pool.query(
    `SELECT
        c.id,
        c.email,
        c.first_name,
        c.last_name,
        c.phone,
        c.address,
        c.gender,
        c.role,
        c.theme_preference,
        c.signup_date,
        c.updated_at
      FROM customers c
      ${where}
      ORDER BY ${column} ${direction}
      ${limitClause}`,
    [...params, ...limitParams]
  );

  const items = rows.map(mapCustomerSummary);

  const totalPages = includeAll ? 1 : Math.max(Math.ceil(total / pageSize), 1);

  return {
    items,
    page: includeAll ? 1 : page,
    pageSize: includeAll ? items.length : pageSize,
    total,
    totalPages,
    sort: { key: sortKey, direction },
  };
};

export const createAdminCustomer = async (pool, payload) => {
  const passwordHash = await bcrypt.hash(payload.password, 10);
  const [result] = await pool.query(
    `INSERT INTO customers (
        email,
        password_hash,
        first_name,
        last_name,
        phone,
        address,
        gender,
        role,
        theme_preference,
        signup_date,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
    [
      payload.email,
      passwordHash,
      payload.firstName,
      payload.lastName,
      payload.phone || null,
      payload.address || null,
      payload.gender || "other",
      payload.role || "customer",
      payload.theme || "sunrise",
    ]
  );

  const [rows] = await pool.query(
    `SELECT
        c.id,
        c.email,
        c.first_name,
        c.last_name,
        c.phone,
        c.address,
        c.gender,
        c.role,
        c.theme_preference,
        c.signup_date,
        c.updated_at
      FROM customers c WHERE c.id = ?`,
    [result.insertId]
  );
  return rows.length ? mapCustomerSummary(rows[0]) : null;
};

export const updateAdminCustomer = async (pool, id, updates) => {
  const assignments = [];
  const params = [];

  if (updates.email !== undefined) {
    assignments.push("email = ?");
    params.push(updates.email);
  }
  if (updates.firstName !== undefined) {
    assignments.push("first_name = ?");
    params.push(updates.firstName);
  }
  if (updates.lastName !== undefined) {
    assignments.push("last_name = ?");
    params.push(updates.lastName);
  }
  if (updates.phone !== undefined) {
    assignments.push("phone = ?");
    params.push(updates.phone || null);
  }
  if (updates.address !== undefined) {
    assignments.push("address = ?");
    params.push(updates.address || null);
  }
  if (updates.gender !== undefined) {
    assignments.push("gender = ?");
    params.push(updates.gender || "other");
  }
  if (updates.role !== undefined) {
    assignments.push("role = ?");
    params.push(updates.role);
  }
  if (updates.theme !== undefined) {
    assignments.push("theme_preference = ?");
    params.push(updates.theme);
  }
  if (updates.password) {
    const passwordHash = await bcrypt.hash(updates.password, 10);
    assignments.push("password_hash = ?");
    params.push(passwordHash);
  }

    if (!assignments.length) {
      const [rows] = await pool.query(
        `SELECT
            c.id,
            c.email,
            c.first_name,
            c.last_name,
            c.phone,
            c.address,
            c.gender,
            c.role,
            c.theme_preference,
            c.signup_date,
            c.updated_at
          FROM customers c WHERE c.id = ?`,
        [id]
      );
      return rows.length ? mapCustomerSummary(rows[0]) : null;
    }

  params.push(id);
  const [result] = await pool.query(
    `UPDATE customers SET ${assignments.join(", ")}, updated_at = NOW() WHERE id = ?`,
    params
  );

  if (result.affectedRows === 0) {
    return null;
  }

  const [rows] = await pool.query(
    `SELECT
        c.id,
        c.email,
        c.first_name,
        c.last_name,
        c.phone,
        c.address,
        c.gender,
        c.role,
        c.theme_preference,
        c.signup_date,
        c.updated_at
      FROM customers c WHERE c.id = ?`,
    [id]
  );

  return rows.length ? mapCustomerSummary(rows[0]) : null;
};

export const deleteAdminCustomer = async (pool, id) => {
  const [result] = await pool.query(`DELETE FROM customers WHERE id = ?`, [id]);
  return result.affectedRows > 0;
};

export const listAdminOrders = async (pool, query = {}, options = {}) => {
  const filters = {
    page: query.page,
    pageSize: query.pageSize,
    sortBy: query.sortBy,
    sortDir: query.sortDir,
    status: query.status,
    transactionStatus: query.transactionStatus,
    startDate: query.startDate,
    endDate: query.endDate,
    search: query.search,
    customerId: query.customerId,
  };

  return listOrders(pool, {
    userId: 0,
    role: "admin",
    filters,
    unlimited: Boolean(options.includeAll),
  });
};

export const createAdminOrder = async (pool, payload) =>
  createOrder(pool, {
    customerId: payload.customerId,
    items: payload.items,
    totalAmount: payload.totalAmount,
    paymentStatus: payload.paymentStatus,
    payment: payload.payment,
  });

export const updateAdminOrder = async (pool, id, updates) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const assignments = [];
    const params = [];

    if (updates.paymentStatus !== undefined) {
      assignments.push("payment_status = ?");
      params.push(updates.paymentStatus);
    }
    if (updates.totalAmount !== undefined) {
      assignments.push("total_amount = ?");
      params.push(updates.totalAmount);
    }
    if (updates.orderDate !== undefined) {
      assignments.push("order_date = ?");
      params.push(updates.orderDate);
    }

    if (assignments.length) {
      params.push(id);
      const [orderResult] = await connection.query(
        `UPDATE orders SET ${assignments.join(", ")}, updated_at = NOW() WHERE id = ?`,
        params
      );
      if (orderResult.affectedRows === 0) {
        await connection.rollback();
        return null;
      }
    }

    if (updates.payment) {
      const payment = updates.payment;
      if (payment.method || payment.status) {
        await connection.query(
          `INSERT INTO payments (order_id, payment_method, transaction_status, recorded_at)
             VALUES (?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE
               payment_method = VALUES(payment_method),
               transaction_status = VALUES(transaction_status),
               recorded_at = NOW()`,
          [id, payment.method || "Manual", payment.status || updates.paymentStatus || "Pending"]
        );
      }
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return getOrderById(pool, id, { userId: 0, role: "admin" });
};

export const deleteAdminOrder = async (pool, id) => {
  const [result] = await pool.query(`DELETE FROM orders WHERE id = ?`, [id]);
  return result.affectedRows > 0;
};

