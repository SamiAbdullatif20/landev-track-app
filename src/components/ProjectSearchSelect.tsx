import { useEffect, useMemo, useRef, useState } from "react";
import type { Project } from "../store/trackingStore";
import { getProjectDisplayLabel } from "../utils/projectDisplay";
import { filterProjectsByQuery, sortProjectsForDisplay } from "../utils/sortProjects";

type ProjectSearchSelectProps = {
  projects: Project[];
  value: string;
  disabled?: boolean;
  loading?: boolean;
  onChange: (projectId: string) => void;
  /** Called when the menu opens — use to refresh from API (not cache-only). */
  onOpen?: () => void;
};

export function ProjectSearchSelect({
  projects,
  value,
  disabled,
  loading,
  onChange,
  onOpen
}: ProjectSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === value),
    [projects, value]
  );

  const sortedProjects = useMemo(() => sortProjectsForDisplay(projects), [projects]);
  const filteredProjects = useMemo(
    () => filterProjectsByQuery(sortedProjects, query),
    [sortedProjects, query]
  );

  const closeMenu = () => {
    setOpen(false);
    setQuery("");
  };

  const selectProject = (projectId: string) => {
    onChange(projectId);
    closeMenu();
  };

  const openMenu = () => {
    if (disabled) {
      return;
    }
    onOpen?.();
    setOpen(true);
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const frameId = window.requestAnimationFrame(() => {
      searchRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [open]);

  const selectedLabel = selectedProject ? getProjectDisplayLabel(selectedProject) : "Select project";

  return (
    <div
      ref={rootRef}
      className={`project-search-select${open ? " is-open" : ""}`}
    >
      <button
        type="button"
        className="project-select-trigger"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          if (disabled) return;
          if (open) {
            closeMenu();
            return;
          }
          openMenu();
        }}
      >
        <span className={`project-select-label${selectedProject ? "" : " is-placeholder"}`}>
          {loading && open ? "Loading projects…" : selectedLabel}
        </span>
        <span className="project-select-chevron" aria-hidden>
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open && (
        <div className="project-select-menu" role="listbox">
          <div className="project-select-menu-search">
            <input
              ref={searchRef}
              type="search"
              className="project-search-input"
              placeholder="Search by address or client…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  closeMenu();
                }
              }}
            />
          </div>
          <ul className="project-select-options">
            {loading && filteredProjects.length === 0 ? (
              <li className="project-select-empty">Loading projects…</li>
            ) : filteredProjects.length === 0 ? (
              <li className="project-select-empty">No projects match</li>
            ) : (
              filteredProjects.map((project) => (
                <li key={project.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={project.id === value}
                    className={`project-select-option${project.id === value ? " is-selected" : ""}`}
                    onClick={() => selectProject(project.id)}
                  >
                    {getProjectDisplayLabel(project)}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
