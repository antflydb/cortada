import type { ProjectDocument } from "@/lib/types";

type ProjectSwitcherProps = {
  projects: ProjectDocument[];
  selectedProjectId?: string;
  loading: boolean;
  onChange: (projectId: string) => void;
};

export function ProjectSwitcher({ projects, selectedProjectId, loading, onChange }: ProjectSwitcherProps) {
  if (!projects.length) return null;
  return (
    <section className="project-switcher" aria-label="Project workspace">
      <div>
        <span>Project workspace</span>
        <strong>{projects.find((project) => project.id === selectedProjectId)?.brandName || "Select a site"}</strong>
      </div>
      <label>
        <span>Active site</span>
        <select
          value={selectedProjectId || ""}
          onChange={(event) => onChange(event.target.value)}
          disabled={loading}
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>{project.brandName} · {project.hostname}</option>
          ))}
        </select>
      </label>
    </section>
  );
}
