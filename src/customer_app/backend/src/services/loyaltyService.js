import { differenceInDays, addDays } from "date-fns";

const FREQUENCY_MAP = {
  daily: 1,
  weekly: 7,
  monthly: 30,
  quarterly: 90,
};

const sanitizeFrequency = (value = "weekly") => {
  return Object.prototype.hasOwnProperty.call(FREQUENCY_MAP, value)
    ? value
    : "weekly";
};

const sanitizeChannel = (value = "email") => {
  const allowed = new Set(["email", "sms", "push"]);
  return allowed.has(value) ? value : "email";
};

const normalizeBundles = (rawBundles) => {
  if (!rawBundles) {
    return [];
  }
  if (Array.isArray(rawBundles)) {
    return rawBundles;
  }
  try {
    const parsed = JSON.parse(rawBundles);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const computeNextScheduled = (frequency) => {
  const daysToAdd = FREQUENCY_MAP[sanitizeFrequency(frequency)] || 7;
  const now = new Date();
  return addDays(now, daysToAdd);
};

export const getReminderPreferences = async (pool, customerId) => {
  const [rows] = await pool.query(
    `SELECT id, frequency, channel, bundle_preferences, quiet_hours, next_scheduled, last_notified
       FROM reminder_preferences
       WHERE customer_id = ?
       LIMIT 1`,
    [customerId]
  );

  if (!rows.length) {
    return {
      frequency: "weekly",
      channel: "email",
      bundlePreferences: [],
      quietHours: null,
      nextScheduled: computeNextScheduled("weekly"),
      adherenceStatus: "pending",
    };
  }

  const row = rows[0];
  return {
    id: row.id,
    frequency: row.frequency,
    channel: row.channel,
    bundlePreferences: normalizeBundles(row.bundle_preferences),
    quietHours: row.quiet_hours,
    nextScheduled: row.next_scheduled,
    lastNotified: row.last_notified,
    adherenceStatus:
      row.last_notified && row.next_scheduled
        ? differenceInDays(new Date(row.next_scheduled), new Date(row.last_notified)) >=
          (FREQUENCY_MAP[row.frequency] || 7)
          ? "overdue"
          : "on-track"
        : "pending",
  };
};

export const upsertReminderPreferences = async (
  pool,
  customerId,
  { frequency, channel, bundlePreferences = [], quietHours }
) => {
  const sanitizedFrequency = sanitizeFrequency(frequency);
  const sanitizedChannel = sanitizeChannel(channel);
  const safeBundles = normalizeBundles(bundlePreferences);
  const nextScheduled = computeNextScheduled(sanitizedFrequency);

  await pool.query(
    `INSERT INTO reminder_preferences
      (customer_id, frequency, channel, bundle_preferences, quiet_hours, next_scheduled)
    VALUES (?, ?, ?, CAST(? AS JSON), ?, ?)
    ON DUPLICATE KEY UPDATE
      frequency = VALUES(frequency),
      channel = VALUES(channel),
      bundle_preferences = VALUES(bundle_preferences),
      quiet_hours = VALUES(quiet_hours),
      next_scheduled = VALUES(next_scheduled),
      updated_at = CURRENT_TIMESTAMP`,
    [
      customerId,
      sanitizedFrequency,
      sanitizedChannel,
      JSON.stringify(safeBundles),
      quietHours || null,
      nextScheduled,
    ]
  );

  return getReminderPreferences(pool, customerId);
};

export const listBundleOptions = async (pool) => {
  const [rows] = await pool.query(
    `SELECT
        LOWER(REPLACE(p.category, ' ', '-')) AS bundle_key,
        p.category AS bundle_name,
        COUNT(*) AS product_count,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', p.id,
            'name', p.name,
            'price', p.price,
            'imageUrl', p.image_url
          )
        ) AS products
      FROM products p
      GROUP BY p.category
      ORDER BY p.category ASC`
  );

  return rows.map((row) => ({
    id: row.bundle_key,
    name: row.bundle_name,
    productCount: Number(row.product_count) || 0,
    products: normalizeBundles(row.products).slice(0, 4),
  }));
};
