import express from "express";
import { body, validationResult } from "express-validator";

import { sendSupportEmail } from "../utils/email.js";

const router = express.Router();

router.post(
  "/contact",
  [
    body("name").notEmpty(),
    body("email").isEmail(),
    body("topic").notEmpty(),
    body("message").isLength({ min: 10 }),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      await sendSupportEmail(req.body);
      res.json({ success: true });
    } catch (error) {
      error.status = 502;
      next(error);
    }
  }
);

export default router;
