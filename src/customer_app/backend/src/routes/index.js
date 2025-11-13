import express from "express";

import authRouter from "./auth.js";
import ordersRouter from "./orders.js";
import productsRouter from "./products.js";
import supportRouter from "./support.js";

const router = express.Router();

router.use("/auth", authRouter);
router.use("/products", productsRouter);
router.use("/orders", ordersRouter);
router.use("/support", supportRouter);

export default router;
