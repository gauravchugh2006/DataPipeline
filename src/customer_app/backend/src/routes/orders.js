import express from "express";
import { body, query, validationResult } from "express-validator";

import { authenticate } from "../middleware/auth.js";
import {
  createOrder,
  getOrderById,
  listOrders,
  updateOrderStatus,
} from "../services/orderService.js";
import { streamInvoice } from "../services/invoiceService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

router.get(
  "/",
  authenticate(),
  [
    query("page").optional().isInt({ min: 1 }),
    query("pageSize").optional().isInt({ min: 1, max: 100 }),
    query("status").optional().isIn(["Paid", "Pending", "Refunded"]),
    query("transactionStatus").optional().isIn(["Completed", "Pending", "Refunded"]),
    query("startDate").optional().isISO8601(),
    query("endDate").optional().isISO8601(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const filters = {
      page: req.query.page,
      pageSize: req.query.pageSize,
      sortBy: req.query.sortBy,
      sortDir: req.query.sortDir,
      status: req.query.status,
      paymentMethod: req.query.paymentMethod,
      transactionStatus: req.query.transactionStatus,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      search: req.query.search,
      customerId: req.query.customerId,
    };

    const result = await listOrders(req.db, {
      userId: req.user.id,
      role: req.user.role,
      filters,
    });
    res.json(result);
  })
);

router.post(
  "/",
  authenticate(),
  [
    body("items").isArray({ min: 1 }),
    body("items.*.productId").isInt({ min: 1 }),
    body("items.*.productName").isString().notEmpty(),
    body("items.*.category").isString().notEmpty(),
    body("items.*.price").isFloat({ min: 0 }),
    body("items.*.quantity").optional().isInt({ min: 1 }),
    body("totalAmount").isFloat({ min: 0 }),
    body("paymentStatus").optional().isIn(["Paid", "Pending", "Refunded"]),
    body("payment.method").optional().isString(),
    body("payment.status").optional().isIn(["Completed", "Pending", "Refunded"]),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const order = await createOrder(req.db, {
      customerId: req.user.id,
      items: req.body.items,
      totalAmount: req.body.totalAmount,
      paymentStatus: req.body.paymentStatus,
      payment: req.body.payment,
    });

    res.status(201).json(order);
  })
);

router.get(
  "/:id",
  authenticate(),
  asyncHandler(async (req, res) => {
    const order = await getOrderById(req.db, req.params.id, {
      userId: req.user.id,
      role: req.user.role,
    });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json(order);
  })
);

router.get(
  "/:id/invoice",
  authenticate(),
  asyncHandler(async (req, res) => {
    const order = await getOrderById(req.db, req.params.id, {
      userId: req.user.id,
      role: req.user.role,
    });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    streamInvoice(order, res);
  })
);

router.patch(
  "/:id/status",
  authenticate("admin"),
  [
    body("status").isIn(["Paid", "Pending", "Refunded"]),
    body("transactionStatus").optional().isIn(["Completed", "Pending", "Refunded"]),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updated = await updateOrderStatus(
      req.db,
      req.params.id,
      req.body.status,
      req.body.transactionStatus
    );
    if (!updated) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({ success: true });
  })
);

export default router;
