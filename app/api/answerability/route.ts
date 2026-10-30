import { NextResponse } from "next/server";
import { z } from "zod";
import { compareSourceRetrieval } from "@/lib/antfly/repository";
import { limitRequest, rateLimitHeaders, tooManyRequests } from "@/lib/security/rate-limit";
import { readJsonBody, RequestBodyError } from "@/lib/security/request-body";
import type { AnswerabilityResult } from "@/lib/types";

export const runtime = "nodejs";

const requestSchema = z.object({
  question: z.string().trim().min(5).max(500),
  projectId: z.string().trim().min(1).max(300),
});

export async function POST(request: Request) {
  const rateLimit = limitRequest(request, "search");
  if (!rateLimit.allowed) return tooManyRequests(rateLimit);
  try {
    const { question, projectId } = requestSchema.parse(await readJsonBody(request));
    const comparison = await compareSourceRetrieval(question, projectId, 5);
    const result: AnswerabilityResult = {
      question,
      ...comparison,
      testedAt: new Date().toISOString(),
    };
    return NextResponse.json({ ok: true, result }, { headers: rateLimitHeaders(rateLimit) });
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status, headers: rateLimitHeaders(rateLimit) });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "Enter a customer question of at least five characters" }, { status: 400, headers: rateLimitHeaders(rateLimit) });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Answerability test failed" },
      { status: 503, headers: rateLimitHeaders(rateLimit) },
    );
  }
}
