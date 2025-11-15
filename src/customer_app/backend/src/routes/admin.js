const express = require("express");
const {
  getEntities,
  createEntity,
  updateEntity,
  deleteEntity
} = require("../controllers/adminController");
const { parsePagination } = require("../middleware/pagination");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(requireRole("admin", "editor"));

router.get("/:entity", parsePagination, getEntities);
router.post("/:entity", createEntity);
router.put("/:entity/:id", updateEntity);
router.delete("/:entity/:id", deleteEntity);

module.exports = router;
