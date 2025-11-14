import express from "express";

import { fetchRecommendationsBySegment } from "../services/loyaltyService.js";

const router = express.Router();

router.get("/recommendations", async (req, res, next) => {
  try {
    const segment = req.query.segment ? String(req.query.segment).trim() : null;
    const recommendations = await fetchRecommendationsBySegment(segment);

    res.json({
      segment: segment || "all",
      recommendations,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
