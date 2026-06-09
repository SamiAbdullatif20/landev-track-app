import { formatClockDuration } from "../utils/formatElapsed";
import type { ProjectDayTotal } from "../types/work-summary";

type TodayWorkListProps = {
  items: ProjectDayTotal[];
  totalMs: number;
  disabled?: boolean;
  onResume: (item: ProjectDayTotal) => void;
};

export function TodayWorkList({ items, totalMs, disabled, onResume }: TodayWorkListProps) {
  return (
    <section className="today-work-panel">
      <header className="today-work-header">
        <span className="today-work-title">Today</span>
        <span className="today-work-total">{formatClockDuration(totalMs)}</span>
      </header>
      {items.length === 0 ? (
        <p className="meta compact-meta">No tracked time yet today.</p>
      ) : (
        <ul className="today-work-list">
          {items.map((item) => (
            <li key={item.projectId}>
              <button
                type="button"
                className="today-work-row"
                disabled={disabled}
                onClick={() => onResume(item)}
              >
                <span className="today-work-row-main">
                  <span className="today-work-project">{item.projectName}</span>
                  {item.lastDescription ? (
                    <span className="today-work-desc">{item.lastDescription}</span>
                  ) : null}
                </span>
                <span className="today-work-time">{formatClockDuration(item.totalMs)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
