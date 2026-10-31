/* eslint-disable @next/next/no-img-element */
import type {
  AssetDocument,
  MultimodalAnalysisDocument,
  MultimodalCapabilities,
  MultimodalSearchResult,
} from "@/lib/types";

type MultimodalPanelProps = {
  analysis?: MultimodalAnalysisDocument;
  assets: AssetDocument[];
  capabilities: MultimodalCapabilities;
  query: string;
  result?: MultimodalSearchResult;
  searching: boolean;
  enabled: boolean;
  isHistoricalRun: boolean;
  onQueryChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

function percentage(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : `${value}%`;
}

function score(value: number) {
  return value >= 10 ? value.toFixed(1) : value.toFixed(3);
}

export function MultimodalPanel({
  analysis,
  assets,
  capabilities,
  query,
  result,
  searching,
  enabled,
  isHistoricalRun,
  onQueryChange,
  onSubmit,
}: MultimodalPanelProps) {
  const relevantAssets = analysis
    ? assets.filter((asset) => asset.sourceId === analysis.sourceId)
    : assets.slice(0, 12);
  const retrievalEnabled = enabled && (capabilities.pageTextSearchEnabled
    || capabilities.assetMetadataSearchEnabled
    || capabilities.visualSearchEnabled
    || capabilities.pdfExtractionEnabled);
  const retrievalDescription = "Antfly runs one question across every configured page, asset, pixel, and PDF index. Each path stays separate so you can see which format makes—or hides—the evidence.";
  const scopedRetrievalDescription = isHistoricalRun
    ? `Historical readiness is shown above. Retrieval searches the project's currently retained Antfly evidence. ${retrievalDescription}`
    : retrievalDescription;

  return (
    <section className="multimodal-section">
      <div className="section-heading multimodal-heading">
        <div>
          <p className="eyebrow">Multimodal evidence audit</p>
          <h2>Can answer engines see the evidence in your images and PDFs?</h2>
        </div>
        <span className="antfly-native">Antfly native</span>
      </div>

      <div className="multimodal-metrics">
        <article><span>Images found</span><strong>{analysis?.imageCount ?? 0}</strong><em>{analysis?.indexableImageCount ?? 0} on trusted asset hosts</em></article>
        <article><span>PDFs found</span><strong>{analysis?.pdfCount ?? 0}</strong><em>{capabilities.pdfExtractionEnabled ? "durable extraction configured" : "extraction feature-gated"}</em></article>
        <article><span>Image alt coverage</span><strong>{percentage(analysis?.imageAltCoverage)}</strong><em>deterministic HTML signal</em></article>
        <article><span>Multimodal readiness</span><strong>{analysis?.score ?? "—"}</strong><em>{analysis?.grade === "no-assets" ? "no assets on the audited page" : "separate from the AEO score"}</em></article>
      </div>

      <div className="multimodal-grid">
        <article className="multimodal-findings">
          <div className="card-title"><span>Readiness findings</span><small>{analysis ? `${analysis.imageCount + analysis.pdfCount} assets inspected` : "Waiting for an audit"}</small></div>
          {analysis?.findings.length ? (
            <ol>{analysis.findings.map((finding) => <li key={finding.id}><span className={`severity ${finding.severity}`}>{finding.severity}</span><div><strong>{finding.title}</strong><p>{finding.detail}</p></div></li>)}</ol>
          ) : <div className="empty">Audit a page with images or PDF links to create an inspectable multimodal evidence baseline.</div>}
        </article>

        <article className="asset-inventory">
          <div className="card-title"><span>Discovered assets</span><small>{isHistoricalRun ? "latest retained records" : "stored in Antfly"}</small></div>
          {relevantAssets.length ? <div className="asset-list">{relevantAssets.slice(0, 8).map((asset) => (
            <a key={asset.id} href={asset.url} target="_blank" rel="noreferrer">
              {asset.assetKind === "image" ? <img src={asset.url} alt={asset.altText || "Discovered page image"} loading="lazy" referrerPolicy="no-referrer" /> : <span className="pdf-tile">PDF</span>}
              <span><strong>{asset.title || asset.altText || new URL(asset.url).pathname.split("/").pop() || "Untitled asset"}</strong><small>{asset.assetKind} · {asset.indexable ? "trusted host" : "metadata only"}</small></span>
            </a>
          ))}</div> : <div className="empty">No image or PDF assets have been discovered yet.</div>}
        </article>
      </div>

      <div className="multimodal-search-lab">
        <div className="multimodal-lab-copy">
          <span>Antfly multimodal evidence lab</span>
          <h3>Ask once. Compare every evidence format.</h3>
          <p>{scopedRetrievalDescription}</p>
        </div>
        <form onSubmit={onSubmit}>
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="e.g. How can Antfly run inside a private environment?" minLength={2} maxLength={300} disabled={!retrievalEnabled} required />
          <button type="submit" disabled={!retrievalEnabled || searching}>{searching ? "Comparing…" : "Compare formats"}</button>
        </form>
        <div className="multimodal-capabilities" aria-label="Antfly multimodal capabilities">
          <span className={capabilities.pageTextSearchEnabled ? "ready" : "off"}>Page vectors</span>
          <span className={capabilities.assetMetadataSearchEnabled ? "ready" : "off"}>Asset meaning</span>
          <span className={capabilities.visualSearchEnabled ? "ready" : "off"}>Pixel vectors</span>
          <span className={capabilities.pdfExtractionEnabled ? "ready" : "off"}>PDF extraction</span>
        </div>
        {result?.findings.length ? <div className="multimodal-retrieval-findings">{result.findings.map((finding) => (
          <article className={finding.severity} key={finding.id}><span>{finding.severity}</span><div><strong>{finding.title}</strong><p>{finding.detail}</p></div></article>
        ))}</div> : null}
        {result && <div className="multimodal-comparison">{result.runs.map((run) => (
          <article className={`multimodal-run ${run.status}`} key={run.mode}>
            <header><div><span>{run.label}</span><h4>{run.description}</h4></div><b>{run.status.replace("-", " ")}</b></header>
            <dl>
              <div><dt>Hits</dt><dd>{run.hits.length}</dd></div>
              <div><dt>Antfly</dt><dd>{run.engineTookMs === undefined ? "—" : `${run.engineTookMs}ms`}</dd></div>
              <div><dt>Round trip</dt><dd>{run.latencyMs ? `${run.latencyMs}ms` : "—"}</dd></div>
            </dl>
            <div className="multimodal-pipeline"><span>{run.method}</span>{run.index && <span>{run.index}</span>}</div>
            {run.error && <p className="multimodal-run-error">{run.error}</p>}
            {run.status === "not-configured" && <p className="multimodal-run-empty">This Antfly path is feature-gated on the current deployment.</p>}
            {run.status === "empty" && <p className="multimodal-run-empty">Antfly found no matching evidence in this index.</p>}
            {run.hits.length > 0 && <ol>{run.hits.map((hit) => (
              <li key={`${run.mode}:${hit.id}`}>
                {hit.kind === "image" && hit.url && <img src={hit.url} alt={hit.altText || hit.title} loading="lazy" referrerPolicy="no-referrer" />}
                <div className="multimodal-hit-heading"><span>#{hit.rank} · {hit.kind}</span><b>{score(hit.score)}</b></div>
                <h5>{hit.title}</h5>
                {hit.excerpt && <p>{hit.excerpt}</p>}
                {hit.indexScores && <small>{Object.entries(hit.indexScores).map(([index, value]) => `${index}: ${score(value)}`).join(" · ")}</small>}
                {hit.url && <a href={hit.url} target="_blank" rel="noreferrer">Open evidence ↗</a>}
              </li>
            ))}</ol>}
          </article>
        ))}</div>}
      </div>
    </section>
  );
}
