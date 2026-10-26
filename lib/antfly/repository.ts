import "server-only";
import { conjunction, disjunction, matchAll, term, type QueryRequest } from "@antfly/sdk";
import { antflyClient } from "./client";
import { antflySettings } from "./config";
import { antflySearchIndexes } from "./search-indexes";
import type { AnalysisDocument, Overview, SearchHit, SourceDocument } from "@/lib/types";
import { buildVisibilityOverview } from "@/lib/visibility/metrics";
import type {
  VisibilityCitationDocument,
  VisibilityDocument,
  VisibilityEvidenceHit,
  VisibilityObservationDocument,
} from "@/lib/visibility/types";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

let tableSetup: Promise<string> | undefined;

async function verifyTable(): Promise<string> {
  const settings = antflySettings();
  const tables = await antflyClient().tables.list();
  if (!tables?.some((table) => table.name === settings.table)) {
    throw new Error(`Antfly table "${settings.table}" was not found`);
  }
  return settings.table;
}

export async function ensureTables(): Promise<string> {
  tableSetup ??= verifyTable().catch((error) => {
    tableSetup = undefined;
    throw error;
  });
  return tableSetup;
}

export async function saveIngestion(source: SourceDocument, analysis: AnalysisDocument) {
  const client = antflyClient();
  const table = await ensureTables();
  await client.tables.batch(table, {
    inserts: {
      [source.id]: source,
      [analysis.id]: analysis,
    },
  });
}

export async function saveVisibilityDocuments(documents: VisibilityDocument[]) {
  const client = antflyClient();
  const table = await ensureTables();
  await client.tables.batch(table, {
    inserts: Object.fromEntries(documents.map((document) => [document.id, document])),
  });
}

function extractHits(result: unknown): UnknownRecord[] {
  if (!isRecord(result)) return [];
  const responses = Array.isArray(result.responses) ? result.responses : [];
  const first = responses[0];
  if (!isRecord(first) || !isRecord(first.hits) || !Array.isArray(first.hits.hits)) return [];
  return first.hits.hits.filter(isRecord);
}

function normalizeHit<T>(hit: UnknownRecord): T {
  const candidate = isRecord(hit._source) ? hit._source : hit;
  return { ...candidate, id: String(candidate.id || hit._id || hit._key) } as T;
}

function namespaceFilter() {
  return term(antflySettings().namespace, "workspaceId");
}

export async function getOverview(): Promise<Overview> {
  const client = antflyClient();
  const table = await ensureTables();
  const settings = antflySettings();
  const result = await client.tables.query(table, {
    filter_query: namespaceFilter(),
    indexes: [settings.fullTextIndex],
    limit: 500,
  } as QueryRequest);
  const documents = extractHits(result).map(normalizeHit<SourceDocument | AnalysisDocument>);
  const sources = documents.filter((document): document is SourceDocument => document.type === "source");
  const analyses = documents
    .filter((document): document is AnalysisDocument => document.type === "analysis")
    .sort((a, b) => b.analyzedAt.localeCompare(a.analyzedAt));
  return { sources, analyses };
}

export async function getVisibilityOverview() {
  const client = antflyClient();
  const table = await ensureTables();
  const settings = antflySettings();
  const result = await client.tables.query(table, {
    filter_query: namespaceFilter(),
    indexes: [settings.fullTextIndex],
    limit: 2_000,
  } as QueryRequest);
  const documents = extractHits(result)
    .map(normalizeHit<UnknownRecord>)
    .filter((document): document is UnknownRecord & VisibilityDocument =>
      typeof document.type === "string" && document.type.startsWith("visibility_"),
    );
  return buildVisibilityOverview(documents);
}

export async function searchVisibilityEvidence(query: string, limit = 8): Promise<VisibilityEvidenceHit[]> {
  const client = antflyClient();
  const table = await ensureTables();
  const settings = antflySettings();
  const result = await client.tables.query(table, {
    full_text_search: { query },
    filter_query: conjunction([
      namespaceFilter(),
      disjunction([
        term("visibility_observation", "type"),
        term("visibility_citation", "type"),
      ]),
    ]),
    indexes: antflySearchIndexes(settings),
    limit,
    ...(settings.embeddingsEnabled && settings.embeddingIndex
      ? { semantic_search: query, merge_config: { strategy: "rrf" } }
      : {}),
  } as QueryRequest);

  return extractHits(result).flatMap((hit): VisibilityEvidenceHit[] => {
    const document = normalizeHit<VisibilityDocument>(hit);
    const score = typeof hit._score === "number" ? hit._score : 0;
    if (document.type === "visibility_observation") {
      const observation = document as VisibilityObservationDocument;
      return [{
        id: observation.id,
        score,
        kind: "observation",
        label: `${observation.providerId} · ${observation.modelId}`,
        title: "Answer-engine observation",
        excerpt: observation.answer.slice(0, 420),
      }];
    }
    if (document.type === "visibility_citation") {
      const citation = document as VisibilityCitationDocument;
      return [{
        id: citation.id,
        score,
        kind: "citation",
        label: citation.hostname,
        title: citation.title || citation.url,
        excerpt: citation.sourceType ? `Source type: ${citation.sourceType}` : "Cited source",
        url: citation.url,
      }];
    }
    return [];
  });
}

export async function searchSources(query: string, limit = 8): Promise<SearchHit[]> {
  const client = antflyClient();
  const table = await ensureTables();
  const settings = antflySettings();
  const request: QueryRequest = {
    full_text_search: { query },
    filter_query: conjunction([namespaceFilter(), term("source", "type")]),
    indexes: antflySearchIndexes(settings),
    limit,
    ...(settings.embeddingsEnabled && settings.embeddingIndex
      ? { semantic_search: query, merge_config: { strategy: "rrf" } }
      : {}),
  } as QueryRequest;
  const result = await client.tables.query(table, request);
  return extractHits(result).map((hit) => ({
    id: String(hit._id || hit._key || "unknown"),
    score: typeof hit._score === "number" ? hit._score : 0,
    source: normalizeHit<SourceDocument>(hit),
  }));
}

export async function connectionStatus() {
  const settings = antflySettings();
  const started = Date.now();
  const table = await ensureTables();
  await antflyClient().tables.query(table, {
    filter_query: matchAll(),
    indexes: [settings.fullTextIndex],
    limit: 1,
  } as QueryRequest);
  return {
    status: "ready" as const,
    mode: settings.apiKey ? "cloud-or-authenticated" : "local",
    table,
    namespace: settings.namespace,
    embeddingsEnabled: settings.embeddingsEnabled,
    latencyMs: Date.now() - started,
  };
}
