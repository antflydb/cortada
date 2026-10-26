import { createHash } from "node:crypto";
import { z } from "zod";
import type {
  VisibilityCampaignDocument,
  VisibilityCitationDocument,
  VisibilityDocument,
  VisibilityObservationDocument,
  VisibilityPromptDocument,
  VisibilityRunDocument,
} from "./types";

const identifier = z.string().trim().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/);
const webUrl = z.string().url().max(2_048).refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === "http:" || protocol === "https:";
}, "URL must use HTTP or HTTPS");
const hostname = z.string().trim().min(1).max(253).refine((value) => {
  try {
    const candidate = value.includes("://") ? value : `https://${value}`;
    const parsed = new URL(candidate);
    return Boolean(parsed.hostname) && (parsed.protocol === "http:" || parsed.protocol === "https:");
  } catch {
    return false;
  }
}, "Domain must be a valid hostname or HTTP(S) URL");

export const visibilityImportSchema = z.object({
  campaign: z.object({
    key: identifier.optional(),
    name: z.string().trim().min(2).max(120),
    brandName: z.string().trim().min(2).max(100),
    domains: z.array(hostname).min(1).max(20),
    competitors: z.array(z.string().trim().min(1).max(100)).max(50).default([]),
    personas: z.array(z.object({ id: identifier, name: z.string().trim().min(2).max(100) })).min(1).max(30),
    topics: z.array(z.object({ id: identifier, name: z.string().trim().min(2).max(100) })).min(1).max(50),
  }),
  run: z.object({
    key: identifier.optional(),
    label: z.string().trim().min(1).max(120),
    startedAt: z.string().datetime(),
    completedAt: z.string().datetime(),
  }),
  observations: z.array(z.object({
    key: identifier.optional(),
    prompt: z.object({
      key: identifier.optional(),
      text: z.string().trim().min(5).max(4_000),
      personaId: identifier,
      topicIds: z.array(identifier).min(1).max(20),
    }),
    providerId: identifier,
    modelId: z.string().trim().min(1).max(160),
    status: z.enum(["success", "error"]).default("success"),
    answer: z.string().max(100_000).default(""),
    errorCode: z.string().trim().min(1).max(100).optional(),
    mentions: z.array(z.object({
      brandName: z.string().trim().min(1).max(100),
      rank: z.number().int().positive().max(100).optional(),
    })).max(100).default([]),
    citations: z.array(z.object({
      url: webUrl,
      title: z.string().trim().max(500).optional(),
      sourceType: z.string().trim().max(100).optional(),
    })).max(100).default([]),
    observedAt: z.string().datetime(),
  })).min(1).max(200),
}).superRefine((input, context) => {
  if (input.run.completedAt < input.run.startedAt) {
    context.addIssue({ code: "custom", path: ["run", "completedAt"], message: "must not be before startedAt" });
  }
  const personaIds = new Set(input.campaign.personas.map((persona) => persona.id));
  const topicIds = new Set(input.campaign.topics.map((topic) => topic.id));
  if (personaIds.size !== input.campaign.personas.length) {
    context.addIssue({ code: "custom", path: ["campaign", "personas"], message: "persona ids must be unique" });
  }
  if (topicIds.size !== input.campaign.topics.length) {
    context.addIssue({ code: "custom", path: ["campaign", "topics"], message: "topic ids must be unique" });
  }
  input.observations.forEach((observation, index) => {
    if (!personaIds.has(observation.prompt.personaId)) {
      context.addIssue({
        code: "custom",
        path: ["observations", index, "prompt", "personaId"],
        message: "must reference a campaign persona",
      });
    }
    observation.prompt.topicIds.forEach((topicId, topicIndex) => {
      if (!topicIds.has(topicId)) {
        context.addIssue({
          code: "custom",
          path: ["observations", index, "prompt", "topicIds", topicIndex],
          message: "must reference a campaign topic",
        });
      }
    });
  });
});

export type VisibilityImport = z.infer<typeof visibilityImportSchema>;

function stableHash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 20);
}

