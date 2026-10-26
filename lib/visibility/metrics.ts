import type {
  VisibilityCampaignDocument,
  VisibilityCitationDocument,
  VisibilityDocument,
  VisibilityObservationDocument,
  VisibilityOverview,
  VisibilityRunDocument,
} from "./types";

function percentage(numerator: number, denominator: number): number | null {
  return denominator ? Math.round((numerator / denominator) * 100) : null;
}

function normalizedBrand(value: string): string {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "");
}

function emptyMetrics() {
  return {
    expectedObservations: 0,
    successfulObservations: 0,
    failedObservations: 0,
    mentionCount: 0,
    visibilityRate: null,
    firstChoiceCount: 0,
    firstChoiceRate: null,
    coveredPersonas: 0,
    totalPersonas: 0,
    coveredModels: 0,
    totalModels: 0,
    citationCount: 0,
    ownedCitationShare: null,
  };
}

export function emptyVisibilityOverview(): VisibilityOverview {
  return { campaigns: [], metrics: emptyMetrics(), topCitedDomains: [] };
}

export function buildVisibilityOverview(documents: VisibilityDocument[]): VisibilityOverview {
  const allRuns = documents.filter(
    (document): document is VisibilityRunDocument => document.type === "visibility_run",
  );
  const latestRunByCampaign = new Map<string, string>();
  for (const run of allRuns) {
    const current = latestRunByCampaign.get(run.campaignId);
    if (!current || run.completedAt > current) latestRunByCampaign.set(run.campaignId, run.completedAt);
  }
  const campaigns = documents
    .filter((document): document is VisibilityCampaignDocument => document.type === "visibility_campaign")
    .sort((a, b) =>
      (latestRunByCampaign.get(b.id) || b.updatedAt).localeCompare(latestRunByCampaign.get(a.id) || a.updatedAt),
    );
  const latestCampaign = campaigns[0];
  if (!latestCampaign) return emptyVisibilityOverview();

  const runs = allRuns
    .filter((document) => document.campaignId === latestCampaign.id)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const latestRun = runs[0];
  if (!latestRun) {
    return {
      campaigns,
      latestCampaign,
      metrics: { ...emptyMetrics(), totalPersonas: latestCampaign.personas.length },
      topCitedDomains: [],
    };
  }

  const observations = documents.filter(
    (document): document is VisibilityObservationDocument =>
      document.type === "visibility_observation" && document.runId === latestRun.id,
  );
  const successful = observations.filter((observation) => observation.status === "success");
  const target = normalizedBrand(latestCampaign.brandName);
  const mentioning = successful.filter((observation) =>
    observation.mentions.some((mention) => mention.normalizedName === target),
  );
  const firstChoice = mentioning.filter((observation) =>
    observation.mentions.some((mention) => mention.normalizedName === target && mention.rank === 1),
  );
  const models = new Set(observations.map((observation) => `${observation.providerId}:${observation.modelId}`));
  const coveredModels = new Set(
    mentioning.map((observation) => `${observation.providerId}:${observation.modelId}`),
  );
  const coveredPersonas = new Set(mentioning.map((observation) => observation.personaId));
  const observationIds = new Set(successful.map((observation) => observation.id));
  const citations = documents.filter(
    (document): document is VisibilityCitationDocument =>
      document.type === "visibility_citation" &&
      document.runId === latestRun.id &&
      observationIds.has(document.observationId),
  );
  const domainCounts = new Map<string, number>();
  for (const citation of citations) {
    domainCounts.set(citation.hostname, (domainCounts.get(citation.hostname) || 0) + 1);
  }
  const topCitedDomains = [...domainCounts]
    .map(([hostname, citationCount]) => ({ hostname, citations: citationCount }))
    .sort((a, b) => b.citations - a.citations || a.hostname.localeCompare(b.hostname))
    .slice(0, 8);
  const ownedCitations = citations.filter((citation) => citation.owned).length;

  return {
    campaigns,
    latestCampaign,
    latestRun,
    metrics: {
      expectedObservations: latestRun.expectedObservationCount,
      successfulObservations: successful.length,
      failedObservations: observations.length - successful.length,
      mentionCount: mentioning.length,
      visibilityRate: percentage(mentioning.length, successful.length),
      firstChoiceCount: firstChoice.length,
      firstChoiceRate: percentage(firstChoice.length, mentioning.length),
      coveredPersonas: coveredPersonas.size,
      totalPersonas: latestCampaign.personas.length,
      coveredModels: coveredModels.size,
      totalModels: models.size,
      citationCount: citations.length,
      ownedCitationShare: percentage(ownedCitations, citations.length),
    },
    topCitedDomains,
  };
}

