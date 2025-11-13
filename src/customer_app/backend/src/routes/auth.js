import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";

const router = express.Router();

router.post(
  "/register",
  [
    body("email").isEmail(),
    body("password").isLength({ min: 8 }),
    body("name").notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name } = req.body;
    const pool = req.db;

    const [existing] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existing.length) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES (?, ?, ?, 'customer')`,
      [email, hashed, name]
    );

    const token = jwt.sign(
      { id: result.insertId, email, name, role: "customer" },
      process.env.JWT_SECRET || "change_me",
      { expiresIn: process.env.JWT_EXPIRES_IN || "2h" }
    );

    res.status(201).json({ token });
  }
);

router.post(
  "/login",
  [body("email").isEmail(), body("password").notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const pool = req.db;

    const [users] = await pool.query(
      "SELECT id, password_hash, role, name FROM users WHERE email = ?",
      [email]
    );

    if (!users.length) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, email, role: user.role, name: user.name },
      process.env.JWT_SECRET || "change_me",
      { expiresIn: process.env.JWT_EXPIRES_IN || "2h" }
    );

    res.json({ token });
  }
);

export default router;
