import type { ProjectDocument } from "@/lib/types";
import type { VisibilityDocument } from "@/lib/visibility/types";

export class ProjectNotFoundError extends Error {
  constructor(projectId: string) {
    super(`Project "${projectId}" was not found in this workspace`);
    this.name = "ProjectNotFoundError";
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
