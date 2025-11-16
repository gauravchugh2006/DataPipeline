const express = require("express");
const { parsePagination } = require("../middleware/pagination");
const { listOrders } = require("../services/orderService");

const router = express.Router();

router.get("/", parsePagination, async (req, res, next) => {
  try {
    const customerId = Number(req.query.customerId);
    if (!customerId) {
      const error = new Error("customerId query parameter is required");
      error.status = 400;
      throw error;
    }

    const { page, pageSize } = req.pagination;
    const orders = await listOrders({
      customerId,
      paymentStatus: req.query.paymentStatus,
      limit: pageSize,
      offset: (page - 1) * pageSize
    });

    res.json({ data: orders });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
