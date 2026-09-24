import {
  UNASSIGNED_FILTER,
  UNASSIGNED_LABEL,
  type OverdueFilter,
  type RelationFilter,
  type ScheduleFilters,
  type StatusFilter,
} from "../model/types";

type ToolbarProps = {
  title: string;
  filters: ScheduleFilters;
  assignees: string[];
  zoomLabel: string;
  lineageName: string | null;
  canStartLineage: boolean;
  onToggleLineage: () => void;
  onFiltersChange: (patch: Partial<ScheduleFilters>) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onShowJson: () => void;
  onExportHtml: () => void;
  canDelete: boolean;
  onAdd: () => void;
  onDelete: () => void;
};

export function Toolbar({
  title,
  filters,
  assignees,
  zoomLabel,
  lineageName,
  canStartLineage,
  onToggleLineage,
  onFiltersChange,
  onZoomIn,
  onZoomOut,
  onFit,
  onShowJson,
  onExportHtml,
  canDelete,
  onAdd,
  onDelete,
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
        className="search-input"
        value={filters.search}
        onChange={(e) => onFiltersChange({ search: e.target.value.trim() })}
      />
      <select
        value={filters.assignee}
        onChange={(e) => onFiltersChange({ assignee: e.target.value })}
      >
        <option value="all">担当者: すべて</option>
        <option value={UNASSIGNED_FILTER}>{UNASSIGNED_LABEL}</option>
        {assignees.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
      <select
        value={filters.status}
        onChange={(e) =>
          onFiltersChange({ status: e.target.value as StatusFilter })
        }
      >
        <option value="all">ステータス: すべて</option>
        <option value="not-done">完了以外</option>
        <option value="not-started">未着手</option>
        <option value="in-progress">進行中</option>
        <option value="done">完了</option>
      </select>
      <select
        value={filters.overdue}
        onChange={(e) =>
          onFiltersChange({ overdue: e.target.value as OverdueFilter })
        }
      >
        <option value="all">期限: すべて</option>
        <option value="overdue">期限超過</option>
      </select>
      <select
        value={filters.relation}
        onChange={(e) =>
          onFiltersChange({ relation: e.target.value as RelationFilter })
        }
      >
        <option value="all">前後: すべて</option>
        <option value="broken">前後: 破綻のみ</option>
      </select>
      <button
        type="button"
        className={`lineage-btn${lineageName ? " active" : ""}`}
        disabled={!lineageName && !canStartLineage}
        title={
          lineageName
            ? `${lineageName} の前後の系統を表示中。クリックで解除`
            : "選択中のタスクについて、前後の最初から最後までを表示"
        }
        onClick={onToggleLineage}
      >
        {lineageName ? `系統: ${lineageName}` : "系統"}
      </button>
      <button type="button" className="toolbar-btn" onClick={onAdd}>
        追加
      </button>
      <button
        type="button"
        className="toolbar-btn"
        disabled={!canDelete}
        title={canDelete ? "選択中のタスクを削除" : "タスクを選択してから削除"}
        onClick={onDelete}
      >
        削除
      </button>
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
        className="toolbar-btn"
        title="見えている行を、今のズームのままHTMLで保存"
        onClick={onExportHtml}
      >
        書き出し
      </button>
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
