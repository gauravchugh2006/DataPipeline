import nodemailer from "nodemailer";

let transporter;

const initTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "localhost",
    port: Number(process.env.SMTP_PORT || 1025),
    secure: false,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASSWORD
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          }
        : undefined,
  });

  return transporter;
};

export const sendSupportEmail = async ({ name, email, topic, message }) => {
  const mailer = initTransporter();
  const inbox = process.env.SUPPORT_INBOX || "support@example.com";
  await mailer.sendMail({
    to: inbox,
    from: email,
    subject: `[Cafe Commerce] ${topic}`,
    text: `${name} (${email}) says:\n\n${message}`,
  });
};
