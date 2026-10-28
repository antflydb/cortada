export type SuggestionSeverity = "critical" | "warning" | "opportunity";

export type Suggestion = {
  id: string;
  severity: SuggestionSeverity;
  title: string;
  detail: string;
  evidence?: string;
  fix?: string;
  example?: string;
};

export type ProjectDocument = {
  id: string;
  type: "project";
  workspaceId: string;
  brandName: string;
  rootUrl: string;
  hostname: string;
  createdAt: string;
  updatedAt: string;
};

export type CrawlFailure = {
  url: string;
  error: string;
};

export type CrawlRunDocument = {
  id: string;
  type: "crawl_run";
  workspaceId: string;
  projectId: string;
  brandName: string;
  rootUrl: string;
  status: "completed" | "partial" | "failed";
  requestedPages: number;
  completedPages: number;
  averageScore: number | null;
  failures: CrawlFailure[];
  startedAt: string;
  completedAt: string;
};

export type PageSignals = {
  title: boolean;
  metaDescription: boolean;
  singleH1: boolean;
  headingStructure: boolean;
  sufficientDepth: boolean;
  faqContent: boolean;
  structuredData: boolean;
  factualSignals: boolean;
  citations: boolean;
  answerFirstOpening: boolean;
};

export type SourceDocument = {
  id: string;
  type: "source";
  workspaceId: string;
  brandName: string;
  url: string;
  hostname: string;
  title: string;
  description: string;
  text: string;
  headings: string[];
  wordCount: number;
  fetchedAt: string;
  contentHash: string;
  projectId?: string;
  crawlRunId?: string;
};

export type AnalysisDocument = {
  id: string;
  type: "analysis";
  workspaceId: string;
  sourceId: string;
  brandName: string;
  url: string;
  title: string;
  rubric?: {
    id: string;
    version: number;
    name: string;
  };
  score: number;
  grade: "excellent" | "good" | "needs-work";
  signals: PageSignals;
  suggestions: Suggestion[];
  analyzedAt: string;
  projectId?: string;
  crawlRunId?: string;
};

export type AssetKind = "image" | "pdf";

export type DiscoveredAsset = {
  assetKind: AssetKind;
  url: string;
  title: string;
  altText: string;
  context: string;
  mimeType: string;
  width?: number;
  height?: number;
};

export type AssetDocument = {
  id: string;
  type: "asset";
  workspaceId: string;
  sourceId: string;
  brandName: string;
  sourceUrl: string;
  assetKind: AssetKind;
  url: string;
  /** PDF-only alias consumed by Antfly's durable document extraction pipeline. */
  pdfUrl?: string;
  hostname: string;
  title: string;
  altText: string;
  context: string;
  mimeType: string;
  width?: number;
  height?: number;
  indexable: boolean;
  discoveredAt: string;
  projectId?: string;
  crawlRunId?: string;
};

export type MultimodalFinding = {
  id: string;
  severity: SuggestionSeverity;
  title: string;
  detail: string;
};

export type MultimodalAnalysisDocument = {
  id: string;
  type: "multimodal_analysis";
  workspaceId: string;
  sourceId: string;
  brandName: string;
  url: string;
  title: string;
  score: number | null;
  grade: "ready" | "needs-work" | "no-assets";
  imageCount: number;
  pdfCount: number;
  indexableImageCount: number;
  imageAltCoverage: number | null;
  imageContextCoverage: number | null;
  pdfLabelCoverage: number | null;
  findings: MultimodalFinding[];
  analyzedAt: string;
  projectId?: string;
  crawlRunId?: string;
};

export type MultimodalCapabilities = {
  assetDiscovery: true;
  assetMetadataSearchEnabled: boolean;
  visualSearchEnabled: boolean;
  pdfExtractionEnabled: boolean;
};

export type Overview = {
  projects: ProjectDocument[];
  crawlRuns: CrawlRunDocument[];
  sources: SourceDocument[];
  analyses: AnalysisDocument[];
  assets: AssetDocument[];
  multimodalAnalyses: MultimodalAnalysisDocument[];
  multimodalCapabilities: MultimodalCapabilities;
  siteSummary: SiteSummary | null;
};

export type SiteFinding = {
  id: string;
  severity: SuggestionSeverity;
  title: string;
  detail: string;
  affectedPages: number;
  totalPages: number;
  urls: string[];
};

export type SiteComparison = {
  previousRunId: string;
  scoreDelta: number;
  pageDelta: number;
  newFindings: string[];
  resolvedFindings: string[];
};

export type SiteSummary = {
  project: ProjectDocument;
  run: CrawlRunDocument;
  pageCount: number;
  averageScore: number;
  findings: SiteFinding[];
  comparison: SiteComparison | null;
};

export type SearchHit = {
  id: string;
  score: number;
  source: SourceDocument;
};

export type AnswerabilityResult = {
  question: string;
  status: "supported" | "partial" | "not-found";
  evidenceCount: number;
  evidence: SearchHit[];
  testedAt: string;
};

export type MultimodalSearchHit = {
  id: string;
  score: number;
  kind: AssetKind | "pdf-page";
  title: string;
  url?: string;
  sourceUrl?: string;
  altText?: string;
  excerpt?: string;
};
