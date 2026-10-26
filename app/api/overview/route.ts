import { NextResponse } from "next/server";
import { getOverview } from "@/lib/antfly/repository";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json({ ok: true, ...(await getOverview()) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not load Antfly data" },
      { status: 503 },
    );
  }
}
