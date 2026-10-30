import { describe, expect, it } from "vitest";
import {
  belongsToProject,
  ProjectNotFoundError,
  resolveComparisonRun,
  resolveProject,
  resolveRun,
  RunNotFoundError,
  scopeVisibilityDocuments,
} from "@/lib/projects/scope";
import type { CrawlRunDocument, ProjectDocument } from "@/lib/types";
import type { VisibilityDocument } from "@/lib/visibility/types";

const alpha: ProjectDocument = {
  id: "workspace:project:alpha",
  type: "project",
  workspaceId: "workspace",
  brandName: "Alpha",
  rootUrl: "https://www.alpha.example/",
  hostname: "www.alpha.example",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

const beta: ProjectDocument = {
  ...alpha,
  id: "workspace:project:beta",
  brandName: "Beta",
  rootUrl: "https://beta.example/",
  hostname: "beta.example",
};

const visibilityDocuments: VisibilityDocument[] = [
  {
    id: "campaign-alpha",
    type: "visibility_campaign",
    workspaceId: "workspace",
    name: "Alpha campaign",
    brandName: "Alpha",
    brandDomains: ["https://alpha.example/"],
    competitors: [],
    personas: [],
    topics: [],
    createdAt: alpha.createdAt,
    updatedAt: alpha.updatedAt,
  },
  {
    id: "campaign-beta",
    type: "visibility_campaign",
    workspaceId: "workspace",
    name: "Beta campaign",
    brandName: "Beta",
    brandDomains: ["beta.example"],
    competitors: [],
    personas: [],
    topics: [],
    createdAt: beta.createdAt,
    updatedAt: beta.updatedAt,
  },
  {
    id: "run-alpha",
    type: "visibility_run",
    workspaceId: "workspace",
    campaignId: "campaign-alpha",
    label: "Alpha run",
    status: "complete",
    expectedObservationCount: 1,
    successfulObservationCount: 1,
    startedAt: alpha.createdAt,
    completedAt: alpha.updatedAt,
  },
  {
    id: "run-beta",
    type: "visibility_run",
    workspaceId: "workspace",
    campaignId: "campaign-beta",
    label: "Beta run",
    status: "complete",
    expectedObservationCount: 1,
    successfulObservationCount: 1,
    startedAt: beta.createdAt,
    completedAt: beta.updatedAt,
  },
];

function run(id: string): CrawlRunDocument {
  return {
    id,
    type: "crawl_run",
    workspaceId: "workspace",
    projectId: alpha.id,
    brandName: alpha.brandName,
    rootUrl: alpha.rootUrl,
    status: "completed",
    requestedPages: 1,
    completedPages: 1,
    averageScore: 75,
    failures: [],
    startedAt: id,
    completedAt: id,
  };
}

describe("project workspace scoping", () => {
  it("uses the newest project by default and honors an explicit project", () => {
    expect(resolveProject([alpha, beta])?.id).toBe(alpha.id);
    expect(resolveProject([alpha, beta], beta.id)?.id).toBe(beta.id);
  });

  it("rejects a project outside the loaded workspace", () => {
    expect(() => resolveProject([alpha], "workspace:project:missing")).toThrow(ProjectNotFoundError);
  });

  it("resolves selected and comparison runs without crossing the project scope", () => {
    const latest = run("run:2");
    const previous = run("run:1");
    expect(resolveRun([latest, previous], previous.id)).toBe(previous);
    expect(resolveComparisonRun([latest, previous], latest)).toBe(previous);
    expect(() => resolveRun([latest], "run:missing")).toThrow(RunNotFoundError);
    expect(() => resolveComparisonRun([latest, previous], latest, latest.id)).toThrow(RunNotFoundError);
  });

  it("excludes documents without the selected project id", () => {
    expect(belongsToProject({ projectId: alpha.id }, alpha.id)).toBe(true);
    expect(belongsToProject({ projectId: beta.id }, alpha.id)).toBe(false);
    expect(belongsToProject({}, alpha.id)).toBe(false);
  });

  it("scopes visibility evidence by the project's normalized hostname", () => {
    const scoped = scopeVisibilityDocuments(visibilityDocuments, alpha);
    expect(scoped.map((document) => document.id)).toEqual(["campaign-alpha", "run-alpha"]);
  });
});
