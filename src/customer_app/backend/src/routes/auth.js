import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";

import { authenticate } from "../middleware/auth.js";
import {
  createCustomer,
  findCustomerByEmail,
  getCustomerById,
  getCustomerWithSensitiveData,
  updateCustomerProfile,
} from "../services/customerService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

const tokenConfig = {
  secret: process.env.JWT_SECRET || "change_me",
  expiresIn: process.env.JWT_EXPIRES_IN || "2h",
};

const buildTokenPayload = (customer) => ({
  id: customer.id,
  email: customer.email,
  role: customer.role,
  firstName: customer.firstName,
  lastName: customer.lastName,
});

router.post(
  "/register",
  [
    body("firstName").trim().notEmpty(),
    body("lastName").trim().notEmpty(),
    body("email").isEmail(),
    body("password").isLength({ min: 8 }),
    body("phone").optional().isLength({ max: 32 }),
    body("address").optional().isLength({ max: 500 }),
    body("gender").optional().isIn(["male", "female", "other"]),
    body("theme").optional().isLength({ max: 50 }),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const pool = req.db;
    const existing = await findCustomerByEmail(pool, req.body.email);
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const hashed = await bcrypt.hash(req.body.password, 10);
    const profile = await createCustomer(pool, {
      email: req.body.email,
      passwordHash: hashed,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      phone: req.body.phone,
      address: req.body.address,
      gender: req.body.gender,
      theme: req.body.theme,
    });

    const token = jwt.sign(buildTokenPayload(profile), tokenConfig.secret, {
      expiresIn: tokenConfig.expiresIn,
    });

    res.status(201).json({ token, profile });
  })
);

router.post(
  "/login",
  [body("email").isEmail(), body("password").notEmpty()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const pool = req.db;
    const account = await getCustomerWithSensitiveData(pool, req.body.email);
    if (!account) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(req.body.password, account.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const profile = await getCustomerById(pool, account.id);
    const token = jwt.sign(buildTokenPayload(profile), tokenConfig.secret, {
      expiresIn: tokenConfig.expiresIn,
    });

    res.json({ token, profile });
  })
);

router.get(
  "/me",
  authenticate(),
  asyncHandler(async (req, res) => {
    const profile = await getCustomerById(req.db, req.user.id);
    res.json({ profile });
  })
);

router.put(
  "/profile",
  authenticate(),
  [
    body("firstName").optional().trim().notEmpty(),
    body("lastName").optional().trim().notEmpty(),
    body("phone").optional().isLength({ max: 32 }),
    body("address").optional().isLength({ max: 500 }),
    body("gender").optional().isIn(["male", "female", "other"]),
    body("theme").optional().isLength({ max: 50 }),
    body("avatarStyle").optional().isLength({ max: 50 }),
    body("profileImage").optional().isString(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const profile = await updateCustomerProfile(req.db, req.user.id, {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      phone: req.body.phone,
      address: req.body.address,
      gender: req.body.gender,
      theme: req.body.theme,
      avatarStyle: req.body.avatarStyle,
      profileImage: req.body.profileImage,
    });

    res.json({ profile });
  })
);

export default router;
