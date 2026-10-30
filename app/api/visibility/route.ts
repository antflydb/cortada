import { NextResponse } from "next/server";
import { z } from "zod";
import { antflySettings } from "@/lib/antfly/config";
import { getVisibilityOverview, saveVisibilityDocuments } from "@/lib/antfly/repository";
import { limitRequest, rateLimitHeaders, tooManyRequests } from "@/lib/security/rate-limit";
import { readJsonBody, RequestBodyError } from "@/lib/security/request-body";
import { buildVisibilityDocuments, visibilityImportSchema } from "@/lib/visibility/import";
import { buildVisibilityOverview } from "@/lib/visibility/metrics";
import { ProjectNotFoundError } from "@/lib/projects/scope";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const projectId = new URL(request.url).searchParams.get("projectId")?.trim() || undefined;
    if (projectId && projectId.length > 300) {
      return NextResponse.json({ ok: false, error: "Invalid project identifier" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, ...(await getVisibilityOverview(projectId)) });
  } catch (error) {
    if (error instanceof ProjectNotFoundError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not load visibility data" },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  if (process.env.CORTADA_PUBLIC_DEMO === "true") {
    return NextResponse.json(
      { ok: false, error: "Visibility imports are disabled in the public demo" },
      { status: 403 },
    );
  }

  const rateLimit = limitRequest(request, "ingest");
  if (!rateLimit.allowed) return tooManyRequests(rateLimit);

  try {
    const input = visibilityImportSchema.parse(await readJsonBody(request, 256_000));
    const documents = buildVisibilityDocuments(antflySettings().namespace, input);
    await saveVisibilityDocuments(documents);
    return NextResponse.json(
      { ok: true, importedDocuments: documents.length, ...buildVisibilityOverview(documents) },
      { status: 201, headers: rateLimitHeaders(rateLimit) },
    );
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status, headers: rateLimitHeaders(rateLimit) },
      );
    }
    if (error instanceof z.ZodError) {
      const issue = error.issues[0];
      const location = issue?.path.length ? ` at ${issue.path.join(".")}` : "";
      return NextResponse.json(
        { ok: false, error: `Invalid visibility import${location}: ${issue?.message || "validation failed"}` },
        { status: 400, headers: rateLimitHeaders(rateLimit) },
      );
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Visibility import failed" },
      { status: 503, headers: rateLimitHeaders(rateLimit) },
    );
  }
}

