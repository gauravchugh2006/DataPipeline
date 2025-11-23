import express from "express";

import authRouter from "./auth.js";
import ordersRouter from "./orders.js";
import productsRouter from "./products.js";
import supportRouter from "./support.js";
import adminRouter from "./admin.js";
import loyaltyRouter from "./loyalty.js";
import analyticsRouter from "./analytics.js";
import trustRouter from "./trust.js";
import cartRouter from "./cart.js";

const router = express.Router();

router.use("/auth", authRouter);
router.use("/products", productsRouter);
router.use("/orders", ordersRouter);
router.use("/support", supportRouter);
router.use("/admin", adminRouter);
router.use("/analytics", analyticsRouter);
router.use("/trust", trustRouter);
router.use("/loyalty", loyaltyRouter);
router.use("/cart", cartRouter);

export default router;
const express = require("express");
const loyaltyRouter = require("./loyalty");
const transparencyRouter = require("./transparency");
const adminRouter = require("./admin");
const remindersRouter = require("./reminders");
const ordersRouter = require("./orders");

const router = express.Router();

router.use("/loyalty", loyaltyRouter);
router.use("/transparency", transparencyRouter);
router.use("/admin", adminRouter);
router.use("/reminders", remindersRouter);
router.use("/orders", ordersRouter);

module.exports = router;
