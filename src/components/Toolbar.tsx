import type { RefObject } from "react";
import {
  NO_MILESTONE_FILTER,
  UNASSIGNED_FILTER,
  UNASSIGNED_LABEL,
  type Milestone,
  type OverdueFilter,
  type RelationFilter,
  type ScheduleFilters,
  type StatusFilter,
} from "../model/types";
import { linkShortcutHint, usesCommandKey } from "../model/shortcuts";
import { AppMenu } from "./AppMenu";

export type AssigneeFilterOption = {
  id: string;
  label: string;
};

type ToolbarProps = {
  title: string;
  fileStatusLabel: string;
  showDeferredReload?: boolean;
  onDeferredReload?: () => void;
  membersCatalogLabel: string | null;
  membersCatalogError?: string | null;
  calendarError?: string | null;
  filters: ScheduleFilters;
  milestones: Milestone[];
  assigneeFilterOptions: AssigneeFilterOption[];
  zoomLabel: string;
  lineageName: string | null;
  canStartLineage: boolean;
  onToggleLineage: () => void;
  linkSourceName: string | null;
  canStartLink: boolean;
  onToggleLink: () => void;
  onFiltersChange: (patch: Partial<ScheduleFilters>) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onShowJson: () => void;
  onShowDiff: () => void;
  onExportHtml: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onOpenSettings: () => void;
  canDelete: boolean;
  onAdd: () => void;
  onAddMilestone: () => void;
  onDelete: () => void;
  fileBusy?: boolean;
  taskSearchRef?: RefObject<HTMLInputElement | null>;
};

export function Toolbar({
  title,
  fileStatusLabel,
  showDeferredReload = false,
  onDeferredReload,
  membersCatalogLabel,
  membersCatalogError = null,
  calendarError = null,
  filters,
  milestones,
  assigneeFilterOptions,
  zoomLabel,
  lineageName,
  canStartLineage,
  onToggleLineage,
  linkSourceName,
  canStartLink,
  onToggleLink,
  onFiltersChange,
  onZoomIn,
  onZoomOut,
  onFit,
  onShowJson,
  onShowDiff,
  onExportHtml,
  onOpen,
  onSave,
  onSaveAs,
  onOpenSettings,
  canDelete,
  onAdd,
  onAddMilestone,
  onDelete,
  fileBusy = false,
  taskSearchRef,
}: ToolbarProps) {
  const linkKey = linkShortcutHint(
    usesCommandKey(navigator.platform || navigator.userAgent),
  );
  return (
    <div className="toolbar">
      <AppMenu
        fileBusy={fileBusy}
        onOpen={onOpen}
        onSave={onSave}
        onSaveAs={onSaveAs}
        onExportHtml={onExportHtml}
        onShowJson={onShowJson}
        onShowDiff={onShowDiff}
        onOpenSettings={onOpenSettings}
      />
      <h1>
        {title}
        <span className="tag">{fileStatusLabel}</span>
        {showDeferredReload ? (
          <button
            type="button"
            className="tag tag-btn"
            onClick={onDeferredReload}
          >
            ファイルに更新あり — 読み直す
          </button>
        ) : null}
        {membersCatalogError ? (
          <span className="tag members-tag members-tag-error" title={membersCatalogError}>
            メンバー設定エラー
          </span>
        ) : membersCatalogLabel ? (
          <span className="tag members-tag">{membersCatalogLabel}</span>
        ) : null}
        {calendarError ? (
          <span className="tag members-tag members-tag-error" title={calendarError}>
            カレンダー設定エラー
          </span>
        ) : null}
      </h1>
      <input
        type="text"
        ref={taskSearchRef}
        placeholder="タスク名で検索"
        className="search-input"
        value={filters.search}
        onChange={(e) => onFiltersChange({ search: e.target.value })}
      />
      <input
        type="text"
        placeholder="ノートで検索"
        className="search-input search-input-note"
        value={filters.noteSearch}
        onChange={(e) => onFiltersChange({ noteSearch: e.target.value })}
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
      <select
        value={filters.milestone}
        onChange={(e) => onFiltersChange({ milestone: e.target.value })}
      >
        <option value="all">マイルストン: すべて</option>
        <option value={NO_MILESTONE_FILTER}>なし</option>
        {milestones.map((milestone) => (
          <option key={milestone.id} value={milestone.id}>
            {milestone.name}（{milestone.date}）
          </option>
        ))}
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
      <button
        type="button"
        className={`lineage-btn${linkSourceName ? " active" : ""}`}
        disabled={!linkSourceName && !canStartLink}
        title={
          linkSourceName
            ? `${linkSourceName} から後続へ線を引いています。もう一度押すか、${linkKey} で中止`
            : `選択中のタスクから、次にクリックしたタスクを後続にする（${linkKey}）`
        }
        onClick={onToggleLink}
      >
        {linkSourceName ? `線を引く: ${linkSourceName}` : "線を引く"}
      </button>
      <button type="button" className="toolbar-btn" onClick={onAdd}>
        追加
      </button>
      <button type="button" className="toolbar-btn" onClick={onAddMilestone}>
        マイルストン追加
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
