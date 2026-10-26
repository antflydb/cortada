import { NextResponse } from "next/server";
import { ensureTables } from "@/lib/antfly/repository";
import { antflySettings } from "@/lib/antfly/config";

export const runtime = "nodejs";

export async function POST() {
  try {
    const table = await ensureTables();
    return NextResponse.json({ ok: true, table, namespace: antflySettings().namespace });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Antfly setup failed" },
      { status: 503 },
    );
  }
}
