import { NextResponse } from "next/server";
import { apiMeta } from "@/lib/api-contract";

export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json(
    {
      ok: true,
      meta: apiMeta(),
      data
    },
    init
  );
}

export function error(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      ok: false,
      meta: apiMeta(),
      error: {
        message,
        details
      }
    },
    { status }
  );
}
