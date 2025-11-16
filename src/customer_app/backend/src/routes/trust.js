import express from "express";

import {
  fetchTrustScores,
  fetchTrustScoresCsv,
} from "../services/trustService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

router.get(
  "/metrics",
  asyncHandler(async (req, res) => {
    try {
      const data = await fetchTrustScores(req.query.limit);
      res.json({ data });
    } catch (error) {
      error.status = 502;
      throw error;
    }
  })
);

router.get(
  "/metrics/export",
  asyncHandler(async (req, res) => {
    try {
      const csv = await fetchTrustScoresCsv(req.query.limit);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=trust-metrics.csv"
      );
      res.send(csv);
    } catch (error) {
      error.status = 502;
      throw error;
    }
  })
);

export default router;
