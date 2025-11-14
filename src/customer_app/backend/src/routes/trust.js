import express from "express";

import {
  fetchTrustScores,
  fetchTrustScoresCsv,
} from "../services/trustService.js";

const router = express.Router();

router.get("/metrics", async (req, res, next) => {
  try {
    const data = await fetchTrustScores(req.query.limit);
    res.json({ data });
  } catch (error) {
    error.status = 502;
    next(error);
  }
});

router.get("/metrics/export", async (req, res, next) => {
  try {
    const csv = await fetchTrustScoresCsv(req.query.limit);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=trust-metrics.csv");
    res.send(csv);
  } catch (error) {
    error.status = 502;
    next(error);
  }
});

export default router;
