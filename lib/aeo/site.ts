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
): SiteSummary | null {
  const run = [...crawlRuns].sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
  if (!run) return null;
  const project = projects.find((candidate) => candidate.id === run.projectId);
  if (!project) return null;
  const currentAnalyses = analyses.filter((analysis) => analysis.crawlRunId === run.id);
  const findings = findingsFor(currentAnalyses);
  const previousRun = crawlRuns
    .filter((candidate) => candidate.projectId === run.projectId && candidate.id !== run.id)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
  let comparison: SiteSummary["comparison"] = null;
  if (previousRun) {
    const previousAnalyses = analyses.filter((analysis) => analysis.crawlRunId === previousRun.id);
    const previousFindings = findingsFor(previousAnalyses);
    const currentIds = new Set(findings.map((finding) => finding.id));
    const previousIds = new Set(previousFindings.map((finding) => finding.id));
    comparison = {
      previousRunId: previousRun.id,
      scoreDelta: Math.round((run.averageScore ?? 0) - (previousRun.averageScore ?? 0)),
      pageDelta: run.completedPages - previousRun.completedPages,
      newFindings: [...currentIds].filter((id) => !previousIds.has(id)),
      resolvedFindings: [...previousIds].filter((id) => !currentIds.has(id)),
    };
  }
  return {
    project,
    run,
    pageCount: currentAnalyses.length,
    averageScore: currentAnalyses.length
      ? Math.round(currentAnalyses.reduce((sum, analysis) => sum + analysis.score, 0) / currentAnalyses.length)
      : 0,
    findings,
    comparison,
  };
}
