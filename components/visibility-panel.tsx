import type { FormEventHandler } from "react";
import type { VisibilityEvidenceHit, VisibilityOverview } from "@/lib/visibility/types";
import { productConfig } from "@/lib/product/config";

type VisibilityPanelProps = {
  visibility: VisibilityOverview;
  query: string;
  hits: VisibilityEvidenceHit[];
  searching: boolean;
  onQueryChange: (value: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

function percentage(value: number | null) {
  return value === null ? "—" : `${value}%`;
}

export function VisibilityPanel({ visibility, query, hits, searching, onQueryChange, onSubmit }: VisibilityPanelProps) {
  return (
    <section className="visibility-section">
      <div className="section-heading visibility-heading">
        <div><p className="eyebrow">Antfly-native visibility campaigns</p><h2>Measure where the brand appears.</h2></div>
        <span className="antfly-native">Evidence stored in Antfly</span>
      </div>

      <div className="visibility-metrics" aria-label="Latest visibility campaign metrics">
        <article><span>Brand visibility</span><strong>{percentage(visibility.metrics.visibilityRate)}</strong><em>{visibility.metrics.mentionCount} mentioned conversations</em></article>
        <article><span>First-choice rate</span><strong>{percentage(visibility.metrics.firstChoiceRate)}</strong><em>when the brand is visible</em></article>
        <article><span>Persona coverage</span><strong>{visibility.latestCampaign ? `${visibility.metrics.coveredPersonas}/${visibility.metrics.totalPersonas}` : "—"}</strong><em>buyer groups reached</em></article>
        <article><span>Model coverage</span><strong>{visibility.latestRun ? `${visibility.metrics.coveredModels}/${visibility.metrics.totalModels}` : "—"}</strong><em>provider models naming the brand</em></article>
      </div>

      {visibility.latestCampaign && visibility.latestRun ? (
        <div className="visibility-evidence">
          <article>
            <span>Latest evidence baseline</span><h3>{visibility.latestCampaign.name}</h3><p>{visibility.latestCampaign.brandName} · {visibility.latestRun.label}</p>
            <dl>
              <div><dt>Conversations</dt><dd>{visibility.metrics.successfulObservations}/{visibility.metrics.expectedObservations}</dd></div>
              <div><dt>Citations</dt><dd>{visibility.metrics.citationCount}</dd></div>
              <div><dt>Owned citation share</dt><dd>{percentage(visibility.metrics.ownedCitationShare)}</dd></div>
            </dl>
          </article>
          <article>
            <span>Most cited domains</span>
            {visibility.topCitedDomains.length ? <ol>{visibility.topCitedDomains.slice(0, 5).map((item) => <li key={item.hostname}><strong>{item.hostname}</strong><b>{item.citations}</b></li>)}</ol> : <p>No citations were returned in this run.</p>}
          </article>
        </div>
      ) : (
        <div className="visibility-empty">
          <div><span>01</span><strong>Import observations</strong><p>Private deployments accept a bounded, normalized campaign payload.</p></div>
          <div><span>02</span><strong>Index the evidence</strong><p>Antfly stores prompts, responses, citations, personas and model metadata together.</p></div>
          <div><span>03</span><strong>Track the baseline</strong><p>{productConfig.name} calculates visibility, first-choice, coverage and source metrics from the stored evidence.</p></div>
        </div>
      )}

      <div className="visibility-search">
        <div><span>Antfly evidence retrieval</span><h3>Search model answers and citations.</h3><p>Uses full-text retrieval and automatically adds semantic fusion when the deployment has an Antfly embedding index.</p></div>
        <form onSubmit={onSubmit}>
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Why is the brand missing for privacy buyers?" minLength={2} required />
          <button disabled={searching}>{searching ? "Searching…" : "Search evidence"}</button>
        </form>
        {hits.length > 0 && (
          <div className="visibility-search-results">
            {hits.map((hit) => <article key={hit.id}><span>{hit.kind} · {hit.label}</span><h4>{hit.title}</h4><p>{hit.excerpt}</p>{hit.url && <a href={hit.url} target="_blank" rel="noreferrer">Open citation ↗</a>}</article>)}
          </div>
        )}
      </div>
    </section>
  );
}
