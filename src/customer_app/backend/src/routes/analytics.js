import express from "express";
import { body, validationResult } from "express-validator";

import { authenticateOptional } from "../middleware/auth.js";
import { recordEvent } from "../services/analyticsService.js";

const router = express.Router();

router.post(
  "/events",
  authenticateOptional(),
  [
    body("eventType").trim().notEmpty(),
    body("payload").optional({ nullable: true }).isObject(),
    body("source").optional({ nullable: true }).isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    await recordEvent(req.db, {
      customerId: req.user?.id || null,
      eventType: req.body.eventType,
      source: req.body.source || "frontend",
      payload: req.body.payload || {},
    });

    res.status(202).json({ status: "recorded" });
  }
);

export default router;
