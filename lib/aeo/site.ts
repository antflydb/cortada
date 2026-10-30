import type {
  AnalysisDocument,
  CrawlRunDocument,
  ProjectDocument,
  SiteFinding,
  SiteSummary,
  SuggestionSeverity,
} from "@/lib/types";

const severityRank: Record<SuggestionSeverity, number> = { critical: 0, warning: 1, opportunity: 2 };

function findingsFor(analyses: AnalysisDocument[]): SiteFinding[] {
  const findings = new Map<string, SiteFinding>();
  for (const analysis of analyses) {
    for (const suggestion of analysis.suggestions) {
      const current = findings.get(suggestion.id);
      if (current) {
        current.affectedPages += 1;
        if (current.urls.length < 10) current.urls.push(analysis.url);
      } else {
        findings.set(suggestion.id, {
          id: suggestion.id,
          severity: suggestion.severity,
          title: suggestion.title,
          detail: suggestion.detail,
          affectedPages: 1,
          totalPages: analyses.length,
          urls: [analysis.url],
        });
      }
    }
  }
  return [...findings.values()].sort((a, b) =>
    severityRank[a.severity] - severityRank[b.severity]
      || b.affectedPages - a.affectedPages
      || a.title.localeCompare(b.title),
  );
}

export function buildSiteSummary(
  projects: ProjectDocument[],
  crawlRuns: CrawlRunDocument[],
  analyses: AnalysisDocument[],
  selectedRunId?: string,
  comparisonRunId?: string,
): SiteSummary | null {
  const sortedRuns = [...crawlRuns].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const run = selectedRunId ? sortedRuns.find((candidate) => candidate.id === selectedRunId) : sortedRuns[0];
  if (!run) return null;
  const project = projects.find((candidate) => candidate.id === run.projectId);
  if (!project) return null;
  const currentAnalyses = analyses.filter((analysis) => analysis.crawlRunId === run.id);
  const findings = findingsFor(currentAnalyses);
  const selectedIndex = sortedRuns.findIndex((candidate) => candidate.id === run.id);
  const comparisonRun = comparisonRunId
    ? sortedRuns.find((candidate) => candidate.id === comparisonRunId && candidate.id !== run.id)
    : sortedRuns.slice(selectedIndex + 1).find((candidate) => candidate.completedPages > 0);
  let comparison: SiteSummary["comparison"] = null;
  if (comparisonRun) {
    const comparisonAnalyses = analyses.filter((analysis) => analysis.crawlRunId === comparisonRun.id);
    const comparisonFindings = findingsFor(comparisonAnalyses);
    const currentIds = new Set(findings.map((finding) => finding.id));
    const comparisonIds = new Set(comparisonFindings.map((finding) => finding.id));
    comparison = {
      comparisonRunId: comparisonRun.id,
      scoreDelta: Math.round((run.averageScore ?? 0) - (comparisonRun.averageScore ?? 0)),
      pageDelta: run.completedPages - comparisonRun.completedPages,
      newFindings: [...currentIds].filter((id) => !comparisonIds.has(id)),
      resolvedFindings: [...comparisonIds].filter((id) => !currentIds.has(id)),
    };
  }
  const history = sortedRuns.map((historyRun) => {
    const runAnalyses = analyses.filter((analysis) => analysis.crawlRunId === historyRun.id);
    return {
      run: historyRun,
      pageCount: runAnalyses.length,
      averageScore: runAnalyses.length
        ? Math.round(runAnalyses.reduce((sum, analysis) => sum + analysis.score, 0) / runAnalyses.length)
        : historyRun.averageScore ?? 0,
      findingCount: findingsFor(runAnalyses).length,
    };
  });
  return {
    project,
    run,
    pageCount: currentAnalyses.length,
    averageScore: currentAnalyses.length
      ? Math.round(currentAnalyses.reduce((sum, analysis) => sum + analysis.score, 0) / currentAnalyses.length)
      : 0,
    findings,
    history,
    latestRunId: sortedRuns[0].id,
    comparison,
  };
}
