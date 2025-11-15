const express = require("express");
const {
  getTrustScores,
  getLogisticsSnapshots
} = require("../controllers/transparencyController");
const { parsePagination } = require("../middleware/pagination");

const router = express.Router();

router.get("/trust/scores", parsePagination, getTrustScores);
router.get("/logistics/snapshots", parsePagination, getLogisticsSnapshots);

module.exports = router;
