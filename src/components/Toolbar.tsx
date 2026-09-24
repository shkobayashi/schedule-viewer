import type { ScheduleFilters } from "../model/types";

type ToolbarProps = {
  title: string;
  filters: ScheduleFilters;
  assignees: string[];
  zoomLabel: string;
  onFiltersChange: (patch: Partial<ScheduleFilters>) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onShowJson: () => void;
};

export function Toolbar({
  title,
  filters,
  assignees,
  zoomLabel,
  onFiltersChange,
  onZoomIn,
  onZoomOut,
  onFit,
  onShowJson,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <h1>
        {title}
        <span className="tag">サンプルデータ</span>
      </h1>
      <input
        type="text"
        placeholder="タスク名で検索"
        style={{ width: 130 }}
        value={filters.search}
        onChange={(e) => onFiltersChange({ search: e.target.value.trim() })}
      />
      <select
        value={filters.assignee}
        onChange={(e) => onFiltersChange({ assignee: e.target.value })}
      >
        <option value="all">担当者: すべて</option>
        {assignees.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
      <select
        value={filters.status}
        onChange={(e) => onFiltersChange({ status: e.target.value })}
      >
        <option value="all">ステータス: すべて</option>
        <option value="not-started">未着手</option>
        <option value="in-progress">進行中</option>
        <option value="done">完了</option>
      </select>
      <div className="zoom-controls">
        <button type="button" title="縮小" onClick={onZoomOut}>
          −
        </button>
        <span>{zoomLabel}</span>
        <button type="button" title="拡大" onClick={onZoomIn}>
          ＋
        </button>
        <button type="button" title="全体表示" onClick={onFit}>
          Fit
        </button>
      </div>
      <button
        type="button"
        className="icon-btn"
        title="現在のデータをJSONで見る"
        onClick={onShowJson}
      >
        {"{ }"}
      </button>
    </div>
  );
}
