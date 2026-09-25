import {
  UNASSIGNED_FILTER,
  UNASSIGNED_LABEL,
  type OverdueFilter,
  type RelationFilter,
  type ScheduleFilters,
  type StatusFilter,
} from "../model/types";
import { AppMenu } from "./AppMenu";

export type AssigneeFilterOption = {
  id: string;
  label: string;
};

type ToolbarProps = {
  title: string;
  fileStatusLabel: string;
  membersCatalogLabel: string | null;
  filters: ScheduleFilters;
  assigneeFilterOptions: AssigneeFilterOption[];
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
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onOpenSettings: () => void;
  canDelete: boolean;
  onAdd: () => void;
  onDelete: () => void;
  fileBusy?: boolean;
};

export function Toolbar({
  title,
  fileStatusLabel,
  membersCatalogLabel,
  filters,
  assigneeFilterOptions,
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
  onOpen,
  onSave,
  onSaveAs,
  onOpenSettings,
  canDelete,
  onAdd,
  onDelete,
  fileBusy = false,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <AppMenu
        fileBusy={fileBusy}
        onOpen={onOpen}
        onSave={onSave}
        onSaveAs={onSaveAs}
        onExportHtml={onExportHtml}
        onShowJson={onShowJson}
        onOpenSettings={onOpenSettings}
      />
      <h1>
        {title}
        <span className="tag">{fileStatusLabel}</span>
        {membersCatalogLabel ? (
          <span className="tag members-tag">{membersCatalogLabel}</span>
        ) : null}
      </h1>
      <input
        type="text"
        placeholder="タスク名で検索"
        className="search-input"
        value={filters.search}
        onChange={(e) => onFiltersChange({ search: e.target.value })}
      />
      <select
        value={filters.assignee}
        onChange={(e) => onFiltersChange({ assignee: e.target.value })}
      >
        <option value="all">担当者: すべて</option>
        <option value={UNASSIGNED_FILTER}>{UNASSIGNED_LABEL}</option>
        {assigneeFilterOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
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
    </div>
  );
}
