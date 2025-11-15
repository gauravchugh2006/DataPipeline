const express = require("express");
const { getRecommendations, getCustomerSummary } = require("../controllers/loyaltyController");
const { parsePagination } = require("../middleware/pagination");

const router = express.Router();

router.get("/recommendations", parsePagination, getRecommendations);
router.get("/recommendations/:customerId/summary", getCustomerSummary);

module.exports = router;
