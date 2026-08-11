import { NextResponse } from "next/server";
import { createUserApiKey, PmtHouseError } from "@/lib/pymthouse";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      externalUserId?: string;
      label?: string;
    };
    if (!body.externalUserId?.trim()) {
      return NextResponse.json({ error: "externalUserId required" }, { status: 400 });
    }
    const created = await createUserApiKey(body.externalUserId.trim(), body.label);
    return NextResponse.json({
      apiKey: created.apiKey,
      sdkToken: created.sdkToken ?? null,
      id: created.id,
    });
  } catch (error) {
    if (error instanceof PmtHouseError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status || 500 },
      );
    }
    return NextResponse.json({ error: "key_mint_failed" }, { status: 500 });
  }
}
