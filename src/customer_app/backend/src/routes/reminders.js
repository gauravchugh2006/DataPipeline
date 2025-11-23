const express = require("express");
const {
  getReminderConfigurations,
  upsertReminder
} = require("../controllers/reminderController");
const { requireRole, authenticateOptionalUser } = require("../middleware/auth");

const router = express.Router();

router.get("/configurations", authenticateOptionalUser, getReminderConfigurations);
router.post("/configurations", requireRole("admin", "editor", "csr"), upsertReminder);

module.exports = router;
