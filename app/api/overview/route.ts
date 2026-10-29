import { NextResponse } from "next/server";
import { getWorkspaceOverview } from "@/lib/antfly/repository";

export const runtime = "nodejs";

export async function GET() {
  const startedAt = performance.now();
  try {
    const overview = await getWorkspaceOverview();
    const duration = performance.now() - startedAt;
    return NextResponse.json(
      { ok: true, ...overview },
      {
        headers: {
          "Cache-Control": "no-store",
          "Server-Timing": `antfly;dur=${duration.toFixed(1)}`,
          "X-AEO-Read-Ms": String(Math.round(duration)),
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not load Antfly data" },
      { status: 503 },
    );
  }
}
