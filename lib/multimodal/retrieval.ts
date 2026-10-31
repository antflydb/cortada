import type {
  MultimodalRetrievalFinding,
  MultimodalRetrievalMode,
  MultimodalRetrievalRun,
} from "@/lib/types";

export const multimodalModes: Record<MultimodalRetrievalMode, {
  label: string;
  description: string;
  method: MultimodalRetrievalRun["method"];
}> = {
  "page-text": {
    label: "Page text",
    description: "Antfly semantic retrieval over audited page content",
    method: "semantic",
  },
  "asset-metadata": {
    label: "Asset meaning",
    description: "Antfly semantic retrieval over image and PDF descriptions",
    method: "semantic",
  },
  visual: {
    label: "Image pixels",
    description: "Antfly cross-modal retrieval in a shared text-image vector space",
    method: "semantic",
  },
  "pdf-text": {
    label: "PDF pages",
    description: "Antfly full-text retrieval over extracted and OCR-ready PDF chunks",
    method: "full-text",
  },
};

export function buildMultimodalFindings(runs: MultimodalRetrievalRun[]): MultimodalRetrievalFinding[] {
  const results = new Map(runs.map((run) => [run.mode, run.hits.length]));
  const findings: MultimodalRetrievalFinding[] = [];
  const pageHits = results.get("page-text") || 0;
  const metadataHits = results.get("asset-metadata") || 0;
  const visualHits = results.get("visual") || 0;
  const pdfHits = results.get("pdf-text") || 0;

  if (pdfHits > 0 && pageHits === 0) {
    findings.push({
      id: "pdf-only-evidence",
      severity: "warning",
      title: "Supporting evidence is trapped in PDFs",
      detail: "Antfly found relevant PDF passages but no matching audited page text. Publish a concise HTML explanation so answer engines can reach the evidence without opening a document.",
    });
  }
  if (visualHits > 0 && metadataHits === 0) {
    findings.push({
      id: "pixel-only-evidence",
      severity: "warning",
      title: "The image communicates more than its description",
      detail: "Antfly matched the image pixels, but its stored label and surrounding context did not match. Add specific alt text or a caption that states the visible claim.",
    });
  }
  if (metadataHits > 0 && visualHits === 0 && runs.some((run) => run.mode === "visual" && run.status === "not-configured")) {
    findings.push({
      id: "metadata-only-retrieval",
      severity: "signal",
      title: "Assets are retrievable through their descriptions",
      detail: "Antfly can find image and PDF evidence from alt text, captions, labels, and context. Pixel retrieval is not configured on this deployment.",
    });
  }
  if (pageHits > 0 && (metadataHits > 0 || visualHits > 0 || pdfHits > 0)) {
    findings.push({
      id: "cross-format-evidence",
      severity: "signal",
      title: "Antfly returned cross-format candidates",
      detail: "The same question produced page and asset candidates. Inspect their scores and descriptions to decide whether the non-HTML evidence is specific enough to support an answer.",
    });
  }
  return findings;
}
