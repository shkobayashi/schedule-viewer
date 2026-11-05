import type { StatusItem } from "../model/statusCatalog";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { ChevronDown, Plus } from "lucide-react";
import type {
  Milestone,
  MilestoneGroup,
  ScheduleFieldDef,
  ScheduleFilters,
  ScheduleId,
} from "../model/types";
import { activeFilterCount } from "../model/filterChips";
import {
  addMilestoneShortcutHint,
  addTaskShortcutHint,
  deleteShortcutHint,
  filterPanelShortcutHint,
  goTodayShortcutHint,
  lineageToggleShortcutHint,
  linkShortcutHint,
  redoToolbarTitle,
  undoShortcutHint,
  usesCommandKey,
  viewTierShortcutHint,
} from "../model/shortcuts";
import { OPERATION_FORMAL, TOOLBAR_SHORT } from "../model/operationLabels";
import type { GridTier } from "../model/timeline";
import type { FieldFilterCondition } from "../model/fieldFilters";
import type { SearchField } from "../model/scheduleFilterPersistence";
import type { ScheduleTitleCommitResult } from "../model/scheduleTitleEdit";
import { AppMenu } from "./AppMenu";
import { FilterPanel } from "./FilterPanel";
import {
  ScheduleToolbarTitle,
  type ScheduleToolbarTitleHandle,
} from "./ScheduleToolbarTitle";
import { anchorBelowRect, menuViewportShift } from "./anchoredMenu";
import type { AssigneeFilterOption } from "./assigneeFilterOption";

export type { AssigneeFilterOption } from "./assigneeFilterOption";

export type { SearchField } from "../model/scheduleFilterPersistence";

type ToolbarProps = {
  title: string;
  titleDiffMarked?: boolean;
  filters: ScheduleFilters;
  searchField: SearchField;
  onSearchFieldChange: (field: SearchField) => void;
  milestones: Milestone[];
  milestoneGroups: MilestoneGroup[];
  hiddenMilestoneGroupIds: ScheduleId[];
  hiddenMilestoneIds: ScheduleId[];
  onMilestoneGroupVisible: (groupId: ScheduleId, visible: boolean) => void;
  onMilestoneMarkVisible: (milestoneId: ScheduleId, visible: boolean) => void;
  onShowAllMilestoneMarks: () => void;
  assigneeFilterOptions: AssigneeFilterOption[];
  scheduleTags: string[];
  scheduleFields?: readonly ScheduleFieldDef[];
  statuses: readonly StatusItem[];
  tier: GridTier;
  lineageName: string | null;
  canStartLineage: boolean;
  canStartLineageWithConnections: boolean;
  onToggleLineage: () => void;
  onShowLineageWithConnections: () => void;
  linkSourceName: string | null;
  canStartLink: boolean;
  onToggleLink: () => void;
  onFiltersChange: (patch: Partial<ScheduleFilters>) => void;
  onPatchFieldFilter: (
    def: ScheduleFieldDef,
    patch: Partial<FieldFilterCondition>,
  ) => void;
  onUpdateFieldFilters: (
    build: (prev: ScheduleFilters) => ScheduleFilters["fieldFilters"],
  ) => void;
  onGoToday: () => void;
  onSetTier: (tier: GridTier) => void;
  onFit: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onOpenGuide: () => void;
  onOpenShortcuts: () => void;
  onShowJson: () => void;
  onShowDiff: () => void;
  onCopyDiff: () => void;
  onExportHtml: () => void;
  onExportWorkspace?: () => void;
  onOpen: () => void;
  recentFilesStore?: import("../model/recentFiles").RecentFilesStore;
  onRefreshRecentFiles?: () => void;
  onOpenRecent?: (path: string, kind: "schedule" | "workspace") => void;
  onClearRecentHistory?: () => void;
  onOpenInNewWindow?: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onOpenSettings: () => void;
  onCheckForUpdates?: () => void;
  canDelete: boolean;
  onAdd: () => void;
  onAddMilestone: () => void;
  addTopLevelMenuLabel?: string | null;
  onAddTopLevel?: () => void;
  onDelete: () => void;
  fileBusy?: boolean;
  startupSettled?: boolean;
  taskSearchRef?: RefObject<HTMLInputElement | null>;
  onCommitTitle: (raw: string) => ScheduleTitleCommitResult;
  onTitleEditingChange: (editing: boolean) => void;
  onTitleBlankCommit: () => void;
  titleEditHandleRef?: RefObject<ScheduleToolbarTitleHandle | null>;
  titleEditRequestToken: number;
  hierarchyEditDisabled?: boolean;
  hierarchyButtonRef?: RefObject<HTMLButtonElement | null>;
  onOpenHierarchy?: () => void;
  recentFilesEmptyHint?: string | null;
  filterPanelOpen?: boolean;
  onFilterPanelOpenChange?: (open: boolean) => void;
};

