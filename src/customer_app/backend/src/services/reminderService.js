const { getAnalyticsPool, withConnection } = require("../config/postgres");
const { buildWhereClause } = require("../utils/queryBuilder");

const FILTER_MAP = {
  productId: "product_id",
  csrId: "csr_id",
  channel: "preferred_channel"
};

const listReminderConfigurations = async (filters = {}) => {
  const { where, values } = buildWhereClause(filters, FILTER_MAP);
  const query = `
    SELECT
      preference_id,
      customer_id,
      product_id,
      preferred_channel,
      reminder_frequency,
      quiet_hours_start,
      quiet_hours_end,
      last_modified_by,
      updated_at
    FROM reminder_preferences
    ${where}
    ORDER BY updated_at DESC
  `;

  return withConnection(async (client) => {
    const result = await client.query(query, values);
    return result.rows;
  }, getAnalyticsPool());
};

const upsertReminderPreference = async (payload) => {
  const requiredFields = ["customer_id", "product_id", "preferred_channel", "reminder_frequency"];
  const missing = requiredFields.filter((field) => payload[field] === undefined || payload[field] === null);
  if (missing.length) {
    const error = new Error(`Missing required fields: ${missing.join(", ")}`);
    error.status = 400;
    throw error;
  }

  const query = `
    INSERT INTO reminder_preferences (
      customer_id,
      product_id,
      preferred_channel,
      reminder_frequency,
      quiet_hours_start,
      quiet_hours_end,
      last_modified_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (customer_id, product_id)
    DO UPDATE SET
      preferred_channel = EXCLUDED.preferred_channel,
      reminder_frequency = EXCLUDED.reminder_frequency,
      quiet_hours_start = EXCLUDED.quiet_hours_start,
      quiet_hours_end = EXCLUDED.quiet_hours_end,
      last_modified_by = EXCLUDED.last_modified_by,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;

  const values = [
    payload.customer_id,
    payload.product_id,
    payload.preferred_channel,
    payload.reminder_frequency,
    payload.quiet_hours_start || null,
    payload.quiet_hours_end || null,
    payload.last_modified_by || payload.modified_by || "system"
  ];

  return withConnection(async (client) => {
    const result = await client.query(query, values);
    return result.rows[0];
  }, getAnalyticsPool());
};

module.exports = {
  listReminderConfigurations,
  upsertReminderPreference
};
