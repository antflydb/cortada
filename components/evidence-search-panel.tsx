import type { FormEventHandler } from "react";
import type { AnswerabilityResult, AnswerabilityRun } from "@/lib/types";
import { productConfig } from "@/lib/product/config";

type EvidenceSearchPanelProps = {
  query: string;
  result?: AnswerabilityResult;
  searching: boolean;
  enabled: boolean;
  onQueryChange: (value: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

function score(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return value >= 10 ? value.toFixed(1) : value.toFixed(3);
}

function preferredRun(result?: AnswerabilityResult): AnswerabilityRun | undefined {
  return result?.runs.find((run) => run.mode === "hybrid-reranked")
    || result?.runs.find((run) => run.mode === "hybrid")
    || result?.runs.find((run) => run.mode === "semantic")
    || result?.runs[0];
}

export function EvidenceSearchPanel({ query, result, searching, enabled, onQueryChange, onSubmit }: EvidenceSearchPanelProps) {
  const preferred = preferredRun(result);
  return (
    <section className="search-section">
      <div className="section-heading answerability-heading">
        <div><p className="eyebrow">Antfly retrieval laboratory</p><h2>Can Antfly retrieve the evidence an answer needs?</h2></div>
        {preferred && <span className={`answerability-status ${preferred.status}`}>{preferred.status.replace("-", " ")}</span>}
      </div>
      <form className="search-form" onSubmit={onSubmit}>
        <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="How does this company solve…?" minLength={5} disabled={!enabled} required />
        <button disabled={!enabled || searching}>{searching ? "Comparing…" : "Compare retrieval"}</button>
      </form>
      <p className="answerability-copy">{productConfig.name} runs the same question through Antfly’s available keyword, semantic and fused retrieval paths. Results are evidence retrieval—not a model-generated answer or subjective grade.</p>

      {result && <>
        <div className="retrieval-capabilities" aria-label="Antfly retrieval capabilities">
          <span className="ready">BM25 ready</span>
          <span className={result.capabilities.semantic ? "ready" : "off"}>Semantic {result.capabilities.semantic ? "ready" : "not configured"}</span>
          <span className={result.capabilities.hybrid ? "ready" : "off"}>RRF fusion {result.capabilities.hybrid ? "ready" : "not configured"}</span>
          <span className={result.capabilities.reranking ? "ready" : "off"}>Reranking {result.capabilities.reranking ? "ready" : "opt-in"}</span>
          <small>{result.capabilities.fullTextIndex}{result.capabilities.embeddingIndex ? ` · ${result.capabilities.embeddingIndex}` : ""}</small>
        </div>
        <div className="retrieval-comparison">
          {result.runs.map((run) => (
            <article className={`retrieval-run ${run.mode === preferred?.mode ? "preferred" : ""}`} key={run.mode}>
              <header>
                <div><span>{run.label}</span><h3>{run.description}</h3></div>
                <b className={`run-status ${run.status}`}>{run.status.replace("-", " ")}</b>
              </header>
              <dl>
                <div><dt>Hits</dt><dd>{run.evidenceCount}</dd></div>
                <div><dt>Antfly</dt><dd>{run.engineTookMs === undefined ? "—" : `${run.engineTookMs}ms`}</dd></div>
                <div><dt>Round trip</dt><dd>{run.latencyMs ? `${run.latencyMs}ms` : "—"}</dd></div>
              </dl>
              <div className="pipeline-tags">
                {run.pipeline.fullTextIndex && <span>BM25 · {run.pipeline.fullTextIndex}</span>}
                {run.pipeline.embeddingIndexes.map((index) => <span key={index}>Vector · {index}</span>)}
                {run.pipeline.fusion && <span>Fusion · {run.pipeline.fusion.toUpperCase()}</span>}
                {run.pipeline.reranker && <span>Reranker · {run.pipeline.reranker}</span>}
                {run.pipeline.pruner && <span>Pruner · {run.pipeline.pruner}</span>}
              </div>
              {run.error && <p className="retrieval-error">{run.error}</p>}
              {run.evidence.length ? <ol className="retrieval-evidence">{run.evidence.map((hit) => (
                <li key={hit.id}>
                  <div className="evidence-rank"><b>#{hit.rank}</b><span>{score(hit.score)}</span></div>
                  <div>
                    <h4>{hit.source.title}</h4>
                    <p>{hit.source.description || hit.source.text.slice(0, 180)}</p>
                    {hit.indexScores && <small>{Object.entries(hit.indexScores).map(([index, value]) => `${index}: ${score(value)}`).join(" · ")}</small>}
                    <a href={hit.source.url} target="_blank" rel="noreferrer">View evidence ↗</a>
                  </div>
                </li>
              ))}</ol> : run.status !== "unavailable" && <p className="retrieval-empty">Antfly returned no project evidence for this question.</p>}
              {run.profile?.merge && <p className="profile-note">Fusion profile: {run.profile.merge.fullTextHits ?? "—"} keyword + {run.profile.merge.semanticHits ?? "—"} semantic candidates in {run.profile.merge.durationMs ?? "—"}ms.</p>}
              {run.profile?.reranker && <p className="profile-note">Reranked {run.profile.reranker.documentsReranked ?? "—"} documents in {run.profile.reranker.durationMs ?? "—"}ms.</p>}
            </article>
          ))}
        </div>
      </>}
      {!result && <p className="search-empty">Ask an important customer question to compare the retrieval paths Antfly can execute for this project.</p>}
    </section>
  );
}
