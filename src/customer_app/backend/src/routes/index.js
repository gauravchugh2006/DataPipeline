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
