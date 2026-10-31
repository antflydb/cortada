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
  pageTextSearchEnabled: boolean;
  assetMetadataSearchEnabled: boolean;
  visualSearchEnabled: boolean;
  pdfExtractionEnabled: boolean;
};

export type Overview = {
  selectedProjectId?: string;
  selectedRunId?: string;
  comparisonRunId?: string;
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
  comparisonRunId: string;
  scoreDelta: number;
  pageDelta: number;
  newFindings: string[];
  resolvedFindings: string[];
};

export type SiteRunHistoryEntry = {
  run: CrawlRunDocument;
  pageCount: number;
  averageScore: number;
  findingCount: number;
};

export type SiteSummary = {
  project: ProjectDocument;
  run: CrawlRunDocument;
  pageCount: number;
  averageScore: number;
  findings: SiteFinding[];
  history: SiteRunHistoryEntry[];
  latestRunId: string;
  comparison: SiteComparison | null;
};

export type SearchHit = {
  id: string;
  rank?: number;
  score: number;
  indexScores?: Record<string, number>;
  source: SourceDocument;
};

export type AnswerabilityMode = "keyword" | "semantic" | "hybrid" | "hybrid-reranked";

export type AnswerabilityRun = {
  mode: AnswerabilityMode;
  label: string;
  description: string;
  status: "supported" | "partial" | "not-found" | "unavailable";
  evidenceCount: number;
  evidence: SearchHit[];
  latencyMs: number;
  engineTookMs?: number;
  error?: string;
  pipeline: {
    fullTextIndex?: string;
    embeddingIndexes: string[];
    fusion?: "rrf" | "rsf";
    reranker?: string;
    pruner?: string;
  };
  profile?: {
    shards?: { total?: number; successful?: number; failed?: number };
    merge?: { strategy?: string; fullTextHits?: number; semanticHits?: number; durationMs?: number };
    reranker?: { model?: string; documentsReranked?: number; durationMs?: number };
  };
};

export type AnswerabilityResult = {
  question: string;
  runs: AnswerabilityRun[];
  capabilities: {
    keyword: true;
    semantic: boolean;
    hybrid: boolean;
    reranking: boolean;
    fullTextIndex: string;
    embeddingIndex?: string;
  };
  testedAt: string;
};

export type MultimodalRetrievalMode = "page-text" | "asset-metadata" | "visual" | "pdf-text";

export type MultimodalSearchHit = {
  id: string;
  rank: number;
  score: number;
  kind: AssetKind | "page" | "pdf-page";
  title: string;
  url?: string;
  sourceUrl?: string;
  altText?: string;
  excerpt?: string;
  indexScores?: Record<string, number>;
};

export type MultimodalRetrievalRun = {
  mode: MultimodalRetrievalMode;
  label: string;
  description: string;
  status: "results" | "empty" | "unavailable" | "not-configured";
  index?: string;
  method: "semantic" | "full-text";
  latencyMs: number;
  engineTookMs?: number;
  hits: MultimodalSearchHit[];
  error?: string;
};

export type MultimodalRetrievalFinding = {
  id: string;
  severity: "signal" | "warning";
  title: string;
  detail: string;
};

export type MultimodalSearchResult = {
  query: string;
  runs: MultimodalRetrievalRun[];
  findings: MultimodalRetrievalFinding[];
  capabilities: {
    pageText: boolean;
    assetMetadata: boolean;
    visual: boolean;
    pdfText: boolean;
  };
  testedAt: string;
};
