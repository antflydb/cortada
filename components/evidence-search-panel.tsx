import type { FormEventHandler } from "react";
import type { AnswerabilityResult } from "@/lib/types";
import { productConfig } from "@/lib/product/config";

type EvidenceSearchPanelProps = {
  query: string;
  result?: AnswerabilityResult;
  searching: boolean;
  enabled: boolean;
  onQueryChange: (value: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

export function EvidenceSearchPanel({ query, result, searching, enabled, onQueryChange, onSubmit }: EvidenceSearchPanelProps) {
  return (
    <section className="search-section">
      <div className="section-heading"><div><p className="eyebrow">Antfly answerability test</p><h2>Can your evidence answer a customer’s question?</h2></div>{result && <span className={`answerability-status ${result.status}`}>{result.status.replace("-", " ")}</span>}</div>
      <form className="search-form" onSubmit={onSubmit}>
        <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="How does this company solve…?" minLength={5} disabled={!enabled} required />
        <button disabled={!enabled || searching}>{searching ? "Testing…" : "Test question"}</button>
      </form>
      <p className="answerability-copy">{productConfig.name} asks Antfly to retrieve the strongest site evidence. This measures retrievability—it does not use a model to invent or grade an answer.</p>
      <div className="search-results">
        {result?.evidence.map((hit) => <article key={hit.id}><span>{hit.source.hostname}</span><h3>{hit.source.title}</h3><p>{hit.source.description || hit.source.text.slice(0, 220)}</p><a href={hit.source.url} target="_blank" rel="noreferrer">View supporting evidence ↗</a></article>)}
        {!result?.evidence.length && <p className="search-empty">Ask an important customer question to inspect the evidence Antfly can retrieve.</p>}
      </div>
    </section>
  );
}
