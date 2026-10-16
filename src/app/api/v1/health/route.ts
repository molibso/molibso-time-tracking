import { NextResponse } from "next/server";
import { prisma, useMockData } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** GET /api/v1/health — database connectivity check. */
export async function GET() {
  try {
    if (useMockData) {
      return NextResponse.json({
        success: true,
        data: {
          status: "ok",
          database: "mock",
          message: "USE_MOCK_DATA=true — switch off for PostgreSQL",
        },
      });
    }

    await prisma.$queryRaw`SELECT 1`;
    const [userCount, employeeCount] = await Promise.all([
      prisma.user.count(),
      prisma.employee.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        status: "ok",
        database: "postgresql",
        userCount,
        employeeCount,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database connection failed";
    return NextResponse.json(
      { success: false, error: message, data: { status: "error", database: "postgresql" } },
      { status: 503 },
    );
  }
}
