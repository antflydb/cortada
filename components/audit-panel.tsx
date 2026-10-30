import type { AnalysisDocument, Overview } from "@/lib/types";
import { productConfig } from "@/lib/product/config";

type AuditPanelProps = {
  loading: boolean;
  overview: Overview;
  selected?: AnalysisDocument;
  averageScore: number;
  isLatestRun: boolean;
};

function gradeLabel(analysis?: AnalysisDocument, hasRun = false) {
  if (!analysis) return hasRun ? "No completed pages" : "No audit yet";
  if (analysis.grade === "excellent") return "Excellent";
  if (analysis.grade === "good") return "Good foundation";
  return "Needs work";
}

export function AuditPanel({ loading, overview, selected, averageScore, isLatestRun }: AuditPanelProps) {
  const selectedRun = overview.siteSummary?.run;
  const emptyRunMessage = selectedRun
    ? `${selectedRun.failures.length || selectedRun.requestedPages} page(s) produced no saved page analysis in this ${selectedRun.status} run.`
    : "Analyze a public page to establish a baseline.";
  return (
    <>
      <section className="metrics" aria-label="Workspace metrics">
        <article><span>Indexed sources</span><strong>{loading ? "—" : overview.sources.length}</strong><em>in Antfly</em></article>
        <article><span>Audits completed</span><strong>{loading ? "—" : overview.analyses.length}</strong><em>deterministic</em></article>
        <article><span>Average score</span><strong>{loading ? "—" : averageScore}</strong><em>out of 100</em></article>
        <article><span>External model keys</span><strong>0</strong><em>inference stays in Antfly</em></article>
      </section>

      <section className="workspace">
        <div className="section-heading">
          <div><p className="eyebrow">{isLatestRun ? "Latest run evidence" : "Historical run evidence"}</p><h2>{selected ? selected.title : selectedRun ? "No page evidence for this run" : "Your first audit appears here"}</h2></div>
          {selected && <a href={selected.url} target="_blank" rel="noreferrer">Open source ↗</a>}
        </div>

        <div className="result-grid">
          <article className="score-card">
            <span>AEO readiness</span>
            <div className="score-ring" style={{ "--score": `${selected?.score ?? 0}%` } as React.CSSProperties} aria-label={selected ? `AEO readiness score ${selected.score} out of 100` : selectedRun ? "No completed page score for this run" : "No AEO readiness score yet"}>
              <div className="score-value"><strong>{selected?.score ?? "—"}</strong><small>out of 100</small></div>
            </div>
            <h3>{gradeLabel(selected, Boolean(selectedRun))}</h3>
            <p>{selected ? `${selected.suggestions.length} focused improvements found.` : emptyRunMessage}</p>
            {selected?.rubric && <small className="rubric-label">Rubric: {selected.rubric.name} v{selected.rubric.version}</small>}
          </article>

          <article className="suggestions-card">
            <div className="card-title"><span>Priority improvements</span><small>{selected?.analyzedAt ? new Date(selected.analyzedAt).toLocaleString() : "Waiting for evidence"}</small></div>
            {selected?.suggestions.length ? (
              <ol>{selected.suggestions.slice(0, 5).map((item) => <li key={item.id}><span className={`severity ${item.severity}`}>{item.severity}</span><div><strong>{item.title}</strong><p>{item.detail}</p>{item.evidence && <details><summary>Evidence and recommended fix</summary><p><b>Observed:</b> {item.evidence}</p>{item.fix && <p><b>Do this:</b> {item.fix}</p>}{item.example && <code>{item.example}</code>}</details>}</div></li>)}</ol>
            ) : <div className="empty">{selectedRun ? "This run contains no completed page analysis to inspect." : `${productConfig.name} recommendations are rules-based, so every score is inspectable and repeatable.`}</div>}
          </article>
        </div>
      </section>
    </>
  );
}
