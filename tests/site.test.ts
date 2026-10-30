import { describe, expect, it } from "vitest";
import { buildSiteSummary } from "@/lib/aeo/site";
import { parseRobotsText, parseSitemapXml, robotsRuleMatches } from "@/lib/web/discover-site";
import type { AnalysisDocument, CrawlRunDocument, ProjectDocument } from "@/lib/types";

const project: ProjectDocument = {
  id: "workspace:project:example",
  type: "project",
  workspaceId: "workspace",
  brandName: "Example",
  rootUrl: "https://example.com/",
  hostname: "example.com",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-02T00:00:00.000Z",
};

function run(id: string, completedAt: string, averageScore: number): CrawlRunDocument {
  return {
    id,
    type: "crawl_run",
    workspaceId: "workspace",
    projectId: project.id,
    brandName: project.brandName,
    rootUrl: project.rootUrl,
    status: "completed",
    requestedPages: 2,
    completedPages: 2,
    averageScore,
    failures: [],
    startedAt: completedAt,
    completedAt,
  };
}

function analysis(id: string, crawlRunId: string, url: string, score: number, suggestionId?: string): AnalysisDocument {
  return {
    id,
    type: "analysis",
    workspaceId: "workspace",
    projectId: project.id,
    crawlRunId,
    sourceId: `source:${id}`,
    brandName: project.brandName,
    url,
    title: url,
    score,
    grade: score >= 55 ? "good" : "needs-work",
    signals: {
      title: true, metaDescription: true, singleH1: true, headingStructure: true, sufficientDepth: true,
      faqContent: true, structuredData: true, factualSignals: true, citations: true, answerFirstOpening: true,
    },
    suggestions: suggestionId ? [{ id: suggestionId, severity: "warning", title: suggestionId, detail: "Fix it" }] : [],
    analyzedAt: crawlRunId,
  };
}

describe("site-wide audit summaries", () => {
  it("groups findings and compares the latest two immutable runs", () => {
    const previous = run("run:1", "2026-10-01T00:00:00.000Z", 50);
    const latest = run("run:2", "2026-10-02T00:00:00.000Z", 70);
    const summary = buildSiteSummary([project], [previous, latest], [
      analysis("a", previous.id, "https://example.com/", 50, "meta"),
      analysis("b", previous.id, "https://example.com/about", 50, "schema"),
      analysis("c", latest.id, "https://example.com/", 60, "schema"),
      analysis("d", latest.id, "https://example.com/about", 80, "schema"),
    ]);
    expect(summary?.averageScore).toBe(70);
    expect(summary?.history.map((entry) => entry.averageScore)).toEqual([70, 50]);
    expect(summary?.findings[0]).toMatchObject({ id: "schema", affectedPages: 2, totalPages: 2 });
    expect(summary?.comparison).toMatchObject({ comparisonRunId: previous.id, scoreDelta: 20, resolvedFindings: ["meta"], newFindings: [] });
  });

  it("selects and compares arbitrary immutable runs", () => {
    const oldest = run("run:1", "2026-10-01T00:00:00.000Z", 40);
    const middle = run("run:2", "2026-10-02T00:00:00.000Z", 60);
    const latest = run("run:3", "2026-10-03T00:00:00.000Z", 80);
    const summary = buildSiteSummary([project], [oldest, middle, latest], [
      analysis("a", oldest.id, "https://example.com/", 40, "meta"),
      analysis("b", middle.id, "https://example.com/", 60, "schema"),
      analysis("c", latest.id, "https://example.com/", 80),
    ], middle.id, oldest.id);
    expect(summary?.run.id).toBe(middle.id);
    expect(summary?.latestRunId).toBe(latest.id);
    expect(summary?.comparison).toMatchObject({
      comparisonRunId: oldest.id,
      scoreDelta: 20,
      resolvedFindings: ["meta"],
      newFindings: ["schema"],
    });
  });
});

describe("site discovery parsing", () => {
  it("extracts sitemap and conservative robots directives", () => {
    expect(parseRobotsText("User-agent: *\nDisallow: /private\nSitemap: https://example.com/sitemap.xml"))
      .toEqual({ sitemapUrls: ["https://example.com/sitemap.xml"], disallowedPaths: ["/private"] });
  });

  it("honors robots wildcards without treating their prefix as a global block", () => {
    expect(robotsRuleMatches("/WAI/", "/*/wp-admin/")).toBe(false);
    expect(robotsRuleMatches("/blog/acme/wp-admin/", "/*/wp-admin/")).toBe(true);
    expect(robotsRuleMatches("/private", "/private$")).toBe(true);
    expect(robotsRuleMatches("/private/page", "/private$")).toBe(false);
  });

  it("distinguishes sitemap indexes from page maps", () => {
    expect(parseSitemapXml("<urlset><url><loc>https://example.com/a</loc></url></urlset>").pageUrls)
      .toEqual(["https://example.com/a"]);
    expect(parseSitemapXml("<sitemapindex><sitemap><loc>https://example.com/pages.xml</loc></sitemap></sitemapindex>").nestedSitemaps)
      .toEqual(["https://example.com/pages.xml"]);
  });
});
