import express from "express";
import { body, validationResult } from "express-validator";

import { authenticate } from "../middleware/auth.js";
import {
  getReminderPreferences,
  listBundleOptions,
  upsertReminderPreferences,
  fetchRecommendationsBySegment,
} from "../services/loyaltyService.js";
import { enqueueReminderNotification } from "../services/notificationService.js";
import { recordEvent } from "../services/analyticsService.js";

const router = express.Router();

router.get("/bundles", authenticate(), async (req, res) => {
  const bundles = await listBundleOptions(req.db);
  res.json({ bundles });
});

router.get("/preferences", authenticate(), async (req, res) => {
  const preferences = await getReminderPreferences(req.db, req.user.id);
  res.json({ preferences });
});

router.put(
  "/preferences",
  authenticate(),
  [
    body("frequency").optional().isIn(["daily", "weekly", "monthly", "quarterly"]),
    body("channel").optional().isIn(["email", "sms", "push"]),
    body("bundlePreferences").optional({ nullable: true }).isArray(),
    body("quietHours").optional({ nullable: true }).isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const preferences = await upsertReminderPreferences(
      req.db,
      req.user.id,
      req.body
    );

    await recordEvent(req.db, {
      customerId: req.user.id,
      eventType: "reminder_preferences_saved",
      payload: {
        frequency: preferences.frequency,
        channel: preferences.channel,
        bundleCount: preferences.bundlePreferences.length,
      },
    });

    await enqueueReminderNotification(req.db, {
      customerId: req.user.id,
      channel: preferences.channel,
      profile: req.user,
      preferences,
    });

    res.json({ preferences });
  }
);

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
