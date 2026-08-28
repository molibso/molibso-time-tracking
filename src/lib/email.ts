import nodemailer from "nodemailer";

const hasSmtp = !!process.env.SMTP_HOST;

const transporter = hasSmtp
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    })
  : null;

export async function sendEmail(opts: { to: string; subject: string; html: string }) {
  if (!transporter) {
    console.log(`[email:dev] to=${opts.to} subject="${opts.subject}"\n${opts.html}`);
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "molibso <no-reply@molibso.de>",
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}

export function passwordResetEmail(resetUrl: string) {
  return `
    <div style="font-family: Montserrat, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color:#00425a;">Reset your molibso password</h2>
      <p>We received a request to reset your password. This link expires in 1 hour.</p>
      <p><a href="${resetUrl}" style="display:inline-block;background:#00425a;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600;">Reset password</a></p>
      <p style="color:#888;font-size:12px;">If you didn't request this, you can safely ignore this email.</p>
    </div>
  `;
}
