import { getLoyaltyPool } from "../config/postgres.js";

const parseAddOns = (payload) => {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  try {
    return JSON.parse(payload);
  } catch (error) {
    console.warn("Unable to parse recommended_add_ons payload", error);
    return [];
  }
};

export const fetchRecommendationsBySegment = async (segment) => {
  const pool = getLoyaltyPool();
  const limit = Number(process.env.LOYALTY_RECOMMENDATION_LIMIT || 200);

  const query = `
    SELECT
      customer_id,
      segment,
      recommended_add_ons,
      discount_tier,
      reminder_channel,
      reminder_schedule,
      affinity_score,
      total_spent_30d,
      purchase_frequency_30d,
      primary_add_on_product_id,
      primary_add_on_name,
      affinity_category,
      updated_at
    FROM mart.mart_loyalty_recommendations
    WHERE ($1::text IS NULL OR segment = $1::text)
    ORDER BY affinity_score DESC NULLS LAST, total_spent_30d DESC, customer_id ASC
    LIMIT $2
  `;

  const values = [segment || null, limit];
  const result = await pool.query(query, values);

  return result.rows.map((row) => ({
    customerId: row.customer_id,
    segment: row.segment,
    discountTier: row.discount_tier,
    reminderChannel: row.reminder_channel,
    reminderSchedule: row.reminder_schedule,
    affinityScore: row.affinity_score,
    totalSpent30d: row.total_spent_30d,
    purchaseFrequency30d: row.purchase_frequency_30d,
    primaryAddOnProductId: row.primary_add_on_product_id,
    primaryAddOnName: row.primary_add_on_name,
    affinityCategory: row.affinity_category,
    recommendedAddOns: parseAddOns(row.recommended_add_ons),
    updatedAt: row.updated_at,
  }));
};
