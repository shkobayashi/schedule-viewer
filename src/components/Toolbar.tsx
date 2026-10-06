import { useRef, useState, type RefObject } from "react";
import type { Milestone, ScheduleFilters } from "../model/types";
import { activeFilterCount } from "../model/filterChips";
import {
  deleteShortcutHint,
  linkShortcutHint,
  redoShortcutHint,
  undoShortcutHint,
  usesCommandKey,
} from "../model/shortcuts";
import type { GridTier } from "../model/timeline";
import { AppMenu } from "./AppMenu";
import { FilterPanel } from "./FilterPanel";

export type AssigneeFilterOption = {
  id: string;
  label: string;
};

export type SearchField = "name" | "note";

type ToolbarProps = {
  title: string;
  fileStatusLabel: string;
  showDeferredReload?: boolean;
  onDeferredReload?: () => void;
  membersCatalogLabel: string | null;
  membersCatalogError?: string | null;
  calendarError?: string | null;
  filters: ScheduleFilters;
  searchField: SearchField;
  onSearchFieldChange: (field: SearchField) => void;
  milestones: Milestone[];
  assigneeFilterOptions: AssigneeFilterOption[];
  tier: GridTier;
  lineageName: string | null;
  canStartLineage: boolean;
  onToggleLineage: () => void;
  linkSourceName: string | null;
  canStartLink: boolean;
  onToggleLink: () => void;
  onFiltersChange: (patch: Partial<ScheduleFilters>) => void;
  onGoToday: () => void;
  onSetTier: (tier: GridTier) => void;
  onFit: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onOpenShortcuts: () => void;
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
  searchField,
  onSearchFieldChange,
  milestones,
  assigneeFilterOptions,
  tier,
  lineageName,
  canStartLineage,
  onToggleLineage,
  linkSourceName,
  canStartLink,
  onToggleLink,
  onFiltersChange,
  onGoToday,
  onSetTier,
  onFit,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onOpenShortcuts,
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
  const commandKey = usesCommandKey(navigator.platform || navigator.userAgent);
  const linkKey = linkShortcutHint(commandKey);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const filterCount = activeFilterCount(filters, false);

  const searchValue =
    searchField === "name" ? filters.search : filters.noteSearch;
  const searchPlaceholder =
    searchField === "name" ? "タスク名で検索" : "ノートで検索";
  const searchAria =
    searchField === "name" ? "タスク名で検索" : "ノートで検索";

  return (
    <div className="toolbar">
      <div className="toolbar-row toolbar-row-primary">
      <AppMenu
        fileBusy={fileBusy}
        onOpen={onOpen}
        onSave={onSave}
        onSaveAs={onSaveAs}
        onExportHtml={onExportHtml}
        onShowJson={onShowJson}
        onShowDiff={onShowDiff}
        onOpenSettings={onOpenSettings}
        onOpenShortcuts={onOpenShortcuts}
      />
      <h1 className="toolbar-title">
        <span className="toolbar-title-text">{title}</span>
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
      <div className="toolbar-search">
        <select
          className="search-field-toggle"
          aria-label="検索の対象"
          value={searchField}
          onChange={(e) => onSearchFieldChange(e.target.value as SearchField)}
        >
          <option value="name">名前</option>
          <option value="note">ノート</option>
        </select>
        <input
          type="text"
          ref={searchField === "name" ? taskSearchRef : undefined}
          placeholder={searchPlaceholder}
          aria-label={searchAria}
          className="search-input"
          value={searchValue}
          onChange={(e) =>
            onFiltersChange(
              searchField === "name"
                ? { search: e.target.value }
                : { noteSearch: e.target.value },
            )
          }
        />
      </div>
      <div className="filter-menu">
        <button
          ref={filterButtonRef}
          type="button"
          className={`toolbar-btn${filterCount > 0 ? " active" : ""}`}
          aria-expanded={filterOpen}
          onClick={() => setFilterOpen((prev) => !prev)}
        >
          絞り込み{filterCount > 0 ? ` ${filterCount}` : ""}
        </button>
        <FilterPanel
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          anchorRef={filterButtonRef}
          filters={filters}
          milestones={milestones}
          assigneeFilterOptions={assigneeFilterOptions}
          onFiltersChange={onFiltersChange}
        />
      </div>
      <div className="view-controls">
        <button type="button" className="toolbar-btn" onClick={onGoToday}>
          今日
        </button>
        <div className="tier-toggle" role="group" aria-label="表示の切り替え">
          {(["day", "week", "month"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={tier === value ? "active" : ""}
              aria-pressed={tier === value}
              onClick={() => onSetTier(value)}
            >
              {value === "day" ? "日" : value === "week" ? "週" : "月"}
            </button>
          ))}
        </div>
        <button type="button" className="toolbar-btn" onClick={onFit}>
          全体
        </button>
        <button
          type="button"
          className="icon-btn shortcuts-btn"
          title="ショートカット一覧（?）"
          onClick={onOpenShortcuts}
        >
          ?
        </button>
      </div>
      </div>
      <div className="toolbar-row toolbar-row-actions">
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
        className={`lineage-btn toolbar-btn-with-shortcut${linkSourceName ? " active" : ""}`}
        disabled={!linkSourceName && !canStartLink}
        title={
          linkSourceName
            ? `${linkSourceName} から後続へ線を引いています。もう一度押すか、${linkKey} で中止`
            : `選択中のタスクから、次にクリックしたタスクを後続にする（${linkKey}）`
        }
        onClick={onToggleLink}
      >
        <span className="toolbar-btn-label">
          {linkSourceName ? `線を引く: ${linkSourceName}` : "線を引く"}
        </span>
        <span className="menu-shortcut">{linkKey}</span>
      </button>
      <button type="button" className="toolbar-btn" onClick={onAdd}>
        追加
      </button>
      <button type="button" className="toolbar-btn" onClick={onAddMilestone}>
        マイルストン追加
      </button>
      <button
        type="button"
        className="toolbar-btn toolbar-btn-with-shortcut"
        disabled={!canDelete}
        title={canDelete ? "選択中のタスクを削除" : "タスクを選択してから削除"}
        onClick={onDelete}
      >
        <span>削除</span>
        <span className="menu-shortcut">{deleteShortcutHint()}</span>
      </button>
      <button
        type="button"
        className="toolbar-btn toolbar-btn-with-shortcut"
        disabled={!canUndo}
        title="取り消し"
        onClick={onUndo}
      >
        <span>取り消し</span>
        <span className="menu-shortcut">{undoShortcutHint(commandKey)}</span>
      </button>
      <button
        type="button"
        className="toolbar-btn toolbar-btn-with-shortcut"
        disabled={!canRedo}
        title="やり直し"
        onClick={onRedo}
      >
        <span>やり直し</span>
        <span className="menu-shortcut">{redoShortcutHint(commandKey)}</span>
      </button>
      </div>
    </div>
  );
}
