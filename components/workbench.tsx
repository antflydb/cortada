"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { AnalysisDocument, AnswerabilityResult, CrawlRunDocument, MultimodalSearchHit, Overview, ProjectDocument } from "@/lib/types";
import type { VisibilityEvidenceHit, VisibilityOverview } from "@/lib/visibility/types";
import { productConfig } from "@/lib/product/config";
import { AuditPanel } from "./audit-panel";
import { EvidenceSearchPanel } from "./evidence-search-panel";
import { MultimodalPanel } from "./multimodal-panel";
import { AuditHero, ProductArchitecture, ProductFooter, ProductHeader } from "./product-shell";
import { VisibilityPanel } from "./visibility-panel";
import { SiteOverviewPanel } from "./site-overview-panel";
import { ProjectSwitcher } from "./project-switcher";

type ApiError = { ok?: false; error?: string };

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json()) as T & ApiError;
  if (!response.ok) throw new Error(payload.error || `Request failed with HTTP ${response.status}`);
  return payload;
}

const emptyVisibility: VisibilityOverview = {
  campaigns: [],
  metrics: {
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
  },
  topCitedDomains: [],
};

type WorkspacePayload = { ok: true; visibility: VisibilityOverview } & Overview;

async function loadWorkspace(projectId?: string, runId?: string, compareTo?: string) {
  const searchParams = new URLSearchParams();
  if (projectId) searchParams.set("projectId", projectId);
  if (runId) searchParams.set("runId", runId);
  if (compareTo) searchParams.set("compareTo", compareTo);
  const query = searchParams.size ? `?${searchParams}` : "";
  const overview = await jsonRequest<WorkspacePayload>(`/api/overview${query}`, { cache: "no-store" });
  return { overview, visibility: overview.visibility };
}

function updateWorkspaceUrl(projectId?: string, runId?: string, compareTo?: string) {
  const next = new URL(window.location.href);
  if (projectId) next.searchParams.set("project", projectId);
  else next.searchParams.delete("project");
  if (runId) next.searchParams.set("run", runId);
  else next.searchParams.delete("run");
  if (compareTo) next.searchParams.set("compare", compareTo);
  else next.searchParams.delete("compare");
  window.history.replaceState({}, "", `${next.pathname}${next.search}${next.hash}`);
}

