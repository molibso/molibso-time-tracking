import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import authConfig from "@/lib/auth.config";
import { isDevAccountEmail, isLocalDevLoginEnabled } from "@/lib/dev-login";
import { devSessionUser } from "@/lib/dev-fixtures";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        devShortcut: { label: "Dev shortcut", type: "text" },
      },
      async authorize(raw) {
        const shortcut = raw && typeof raw === "object" && "devShortcut" in raw ? String(raw.devShortcut ?? "") : "";
        const shortcutEmail = raw && typeof raw === "object" && "email" in raw ? String(raw.email ?? "") : "";
        if (shortcut === "1" && isLocalDevLoginEnabled() && isDevAccountEmail(shortcutEmail)) {
          try {
            return await devSessionUser(shortcutEmail);
          } catch (error) {
            console.error("Local dummy sign-in failed", error);
            return null;
          }
        }

        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: { employee: true },
        });

        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: "LOGIN",
            entityType: "User",
            entityId: user.id,
          },
        });

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user.email,
          employeeId: user.employee?.id ?? null,
          image: user.image ?? undefined,
        };
      },
    }),
  ],
});
