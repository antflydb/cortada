import { NextResponse } from "next/server";
import { z } from "zod";
import { compareMultimodalEvidence } from "@/lib/antfly/repository";
import { limitRequest, rateLimitHeaders, tooManyRequests } from "@/lib/security/rate-limit";
import { readJsonBody, RequestBodyError } from "@/lib/security/request-body";

export const runtime = "nodejs";

const requestSchema = z.object({
  query: z.string().trim().min(2).max(300),
  projectId: z.string().trim().min(1).max(300),
});

export async function POST(request: Request) {
  const rateLimit = limitRequest(request, "search");
  if (!rateLimit.allowed) return tooManyRequests(rateLimit);

  try {
    const { query, projectId } = requestSchema.parse(await readJsonBody(request));
    const comparison = await compareMultimodalEvidence(query, projectId, 5);
    return NextResponse.json(
      { ok: true, result: { query, ...comparison, testedAt: new Date().toISOString() } },
      { headers: rateLimitHeaders(rateLimit) },
    );
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status, headers: rateLimitHeaders(rateLimit) },
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Enter at least two characters" },
        { status: 400, headers: rateLimitHeaders(rateLimit) },
      );
    }
    console.error("Antfly multimodal comparison failed", error);
    return NextResponse.json(
      { ok: false, error: "Antfly multimodal comparison failed" },
      { status: 503, headers: rateLimitHeaders(rateLimit) },
    );
  }
}
