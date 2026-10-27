export type SuggestionSeverity = "critical" | "warning" | "opportunity";

export type Suggestion = {
  id: string;
  severity: SuggestionSeverity;
  title: string;
  detail: string;
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
};

export type Overview = {
  sources: SourceDocument[];
  analyses: AnalysisDocument[];
};

export type SearchHit = {
  id: string;
  score: number;
  source: SourceDocument;
};
