/* eslint-disable @next/next/no-img-element */
import type {
  AssetDocument,
  MultimodalAnalysisDocument,
  MultimodalCapabilities,
  MultimodalSearchHit,
} from "@/lib/types";

type MultimodalPanelProps = {
  analysis?: MultimodalAnalysisDocument;
  assets: AssetDocument[];
  capabilities: MultimodalCapabilities;
  query: string;
  hits: MultimodalSearchHit[];
  searching: boolean;
  onQueryChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

function percentage(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : `${value}%`;
}

export function MultimodalPanel({
  analysis,
  assets,
  capabilities,
  query,
  hits,
  searching,
  onQueryChange,
  onSubmit,
}: MultimodalPanelProps) {
  const relevantAssets = analysis
    ? assets.filter((asset) => asset.sourceId === analysis.sourceId)
    : assets.slice(0, 12);
  const retrievalEnabled = capabilities.visualSearchEnabled || capabilities.pdfExtractionEnabled;

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
        <article><span>Images found</span><strong>{analysis?.imageCount ?? 0}</strong><em>{analysis?.indexableImageCount ?? 0} approved for visual indexing</em></article>
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
          <div className="card-title"><span>Discovered assets</span><small>stored in Antfly</small></div>
          {relevantAssets.length ? <div className="asset-list">{relevantAssets.slice(0, 8).map((asset) => (
            <a key={asset.id} href={asset.url} target="_blank" rel="noreferrer">
              {asset.assetKind === "image" ? <img src={asset.url} alt={asset.altText || "Discovered page image"} loading="lazy" referrerPolicy="no-referrer" /> : <span className="pdf-tile">PDF</span>}
              <span><strong>{asset.title || asset.altText || new URL(asset.url).pathname.split("/").pop() || "Untitled asset"}</strong><small>{asset.assetKind} · {asset.indexable ? "trusted host" : "metadata only"}</small></span>
            </a>
          ))}</div> : <div className="empty">No image or PDF assets have been discovered yet.</div>}
        </article>
      </div>

      <div className="multimodal-search">
        <div>
          <span>Cross-modal retrieval</span>
          <h3>Search visual and PDF evidence by meaning</h3>
          <p>{retrievalEnabled ? "Antfly searches approved images in a shared text-image vector space and extracted PDF text when enabled." : "Asset discovery is active. Retrieval stays disabled until the deployment has the required Antfly indexes and inference runtime."}</p>
        </div>
        <form onSubmit={onSubmit}>
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="e.g. diagram showing private deployment" minLength={2} maxLength={300} disabled={!retrievalEnabled} required />
          <button type="submit" disabled={!retrievalEnabled || searching}>{searching ? "Searching…" : "Search evidence"}</button>
        </form>
        {hits.length > 0 && <div className="multimodal-search-results">{hits.map((hit) => (
          <article key={`${hit.kind}:${hit.id}`}>
            {hit.kind === "image" && hit.url && <img src={hit.url} alt={hit.altText || hit.title} loading="lazy" referrerPolicy="no-referrer" />}
            <span>{hit.kind}</span><h4>{hit.title}</h4>
            {hit.excerpt && <p>{hit.excerpt}</p>}
            {hit.url && <a href={hit.url} target="_blank" rel="noreferrer">Open evidence ↗</a>}
          </article>
        ))}</div>}
      </div>
    </section>
  );
}
