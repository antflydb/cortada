import type { FormEventHandler } from "react";
import type { SearchHit } from "@/lib/types";

type EvidenceSearchPanelProps = {
  query: string;
  hits: SearchHit[];
  searching: boolean;
  onQueryChange: (value: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

export function EvidenceSearchPanel({ query, hits, searching, onQueryChange, onSubmit }: EvidenceSearchPanelProps) {
  return (
    <section className="search-section">
      <div className="section-heading"><div><p className="eyebrow">Antfly retrieval</p><h2>Search the evidence you indexed.</h2></div></div>
      <form className="search-form" onSubmit={onSubmit}>
        <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="What does the company say about…" minLength={2} required />
        <button disabled={searching}>{searching ? "Searching…" : "Search Antfly"}</button>
      </form>
      <div className="search-results">
        {hits.map((hit) => <article key={hit.id}><span>{hit.source.hostname}</span><h3>{hit.source.title}</h3><p>{hit.source.description || hit.source.text.slice(0, 220)}</p><a href={hit.source.url} target="_blank" rel="noreferrer">View source ↗</a></article>)}
        {!hits.length && <p className="search-empty">Indexed page content will appear here when it matches your query.</p>}
      </div>
    </section>
  );
}
