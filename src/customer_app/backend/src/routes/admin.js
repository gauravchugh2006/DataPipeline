import express from "express";
import { body, param, query, validationResult } from "express-validator";

import { authenticate } from "../middleware/auth.js";
import {
  createAdminCustomer,
  createAdminOrder,
  createAdminProduct,
  deleteAdminCustomer,
  deleteAdminOrder,
  deleteAdminProduct,
  listAdminCustomers,
  listAdminOrders,
  listAdminProducts,
  updateAdminCustomer,
  updateAdminOrder,
  updateAdminProduct,
} from "../services/adminEntityService.js";
import { streamCsv, streamXlsx } from "../utils/exportHelpers.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

router.use(authenticate("admin"));

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return next();
};

// Products
router.get(
  "/products",
  [
    query("page").optional().isInt({ min: 1 }),
    query("pageSize").optional().isInt({ min: 1, max: 100 }),
    query("sortBy").optional().isIn(["createdAt", "updatedAt", "name", "category", "price"]),
    query("sortDir").optional().isIn(["asc", "desc"]),
    query("minPrice").optional().isFloat({ min: 0 }),
    query("maxPrice").optional().isFloat({ min: 0 }),
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const result = await listAdminProducts(req.db, req.query);
    res.json(result);
  })
);

router.post(
  "/products",
  [
    body("name").isString().trim().isLength({ min: 2 }),
    body("category").isString().trim().isLength({ min: 2 }),
    body("price").isFloat({ min: 0 }),
    body("imageUrl").optional({ nullable: true }).isString(),
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const product = await createAdminProduct(req.db, {
      name: req.body.name,
      category: req.body.category,
      price: Number(req.body.price),
      imageUrl: req.body.imageUrl,
    });
    res.status(201).json(product);
  })
);

router.patch(
  "/products/:id",
  [
    param("id").isInt({ min: 1 }),
    body("name").optional().isString().trim().isLength({ min: 2 }),
    body("category").optional().isString().trim().isLength({ min: 2 }),
    body("price").optional().isFloat({ min: 0 }),
    body("imageUrl").optional({ nullable: true }).isString(),
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const updated = await updateAdminProduct(req.db, req.params.id, {
      name: req.body.name,
      category: req.body.category,
      price: req.body.price !== undefined ? Number(req.body.price) : undefined,
      imageUrl: req.body.imageUrl,
    });
    if (!updated) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(updated);
  })
);

router.delete(
  "/products/:id",
  [param("id").isInt({ min: 1 })],
  handleValidation,
  asyncHandler(async (req, res) => {
    const removed = await deleteAdminProduct(req.db, req.params.id);
    if (!removed) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.status(204).send();
  })
);

router.get(
  "/products/export/:format",
  [
    param("format").isIn(["csv", "xlsx"]),
    query("sortBy").optional().isIn(["createdAt", "updatedAt", "name", "category", "price"]),
    query("sortDir").optional().isIn(["asc", "desc"]),
    query("minPrice").optional().isFloat({ min: 0 }),
    query("maxPrice").optional().isFloat({ min: 0 }),
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const { items } = await listAdminProducts(req.db, req.query, { includeAll: true });
    const columns = [
      { key: "id", header: "ID" },
      { key: "name", header: "Name" },
      { key: "category", header: "Category" },
      { key: "price", header: "Price" },
      { key: "createdAt", header: "Created At" },
      { key: "updatedAt", header: "Updated At" },
    ];
    if (req.params.format === "csv") {
      streamCsv(res, "products-export", columns, items);
    } else {
      await streamXlsx(res, "products-export", columns, items);
    }
  })
);

// Customers
router.get(
  "/customers",
  [
    query("page").optional().isInt({ min: 1 }),
    query("pageSize").optional().isInt({ min: 1, max: 100 }),
    query("role").optional().isIn(["customer", "admin"]),
    query("sortBy").optional().isIn(["createdAt", "updatedAt", "email", "firstName", "lastName"]),
    query("sortDir").optional().isIn(["asc", "desc"]),
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const result = await listAdminCustomers(req.db, req.query);
    res.json(result);
  })
);

router.post(
  "/customers",
  [
    body("email").isEmail(),
    body("password").isLength({ min: 6 }),
    body("firstName").isString().trim().isLength({ min: 2 }),
    body("lastName").isString().trim().isLength({ min: 2 }),
    body("phone").optional({ nullable: true }).isString(),
    body("address").optional({ nullable: true }).isString(),
    body("gender").optional().isIn(["male", "female", "other"]),
    body("role").optional().isIn(["customer", "admin"]),
    body("theme").optional().isString(),
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const customer = await createAdminCustomer(req.db, req.body);
    res.status(201).json(customer);
  })
);

router.patch(
  "/customers/:id",
  [
    param("id").isInt({ min: 1 }),
    body("email").optional().isEmail(),
    body("firstName").optional().isString().trim().isLength({ min: 2 }),
    body("lastName").optional().isString().trim().isLength({ min: 2 }),
    body("phone").optional({ nullable: true }).isString(),
    body("address").optional({ nullable: true }).isString(),
    body("gender").optional().isIn(["male", "female", "other"]),
    body("role").optional().isIn(["customer", "admin"]),
    body("theme").optional().isString(),
    body("password").optional().isLength({ min: 6 }),
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const updated = await updateAdminCustomer(req.db, req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.json(updated);
  })
);

