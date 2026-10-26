import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user.employeeId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const line = await prisma.expenseLine.findUnique({ where: { id }, include: { claim: true } });
  if (!line?.receiptPath) return new NextResponse("Not found", { status: 404 });

  const allowed =
    line.claim.employeeId === session.user.employeeId || hasPermission(session.user.role, "EXPENSE_APPROVE");
  if (!allowed) return new NextResponse("Forbidden", { status: 403 });

  const filename = path.basename(line.receiptPath);
  const bytes = await readFile(path.join(process.cwd(), "data", "receipts", filename));
  const ext = path.extname(filename).toLowerCase();
  const type = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  return new NextResponse(new Uint8Array(bytes), {
    headers: { "Content-Type": type, "Cache-Control": "private, max-age=3600" },
  });
}
