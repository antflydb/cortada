"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { AnalysisDocument, MultimodalSearchHit, Overview, SearchHit } from "@/lib/types";
import type { VisibilityEvidenceHit, VisibilityOverview } from "@/lib/visibility/types";
import { AuditPanel } from "./audit-panel";
import { EvidenceSearchPanel } from "./evidence-search-panel";
import { MultimodalPanel } from "./multimodal-panel";
import { AuditHero, ProductArchitecture, ProductFooter, ProductHeader } from "./product-shell";
import { VisibilityPanel } from "./visibility-panel";

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

async function loadWorkspace() {
  const [overview, visibility] = await Promise.all([
    jsonRequest<{ ok: true } & Overview>("/api/overview", { cache: "no-store" }),
    jsonRequest<{ ok: true } & VisibilityOverview>("/api/visibility", { cache: "no-store" }),
  ]);
  return { overview, visibility };
}

export function Workbench() {
  const [brandName, setBrandName] = useState("");
  const [url, setUrl] = useState("");
  const [overview, setOverview] = useState<Overview>({
    sources: [],
    analyses: [],
    assets: [],
    multimodalAnalyses: [],
    multimodalCapabilities: { assetDiscovery: true, visualSearchEnabled: false, pdfExtractionEnabled: false },
  });
  const [visibility, setVisibility] = useState<VisibilityOverview>(emptyVisibility);
  const [selected, setSelected] = useState<AnalysisDocument>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [visibilityQuery, setVisibilityQuery] = useState("");
  const [visibilityHits, setVisibilityHits] = useState<VisibilityEvidenceHit[]>([]);
  const [visibilitySearching, setVisibilitySearching] = useState(false);
  const [multimodalQuery, setMultimodalQuery] = useState("");
  const [multimodalHits, setMultimodalHits] = useState<MultimodalSearchHit[]>([]);
  const [multimodalSearching, setMultimodalSearching] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await loadWorkspace();
      setOverview(result.overview);
      setVisibility(result.visibility);
      setSelected((current) => current || result.overview.analyses[0]);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load the workspace");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspace()
      .then((result) => {
        setOverview(result.overview);
        setVisibility(result.visibility);
        setSelected(result.overview.analyses[0]);
        setMessage("");
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Could not load the workspace"))
      .finally(() => setLoading(false));
  }, []);

  const averageScore = useMemo(() => {
    if (!overview.analyses.length) return 0;
    return Math.round(overview.analyses.reduce((sum, item) => sum + item.score, 0) / overview.analyses.length);
  }, [overview.analyses]);

  const selectedMultimodal = useMemo(() => {
    if (!selected) return overview.multimodalAnalyses[0];
    return overview.multimodalAnalyses.find((analysis) => analysis.sourceId === selected.sourceId)
      || overview.multimodalAnalyses[0];
  }, [overview.multimodalAnalyses, selected]);

  async function submitAudit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const result = await jsonRequest<{ ok: true; analysis: AnalysisDocument }>("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandName, url }),
      });
      setSelected(result.analysis);
      await refresh();
      setMessage("The page was indexed in Antfly and audited successfully.");
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
      const result = await jsonRequest<{ ok: true; hits: SearchHit[] }>("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });
      setSearchHits(result.hits);
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
        body: JSON.stringify({ query: visibilityQuery }),
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
        body: JSON.stringify({ query: multimodalQuery }),
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
      <AuditHero brandName={brandName} url={url} submitting={submitting} onBrandNameChange={setBrandName} onUrlChange={setUrl} onSubmit={submitAudit} />
      {message && <div className="notice" role="status">{message}</div>}
      <AuditPanel loading={loading} overview={overview} selected={selected} averageScore={averageScore} />
      <MultimodalPanel analysis={selectedMultimodal} assets={overview.assets} capabilities={overview.multimodalCapabilities} query={multimodalQuery} hits={multimodalHits} searching={multimodalSearching} onQueryChange={setMultimodalQuery} onSubmit={submitMultimodalSearch} />
      <VisibilityPanel visibility={visibility} query={visibilityQuery} hits={visibilityHits} searching={visibilitySearching} onQueryChange={setVisibilityQuery} onSubmit={submitVisibilitySearch} />
      <EvidenceSearchPanel query={searchQuery} hits={searchHits} searching={searching} onQueryChange={setSearchQuery} onSubmit={submitSearch} />
      <ProductArchitecture />
      <ProductFooter />
    </main>
  );
}