router.delete(
  "/customers/:id",
  [param("id").isInt({ min: 1 })],
  handleValidation,
  asyncHandler(async (req, res) => {
    const removed = await deleteAdminCustomer(req.db, req.params.id);
    if (!removed) {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.status(204).send();
  })
);

router.get(
  "/customers/export/:format",
  [
    param("format").isIn(["csv", "xlsx"]),
    query("sortBy").optional().isIn(["createdAt", "updatedAt", "email", "firstName", "lastName"]),
    query("sortDir").optional().isIn(["asc", "desc"]),
    query("role").optional().isIn(["customer", "admin"]),
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const { items } = await listAdminCustomers(req.db, req.query, { includeAll: true });
    const columns = [
      { key: "id", header: "ID" },
      { key: "email", header: "Email" },
      { key: "firstName", header: "First Name" },
      { key: "lastName", header: "Last Name" },
      { key: "role", header: "Role" },
      { key: "signupDate", header: "Signup Date" },
      { key: "updatedAt", header: "Updated At" },
    ];
    if (req.params.format === "csv") {
      streamCsv(res, "customers-export", columns, items);
    } else {
      await streamXlsx(res, "customers-export", columns, items);
    }
  })
);

// Orders
router.get(
  "/orders",
  [
    query("page").optional().isInt({ min: 1 }),
    query("pageSize").optional().isInt({ min: 1, max: 100 }),
    query("sortBy").optional().isIn(["order_date", "total", "status", "payment"]),
    query("sortDir").optional().isIn(["asc", "desc"]),
    query("status").optional().isIn(["Paid", "Pending", "Refunded"]),
    query("transactionStatus").optional().isIn(["Completed", "Pending", "Refunded"]),
    query("customerId").optional().isInt({ min: 1 }),
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const result = await listAdminOrders(req.db, req.query);
    res.json(result);
  })
);

router.post(
  "/orders",
  [
    body("customerId").isInt({ min: 1 }),
    body("totalAmount").isFloat({ min: 0 }),
    body("paymentStatus").optional().isIn(["Paid", "Pending", "Refunded"]),
    body("items").isArray({ min: 1 }),
    body("items.*.productId").isInt({ min: 1 }),
    body("items.*.productName").isString().notEmpty(),
    body("items.*.category").isString().notEmpty(),
    body("items.*.price").isFloat({ min: 0 }),
    body("items.*.quantity").optional().isInt({ min: 1 }),
    body("payment.method").optional().isString(),
    body("payment.status").optional().isIn(["Completed", "Pending", "Refunded"]),
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const order = await createAdminOrder(req.db, req.body);
    res.status(201).json(order);
  })
);

router.patch(
  "/orders/:id",
  [
    param("id").isInt({ min: 1 }),
    body("paymentStatus").optional().isIn(["Paid", "Pending", "Refunded"]),
    body("totalAmount").optional().isFloat({ min: 0 }),
    body("orderDate").optional().isISO8601(),
    body("payment.method").optional().isString(),
    body("payment.status").optional().isIn(["Completed", "Pending", "Refunded"]),
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const updated = await updateAdminOrder(req.db, req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json(updated);
  })
);

router.delete(
  "/orders/:id",
  [param("id").isInt({ min: 1 })],
  handleValidation,
  asyncHandler(async (req, res) => {
    const removed = await deleteAdminOrder(req.db, req.params.id);
    if (!removed) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.status(204).send();
  })
);

router.get(
  "/orders/export/:format",
  [
    param("format").isIn(["csv", "xlsx"]),
    query("status").optional().isIn(["Paid", "Pending", "Refunded"]),
    query("transactionStatus").optional().isIn(["Completed", "Pending", "Refunded"]),
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const { items } = await listAdminOrders(req.db, req.query, { includeAll: true });
    const flattened = items.map((order) => ({
      id: order.id,
      customerEmail: order.customer?.email,
      totalAmount: order.totalAmount,
      paymentStatus: order.paymentStatus,
      transactionStatus: order.payment?.status || null,
      orderDate: order.orderDate,
    }));
    const columns = [
      { key: "id", header: "Order ID" },
      { key: "customerEmail", header: "Customer" },
      { key: "totalAmount", header: "Total" },
      { key: "paymentStatus", header: "Payment Status" },
      { key: "transactionStatus", header: "Transaction Status" },
      { key: "orderDate", header: "Order Date" },
    ];
    if (req.params.format === "csv") {
      streamCsv(res, "orders-export", columns, flattened);
    } else {
      await streamXlsx(res, "orders-export", columns, flattened);
    }
  })
);

export default router;

const express = require("express");
const {
  getEntities,
  createEntity,
  updateEntity,
  deleteEntity
} = require("../controllers/adminController");
const { parsePagination } = require("../middleware/pagination");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(requireRole("admin", "editor"));

router.get("/:entity", parsePagination, getEntities);
router.post("/:entity", createEntity);
router.put("/:entity/:id", updateEntity);
router.delete("/:entity/:id", deleteEntity);

module.exports = router;
