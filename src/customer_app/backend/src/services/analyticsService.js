export const recordEvent = async (
  pool,
  { customerId = null, eventType, source = "api", payload = {} }
) => {
  if (!eventType) {
    throw new Error("eventType is required");
  }

  await pool.query(
    `INSERT INTO analytics_events (customer_id, event_type, source, payload)
     VALUES (?, ?, ?, CAST(? AS JSON))`,
    [customerId, eventType, source, JSON.stringify(payload)]
  );
};
