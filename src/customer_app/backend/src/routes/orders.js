import express from "express";
import { body, validationResult } from "express-validator";

import { authenticate } from "../middleware/auth.js";
import {
  createOrder,
  getOrderById,
  listOrders,
  updateOrderStatus,
} from "../services/orderService.js";
import { streamInvoice } from "../services/invoiceService.js";

const router = express.Router();

router.get("/", authenticate(), async (req, res) => {
  const orders = await listOrders(req.db, {
    userId: req.user.id,
    role: req.user.role,
  });
  res.json({ items: orders });
});

router.post(
  "/",
  authenticate(),
  [
    body("items").isArray({ min: 1 }),
    body("items.*.variantId").isInt(),
    body("items.*.quantity").isInt({ min: 1 }),
    body("items.*.unitPrice").isFloat({ min: 0 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const order = await createOrder(req.db, {
      userId: req.user.id,
      items: req.body.items,
    });

    res.status(201).json(order);
  }
);

router.get("/:id", authenticate(), async (req, res) => {
  const order = await getOrderById(req.db, req.params.id, {
    userId: req.user.id,
    role: req.user.role,
  });
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }
  res.json(order);
});

router.get("/:id/invoice", authenticate(), async (req, res) => {
  const order = await getOrderById(req.db, req.params.id, {
    userId: req.user.id,
    role: req.user.role,
  });
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }
  streamInvoice(order, res);
});

router.patch(
  "/:id/status",
  authenticate("admin"),
  [body("status").isIn(["pending", "preparing", "ready", "completed", "cancelled"])],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updated = await updateOrderStatus(req.db, req.params.id, req.body.status);
    if (!updated) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({ success: true });
  }
);

export default router;
