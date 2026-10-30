import type { CrawlRunDocument, ProjectDocument } from "@/lib/types";
import type { VisibilityDocument } from "@/lib/visibility/types";

export class ProjectNotFoundError extends Error {
  constructor(projectId: string) {
    super(`Project "${projectId}" was not found in this workspace`);
    this.name = "ProjectNotFoundError";
  }
}

export class RunNotFoundError extends Error {
  constructor(runId: string) {
    super(`Audit run "${runId}" was not found in the selected project`);
    this.name = "RunNotFoundError";
  }
}

export function resolveProject(projects: ProjectDocument[], requestedProjectId?: string): ProjectDocument | undefined {
  if (!requestedProjectId) return projects[0];
  const project = projects.find((candidate) => candidate.id === requestedProjectId);
  if (!project) throw new ProjectNotFoundError(requestedProjectId);
  return project;
}

export function belongsToProject(document: { projectId?: string }, projectId?: string): boolean {
  return !projectId || document.projectId === projectId;
}

export function resolveRun(
  runs: CrawlRunDocument[],
  requestedRunId?: string,
): CrawlRunDocument | undefined {
  if (!requestedRunId) return runs[0];
  const run = runs.find((candidate) => candidate.id === requestedRunId);
  if (!run) throw new RunNotFoundError(requestedRunId);
  return run;
}

export function resolveComparisonRun(
  runs: CrawlRunDocument[],
  selectedRun?: CrawlRunDocument,
  requestedRunId?: string,
): CrawlRunDocument | undefined {
  if (!selectedRun) return undefined;
  if (requestedRunId) {
    if (requestedRunId === selectedRun.id) throw new RunNotFoundError(requestedRunId);
    const run = runs.find((candidate) => candidate.id === requestedRunId);
    if (!run) throw new RunNotFoundError(requestedRunId);
    return run;
  }
  const selectedIndex = runs.findIndex((candidate) => candidate.id === selectedRun.id);
  return runs.slice(selectedIndex + 1).find((candidate) => candidate.completedPages > 0);
}

function normalizedHostname(value: string): string {
  const candidate = value.trim().toLowerCase();
  if (!candidate) return "";
  try {
    return new URL(candidate.includes("://") ? candidate : `https://${candidate}`).hostname.replace(/^www\./, "");
  } catch {
    return candidate.replace(/^www\./, "").replace(/\/$/, "");
  }
}

export function scopeVisibilityDocuments(
  documents: VisibilityDocument[],
  project?: ProjectDocument,
): VisibilityDocument[] {
  if (!project) return documents;
  const hostname = normalizedHostname(project.hostname);
  const campaignIds = new Set(documents.flatMap((document) => {
    if (document.type !== "visibility_campaign") return [];
    const matches = document.brandDomains.some((domain) => normalizedHostname(domain) === hostname);
    return matches ? [document.id] : [];
  }));
  return documents.filter((document) =>
    document.type === "visibility_campaign"
      ? campaignIds.has(document.id)
      : campaignIds.has(document.campaignId),
  );
}
