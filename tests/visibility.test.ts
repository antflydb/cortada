import { describe, expect, it } from "vitest";
import { buildVisibilityDocuments, visibilityImportSchema } from "@/lib/visibility/import";
import { buildVisibilityOverview, emptyVisibilityOverview } from "@/lib/visibility/metrics";

const input = visibilityImportSchema.parse({
  campaign: {
    key: "acme-baseline",
    name: "Acme retrieval baseline",
    brandName: "Acme Search",
    domains: ["https://www.acme.test"],
    competitors: ["Example Vector"],
    personas: [
      { id: "privacy", name: "Privacy-first architect" },
      { id: "velocity", name: "Velocity-oriented engineer" },
    ],
    topics: [
      { id: "deployment", name: "Deployment flexibility" },
      { id: "accuracy", name: "Retrieval accuracy" },
    ],
  },
  run: {
    key: "october",
    label: "October baseline",
    startedAt: "2026-10-01T00:00:00.000Z",
    completedAt: "2026-10-01T00:05:00.000Z",
  },
  observations: [
    {
      prompt: { text: "Which retrieval engine supports private deployment?", personaId: "privacy", topicIds: ["deployment"] },
      providerId: "provider-a",
      modelId: "model-alpha",
      answer: "Example Vector ranks first, followed by Acme Search.",
      mentions: [
        { brandName: "Example Vector", rank: 1 },
        { brandName: "Acme Search", rank: 2 },
      ],
      citations: [
        { url: "https://docs.acme.test/private", title: "Private deployment" },
        { url: "https://independent.test/guide", title: "Retrieval guide" },
      ],
      observedAt: "2026-10-01T00:01:00.000Z",
    },
    {
      prompt: { text: "Which retrieval engine is easiest to operate?", personaId: "velocity", topicIds: ["deployment"] },
      providerId: "provider-a",
      modelId: "model-alpha",
      answer: "Example Vector is commonly considered.",
      mentions: [{ brandName: "Example Vector", rank: 1 }],
      citations: [{ url: "https://competitor.test/start", title: "Getting started" }],
      observedAt: "2026-10-01T00:02:00.000Z",
    },
    {
      prompt: { text: "Which retrieval product combines lexical and semantic search?", personaId: "velocity", topicIds: ["accuracy"] },
      providerId: "provider-b",
      modelId: "model-beta",
      answer: "Acme Search is the first recommendation.",
      mentions: [{ brandName: "Acme Search", rank: 1 }],
      citations: [{ url: "https://acme.test/hybrid", title: "Hybrid search" }],
      observedAt: "2026-10-01T00:03:00.000Z",
    },
    {
      prompt: { text: "Which retrieval product has the best accuracy?", personaId: "velocity", topicIds: ["accuracy"] },
      providerId: "provider-b",
      modelId: "model-beta",
      status: "error",
      errorCode: "provider_timeout",
      citations: [{ url: "https://ignored.test/error" }],
      observedAt: "2026-10-01T00:04:00.000Z",
    },
  ],
});

describe("visibility imports", () => {
  it("builds stable Antfly document identities", () => {
    const first = buildVisibilityDocuments("cortada_test", input);
    const second = buildVisibilityDocuments("cortada_test", input);
    expect(first.map((document) => document.id)).toEqual(second.map((document) => document.id));
    expect(new Set(first.map((document) => document.id)).size).toBe(first.length);
  });

  it("computes evidence-backed metrics for the latest campaign run", () => {
    const overview = buildVisibilityOverview(buildVisibilityDocuments("cortada_test", input));
    expect(overview.latestCampaign?.brandDomains).toEqual(["acme.test"]);
    expect(overview.latestRun?.status).toBe("partial");
    expect(overview.metrics).toEqual({
      expectedObservations: 4,
      successfulObservations: 3,
      failedObservations: 1,
      mentionCount: 2,
      visibilityRate: 67,
      firstChoiceCount: 1,
      firstChoiceRate: 50,
      coveredPersonas: 2,
      totalPersonas: 2,
      coveredModels: 2,
      totalModels: 2,
      citationCount: 4,
      ownedCitationShare: 50,
    });
    expect(overview.topCitedDomains[0]).toEqual({ hostname: "acme.test", citations: 1 });
    expect(overview.topCitedDomains.some((item) => item.hostname === "ignored.test")).toBe(false);
  });

  it("returns an explicit empty state before a campaign is imported", () => {
    expect(buildVisibilityOverview([])).toEqual(emptyVisibilityOverview());
  });

  it("rejects observations whose persona is not declared by the campaign", () => {
    const invalid = structuredClone(input);
    invalid.observations[0].prompt.personaId = "unknown";
    const result = visibilityImportSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["observations", 0, "prompt", "personaId"]);
    }
  });
});

