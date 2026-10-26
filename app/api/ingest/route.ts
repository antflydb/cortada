import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzePage } from "@/lib/aeo/analyze";
import { saveIngestion } from "@/lib/antfly/repository";
import { antflySettings } from "@/lib/antfly/config";
import { limitRequest, rateLimitHeaders, tooManyRequests } from "@/lib/security/rate-limit";
import { readJsonBody, RequestBodyError } from "@/lib/security/request-body";
import { fetchAndParsePage, toSourceDocument } from "@/lib/web/fetch-page";

export const runtime = "nodejs";

const requestSchema = z.object({
  brandName: z.string().trim().min(2).max(100),
  url: z.string().trim().url().max(2_000),
});

export async function POST(request: Request) {
  const rateLimit = limitRequest(request, "ingest");
  if (!rateLimit.allowed) return tooManyRequests(rateLimit);

  try {
    const input = requestSchema.parse(await readJsonBody(request));
    const fetchedAt = new Date().toISOString();
    const page = await fetchAndParsePage(input.url);
    const source = toSourceDocument(page, input.brandName, fetchedAt, antflySettings().namespace);
    const analysis = analyzePage(page, source, fetchedAt);
    await saveIngestion(source, analysis);
    return NextResponse.json(
      { ok: true, source, analysis },
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
        { ok: false, error: "Enter a brand name and a valid website URL" },
        { status: 400, headers: rateLimitHeaders(rateLimit) },
      );
    }
    const message = error instanceof Error ? error.message : "The website could not be analyzed";
    const status = /Antfly|table|connect|fetch failed/i.test(message) ? 503 : 422;
    return NextResponse.json(
      { ok: false, error: message },
      { status, headers: rateLimitHeaders(rateLimit) },
    );
  }
}
