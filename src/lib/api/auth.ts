import type { NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { hasPermission, type PermissionKey } from "@/lib/rbac";
import { verifyApiToken } from "@/lib/api/jwt";
import { forbidden, unauthorized } from "@/lib/api/response";

export type ApiUser = {
  id: string;
  email: string;
  role: Role;
  employeeId: string | null;
};

/** Resolves the caller from `Authorization: Bearer <token>` or the NextAuth session cookie. */
export async function getApiUser(req: NextRequest): Promise<ApiUser | null> {
  const header = req.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    const token = header.slice(7).trim();
    const payload = await verifyApiToken(token);
    if (!payload) return null;
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      employeeId: payload.employeeId,
    };
  }

  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    role: session.user.role,
    employeeId: session.user.employeeId,
  };
}

export async function requireApiUser(req: NextRequest) {
  const user = await getApiUser(req);
  if (!user) return { user: null as ApiUser | null, error: unauthorized() };
  return { user, error: null };
}

export async function requireApiPermission(req: NextRequest, permission: PermissionKey) {
  const { user, error } = await requireApiUser(req);
  if (error || !user) return { user: null as ApiUser | null, error: error ?? unauthorized() };
  if (!hasPermission(user.role, permission)) {
    return { user: null as ApiUser | null, error: forbidden("You don't have permission for this action.") };
  }
  return { user, error: null };
}

export async function requireApiEmployee(req: NextRequest) {
  const { user, error } = await requireApiUser(req);
  if (error || !user) return { user: null as ApiUser | null, error: error ?? unauthorized() };
  if (!user.employeeId) {
    return { user: null as ApiUser | null, error: forbidden("No employee profile linked to this account.") };
  }
  return { user: user as ApiUser & { employeeId: string }, error: null };
}
