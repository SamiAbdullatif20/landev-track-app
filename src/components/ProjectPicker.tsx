import { useEffect, useMemo, useRef, useState } from "react";

type Project = {
  id: string;
  name: string;
  displayLabel: string;
  searchLabel: string;
  projectNumber: string | null;
  clientName: string | null;
};

type Props = {
  projects: Project[];
  value: string;
  disabled?: boolean;
  loading?: boolean;
  onChange: (projectId: string) => void;
};

function normalizeProjectLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ");
}

/** Always keep "Admin - New Task" at the top of the picker. */
export function isAdminNewTaskProject(project: Pick<Project, "name" | "displayLabel">): boolean {
  const labels = [project.displayLabel, project.name]
    .filter(Boolean)
    .map((label) => normalizeProjectLabel(label));
  return labels.some(
    (label) => label === "admin - new task" || label.includes("admin - new task")
  );
}

function compareProjectsPinned(a: Project, b: Project): number {
  const aPin = isAdminNewTaskProject(a) ? 0 : 1;
  const bPin = isAdminNewTaskProject(b) ? 0 : 1;
  if (aPin !== bPin) return aPin - bPin;
  return (a.name || a.displayLabel).localeCompare(b.name || b.displayLabel, undefined, {
    sensitivity: "base"
  });
}

export function ProjectPicker({ projects, value, disabled, loading, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => projects.find((project) => project.id === value) ?? null,
    [projects, value]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const base = needle
      ? projects.filter((project) =>
          [project.searchLabel, project.displayLabel, project.name, project.clientName, project.projectNumber]
            .filter(Boolean)
            .some((part) => String(part).toLowerCase().includes(needle))
        )
      : projects;
    return [...base].sort(compareProjectsPinned);
  }, [projects, query]);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="project-picker" ref={rootRef}>
      <button
        type="button"
        className="project-picker-trigger"
        disabled={disabled || loading}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="project-picker-label">
          {selected ? selected.name || selected.displayLabel : loading ? "Loading projects…" : "Select a project"}
        </span>
        <span className="project-picker-caret">▾</span>
      </button>
      {open && (
        <div className="project-picker-menu">
          <input
            className="project-picker-search"
            value={query}
            autoFocus
            placeholder="Search projects…"
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="project-picker-list">
            {filtered.length === 0 ? (
              <p className="project-picker-empty">No matching projects</p>
            ) : (
              filtered.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  className={`project-picker-item ${project.id === value ? "is-selected" : ""} ${
                    isAdminNewTaskProject(project) ? "is-pinned" : ""
                  }`}
                  onClick={() => {
                    onChange(project.id);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <strong>{project.name || project.displayLabel}</strong>
                  {project.clientName && <span>{project.clientName}</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
