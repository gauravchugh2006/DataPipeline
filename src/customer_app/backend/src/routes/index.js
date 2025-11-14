import express from "express";

import authRouter from "./auth.js";
import ordersRouter from "./orders.js";
import productsRouter from "./products.js";
import supportRouter from "./support.js";
import trustRouter from "./trust.js";
import loyaltyRouter from "./loyalty.js";

const router = express.Router();

router.use("/auth", authRouter);
router.use("/products", productsRouter);
router.use("/orders", ordersRouter);
router.use("/support", supportRouter);
router.use("/trust", trustRouter);
router.use("/loyalty", loyaltyRouter);

export default router;
