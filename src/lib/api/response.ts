import { NextResponse } from "next/server";

export type ApiSuccess<T> = { success: true; data: T; message?: string };
export type ApiError = { success: false; error: string; details?: unknown };

export function ok<T>(data: T, init?: { status?: number; message?: string }) {
  const body: ApiSuccess<T> = { success: true, data };
  if (init?.message) body.message = init.message;
  return NextResponse.json(body, { status: init?.status ?? 200 });
}

export function created<T>(data: T, message?: string) {
  return ok(data, { status: 201, message });
}

export function fail(error: string, status = 400, details?: unknown) {
  const body: ApiError = { success: false, error };
  if (details !== undefined) body.details = details;
  return NextResponse.json(body, { status });
}

export function unauthorized(message = "Unauthorized") {
  return fail(message, 401);
}

export function forbidden(message = "Forbidden") {
  return fail(message, 403);
}

export function notFound(message = "Not found") {
  return fail(message, 404);
}

export function serverError(error: unknown) {
  const message = error instanceof Error ? error.message : "Internal server error";
  console.error("[api]", error);
  return fail(message, 500);
}
