"use server";

import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendEmail, passwordResetEmail } from "@/lib/email";
import { loginSchema, forgotPasswordSchema, resetPasswordSchema } from "@/lib/validations/auth";
import { createTotpSecret, totpQrDataUrl } from "@/lib/totp";

export type ActionResult = { success: true; message?: string } | { success: false; error: string };

export type SignInStep =
  | { ok: true; step: "setup"; qrDataUrl: string; secret: string }
  | { ok: true; step: "code" }
  | { ok: false; error: string };

/** Check the password, then ask for an authenticator code. The first visit prepares the QR code. */
export async function beginSignIn(input: unknown): Promise<SignInStep> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return { ok: false, error: "invalid" };

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) return { ok: false, error: "invalid" };

  if (user.totpEnabled && user.totpSecret) return { ok: true, step: "code" };

  const secret = createTotpSecret();
  await prisma.user.update({
    where: { id: user.id },
    data: { totpSecret: secret, totpEnabled: false },
  });

  return {
    ok: true,
    step: "setup",
    secret,
    qrDataUrl: await totpQrDataUrl(secret, email),
  };
}

export async function requestPasswordReset(input: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid email" };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });

  // Always respond with success to avoid leaking which emails exist in the system.
  if (!user) {
    return { success: true, message: "If an account exists for that email, a reset link has been sent." };
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: { token, userId: user.id, expiresAt },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  await sendEmail({
    to: user.email,
    subject: "Reset your molibso password",
    html: passwordResetEmail(resetUrl),
  });

  return { success: true, message: "If an account exists for that email, a reset link has been sent." };
}

export async function resetPassword(input: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { token, password } = parsed.data;

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return { success: false, error: "This reset link is invalid or has expired. Request a new one." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
    prisma.auditLog.create({
      data: { userId: resetToken.userId, action: "PASSWORD_RESET", entityType: "User", entityId: resetToken.userId },
    }),
  ]);

  return { success: true, message: "Your password has been reset. You can now sign in." };
}