export function Toolbar({
  title,
  titleDiffMarked = false,
  filters,
  searchField,
  onSearchFieldChange,
  milestones,
  milestoneGroups,
  hiddenMilestoneGroupIds,
  hiddenMilestoneIds,
  onMilestoneGroupVisible,
  onMilestoneMarkVisible,
  onShowAllMilestoneMarks,
  assigneeFilterOptions,
  scheduleTags,
  scheduleFields,
  statuses,
  tier,
  lineageName,
  canStartLineage,
  canStartLineageWithConnections,
  onToggleLineage,
  onShowLineageWithConnections,
  linkSourceName,
  canStartLink,
  onToggleLink,
  onFiltersChange,
  onPatchFieldFilter,
  onUpdateFieldFilters,
  onGoToday,
  onSetTier,
  onFit,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onOpenGuide,
  onOpenShortcuts,
  onShowJson,
  onShowDiff,
  onCopyDiff,
  onExportHtml,
  onExportWorkspace,
  onOpen,
  recentFilesStore,
  onRefreshRecentFiles,
  onOpenRecent,
  onClearRecentHistory,
  onOpenInNewWindow,
  onSave,
  onSaveAs,
  onOpenSettings,
  onCheckForUpdates,
  canDelete,
  onAdd,
  onAddMilestone,
  addTopLevelMenuLabel = null,
  onAddTopLevel,
  onDelete,
  fileBusy = false,
  startupSettled = true,
  taskSearchRef,
  onCommitTitle,
  onTitleEditingChange,
  onTitleBlankCommit,
  titleEditHandleRef,
  titleEditRequestToken,
  hierarchyEditDisabled = false,
  hierarchyButtonRef,
  onOpenHierarchy,
  recentFilesEmptyHint = null,
  filterPanelOpen: filterPanelOpenProp,
  onFilterPanelOpenChange,
}: ToolbarProps) {
  const titleEditDisabled = fileBusy || !startupSettled;
  const commandKey = usesCommandKey(navigator.platform || navigator.userAgent);
  const linkKey = linkShortcutHint(commandKey);
  const [filterOpenInternal, setFilterOpenInternal] = useState(false);
  const filterOpenControlled = filterPanelOpenProp !== undefined;
  const filterOpen = filterPanelOpenProp ?? filterOpenInternal;
  const setFilterOpen = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      const value = typeof next === "function" ? next(filterOpen) : next;
      if (filterOpenControlled) onFilterPanelOpenChange?.(value);
      else setFilterOpenInternal(value);
    },
    [filterOpen, filterOpenControlled, onFilterPanelOpenChange],
  );
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const addButtonRef = useRef<HTMLDivElement>(null);
  const lineageButtonRef = useRef<HTMLDivElement>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addMenuPos, setAddMenuPos] = useState<{ left: number; top: number } | null>(
    null,
  );
  const filterCount = activeFilterCount(
    filters,
    false,
    hiddenMilestoneGroupIds.length,
    hiddenMilestoneIds.length,
    scheduleFields,
  );

  const showSelectionActions =
    canDelete || Boolean(lineageName) || Boolean(linkSourceName);

  const openAddMenu = () => {
    const anchor = addButtonRef.current;
    if (!anchor) return;
    setAddMenuPos(anchorBelowRect(anchor));
    setAddOpen(true);
  };

  const addMenuRef = useRef<HTMLDivElement>(null);
  const [lineageMenuOpen, setLineageMenuOpen] = useState(false);
  const [lineageMenuPos, setLineageMenuPos] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const lineageMenuRef = useRef<HTMLDivElement>(null);

  const closeAddMenu = () => {
    setAddOpen(false);
    setAddMenuPos(null);
  };

  const openLineageMenu = () => {
    const anchor = lineageButtonRef.current;
    if (!anchor) return;
    setLineageMenuPos(anchorBelowRect(anchor));
    setLineageMenuOpen(true);
  };

  const closeLineageMenu = () => {
    setLineageMenuOpen(false);
    setLineageMenuPos(null);
  };

  useEffect(() => {
    const onCloseMenus = () => {
      closeAddMenu();
      closeLineageMenu();
    };
    document.addEventListener("schedule-viewer:close-menus", onCloseMenus);
    return () => {
      document.removeEventListener("schedule-viewer:close-menus", onCloseMenus);
    };
  }, []);

  useEffect(() => {
    if (!addOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (addButtonRef.current?.contains(target) || addMenuRef.current?.contains(target)) {
        return;
      }
      closeAddMenu();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeAddMenu();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [addOpen]);

  useEffect(() => {
    if (!lineageMenuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        lineageButtonRef.current?.contains(target) ||
        lineageMenuRef.current?.contains(target)
      ) {
        return;
      }
      closeLineageMenu();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeLineageMenu();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [lineageMenuOpen]);

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
        startupSettled={startupSettled}
        onOpen={onOpen}
        recentFilesStore={recentFilesStore}
        onRefreshRecentFiles={onRefreshRecentFiles}
        onOpenRecent={onOpenRecent}
        onClearRecentHistory={onClearRecentHistory}
        onOpenInNewWindow={onOpenInNewWindow}
        onSave={onSave}
        onSaveAs={onSaveAs}
        onExportHtml={onExportHtml}
        onExportWorkspace={onExportWorkspace}
        onShowJson={onShowJson}
        onShowDiff={onShowDiff}
        onCopyDiff={onCopyDiff}
        onOpenSettings={onOpenSettings}
        onOpenGuide={onOpenGuide}
        onOpenShortcuts={onOpenShortcuts}
        onCheckForUpdates={onCheckForUpdates}
        recentFilesEmptyHint={recentFilesEmptyHint}
      />
      <ScheduleToolbarTitle
        title={title}
        titleDiffMarked={titleDiffMarked}
        titleEditDisabled={titleEditDisabled}
        hierarchyEditDisabled={hierarchyEditDisabled}
        hierarchyButtonRef={hierarchyButtonRef}
        onOpenHierarchy={onOpenHierarchy}
        onCommitTitle={onCommitTitle}
        onEditingChange={onTitleEditingChange}
        onBlankCommit={onTitleBlankCommit}
        titleEditHandleRef={titleEditHandleRef}
        editRequestToken={titleEditRequestToken}
      />
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
          ref={taskSearchRef}
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
          title={`${OPERATION_FORMAL.filterPanel}（${filterPanelShortcutHint(commandKey)}）`}
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
          milestoneGroups={milestoneGroups}
          hiddenMilestoneGroupIds={hiddenMilestoneGroupIds}
          hiddenMilestoneIds={hiddenMilestoneIds}
          onMilestoneGroupVisible={onMilestoneGroupVisible}
          onMilestoneMarkVisible={onMilestoneMarkVisible}
          onShowAllMilestoneMarks={onShowAllMilestoneMarks}
          assigneeFilterOptions={assigneeFilterOptions}
          scheduleTags={scheduleTags}
          scheduleFields={scheduleFields}
          statuses={statuses}
          onFiltersChange={onFiltersChange}
          onPatchFieldFilter={onPatchFieldFilter}
          onUpdateFieldFilters={onUpdateFieldFilters}
        />
      </div>
      <div className="view-controls">
        <button
          type="button"
          className="toolbar-btn"
          title={`${OPERATION_FORMAL.goToday}（${goTodayShortcutHint()}）`}
          onClick={onGoToday}
        >
          今日
        </button>
        <div className="tier-toggle" role="group" aria-label="表示の切り替え">
          {(["day", "week", "month"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={tier === value ? "active" : ""}
              aria-pressed={tier === value}
              title={viewTierShortcutHint(value, commandKey)}
              onClick={() => onSetTier(value)}
            >
              {value === "day"
                ? TOOLBAR_SHORT.tierDay
                : value === "week"
                  ? TOOLBAR_SHORT.tierWeek
                  : TOOLBAR_SHORT.tierMonth}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="toolbar-btn"
          title={viewTierShortcutHint("fit", commandKey)}
          onClick={onFit}
        >
          全体
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={onOpenGuide}
          title={OPERATION_FORMAL.guide}
        >
          {TOOLBAR_SHORT.guide}
        </button>
        <button
          type="button"
          className="icon-btn shortcuts-btn"
          title="ショートカット一覧（?、F1）"
          onClick={onOpenShortcuts}
        >
          ?
        </button>
      </div>
      </div>
      <div className="toolbar-row toolbar-row-actions">
      {showSelectionActions ? (
        <>
      <div className="add-split lineage-split" ref={lineageButtonRef}>
        <button
          type="button"
          className={`lineage-btn${lineageName ? " active" : ""}`}
          disabled={!lineageName && !canStartLineage}
          title={
            lineageName
              ? `${lineageName} の前後の系統を表示中。クリックで解除`
              : `${OPERATION_FORMAL.lineageShow}（${lineageToggleShortcutHint(commandKey)}）`
          }
          onClick={onToggleLineage}
        >
          {lineageName ? `系統: ${lineageName}` : "系統"}
        </button>
        <button
          type="button"
          className={`lineage-btn add-split-toggle${lineageName ? " active" : ""}`}
          aria-expanded={lineageMenuOpen}
          aria-label="系統の辿り方"
          title="系統の辿り方（繋がりも辿る）"
          disabled={!canStartLineageWithConnections}
          onClick={() =>
            lineageMenuOpen ? closeLineageMenu() : openLineageMenu()
          }
        >
          <ChevronDown size={16} aria-hidden="true" />
        </button>
        {lineageMenuOpen && lineageMenuPos ? (
          <div
            ref={lineageMenuRef}
            className="app-menu-panel app-menu-panel--fixed add-split-menu"
            style={{
              left: lineageMenuPos.left,
              top: lineageMenuPos.top,
              transform: `translate(${menuViewportShift(
                lineageButtonRef.current!.getBoundingClientRect(),
              ).x}px, ${menuViewportShift(lineageButtonRef.current!.getBoundingClientRect()).y}px)`,
            }}
            role="menu"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                closeLineageMenu();
                onShowLineageWithConnections();
              }}
            >
              繋がりも辿る
            </button>
          </div>
        ) : null}
      </div>
      <button
        type="button"
        className={`lineage-btn${linkSourceName ? " active" : ""}`}
        disabled={!linkSourceName && !canStartLink}
        title={
          linkSourceName
            ? `${linkSourceName} から後続へ線を引いています。もう一度押すか、${linkKey} で中止`
            : `${OPERATION_FORMAL.link}（${linkKey}）`
        }
        onClick={onToggleLink}
      >
        {linkSourceName ? `線を引く: ${linkSourceName}` : OPERATION_FORMAL.link}
      </button>
      <button
        type="button"
        className="toolbar-btn toolbar-btn-danger"
        disabled={!canDelete}
        title={canDelete ? `${OPERATION_FORMAL.deleteTask}（${deleteShortcutHint()}）` : "タスクを選択してから削除"}
        onClick={onDelete}
      >
        <span>削除</span>
      </button>
        </>
      ) : null}
      <div className="add-split" ref={addButtonRef}>
        <button
          type="button"
          className="toolbar-btn toolbar-btn-primary"
          title={`${OPERATION_FORMAL.addTask}（${addTaskShortcutHint(commandKey)}）`}
          onClick={onAdd}
        >
          <Plus size={16} strokeWidth={2.25} aria-hidden="true" />
          <span>{TOOLBAR_SHORT.addTask}</span>
        </button>
        <button
          type="button"
          className="toolbar-btn toolbar-btn-primary add-split-toggle"
          aria-expanded={addOpen}
          aria-label="追加の種類"
          onClick={() => (addOpen ? closeAddMenu() : openAddMenu())}
        >
          <ChevronDown size={16} aria-hidden="true" />
        </button>
        {addOpen && addMenuPos ? (
          <div
            ref={addMenuRef}
            className="app-menu-panel app-menu-panel--fixed add-split-menu"
            style={{
              left: addMenuPos.left,
              top: addMenuPos.top,
              transform: `translate(${menuViewportShift(
                addButtonRef.current!.getBoundingClientRect(),
              ).x}px, ${menuViewportShift(addButtonRef.current!.getBoundingClientRect()).y}px)`,
            }}
            role="menu"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                closeAddMenu();
                onAdd();
              }}
            >
              {OPERATION_FORMAL.addTask}
            </button>
            {addTopLevelMenuLabel && onAddTopLevel ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  closeAddMenu();
                  onAddTopLevel();
                }}
              >
                {addTopLevelMenuLabel}
              </button>
            ) : null}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                closeAddMenu();
                onAddMilestone();
              }}
            >
              <span>{OPERATION_FORMAL.addMilestone}</span>
              <span className="menu-shortcut">
                {addMilestoneShortcutHint(commandKey)}
              </span>
            </button>
          </div>
        ) : null}
      </div>
      <button
        type="button"
        className="toolbar-btn"
        disabled={!canUndo}
        title={`取り消し（${undoShortcutHint(commandKey)}）`}
        onClick={onUndo}
      >
        <span>取り消し</span>
      </button>
      <button
        type="button"
        className="toolbar-btn"
        disabled={!canRedo}
        title={redoToolbarTitle(commandKey)}
        onClick={onRedo}
      >
        <span>やり直し</span>
      </button>
      </div>
    </div>
  );
}
