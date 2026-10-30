import { NextResponse } from "next/server";
import { getWorkspaceOverview } from "@/lib/antfly/repository";
import { ProjectNotFoundError, RunNotFoundError } from "@/lib/projects/scope";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const startedAt = performance.now();
  try {
    const searchParams = new URL(request.url).searchParams;
    const projectId = searchParams.get("projectId")?.trim() || undefined;
    const runId = searchParams.get("runId")?.trim() || undefined;
    const compareTo = searchParams.get("compareTo")?.trim() || undefined;
    if ([projectId, runId, compareTo].some((value) => value && value.length > 300)) {
      return NextResponse.json({ ok: false, error: "Invalid workspace selection" }, { status: 400 });
    }
    const overview = await getWorkspaceOverview(projectId, runId, compareTo);
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
    if (error instanceof ProjectNotFoundError || error instanceof RunNotFoundError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not load Antfly data" },
      { status: 503 },
    );
  }
}
