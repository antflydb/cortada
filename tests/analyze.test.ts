import { describe, expect, it } from "vitest";
import { analyzePage, type ParsedPage } from "@/lib/aeo/analyze";
import type { SourceDocument } from "@/lib/types";

const source: SourceDocument = {
  id: "source:test",
  type: "source",
  workspaceId: "default",
  brandName: "Cortada",
  url: "https://example.com/guide",
  hostname: "example.com",
  title: "A clear guide to answer engine optimization",
  description: "A practical guide to making company information easier for answer engines to understand, verify, retrieve, and cite accurately.",
  text: "",
  headings: [],
  wordCount: 0,
  fetchedAt: "2026-10-26T00:00:00.000Z",
  contentHash: "test",
};

describe("analyzePage", () => {
  it("awards a transparent 100-point score when every signal passes", () => {
    const text = `Answer engine optimization makes verified company information easier to retrieve and cite. ${"Evidence and implementation detail 42 customers. ".repeat(60)}`;
    const page: ParsedPage = {
      url: source.url,
      title: source.title,
      description: source.description,
      text,
      headings: [
        { level: 1, text: "Answer engine optimization" },
        { level: 2, text: "How does it work?" },
      ],
      externalLinkCount: 2,
      hasFaqLanguage: true,
      hasStructuredData: true,
    };
    const result = analyzePage(page, { ...source, text, wordCount: text.split(/\s+/).length }, source.fetchedAt);
    expect(result.score).toBe(100);
    expect(result.grade).toBe("excellent");
    expect(result.rubric).toEqual({ id: "standard-v1", version: 1, name: "Standard AEO" });
    expect(result.suggestions).toEqual([]);
  });

  it("returns concrete improvements for an empty page", () => {
    const page: ParsedPage = {
      url: source.url,
      title: "Home",
      description: "",
      text: "Welcome.",
      headings: [],
      externalLinkCount: 0,
      hasFaqLanguage: false,
      hasStructuredData: false,
    };
    const result = analyzePage(page, source, source.fetchedAt);
    expect(result.score).toBe(0);
    expect(result.grade).toBe("needs-work");
    expect(result.suggestions.map((item) => item.id)).toContain("schema");
    expect(result.suggestions.map((item) => item.id)).toContain("opening");
  });
});
