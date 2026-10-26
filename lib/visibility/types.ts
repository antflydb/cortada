export type VisibilityPersona = {
  id: string;
  name: string;
};

export type VisibilityTopic = {
  id: string;
  name: string;
};

export type VisibilityCampaignDocument = {
  id: string;
  type: "visibility_campaign";
  workspaceId: string;
  name: string;
  brandName: string;
  brandDomains: string[];
  competitors: string[];
  personas: VisibilityPersona[];
  topics: VisibilityTopic[];
  createdAt: string;
  updatedAt: string;
};

export type VisibilityPromptDocument = {
  id: string;
  type: "visibility_prompt";
  workspaceId: string;
  campaignId: string;
  text: string;
  personaId: string;
  topicIds: string[];
  createdAt: string;
};

export type VisibilityRunDocument = {
  id: string;
  type: "visibility_run";
  workspaceId: string;
  campaignId: string;
  label: string;
  status: "complete" | "partial" | "failed";
  expectedObservationCount: number;
  successfulObservationCount: number;
  startedAt: string;
  completedAt: string;
};

export type VisibilityBrandMention = {
  brandName: string;
  normalizedName: string;
  rank?: number;
};

export type VisibilityObservationDocument = {
  id: string;
  type: "visibility_observation";
  workspaceId: string;
  campaignId: string;
  runId: string;
  promptId: string;
  personaId: string;
  topicIds: string[];
  providerId: string;
  modelId: string;
  status: "success" | "error";
  answer: string;
  mentions: VisibilityBrandMention[];
  citationIds: string[];
  observedAt: string;
  errorCode?: string;
};

export type VisibilityCitationDocument = {
  id: string;
  type: "visibility_citation";
  workspaceId: string;
  campaignId: string;
  runId: string;
  observationId: string;
  url: string;
  hostname: string;
  title?: string;
  sourceType?: string;
  owned: boolean;
  observedAt: string;
};

export type VisibilityDocument =
  | VisibilityCampaignDocument
  | VisibilityPromptDocument
  | VisibilityRunDocument
  | VisibilityObservationDocument
  | VisibilityCitationDocument;

export type VisibilityMetrics = {
  expectedObservations: number;
  successfulObservations: number;
  failedObservations: number;
  mentionCount: number;
  visibilityRate: number | null;
  firstChoiceCount: number;
  firstChoiceRate: number | null;
  coveredPersonas: number;
  totalPersonas: number;
  coveredModels: number;
  totalModels: number;
  citationCount: number;
  ownedCitationShare: number | null;
};

export type VisibilityOverview = {
  campaigns: VisibilityCampaignDocument[];
  latestCampaign?: VisibilityCampaignDocument;
  latestRun?: VisibilityRunDocument;
  metrics: VisibilityMetrics;
  topCitedDomains: Array<{ hostname: string; citations: number }>;
};

export type VisibilityEvidenceHit = {
  id: string;
  score: number;
  kind: "observation" | "citation";
  label: string;
  title: string;
  excerpt: string;
  url?: string;
};