export function Workbench() {
  const [brandName, setBrandName] = useState("");
  const [url, setUrl] = useState("");
  const [maxPages, setMaxPages] = useState(10);
  const [overview, setOverview] = useState<Overview>({
    projects: [],
    crawlRuns: [],
    sources: [],
    analyses: [],
    assets: [],
    multimodalAnalyses: [],
    multimodalCapabilities: {
      assetDiscovery: true,
      assetMetadataSearchEnabled: false,
      visualSearchEnabled: false,
      pdfExtractionEnabled: false,
    },
    siteSummary: null,
  });
  const [visibility, setVisibility] = useState<VisibilityOverview>(emptyVisibility);
  const [selectedProjectId, setSelectedProjectId] = useState<string>();
  const [selected, setSelected] = useState<AnalysisDocument>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [answerability, setAnswerability] = useState<AnswerabilityResult>();
  const [searching, setSearching] = useState(false);
  const [visibilityQuery, setVisibilityQuery] = useState("");
  const [visibilityHits, setVisibilityHits] = useState<VisibilityEvidenceHit[]>([]);
  const [visibilitySearching, setVisibilitySearching] = useState(false);
  const [multimodalQuery, setMultimodalQuery] = useState("");
  const [multimodalHits, setMultimodalHits] = useState<MultimodalSearchHit[]>([]);
  const [multimodalSearching, setMultimodalSearching] = useState(false);

  async function refresh(
    preserveMessage = false,
    projectId = selectedProjectId,
    runId: string | null | undefined = overview.selectedRunId,
    compareTo: string | null | undefined = overview.comparisonRunId,
  ) {
    setLoading(true);
    try {
      const result = await loadWorkspace(projectId, runId || undefined, compareTo || undefined);
      setOverview(result.overview);
      setVisibility(result.visibility);
      setSelectedProjectId(result.overview.selectedProjectId);
      updateWorkspaceUrl(result.overview.selectedProjectId, result.overview.selectedRunId, result.overview.comparisonRunId);
      setSelected(result.overview.analyses.find((analysis) => analysis.crawlRunId === result.overview.selectedRunId));
      if (!preserveMessage) setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load the workspace");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const requestedProjectId = new URL(window.location.href).searchParams.get("project") || undefined;
    const requestedRunId = new URL(window.location.href).searchParams.get("run") || undefined;
    const requestedComparisonRunId = new URL(window.location.href).searchParams.get("compare") || undefined;
    void loadWorkspace(requestedProjectId, requestedRunId, requestedComparisonRunId)
      .then((result) => {
        setOverview(result.overview);
        setVisibility(result.visibility);
        setSelectedProjectId(result.overview.selectedProjectId);
        updateWorkspaceUrl(result.overview.selectedProjectId, result.overview.selectedRunId, result.overview.comparisonRunId);
        setSelected(result.overview.analyses.find((analysis) => analysis.crawlRunId === result.overview.selectedRunId));
        setMessage("");
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Could not load the workspace"))
      .finally(() => setLoading(false));
  }, []);

  async function selectProject(projectId: string) {
    if (!projectId || projectId === selectedProjectId) return;
    setAnswerability(undefined);
    setVisibilityHits([]);
    setMultimodalHits([]);
    await refresh(false, projectId, null, null);
  }

  async function selectRun(runId: string) {
    if (!runId || runId === overview.selectedRunId) return;
    await refresh(false, selectedProjectId, runId, null);
  }

  async function selectComparison(runId: string) {
    if (!runId || runId === overview.selectedRunId || runId === overview.comparisonRunId) return;
    await refresh(false, selectedProjectId, overview.selectedRunId, runId);
  }

  const averageScore = useMemo(() => {
    if (overview.siteSummary) return overview.siteSummary.averageScore;
    if (!overview.analyses.length) return 0;
    return Math.round(overview.analyses.reduce((sum, item) => sum + item.score, 0) / overview.analyses.length);
  }, [overview.analyses, overview.siteSummary]);

  const selectedMultimodal = useMemo(() => {
    const runAnalyses = overview.multimodalAnalyses.filter((analysis) => analysis.crawlRunId === overview.selectedRunId);
    if (!selected) return runAnalyses[0];
    return runAnalyses.find((analysis) => analysis.sourceId === selected.sourceId) || runAnalyses[0];
  }, [overview.multimodalAnalyses, overview.selectedRunId, selected]);

  async function submitAudit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const result = await jsonRequest<{ ok: true; project: ProjectDocument; analyses: AnalysisDocument[]; run: CrawlRunDocument }>("/api/site-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandName, url, maxPages }),
      });
      setSelected(result.analyses[0]);
      setSelectedProjectId(result.project.id);
      updateWorkspaceUrl(result.project.id, result.run.id);
      setMessage(`${result.run.completedPages} page(s) were indexed and audited in Antfly${result.run.failures.length ? `; ${result.run.failures.length} page(s) failed safely` : ""}.`);
      // Antfly persists the run synchronously while its retrieval index can take
      // a moment to expose it. Delay the dashboard read so comparisons do not
      // briefly fall back to a baseline after a successful repeat run.
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      await refresh(true, result.project.id, result.run.id, null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The page could not be audited");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearching(true);
    setMessage("");
    try {
      const result = await jsonRequest<{ ok: true; result: AnswerabilityResult }>("/api/answerability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: searchQuery, projectId: selectedProjectId }),
      });
      setAnswerability(result.result);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  async function submitVisibilitySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVisibilitySearching(true);
    setMessage("");
    try {
      const result = await jsonRequest<{ ok: true; hits: VisibilityEvidenceHit[] }>("/api/visibility/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: visibilityQuery, campaignId: visibility.latestCampaign?.id }),
      });
      setVisibilityHits(result.hits);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Visibility evidence search failed");
    } finally {
      setVisibilitySearching(false);
    }
  }

  async function submitMultimodalSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMultimodalSearching(true);
    setMessage("");
    try {
      const result = await jsonRequest<{ ok: true; hits: MultimodalSearchHit[] }>("/api/multimodal/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: multimodalQuery, projectId: selectedProjectId }),
      });
      setMultimodalHits(result.hits);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Multimodal evidence search failed");
    } finally {
      setMultimodalSearching(false);
    }
  }

  return (
    <main>
      <ProductHeader />
      <AuditHero brandName={brandName} url={url} maxPages={maxPages} submitting={submitting} onBrandNameChange={setBrandName} onUrlChange={setUrl} onMaxPagesChange={setMaxPages} onSubmit={submitAudit} />
      {message && <div className="notice" role="status">{message}</div>}
      <ProjectSwitcher projects={overview.projects} selectedProjectId={selectedProjectId} loading={loading} onChange={(projectId) => void selectProject(projectId)} />
      <SiteOverviewPanel summary={overview.siteSummary} analyses={overview.analyses} projectId={selectedProjectId} loading={loading} onRunChange={(runId) => void selectRun(runId)} onComparisonChange={(runId) => void selectComparison(runId)} onSelect={setSelected} />
      <AuditPanel loading={loading} overview={overview} selected={selected} averageScore={averageScore} isLatestRun={overview.siteSummary?.run.id === overview.siteSummary?.latestRunId} />
      <MultimodalPanel analysis={selectedMultimodal} assets={overview.assets} capabilities={overview.multimodalCapabilities} query={multimodalQuery} hits={multimodalHits} searching={multimodalSearching} enabled={Boolean(selectedProjectId)} isHistoricalRun={overview.siteSummary?.run.id !== overview.siteSummary?.latestRunId} onQueryChange={setMultimodalQuery} onSubmit={submitMultimodalSearch} />
      <VisibilityPanel visibility={visibility} query={visibilityQuery} hits={visibilityHits} searching={visibilitySearching} onQueryChange={setVisibilityQuery} onSubmit={submitVisibilitySearch} />
      <EvidenceSearchPanel query={searchQuery} result={answerability} searching={searching} enabled={Boolean(selectedProjectId)} onQueryChange={setSearchQuery} onSubmit={submitSearch} />
      {productConfig.showArchitecture && <ProductArchitecture />}
      <ProductFooter />
    </main>
  );
}
