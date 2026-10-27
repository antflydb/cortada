import { createHash } from "node:crypto";
import type {
  AssetDocument,
  MultimodalAnalysisDocument,
  MultimodalFinding,
  SourceDocument,
} from "@/lib/types";

function coverage(matching: number, total: number): number | null {
  return total ? Math.round((matching / total) * 100) : null;
}

function usefulPdfLabel(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized.length >= 5
    && !/^(download|view|open|read more|click here|pdf|document)$/.test(normalized)
    && !/\.pdf$/.test(normalized);
}

export function analyzeMultimodalEvidence(
  source: SourceDocument,
  assets: AssetDocument[],
  analyzedAt: string,
): MultimodalAnalysisDocument {
  const images = assets.filter((asset) => asset.assetKind === "image");
  const pdfs = assets.filter((asset) => asset.assetKind === "pdf");
  const altCoverage = coverage(images.filter((asset) => asset.altText.length >= 5).length, images.length);
  const contextCoverage = coverage(images.filter((asset) => asset.context.length >= 20).length, images.length);
  const pdfLabelCoverage = coverage(pdfs.filter((asset) => usefulPdfLabel(asset.title)).length, pdfs.length);
  const indexableImages = images.filter((asset) => asset.indexable).length;
  const findings: MultimodalFinding[] = [];

  if (images.length && (altCoverage ?? 0) < 80) {
    findings.push({
      id: "image-alt",
      severity: "critical",
      title: "Describe important images in text",
      detail: `${images.length - images.filter((asset) => asset.altText.length >= 5).length} image(s) lack useful alt text, leaving evidence trapped in pixels.`,
    });
  }
  if (images.length && (contextCoverage ?? 0) < 70) {
    findings.push({
      id: "image-context",
      severity: "warning",
      title: "Add captions or nearby context",
      detail: "Give diagrams, charts, and product images a caption or nearby explanation that can stand on its own.",
    });
  }
  if (images.length && indexableImages < images.length) {
    findings.push({
      id: "image-hosts",
      severity: "opportunity",
      title: "Allow trusted media hosts",
      detail: `${images.length - indexableImages} image(s) are on external hosts. Add only trusted hosts to CORTADA_MEDIA_HOST_ALLOWLIST before Antfly fetches them.`,
    });
  }
  if (pdfs.length && (pdfLabelCoverage ?? 0) < 100) {
    findings.push({
      id: "pdf-labels",
      severity: "warning",
      title: "Give every PDF a descriptive link",
      detail: "Use a human-readable document title instead of generic labels such as “download” or a bare filename.",
    });
  }
  const blockedPdfs = pdfs.filter((asset) => !asset.indexable).length;
  if (blockedPdfs) {
    findings.push({
      id: "pdf-hosts",
      severity: "opportunity",
      title: "Allow trusted PDF hosts",
      detail: `${blockedPdfs} PDF(s) are stored as metadata only. Approve their hosts explicitly before Antfly downloads and extracts them.`,
    });
  }
  if (pdfs.length) {
    findings.push({
      id: "pdf-extraction",
      severity: "opportunity",
      title: "Extract PDF pages as durable evidence",
      detail: "Antfly can persist PDF pages and chunks, OCR pages without native text, and expose failures instead of silently losing them.",
    });
  }

  const components = [altCoverage, contextCoverage, pdfLabelCoverage].filter(
    (value): value is number => value !== null,
  );
  const score = components.length
    ? Math.round(components.reduce((sum, value) => sum + value, 0) / components.length)
    : null;
  const digest = createHash("sha256").update(`${source.id}:${analyzedAt}`).digest("hex").slice(0, 24);

  return {
    id: `${source.workspaceId}:multimodal:${digest}`,
    type: "multimodal_analysis",
    workspaceId: source.workspaceId,
    sourceId: source.id,
    brandName: source.brandName,
    url: source.url,
    title: source.title,
    score,
    grade: score === null ? "no-assets" : score >= 80 ? "ready" : "needs-work",
    imageCount: images.length,
    pdfCount: pdfs.length,
    indexableImageCount: indexableImages,
    imageAltCoverage: altCoverage,
    imageContextCoverage: contextCoverage,
    pdfLabelCoverage,
    findings,
    analyzedAt,
  };
}
