import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";

export type ApiTokenPayload = {
  sub: string;
  email: string;
  role: Role;
  employeeId: string | null;
};

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function signApiToken(payload: ApiTokenPayload, expiresIn = "8h") {
  return new SignJWT({
    email: payload.email,
    role: payload.role,
    employeeId: payload.employeeId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey());
}

export async function verifyApiToken(token: string): Promise<ApiTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub || typeof payload.email !== "string" || typeof payload.role !== "string") {
      return null;
    }
    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role as Role,
      employeeId: (payload.employeeId as string | null) ?? null,
    };
  } catch {
    return null;
  }
}
