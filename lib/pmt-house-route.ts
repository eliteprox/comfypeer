import { NextResponse } from "next/server";
import { PmtHouseError } from "@pymthouse/builder-sdk";

export function pmtHouseErrorResponse(
  error: unknown,
  fallback: string,
): NextResponse {
  if (error instanceof PmtHouseError) {
    const details =
      error.details && typeof error.details === "object"
        ? (error.details as Record<string, unknown>)
        : {};
    const detailCode =
      typeof details.code === "string" ? details.code : undefined;
    return NextResponse.json(
      {
        error: error.message,
        code: detailCode || error.code,
        ...details,
      },
      { status: error.status || 500 },
    );
  }
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status: 502 });
}
