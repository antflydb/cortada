"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { AnalysisDocument, Overview, SearchHit } from "@/lib/types";

type ApiError = { ok?: false; error?: string };

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json()) as T & ApiError;
  if (!response.ok) throw new Error(payload.error || `Request failed with HTTP ${response.status}`);
  return payload;
}

function gradeLabel(analysis?: AnalysisDocument) {
  if (!analysis) return "No audit yet";
  if (analysis.grade === "excellent") return "Excellent";
  if (analysis.grade === "good") return "Good foundation";
  return "Needs work";
}

export function Workbench() {
  const [brandName, setBrandName] = useState("");
  const [url, setUrl] = useState("");
  const [overview, setOverview] = useState<Overview>({ sources: [], analyses: [] });
  const [selected, setSelected] = useState<AnalysisDocument>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await jsonRequest<{ ok: true } & Overview>("/api/overview", { cache: "no-store" });
      setOverview({ sources: result.sources, analyses: result.analyses });
      setSelected((current) => current || result.analyses[0]);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load Cortada");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void jsonRequest<{ ok: true } & Overview>("/api/overview", { cache: "no-store" })
      .then((result) => {
        setOverview({ sources: result.sources, analyses: result.analyses });
        setSelected(result.analyses[0]);
        setMessage("");
      })
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Could not load Cortada");
      })
      .finally(() => setLoading(false));
  }, []);

  const averageScore = useMemo(() => {
    if (!overview.analyses.length) return 0;
    return Math.round(overview.analyses.reduce((sum, item) => sum + item.score, 0) / overview.analyses.length);
  }, [overview.analyses]);

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

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Cortada home">
          <span className="brand-mark">C</span>
          <span>Cortada</span>
        </a>
        <div className="powered"><span className="status-dot" /> Powered by Antfly</div>
      </header>

      <section className="hero" id="top">
        <div>
          <p className="eyebrow">Answer engine intelligence</p>
          <h1>Make your company<br />easy to answer.</h1>
          <p className="hero-copy">Cortada turns your website into structured evidence, then shows where answer engines may struggle to understand or cite it.</p>
        </div>
        <form className="audit-card" onSubmit={submitAudit}>
          <div className="card-kicker">Run an Antfly-backed audit</div>
          <label>Company name<input value={brandName} onChange={(event) => setBrandName(event.target.value)} placeholder="Acme" required minLength={2} /></label>
          <label>Website page<input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com" type="url" required /></label>
          <button type="submit" disabled={submitting}>{submitting ? "Indexing and auditing…" : "Analyze page"}<span>→</span></button>
          <small>Fetched once, evaluated deterministically, and stored in your Antfly database.</small>
        </form>
      </section>

      {message && <div className="notice" role="status">{message}</div>}

      <section className="metrics" aria-label="Workspace metrics">
        <article><span>Indexed sources</span><strong>{loading ? "—" : overview.sources.length}</strong><em>in Antfly</em></article>
        <article><span>Audits completed</span><strong>{loading ? "—" : overview.analyses.length}</strong><em>deterministic</em></article>
        <article><span>Average score</span><strong>{loading ? "—" : averageScore}</strong><em>out of 100</em></article>
        <article><span>Model API calls</span><strong>0</strong><em>V1 is provider-neutral</em></article>
      </section>

      <section className="workspace">
        <div className="section-heading">
          <div><p className="eyebrow">Latest evidence</p><h2>{selected ? selected.title : "Your first audit appears here"}</h2></div>
          {selected && <a href={selected.url} target="_blank" rel="noreferrer">Open source ↗</a>}
        </div>

        <div className="result-grid">
          <article className="score-card">
            <span>AEO readiness</span>
            <div className="score-ring" style={{ "--score": `${selected?.score || 0}%` } as React.CSSProperties}>
              <strong>{selected?.score ?? "—"}</strong><small>/100</small>
            </div>
            <h3>{gradeLabel(selected)}</h3>
            <p>{selected ? `${selected.suggestions.length} focused improvements found.` : "Analyze a public page to establish a baseline."}</p>
          </article>

          <article className="suggestions-card">
            <div className="card-title"><span>Priority improvements</span><small>{selected?.analyzedAt ? new Date(selected.analyzedAt).toLocaleString() : "Waiting for evidence"}</small></div>
            {selected?.suggestions.length ? (
              <ol>{selected.suggestions.slice(0, 5).map((item) => <li key={item.id}><span className={`severity ${item.severity}`}>{item.severity}</span><div><strong>{item.title}</strong><p>{item.detail}</p></div></li>)}</ol>
            ) : <div className="empty">Cortada’s recommendations are rules-based in V1, so every score is inspectable and repeatable.</div>}
          </article>
        </div>
      </section>

      <section className="search-section">
        <div className="section-heading"><div><p className="eyebrow">Antfly retrieval</p><h2>Search the evidence you indexed.</h2></div></div>
        <form className="search-form" onSubmit={submitSearch}>
          <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="What does the company say about…" minLength={2} required />
          <button disabled={searching}>{searching ? "Searching…" : "Search Antfly"}</button>
        </form>
        <div className="search-results">
          {searchHits.map((hit) => <article key={hit.id}><span>{hit.source.hostname}</span><h3>{hit.source.title}</h3><p>{hit.source.description || hit.source.text.slice(0, 220)}</p><a href={hit.source.url} target="_blank" rel="noreferrer">View source ↗</a></article>)}
          {!searchHits.length && <p className="search-empty">Indexed page content will appear here when it matches your query.</p>}
        </div>
      </section>

      <section className="architecture">
        <p className="eyebrow">Reference architecture</p>
        <h2>One codebase, two Antfly modes.</h2>
        <div className="architecture-flow"><span>Next.js on Vercel</span><b>→</b><span>Server-only Antfly adapter</span><b>→</b><span>Local Lite <i>or</i> Cloud Lite</span></div>
      </section>

      <footer><span>Cortada Community · Apache-2.0</span><span>Built as an Antfly Cloud Lite reference application</span></footer>
    </main>
  );
}
