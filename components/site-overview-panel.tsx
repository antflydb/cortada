import type { AnalysisDocument, SiteSummary } from "@/lib/types";

type SiteOverviewPanelProps = {
  summary: SiteSummary | null;
  analyses: AnalysisDocument[];
  onSelect: (analysis: AnalysisDocument) => void;
};

export function SiteOverviewPanel({ summary, analyses, onSelect }: SiteOverviewPanelProps) {
  if (!summary) return null;
  const runAnalyses = analyses
    .filter((analysis) => analysis.crawlRunId === summary.run.id)
    .sort((a, b) => a.score - b.score);
  const delta = summary.comparison?.scoreDelta;
  return (
    <section className="site-overview-section">
      <div className="section-heading">
        <div><p className="eyebrow">Site-wide intelligence</p><h2>{summary.project.hostname}</h2></div>
        <div className="report-actions">
          <a href="/api/report" target="_blank" rel="noreferrer">Open report ↗</a>
          <a href="/api/report?format=markdown">Download Markdown</a>
          <a href="/api/report?format=json">Export JSON</a>
        </div>
      </div>
      <div className="site-run-metrics">
        <article><span>Pages audited</span><strong>{summary.pageCount}</strong><em>{summary.run.status} run</em></article>
        <article><span>Site readiness</span><strong>{summary.averageScore}</strong><em>average of deterministic page scores</em></article>
        <article><span>Change</span><strong>{delta === undefined ? "—" : `${delta >= 0 ? "+" : ""}${delta}`}</strong><em>{summary.comparison ? "since the previous run" : "baseline run"}</em></article>
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
        <span><b>{summary.comparison.pageDelta >= 0 ? "+" : ""}{summary.comparison.pageDelta}</b> pages since the prior run</span>
      </div>}
    </section>
  );
}
