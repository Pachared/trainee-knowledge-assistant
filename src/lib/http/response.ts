import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ ok: false, error: { message, details } }, { status });
}

export function parseRouteError(error: unknown) {
  if (error instanceof ZodError) {
    return jsonError("ข้อมูลที่ส่งมาไม่ถูกต้อง", 422, error.flatten());
  }

  if (error instanceof Error && "statusCode" in error && typeof error.statusCode === "number") {
    return jsonError(error.message, error.statusCode, "details" in error ? error.details : undefined);
  }

  if (error instanceof Error) {
    return jsonError(error.message, 400);
  }

  return jsonError("เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ", 500);
}
