import type { AnalysisDocument, SiteSummary } from "@/lib/types";

type SiteOverviewPanelProps = {
  summary: SiteSummary | null;
  analyses: AnalysisDocument[];
  projectId?: string;
  loading: boolean;
  onRunChange: (runId: string) => void;
  onComparisonChange: (runId: string) => void;
  onSelect: (analysis: AnalysisDocument) => void;
};

function runLabel(completedAt: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(completedAt));
}

export function SiteOverviewPanel({
  summary,
  analyses,
  projectId,
  loading,
  onRunChange,
  onComparisonChange,
  onSelect,
}: SiteOverviewPanelProps) {
  if (!summary) return null;
  const runAnalyses = analyses
    .filter((analysis) => analysis.crawlRunId === summary.run.id)
    .sort((a, b) => a.score - b.score);
  const delta = summary.comparison?.scoreDelta;
  const comparisonRun = summary.history.find((entry) => entry.run.id === summary.comparison?.comparisonRunId);
  const comparisonAnalyses = analyses.filter((analysis) => analysis.crawlRunId === summary.comparison?.comparisonRunId);
  const comparisonFindingTitles = new Map(comparisonAnalyses.flatMap((analysis) =>
    analysis.suggestions.map((suggestion) => [suggestion.id, suggestion.title] as const),
  ));
  const currentFindingTitles = new Map(summary.findings.map((finding) => [finding.id, finding.title]));
  const reportHref = (format?: string) => {
    const params = new URLSearchParams();
    if (format) params.set("format", format);
    if (projectId) params.set("projectId", projectId);
    params.set("runId", summary.run.id);
    if (summary.comparison) params.set("compareTo", summary.comparison.comparisonRunId);
    return `/api/report?${params}`;
  };
  const chronologicalHistory = [...summary.history].reverse();
  return (
    <section className="site-overview-section">
      <div className="section-heading">
        <div><p className="eyebrow">Site-wide intelligence</p><h2>{summary.project.hostname}</h2></div>
        <div className="report-actions">
          <a href={reportHref()} target="_blank" rel="noreferrer">Open report ↗</a>
          <a href={reportHref("markdown")}>Download Markdown</a>
          <a href={reportHref("json")}>Export JSON</a>
        </div>
      </div>
      <div className="run-history-card">
        <div className="run-controls">
          <label>
            <span>Viewing audit</span>
            <select value={summary.run.id} onChange={(event) => onRunChange(event.target.value)} disabled={loading}>
              {summary.history.map((entry) => <option key={entry.run.id} value={entry.run.id}>{runLabel(entry.run.completedAt)} · {entry.averageScore}/100</option>)}
            </select>
          </label>
          <label>
            <span>Compare with</span>
            <select value={summary.comparison?.comparisonRunId || ""} onChange={(event) => onComparisonChange(event.target.value)} disabled={loading || summary.history.length < 2}>
              {!summary.comparison && <option value="">Choose another run</option>}
              {summary.history.filter((entry) => entry.run.id !== summary.run.id).map((entry) => <option key={entry.run.id} value={entry.run.id}>{runLabel(entry.run.completedAt)} · {entry.averageScore}/100</option>)}
            </select>
          </label>
        </div>
        <div className="score-trend" aria-label="Audit score history">
          <div className="trend-heading"><span>Readiness trend</span><small>{summary.history.length} immutable run{summary.history.length === 1 ? "" : "s"}</small></div>
          <div className="trend-bars">{chronologicalHistory.map((entry) => (
            <button
              key={entry.run.id}
              type="button"
              className={entry.run.id === summary.run.id ? "selected" : ""}
              onClick={() => onRunChange(entry.run.id)}
              disabled={loading}
              aria-label={`${runLabel(entry.run.completedAt)}: ${entry.averageScore} out of 100`}
              title={`${runLabel(entry.run.completedAt)} · ${entry.averageScore}/100`}
            >
              <i style={{ height: `${Math.max(entry.averageScore, 4)}%` }} />
              <b>{entry.averageScore}</b>
            </button>
          ))}</div>
        </div>
      </div>
      <div className="site-run-metrics">
        <article><span>Pages audited</span><strong>{summary.pageCount}</strong><em>{summary.run.status} run</em></article>
        <article><span>Site readiness</span><strong>{summary.averageScore}</strong><em>average of deterministic page scores</em></article>
        <article><span>Change</span><strong>{delta === undefined ? "—" : `${delta >= 0 ? "+" : ""}${delta}`}</strong><em>{comparisonRun ? `vs ${runLabel(comparisonRun.run.completedAt)}` : "choose a comparison run"}</em></article>
        <article><span>Priority patterns</span><strong>{summary.findings.length}</strong><em>grouped across the site</em></article>
      </div>
      {summary.run.failures.length > 0 && <p className="crawl-warning">{summary.run.failures.length} page(s) could not be audited. The successful evidence was still saved in Antfly.</p>}
      <div className="site-overview-grid">
        <article className="site-findings">
          <div className="card-title"><span>Highest-impact fixes</span><small>affected pages</small></div>
          <ol>{summary.findings.slice(0, 8).map((finding) => (
            <li key={finding.id}>
              <span className={`severity ${finding.severity}`}>{finding.severity}</span>
              <div><strong>{finding.title}</strong><p>{finding.detail}</p><small>{finding.affectedPages} of {finding.totalPages} pages</small></div>
            </li>
          ))}</ol>
        </article>
        <article className="page-inventory">
          <div className="card-title"><span>Pages by readiness</span><small>select to inspect</small></div>
          <div className="page-list">{runAnalyses.map((analysis) => (
            <button key={analysis.id} type="button" onClick={() => onSelect(analysis)}>
              <span><strong>{analysis.title}</strong><small>{new URL(analysis.url).pathname || "/"}</small></span><b>{analysis.score}</b>
            </button>
          ))}</div>
        </article>
      </div>
      {summary.comparison && <div className="comparison-strip">
        <span><b>{summary.comparison.resolvedFindings.length}</b> resolved finding types</span>
        <span><b>{summary.comparison.newFindings.length}</b> new finding types</span>
        <span><b>{summary.comparison.pageDelta >= 0 ? "+" : ""}{summary.comparison.pageDelta}</b> pages vs comparison</span>
      </div>}
      {summary.comparison && <div className="comparison-details">
        <article>
          <span>Resolved versus comparison</span>
          {summary.comparison.resolvedFindings.length
            ? <ul>{summary.comparison.resolvedFindings.map((id) => <li key={id}>{comparisonFindingTitles.get(id) || id}</li>)}</ul>
            : <p>No finding types were resolved.</p>}
        </article>
        <article>
          <span>New in selected run</span>
          {summary.comparison.newFindings.length
            ? <ul>{summary.comparison.newFindings.map((id) => <li key={id}>{currentFindingTitles.get(id) || id}</li>)}</ul>
            : <p>No new finding types appeared.</p>}
        </article>
      </div>}
    </section>
  );
}
