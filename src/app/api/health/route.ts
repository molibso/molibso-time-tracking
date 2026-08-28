import { NextResponse } from "next/server";

/** Legacy health URL → v1 */
export async function GET() {
  return NextResponse.redirect(new URL("/api/v1/health", process.env.NEXTAUTH_URL ?? "http://localhost:3000"));
}
