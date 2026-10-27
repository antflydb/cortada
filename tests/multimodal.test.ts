import { describe, expect, it } from "vitest";
import { analyzeMultimodalEvidence } from "@/lib/multimodal/analyze";
import { parsePageHtml, toAssetDocuments, toSourceDocument } from "@/lib/web/fetch-page";

const fetchedAt = "2026-10-27T12:00:00.000Z";

describe("multimodal evidence ingestion", () => {
  it("discovers, resolves, deduplicates, and classifies image and PDF assets", () => {
    const page = parsePageHtml(`
      <html><head><title>Evidence center</title></head><body>
        <main>
          <h1>Evidence center</h1>
          <figure><img src="/diagram.png" alt="Private deployment architecture"><figcaption>How data remains inside the customer environment.</figcaption></figure>
          <img src="/diagram.png" alt="duplicate">
          <img src="https://cdn.example.net/chart.jpg">
          <a href="/security-whitepaper.pdf">Security whitepaper</a>
          <a href="/security-whitepaper.pdf">duplicate</a>
        </main>
      </body></html>
    `, new URL("https://example.com/resources"));

    expect(page.assets).toHaveLength(3);
    expect(page.assets.map((asset) => asset.assetKind)).toEqual(["image", "image", "pdf"]);
    expect(page.assets[0]).toMatchObject({
      url: "https://example.com/diagram.png",
      altText: "Private deployment architecture",
      context: "How data remains inside the customer environment.",
    });
    expect(page.assets[2]).toMatchObject({
      url: "https://example.com/security-whitepaper.pdf",
      title: "Security whitepaper",
      mimeType: "application/pdf",
    });
  });

  it("stores external images as metadata-only unless their host is trusted", () => {
    const page = parsePageHtml(`
      <html><head><title>Product evidence</title></head><body><main>
        <h1>Product evidence</h1><img src="/local.png" alt="Local image"><img src="https://cdn.example.net/remote.png" alt="Remote image">
      </main></body></html>
    `, new URL("https://example.com/product"));
    const source = toSourceDocument(page, "Example", fetchedAt, "example_test");
    const assets = toAssetDocuments(page, source, fetchedAt);

    expect(assets.map((asset) => [asset.hostname, asset.indexable])).toEqual([
      ["example.com", true],
      ["cdn.example.net", false],
    ]);
  });

  it("keeps multimodal readiness separate and explainable", () => {
    const page = parsePageHtml(`
      <html><head><title>Resource library</title></head><body><main>
        <h1>Resource library</h1><img src="/chart.png"><a href="/report.pdf">Download</a>
      </main></body></html>
    `, new URL("https://example.com/resources"));
    const source = toSourceDocument(page, "Example", fetchedAt, "example_test");
    const assets = toAssetDocuments(page, source, fetchedAt);
    const analysis = analyzeMultimodalEvidence(source, assets, fetchedAt);

    expect(analysis.score).toBe(0);
    expect(analysis.grade).toBe("needs-work");
    expect(analysis.imageCount).toBe(1);
    expect(analysis.pdfCount).toBe(1);
    expect(analysis.findings.map((finding) => finding.id)).toEqual(
      expect.arrayContaining(["image-alt", "image-context", "pdf-extraction"]),
    );
  });
});
