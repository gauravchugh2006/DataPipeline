import nodemailer from "nodemailer";

let transporterPromise;

const buildTransporter = async () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
};

const getTransporter = async () => {
  if (!transporterPromise) {
    transporterPromise = buildTransporter();
  }
  return transporterPromise;
};

const formatBundles = (bundlePreferences = []) => {
  if (!Array.isArray(bundlePreferences) || !bundlePreferences.length) {
    return "No bundles selected";
  }
  return bundlePreferences
    .map((bundle) => {
      if (typeof bundle === "string") {
        return `• ${bundle}`;
      }
      if (bundle && typeof bundle === "object" && bundle.name) {
        return `• ${bundle.name}`;
      }
      return null;
    })
    .filter(Boolean)
    .join("\n");
};

export const enqueueReminderNotification = async (
  pool,
  { customerId, channel, profile, preferences }
) => {
  const payload = {
    channel,
    template: "reminder-preferences-update",
    recipient: {
      id: customerId,
      email: profile?.email,
    },
    data: {
      frequency: preferences.frequency,
      channel: preferences.channel,
      bundlePreferences: preferences.bundlePreferences,
      nextScheduled: preferences.nextScheduled,
    },
  };

  const subject = "Reminder preferences updated";
  const lines = [
    `Hi ${profile?.firstName || "there"},`,
    "",
    "Thanks for refreshing your reminder cadence.",
    `Frequency: ${preferences.frequency}`,
    `Channel: ${preferences.channel}`,
    "Preferred bundles:",
    formatBundles(preferences.bundlePreferences),
  ];

  const [result] = await pool.query(
    `INSERT INTO notification_outbox
      (customer_id, channel, subject, body, payload)
     VALUES (?, ?, ?, ?, CAST(? AS JSON))`,
    [
      customerId,
      channel,
      subject,
      lines.join("\n"),
      JSON.stringify(payload),
    ]
  );

  if (channel === "email" && profile?.email) {
    try {
      const transporter = await getTransporter();
      if (transporter) {
        await transporter.sendMail({
          to: profile.email,
          from: process.env.SMTP_FROM || "notifications@example.com",
          subject,
          text: lines.join("\n"),
        });
        await pool.query(
          `UPDATE notification_outbox SET status = 'sent', processed_at = NOW() WHERE id = ?`,
          [result.insertId]
        );
      }
    } catch (error) {
      console.error("Unable to send reminder confirmation", error);
      await pool.query(
        `UPDATE notification_outbox SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [result.insertId]
      );
    }
  }

  return { id: result.insertId, payload };
};
