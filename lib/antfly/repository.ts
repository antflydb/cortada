import "server-only";
import { conjunction, disjunction, matchAll, term, type QueryRequest } from "@antfly/sdk";
import { antflyClient } from "./client";
import { antflySettings } from "./config";
import { antflySearchIndexes } from "./search-indexes";
import type {
  AnalysisDocument,
  AnswerabilityMode,
  AnswerabilityRun,
  AssetDocument,
  CrawlRunDocument,
  MultimodalAnalysisDocument,
  MultimodalSearchHit,
  Overview,
  ProjectDocument,
  SearchHit,
  SourceDocument,
} from "@/lib/types";
import { buildSiteSummary } from "@/lib/aeo/site";
import { answerabilityModes, answerabilityStatus, availableAnswerabilityModes, numericIndexScores } from "@/lib/answerability/retrieval";
import { belongsToProject, resolveComparisonRun, resolveProject, resolveRun, scopeVisibilityDocuments } from "@/lib/projects/scope";
import { buildVisibilityOverview } from "@/lib/visibility/metrics";
import type {
  VisibilityCitationDocument,
  VisibilityDocument,
  VisibilityEvidenceHit,
  VisibilityObservationDocument,
  VisibilityOverview,
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

export async function saveIngestion(
  source: SourceDocument,
  analysis: AnalysisDocument,
  assets: AssetDocument[] = [],
  multimodalAnalysis?: MultimodalAnalysisDocument,
) {
  const client = antflyClient();
  const table = await ensureTables();
  await client.tables.batch(table, {
    inserts: {
      [source.id]: source,
      [analysis.id]: analysis,
      ...Object.fromEntries(assets.map((asset) => [asset.id, asset])),
      ...(multimodalAnalysis ? { [multimodalAnalysis.id]: multimodalAnalysis } : {}),
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

export async function saveSiteDocuments(project: ProjectDocument, run: CrawlRunDocument) {
  const client = antflyClient();
  const table = await ensureTables();
  await client.tables.batch(table, { inserts: { [project.id]: project, [run.id]: run } });
}

function extractHits(result: unknown): UnknownRecord[] {
  if (!isRecord(result)) return [];
  const responses = Array.isArray(result.responses) ? result.responses : [];
  const first = responses[0];
  if (!isRecord(first) || !isRecord(first.hits) || !Array.isArray(first.hits.hits)) return [];
  return first.hits.hits.filter(isRecord);
}

function extractQueryResult(result: unknown): UnknownRecord | undefined {
  if (!isRecord(result)) return undefined;
  const responses = Array.isArray(result.responses) ? result.responses : [];
  return responses.find(isRecord);
}

function normalizeHit<T>(hit: UnknownRecord): T {
  const candidate = isRecord(hit._source) ? hit._source : hit;
  return { ...candidate, id: String(candidate.id || hit._id || hit._key) } as T;
}

function namespacePrefix(): string {
  return `${antflySettings().namespace}:`;
}

type WorkspaceDocument =
  | SourceDocument
  | AnalysisDocument
  | AssetDocument
  | MultimodalAnalysisDocument
  | ProjectDocument
  | CrawlRunDocument
  | VisibilityDocument;

async function loadWorkspaceDocuments(limit = 3_000): Promise<WorkspaceDocument[]> {
  const client = antflyClient();
  const settings = antflySettings();
  const result = await client.tables.query(settings.table, {
    // Every Cortada-owned key begins with the configured namespace. Antfly
    // applies this prefix before scoring, avoiding a broad indexed field scan.
    filter_prefix: `${settings.namespace}:`,
    limit,
  } as QueryRequest);
  return extractHits(result).map(normalizeHit<WorkspaceDocument>);
}

function buildOverview(
  documents: WorkspaceDocument[],
  requestedProjectId?: string,
  requestedRunId?: string,
  requestedComparisonRunId?: string,
): Overview {
  const settings = antflySettings();
  const projects = documents
    .filter((document): document is ProjectDocument => document.type === "project")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const selectedProject = resolveProject(projects, requestedProjectId);
  const selectedProjectId = selectedProject?.id;
  const crawlRuns = documents
    .filter((document): document is CrawlRunDocument => document.type === "crawl_run")
    .filter((document) => belongsToProject(document, selectedProjectId))
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const selectedRun = resolveRun(crawlRuns, requestedRunId);
  const comparisonRun = resolveComparisonRun(crawlRuns, selectedRun, requestedComparisonRunId);
  const sources = documents
    .filter((document): document is SourceDocument => document.type === "source")
    .filter((document) => belongsToProject(document, selectedProjectId));
  const analyses = documents
    .filter((document): document is AnalysisDocument => document.type === "analysis")
    .filter((document) => belongsToProject(document, selectedProjectId))
    .sort((a, b) => b.analyzedAt.localeCompare(a.analyzedAt));
  const assets = documents
    .filter((document): document is AssetDocument => document.type === "asset")
    .filter((document) => belongsToProject(document, selectedProjectId))
    .sort((a, b) => b.discoveredAt.localeCompare(a.discoveredAt));
  const multimodalAnalyses = documents
    .filter((document): document is MultimodalAnalysisDocument => document.type === "multimodal_analysis")
    .filter((document) => belongsToProject(document, selectedProjectId))
    .sort((a, b) => b.analyzedAt.localeCompare(a.analyzedAt));
  return {
    projects,
    selectedProjectId,
    selectedRunId: selectedRun?.id,
    comparisonRunId: comparisonRun?.id,
    crawlRuns,
    sources,
    analyses,
    assets,
    multimodalAnalyses,
    multimodalCapabilities: {
      assetDiscovery: true,
      assetMetadataSearchEnabled: settings.assetMetadataSearchEnabled && Boolean(settings.assetMetadataIndex),
      visualSearchEnabled: settings.visualSearchEnabled && Boolean(settings.visualIndex),
      pdfExtractionEnabled: settings.pdfExtractionEnabled && Boolean(settings.pdfTextIndex),
    },
    siteSummary: buildSiteSummary(projects, crawlRuns, analyses, selectedRun?.id, comparisonRun?.id),
  };
}

function visibilityDocuments(documents: WorkspaceDocument[]): VisibilityDocument[] {
  return documents.filter((document): document is VisibilityDocument =>
    typeof document.type === "string" && document.type.startsWith("visibility_"),
  );
}

export async function getWorkspaceOverview(
  requestedProjectId?: string,
  requestedRunId?: string,
  requestedComparisonRunId?: string,
): Promise<Overview & { visibility: VisibilityOverview }> {
  const documents = await loadWorkspaceDocuments();
  const overview = buildOverview(documents, requestedProjectId, requestedRunId, requestedComparisonRunId);
  const selectedProject = overview.projects.find((project) => project.id === overview.selectedProjectId);
  return {
    ...overview,
    visibility: buildVisibilityOverview(scopeVisibilityDocuments(visibilityDocuments(documents), selectedProject)),
  };
}

export async function getOverview(
  requestedProjectId?: string,
  requestedRunId?: string,
  requestedComparisonRunId?: string,
): Promise<Overview> {
  return buildOverview(await loadWorkspaceDocuments(), requestedProjectId, requestedRunId, requestedComparisonRunId);
}

export async function getVisibilityOverview(requestedProjectId?: string) {
  const documents = await loadWorkspaceDocuments(2_000);
  const projects = documents
    .filter((document): document is ProjectDocument => document.type === "project")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const selectedProject = resolveProject(projects, requestedProjectId);
  return buildVisibilityOverview(scopeVisibilityDocuments(visibilityDocuments(documents), selectedProject));
}

export async function searchVisibilityEvidence(query: string, limit = 8, campaignId?: string): Promise<VisibilityEvidenceHit[]> {
  const client = antflyClient();
  const settings = antflySettings();
  const result = await client.tables.query(settings.table, {
    full_text_search: { query },
    filter_prefix: namespacePrefix(),
    filter_query: conjunction([
      disjunction([
        term("visibility_observation", "type"),
        term("visibility_citation", "type"),
      ]),
      ...(campaignId ? [term(campaignId, "campaignId")] : []),
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

export async function searchSources(query: string, limit = 8, projectId?: string): Promise<SearchHit[]> {
  const client = antflyClient();
  const settings = antflySettings();
  const request: QueryRequest = {
    full_text_search: { query },
    filter_prefix: namespacePrefix(),
    filter_query: conjunction([
      term("source", "type"),
      ...(projectId ? [term(projectId, "projectId")] : []),
    ]),
    indexes: antflySearchIndexes(settings),
    limit,
    ...(settings.embeddingsEnabled && settings.embeddingIndex
      ? { semantic_search: query, merge_config: { strategy: "rrf" } }
      : {}),
  } as QueryRequest;
  const result = await client.tables.query(settings.table, request);
  return extractHits(result).map((hit) => ({
    id: String(hit._id || hit._key || "unknown"),
    score: typeof hit._score === "number" ? hit._score : 0,
    source: normalizeHit<SourceDocument>(hit),
  }));
}

async function runSourceSearch(
  query: string,
  projectId: string,
  mode: AnswerabilityMode,
  limit: number,
): Promise<AnswerabilityRun> {
  const client = antflyClient();
  const settings = antflySettings();
  const semantic = mode !== "keyword";
  const fullText = mode !== "semantic";
  const reranked = mode === "hybrid-reranked";
  const request: QueryRequest = {
    ...(fullText ? { full_text_search: { query } } : {}),
    ...(semantic ? { semantic_search: query, indexes: [settings.embeddingIndex!] } : {}),
    ...(mode === "hybrid" || reranked ? { merge_config: { strategy: "rrf" as const } } : {}),
    ...(reranked ? {
      reranker: { provider: "antfly", field: "text" },
      pruner: { min_score_ratio: 0.5, max_score_gap_percent: 30 },
    } : {}),
    filter_prefix: namespacePrefix(),
    filter_query: conjunction([term("source", "type"), term(projectId, "projectId")]),
    limit,
    profile: true,
  } as QueryRequest;
  const startedAt = performance.now();
  const result = await client.tables.query(settings.table, request);
  const latencyMs = Math.round(performance.now() - startedAt);
  const queryResult = extractQueryResult(result);
  const profile = isRecord(queryResult?.profile) ? queryResult.profile : undefined;
  const merge = isRecord(profile?.merge) ? profile.merge : undefined;
  const reranker = isRecord(profile?.reranker) ? profile.reranker : undefined;
  const shards = isRecord(profile?.shards) ? profile.shards : undefined;
  const evidence = extractHits(result).map((hit, index): SearchHit => {
    const indexScores = numericIndexScores(hit._index_scores);
    return {
      id: String(hit._id || hit._key || "unknown"),
      rank: index + 1,
      score: typeof hit._score === "number" ? hit._score : 0,
      ...(indexScores ? { indexScores } : {}),
      source: normalizeHit<SourceDocument>(hit),
    };
  });
  const modeCopy = answerabilityModes[mode];
  return {
    mode,
    ...modeCopy,
    status: answerabilityStatus(evidence.length),
    evidenceCount: evidence.length,
    evidence,
    latencyMs,
    ...(typeof queryResult?.took === "number" ? { engineTookMs: queryResult.took } : {}),
    pipeline: {
      ...(fullText ? { fullTextIndex: settings.fullTextIndex } : {}),
      embeddingIndexes: semantic && settings.embeddingIndex ? [settings.embeddingIndex] : [],
      ...(mode === "hybrid" || reranked ? { fusion: "rrf" as const } : {}),
      ...(reranked ? { reranker: "Antfly built-in cross-encoder", pruner: "50% score ratio · 30% gap" } : {}),
    },
    ...((shards || merge || reranker) ? {
      profile: {
        ...(shards ? { shards: {
          ...(typeof shards.total === "number" ? { total: shards.total } : {}),
          ...(typeof shards.successful === "number" ? { successful: shards.successful } : {}),
          ...(typeof shards.failed === "number" ? { failed: shards.failed } : {}),
        } } : {}),
        ...(merge ? { merge: {
          ...(typeof merge.strategy === "string" ? { strategy: merge.strategy } : {}),
          ...(typeof merge.full_text_hits === "number" ? { fullTextHits: merge.full_text_hits } : {}),
          ...(typeof merge.semantic_hits === "number" ? { semanticHits: merge.semantic_hits } : {}),
          ...(typeof merge.duration_ms === "number" ? { durationMs: merge.duration_ms } : {}),
        } } : {}),
        ...(reranker ? { reranker: {
          ...(typeof reranker.model === "string" ? { model: reranker.model } : {}),
          ...(typeof reranker.documents_reranked === "number" ? { documentsReranked: reranker.documents_reranked } : {}),
          ...(typeof reranker.duration_ms === "number" ? { durationMs: reranker.duration_ms } : {}),
        } } : {}),
      },
    } : {}),
  };
}

export async function compareSourceRetrieval(
  query: string,
  projectId: string,
  limit = 5,
): Promise<{ runs: AnswerabilityRun[]; capabilities: {
  keyword: true;
  semantic: boolean;
  hybrid: boolean;
  reranking: boolean;
  fullTextIndex: string;
  embeddingIndex?: string;
} }> {
  const settings = antflySettings();
  const semanticEnabled = settings.embeddingsEnabled && Boolean(settings.embeddingIndex);
  const modes = availableAnswerabilityModes(semanticEnabled, settings.rerankingEnabled);
  const runs = await Promise.all(modes.map(async (mode): Promise<AnswerabilityRun> => {
    try {
      return await runSourceSearch(query, projectId, mode, limit);
    } catch {
      return {
        mode,
        ...answerabilityModes[mode],
        status: "unavailable",
        evidenceCount: 0,
        evidence: [],
        latencyMs: 0,
        error: "This retrieval path is unavailable on the current Antfly index configuration.",
        pipeline: {
          ...(mode !== "semantic" ? { fullTextIndex: settings.fullTextIndex } : {}),
          embeddingIndexes: mode !== "keyword" && settings.embeddingIndex ? [settings.embeddingIndex] : [],
          ...(mode === "hybrid" || mode === "hybrid-reranked" ? { fusion: "rrf" as const } : {}),
        },
      };
    }
  }));
  if (runs.every((run) => run.status === "unavailable")) {
    throw new Error("Every Antfly retrieval path was unavailable");
  }
  return {
    runs,
    capabilities: {
      keyword: true,
      semantic: semanticEnabled,
      hybrid: semanticEnabled,
      reranking: semanticEnabled && settings.rerankingEnabled,
      fullTextIndex: settings.fullTextIndex,
      ...(settings.embeddingIndex ? { embeddingIndex: settings.embeddingIndex } : {}),
    },
  };
}

export async function searchMultimodalEvidence(query: string, limit = 8, projectId?: string): Promise<MultimodalSearchHit[]> {
  const client = antflyClient();
  const settings = antflySettings();
  const table = settings.table;
  const searches: Promise<unknown>[] = [];
  let allowedAssetIds = new Set<string>();

  if (projectId && settings.pdfExtractionEnabled && settings.pdfTextIndex) {
    const assets = await client.tables.query(table, {
      filter_prefix: namespacePrefix(),
      filter_query: conjunction([term("asset", "type"), term(projectId, "projectId")]),
      limit: 1_000,
    } as QueryRequest);
    allowedAssetIds = new Set(extractHits(assets).map((hit) => normalizeHit<AssetDocument>(hit).id));
  }

  if (settings.assetMetadataSearchEnabled && settings.assetMetadataIndex) {
    searches.push(client.tables.query(table, {
      semantic_search: query,
      filter_prefix: namespacePrefix(),
      filter_query: conjunction([
        term("asset", "type"),
        ...(projectId ? [term(projectId, "projectId")] : []),
      ]),
      indexes: [settings.assetMetadataIndex],
      limit,
    } as QueryRequest));
  }

  if (settings.visualSearchEnabled && settings.visualIndex) {
    searches.push(client.tables.query(table, {
      semantic_search: query,
      filter_prefix: namespacePrefix(),
      filter_query: conjunction([
        term("asset", "type"),
        term("image", "assetKind"),
        term("true", "indexable"),
        ...(projectId ? [term(projectId, "projectId")] : []),
      ]),
      indexes: [settings.visualIndex],
      limit,
    } as QueryRequest));
  }
  if (settings.pdfExtractionEnabled && settings.pdfTextIndex) {
    searches.push(client.tables.query(table, {
      full_text_search: { query },
      // Derived PDF chunks retain the parent asset key prefix, but do not copy
      // arbitrary source fields such as workspaceId into every artifact record.
      // Prefix isolation therefore covers both the parent and its descendants.
      filter_prefix: `${settings.namespace}:asset:`,
      indexes: [settings.pdfTextIndex],
      limit,
    } as QueryRequest));
  }
  if (!searches.length) {
    throw new Error("Antfly multimodal retrieval is not enabled for this deployment");
  }

  const results = await Promise.all(searches);
  const hits = results.flatMap(extractHits).filter((hit) => {
    if (!projectId) return true;
    const document = normalizeHit<UnknownRecord>(hit);
    if (document.projectId === projectId) return true;
    const id = String(document.id || hit._id || hit._key || "");
    return [...allowedAssetIds].some((assetId) => id === assetId || id.startsWith(`${assetId}:`));
  }).map((hit): MultimodalSearchHit => {
    const document = normalizeHit<UnknownRecord>(hit);
    const isImage = document.type === "asset" && document.assetKind === "image";
    const isPdf = document.type === "asset" && document.assetKind === "pdf";
    const text = typeof document.text === "string" ? document.text : "";
    return {
      id: String(document.id || hit._id || hit._key || "unknown"),
      score: typeof hit._score === "number" ? hit._score : 0,
      kind: isImage ? "image" : isPdf ? "pdf" : "pdf-page",
      title: typeof document.title === "string"
        ? document.title
        : typeof document.filename === "string" ? document.filename : isImage ? "Image evidence" : "PDF evidence",
      ...(typeof document.url === "string" ? { url: document.url } : {}),
      ...(typeof document.sourceUrl === "string" ? { sourceUrl: document.sourceUrl } : {}),
      ...(typeof document.altText === "string" ? { altText: document.altText } : {}),
      ...(text ? { excerpt: text.slice(0, 420) } : {}),
    };
  });
  const bestById = new Map<string, MultimodalSearchHit>();
  for (const hit of hits) {
    const current = bestById.get(hit.id);
    if (!current || hit.score > current.score) bestById.set(hit.id, hit);
  }
  return [...bestById.values()].sort((a, b) => b.score - a.score).slice(0, limit);
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
    multimodal: {
      assetMetadataSearchEnabled: settings.assetMetadataSearchEnabled && Boolean(settings.assetMetadataIndex),
      visualSearchEnabled: settings.visualSearchEnabled && Boolean(settings.visualIndex),
      pdfExtractionEnabled: settings.pdfExtractionEnabled && Boolean(settings.pdfTextIndex),
    },
    latencyMs: Date.now() - started,
  };
}