function normalizedBrand(value: string): string {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizedHostname(value: string): string {
  const candidate = value.includes("://") ? value : `https://${value}`;
  return new URL(candidate).hostname.toLocaleLowerCase().replace(/^www\./, "");
}

function isOwnedHostname(hostname: string, domains: string[]): boolean {
  return domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

export function buildVisibilityDocuments(workspaceId: string, input: VisibilityImport): VisibilityDocument[] {
  const campaignKey = input.campaign.key || stableHash(`${input.campaign.brandName}:${input.campaign.name}`);
  const campaignId = `${workspaceId}:visibility:campaign:${campaignKey}`;
  const runKey = input.run.key || stableHash(`${campaignId}:${input.run.startedAt}:${input.run.completedAt}`);
  const runId = `${campaignId}:run:${runKey}`;
  const brandDomains = [...new Set(input.campaign.domains.map(normalizedHostname))];
  const createdAt = input.run.startedAt;
  const campaign: VisibilityCampaignDocument = {
    id: campaignId,
    type: "visibility_campaign",
    workspaceId,
    name: input.campaign.name,
    brandName: input.campaign.brandName,
    brandDomains,
    competitors: input.campaign.competitors,
    personas: input.campaign.personas,
    topics: input.campaign.topics,
    createdAt,
    updatedAt: input.run.completedAt,
  };

  const prompts = new Map<string, VisibilityPromptDocument>();
  const observations: VisibilityObservationDocument[] = [];
  const citations: VisibilityCitationDocument[] = [];

  for (const item of input.observations) {
    const promptKey = item.prompt.key || stableHash(
      `${item.prompt.personaId}:${[...item.prompt.topicIds].sort().join(",")}:${item.prompt.text}`,
    );
    const promptId = `${campaignId}:prompt:${promptKey}`;
    prompts.set(promptId, {
      id: promptId,
      type: "visibility_prompt",
      workspaceId,
      campaignId,
      text: item.prompt.text,
      personaId: item.prompt.personaId,
      topicIds: item.prompt.topicIds,
      createdAt,
    });
    const observationKey = item.key || stableHash(
      `${promptId}:${item.providerId}:${item.modelId}:${item.observedAt}`,
    );
    const observationId = `${runId}:observation:${observationKey}`;
    const citationIds: string[] = [];
    const seenCitationIds = new Set<string>();
    for (const citation of item.citations) {
      const citationId = `${observationId}:citation:${stableHash(citation.url)}`;
      if (seenCitationIds.has(citationId)) continue;
      seenCitationIds.add(citationId);
      const hostname = normalizedHostname(citation.url);
      citationIds.push(citationId);
      citations.push({
        id: citationId,
        type: "visibility_citation",
        workspaceId,
        campaignId,
        runId,
        observationId,
        url: citation.url,
        hostname,
        title: citation.title,
        sourceType: citation.sourceType,
        owned: isOwnedHostname(hostname, brandDomains),
        observedAt: item.observedAt,
      });
    }
    observations.push({
      id: observationId,
      type: "visibility_observation",
      workspaceId,
      campaignId,
      runId,
      promptId,
      personaId: item.prompt.personaId,
      topicIds: item.prompt.topicIds,
      providerId: item.providerId,
      modelId: item.modelId,
      status: item.status,
      answer: item.answer,
      mentions: item.mentions.map((mention) => ({
        brandName: mention.brandName,
        normalizedName: normalizedBrand(mention.brandName),
        rank: mention.rank,
      })),
      citationIds,
      observedAt: item.observedAt,
      errorCode: item.errorCode,
    });
  }

  const successfulObservationCount = observations.filter((observation) => observation.status === "success").length;
  const run: VisibilityRunDocument = {
    id: runId,
    type: "visibility_run",
    workspaceId,
    campaignId,
    label: input.run.label,
    status: successfulObservationCount === observations.length
      ? "complete"
      : successfulObservationCount
        ? "partial"
        : "failed",
    expectedObservationCount: observations.length,
    successfulObservationCount,
    startedAt: input.run.startedAt,
    completedAt: input.run.completedAt,
  };

  return [campaign, run, ...prompts.values(), ...observations, ...citations];
}

