import type { RecentWorkTask } from "../types/recent-task";

type RecentTasksPanelProps = {
  tasks: RecentWorkTask[];
  loading: boolean;
  disabled: boolean;
  onSelect: (task: RecentWorkTask) => void;
};

export function RecentTasksPanel({ tasks, loading, disabled, onSelect }: RecentTasksPanelProps) {
  return (
    <section className="recent-tasks-panel">
      <h2 className="panel-subtitle">Recent (last 3 days)</h2>
      {loading && tasks.length === 0 && <p className="meta compact-meta">Loading...</p>}
      {!loading && tasks.length === 0 && (
        <p className="meta compact-meta">Recent tasks appear after you track time.</p>
      )}
      {tasks.length > 0 && (
        <ul className="recent-tasks-list">
          {tasks.map((task) => (
            <li key={`${task.projectId}:${task.description}:${task.lastUsedAt}`}>
              <button
                type="button"
                className="recent-task-button"
                disabled={disabled}
                onClick={() => onSelect(task)}
              >
                <span className="recent-task-title">{task.projectName}</span>
                <span className="recent-task-description">{task.description}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
