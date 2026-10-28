import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzePage } from "@/lib/aeo/analyze";
import { antflySettings } from "@/lib/antfly/config";
import { saveIngestion, saveSiteDocuments } from "@/lib/antfly/repository";
import { analyzeMultimodalEvidence } from "@/lib/multimodal/analyze";
import { limitRequest, rateLimitHeaders, tooManyRequests } from "@/lib/security/rate-limit";
import { readJsonBody, RequestBodyError } from "@/lib/security/request-body";
import type { AnalysisDocument, CrawlFailure, CrawlRunDocument, ProjectDocument } from "@/lib/types";
import { discoverSite } from "@/lib/web/discover-site";
import { fetchAndParsePage, toAssetDocuments, toSourceDocument } from "@/lib/web/fetch-page";

export const runtime = "nodejs";
export const maxDuration = 300;

const requestSchema = z.object({
  brandName: z.string().trim().min(2).max(100),
  url: z.string().trim().url().max(2_000),
  maxPages: z.number().int().min(1).max(25).default(10),
});

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

export async function POST(request: Request) {
  const rateLimit = limitRequest(request, "ingest");
  if (!rateLimit.allowed) return tooManyRequests(rateLimit);

  try {
    const input = requestSchema.parse(await readJsonBody(request));
    const startedAt = new Date().toISOString();
    const settings = antflySettings();
    const discovery = await discoverSite(input.url, input.maxPages);
    const rootUrl = new URL(discovery.rootPage.url);
    const projectId = `${settings.namespace}:project:${digest(rootUrl.hostname)}`;
    const runId = `${projectId}:run:${digest(startedAt)}`;
    const analyses: AnalysisDocument[] = [];
    const failures: CrawlFailure[] = [];

    for (let offset = 0; offset < discovery.urls.length; offset += 3) {
      const batch = discovery.urls.slice(offset, offset + 3);
      await Promise.all(batch.map(async (url) => {
        try {
          const page = url === discovery.rootPage.url ? discovery.rootPage : await fetchAndParsePage(url);
          if (new URL(page.url).hostname !== rootUrl.hostname) throw new Error("Page redirected outside the audited host");
          const analyzedAt = new Date().toISOString();
          const source = toSourceDocument(page, input.brandName, analyzedAt, settings.namespace, {
            projectId,
            crawlRunId: runId,
          });
          const analysis = analyzePage(page, source, analyzedAt);
          const assets = toAssetDocuments(page, source, analyzedAt);
          const multimodalAnalysis = analyzeMultimodalEvidence(source, assets, analyzedAt);
          await saveIngestion(source, analysis, assets, multimodalAnalysis);
          analyses.push(analysis);
        } catch (error) {
          failures.push({ url, error: error instanceof Error ? error.message : "Page audit failed" });
        }
      }));
    }

    const completedAt = new Date().toISOString();
    const averageScore = analyses.length
      ? Math.round(analyses.reduce((sum, analysis) => sum + analysis.score, 0) / analyses.length)
      : null;
    const project: ProjectDocument = {
      id: projectId,
      type: "project",
      workspaceId: settings.namespace,
      brandName: input.brandName,
      rootUrl: discovery.rootPage.url,
      hostname: rootUrl.hostname,
      createdAt: startedAt,
      updatedAt: completedAt,
    };
    const run: CrawlRunDocument = {
      id: runId,
      type: "crawl_run",
      workspaceId: settings.namespace,
      projectId,
      brandName: input.brandName,
      rootUrl: discovery.rootPage.url,
      status: analyses.length === 0 ? "failed" : failures.length ? "partial" : "completed",
      requestedPages: discovery.urls.length,
      completedPages: analyses.length,
      averageScore,
      failures,
      startedAt,
      completedAt,
    };
    await saveSiteDocuments(project, run);

    return NextResponse.json(
      {
        ok: true,
        project,
        run,
        analyses,
        discovery: {
          sitemapCount: discovery.sitemapUrls.length,
          robotsRules: discovery.disallowedPaths.length,
        },
      },
      { headers: rateLimitHeaders(rateLimit) },
    );
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status, headers: rateLimitHeaders(rateLimit) });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "Enter a brand, valid site URL, and a page limit from 1 to 25" }, { status: 400, headers: rateLimitHeaders(rateLimit) });
    }
    const message = error instanceof Error ? error.message : "The site could not be audited";
    return NextResponse.json(
      { ok: false, error: message },
      { status: /Antfly|table|connect|fetch failed/i.test(message) ? 503 : 422, headers: rateLimitHeaders(rateLimit) },
    );
  }
}
