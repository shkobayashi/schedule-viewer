import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { ActiveFilterBar } from "../components/ActiveFilterBar";
import { CommandPalette } from "../components/CommandPalette";
import { ContextMenu } from "../components/ContextMenu";
import { DeleteTaskDialog } from "../components/DeleteTaskDialog";
import { DiffStrip } from "../components/DiffStrip";
import { GuideDialog } from "../components/GuideDialog";
import { HierarchyLevelsDialog } from "../components/HierarchyLevelsDialog";
import { HierarchyNameDialog } from "../components/HierarchyNameDialog";
import { MilestoneAddDialog } from "../components/MilestoneAddDialog";
import { ScheduleErrorDialog } from "../components/ScheduleErrorDialog";
import { ShortcutsDialog } from "../components/ShortcutsDialog";
import { StatusBar } from "../components/StatusBar";
import { TaskAddDialog } from "../components/TaskAddDialog";
import { TaskEditDialog } from "../components/TaskEditDialog";
import { TaskNoteDialog } from "../components/TaskNoteDialog";
import { Toolbar } from "../components/Toolbar";
import { useAppKeyboard } from "../hooks/useAppKeyboard";
import {
  assigneeSidebarLabel,
  duplicateMemberNames,
  memberMapFromList,
  memberOptionLabel,
  resolveAssigneeRowDisplay,
} from "../model/assigneeDisplay";
import { parseCalendarText } from "../model/calendarAppData";
import { defaultFieldFilterCondition } from "../model/fieldFilters";
import type { ChartPointer } from "../model/chartHitTest";
import { addDays, isoDate, parseDate, todayIso } from "../model/dates";
import { lineageTaskIds, listTasks } from "../model/dependencies";
import {
  documentHasExplicitLevels,
  levelDefsForEditor,
} from "../model/hierarchyLevelEdit";
import type { Member } from "../model/memberTypes";
import type { MilestoneBandLayout } from "../model/milestones";
import { parseScheduleText } from "../model/scheduleFile";
import { BUILTIN_STATUS_ITEMS } from "../model/statusCatalog";
import { SIDEBAR_WIDTH_KEY_STEP } from "../model/sidebarWidth";
import { scrollYToShowSelectedTask } from "../model/stickyRows";
import { computeVisibleRows } from "../model/rows";
import { DEFAULT_FILTERS } from "../model/filterChips";
import type { ScheduleDiffEntry } from "../model/scheduleDiffEntry";
import { pruneSelectedTags, collectTagsFromTasks } from "../model/taskTags";
import {
  emptyTaskSelection,
  moveSelectionByArrow,
  selectTaskClick,
  type TaskSelectionState,
} from "../model/taskSelection";
import { reorderTaskInGroup } from "../model/tasks";
import type {
  Category,
  MilestoneGroup,
  ScheduleDocument,
  ScheduleFieldDef,
  ScheduleFilters,
  ScheduleId,
  Task,
} from "../model/types";
import {
  buildContextMenuItems,
  type ContextMenuItemHandlers,
} from "../operations/contextMenuItems";
import type { ContextMenuTarget } from "../operations/contextMenuTypes";

function noop(): void {}

const ROW_HEIGHT = 32;
const EMPTY_POINTER: ChartPointer = {
  overTask: false,
  overMilestone: false,
  link: null,
  hoverTaskId: null,
};

function bandLayout(
  groups: readonly MilestoneGroup[],
  milestones: ScheduleDocument["milestones"],
): MilestoneBandLayout {
  const blocks = groups.map((group, index) => ({
    group,
    offsetY: index * 24,
    height: 24,
    milestones: milestones.filter((milestone) => milestone.groupId === group.id),
    lanes: new Map<ScheduleId, number>(),
    displayLabels: new Map<ScheduleId, string>(),
    centerYById: new Map<ScheduleId, number>(),
  }));
  return {
    blocks,
    totalHeight: blocks.length * 24,
    centerYById: new Map(),
    displayLabels: new Map(),
  };
}

function mapTaskList(categories: Category[], update: (task: Task) => Task | null): Category[] {
  return categories.map((category) => ({
    ...category,
    groups: category.groups.map((group) => ({
      ...group,
      tasks: group.tasks.flatMap((task) => {
        const next = update(task);
        return next == null ? [] : [next];
      }),
    })),
  }));
}

function findTask(categories: Category[], id: ScheduleId): Task | null {
  for (const category of categories) {
    for (const group of category.groups) {
      const task = group.tasks.find((item) => item.id === id);
      if (task) return task;
    }
  }
  return null;
}

export type SearchErrorKeysHandle = {
  replaceDocument: (document: ScheduleDocument) => void;
  openContextMenu: (target: ContextMenuTarget) => void;
};

type SearchErrorKeysChromeProps = {
  scheduleDocument: ScheduleDocument;
  members?: Member[] | null;
  fields?: readonly ScheduleFieldDef[];
  viewportHeight?: number;
  fileBusy?: boolean;
  diffEntries?: ScheduleDiffEntry[];
  diffText?: string;
  brokenOpenText?: string;
  calendarText?: string;
  openLevels?: boolean;
};

export const SearchErrorKeysChrome = forwardRef<
  SearchErrorKeysHandle,
  SearchErrorKeysChromeProps
>(function SearchErrorKeysChrome(
  {
    scheduleDocument,
    members = null,
    fields = [],
    viewportHeight = 4000,
    fileBusy = false,
    diffEntries = [],
    diffText = "",
    brokenOpenText,
    calendarText,
    openLevels = false,
  },
  ref,
) {
  const taskSearchRef = useRef<HTMLInputElement>(null);
  const detailNameRef = useRef<HTMLInputElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const diffListRef = useRef<HTMLDivElement>(null);
  const chartPointerRef = useRef<ChartPointer>(EMPTY_POINTER);
  const displayScalePreferenceRef = useRef<"auto" | 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2>("auto");
  const uiScaleRef = useRef(1);
  const pastRef = useRef<ScheduleDocument[]>([]);
  const futureRef = useRef<ScheduleDocument[]>([]);
  const [doc, setDoc] = useState(scheduleDocument);
  const [filters, setFilters] = useState<ScheduleFilters>(DEFAULT_FILTERS);
  const [searchField, setSearchField] = useState<"name" | "note">("name");
  const [selection, setSelection] = useState<TaskSelectionState>(emptyTaskSelection());
  const [lineageTaskId, setLineageTaskId] = useState<ScheduleId | null>(null);
  const [lineageIncludesConnections, setLineageIncludesConnections] = useState(false);
  const [hiddenGroupIds, setHiddenGroupIds] = useState<ScheduleId[]>([]);
  const [hiddenMarkIds, setHiddenMarkIds] = useState<ScheduleId[]>([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [addMilestoneOpen, setAddMilestoneOpen] = useState(false);
  const [duplicateTaskId, setDuplicateTaskId] = useState<ScheduleId | null>(null);
  const [noteTaskId, setNoteTaskId] = useState<ScheduleId | null>(null);
  const [hierarchyEdit, setHierarchyEdit] = useState<{ title: string; name: string; id: ScheduleId } | null>(null);
  const [linkSourceId, setLinkSourceId] = useState<ScheduleId | null>(null);
  const [scrollX, setScrollX] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [menu, setMenu] = useState<ContextMenuTarget | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [diffExpanded, setDiffExpanded] = useState(false);
  const [diffIndex, setDiffIndex] = useState(0);
  const [diffNavigated, setDiffNavigated] = useState<number | null>(null);
  const [copiedDiff, setCopiedDiff] = useState<string | null>(null);
  const [levelsOpen, setLevelsOpen] = useState(openLevels);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const today = todayIso();
  const memberMap = useMemo(() => memberMapFromList(members), [members]);
  const lineageIds = useMemo(() => {
    if (lineageTaskId == null) return null;
    return lineageTaskIds(doc.categories, lineageTaskId);
  }, [doc.categories, lineageTaskId]);
  const visibleRows = useMemo(
    () =>
      computeVisibleRows(
        doc.categories,
        filters,
        new Set(),
        today,
        memberMap,
        ROW_HEIGHT,
        lineageIds,
        BUILTIN_STATUS_ITEMS,
        undefined,
        fields,
      ),
    [doc.categories, fields, filters, lineageIds, memberMap, today],
  );
  const scheduleTags = useMemo(() => {
    const tasks: Task[] = [];
    for (const category of doc.categories) {
      for (const group of category.groups) tasks.push(...group.tasks);
    }
    return collectTagsFromTasks(tasks);
  }, [doc.categories]);
  useEffect(() => {
    setFilters((prev) => {
      const pruned = pruneSelectedTags(prev.tags, scheduleTags);
      if (
        pruned.length === prev.tags.length &&
        pruned.every((tag, index) => tag === prev.tags[index])
      ) {
        return prev;
      }
      return { ...prev, tags: pruned };
    });
  }, [scheduleTags]);
  const assigneeFilterOptions = useMemo(() => {
    if (members == null || members.length === 0) return [];
    const dupes = duplicateMemberNames(members);
    return members.map((member) => ({
      id: member.id,
      label: memberOptionLabel(member, dupes),
    }));
  }, [members]);
  const visibleTaskIds = visibleRows.flatMap((row) =>
    row.type === "task" ? [row.task.id] : [],
  );
  const selectedId = selection.ids.length === 1 ? selection.activeId : null;
  const detailTask = selectedId == null ? null : findTask(doc.categories, selectedId);
  const lineageName =
    lineageTaskId == null ? null : findTask(doc.categories, lineageTaskId)?.name ?? null;
  const band = useMemo(
    () =>
      bandLayout(
        doc.milestoneGroups.filter((group) => !hiddenGroupIds.includes(group.id)),
        doc.milestones.filter((milestone) => !hiddenMarkIds.includes(milestone.id)),
      ),
    [doc.milestoneGroups, doc.milestones, hiddenGroupIds, hiddenMarkIds],
  );

  const commitDoc = useCallback((next: ScheduleDocument) => {
    setDoc((current) => {
      pastRef.current.push(structuredClone(current));
      futureRef.current = [];
      setCanUndo(true);
      setCanRedo(false);
      return next;
    });
  }, []);

  const updateFilters = useCallback((patch: Partial<ScheduleFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setSelection(emptyTaskSelection());
  }, []);

  const replaceDocument = useCallback((next: ScheduleDocument) => {
    pastRef.current = [];
    futureRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
    setDoc(next);
    setFilters(DEFAULT_FILTERS);
    setSearchField("name");
    setSelection(emptyTaskSelection());
    setLineageTaskId(null);
    setHiddenGroupIds([]);
    setHiddenMarkIds([]);
  }, []);

  const undo = useCallback(() => {
    setDoc((current) => {
      const previous = pastRef.current.pop();
      if (previous == null) return current;
      futureRef.current.push(structuredClone(current));
      setCanUndo(pastRef.current.length > 0);
      setCanRedo(true);
      return previous;
    });
  }, []);
  const redo = useCallback(() => {
    setDoc((current) => {
      const next = futureRef.current.pop();
      if (next == null) return current;
      pastRef.current.push(structuredClone(current));
      setCanUndo(true);
      setCanRedo(futureRef.current.length > 0);
      return next;
    });
  }, []);

  const closeFloatingMenus = useCallback(() => {
    setMenu(null);
    document.dispatchEvent(new Event("schedule-viewer:close-menus"));
  }, []);

  const revealTaskRow = useCallback(
    (taskId: ScheduleId) => {
      const row = visibleRows.find(
        (item) => item.type === "task" && item.task.id === taskId,
      );
      if (row == null || row.type !== "task") return;
      setScrollY((current) =>
        scrollYToShowSelectedTask(
          visibleRows,
          row.y,
          ROW_HEIGHT,
          viewportHeight,
          current,
        ),
      );
    },
    [viewportHeight, visibleRows],
  );

  const copyDiff = useCallback(() => {
    if (fileBusy || diffText === "") return;
    const clipboard = navigator.clipboard;
    if (clipboard != null) void clipboard.writeText(diffText);
    setCopiedDiff(diffText);
  }, [diffText, fileBusy]);

  useImperativeHandle(ref, () => ({ replaceDocument, openContextMenu: setMenu }), [
    replaceDocument,
  ]);

  useAppKeyboard({
    rowHeight: ROW_HEIGHT,
    scrollBy: (x, y) => {
      setScrollX((current) => current + x);
      setScrollY((current) => current + y);
    },
    fileBusy,
    save: noop,
    requestOpen: noop,
    requestOpenInNewWindow: noop,
    categories: doc.categories,
    selectedTaskId: selection.activeId,
    selectedTaskIds: selection.ids,
    linkSourceId,
    startupSettled: true,
    toggleLinkMode: () => {
      setLinkSourceId((current) => (current != null ? null : selection.activeId));
    },
    openTaskNote: setNoteTaskId,
    clearLinkMode: () => setLinkSourceId(null),
    removePredecessorLink: noop,
    removeTaskConnection: noop,
    chartPointerRef,
    closeFloatingMenus,
    requestDeleteTask: () => {
      if (selection.ids.length === 0) return;
      setDeleteOpen(true);
    },
    undo,
    redo,
    taskSearchRef,
    displayScalePreferenceRef,
    uiScaleRef,
    onDisplayScaleChange: (preference) => {
      displayScalePreferenceRef.current = preference;
    },
    onOpenShortcuts: () => setShortcutsOpen(true),
    visibleRows,
    selectTask: (taskId) => setSelection({ ids: [taskId], anchorId: taskId, activeId: taskId }),
    navigateTaskSelection: (rows, direction, _extend, onAfter) => {
      setSelection((current) => {
        const next = moveSelectionByArrow(rows, current, direction);
        onAfter?.(next.activeId);
        return next;
      });
    },
    moveTaskByDays: (taskId, deltaDays) => {
      commitDoc({
        ...doc,
        categories: mapTaskList(doc.categories, (task) => {
          if (task.id !== taskId) return task;
          return {
            ...task,
            start: isoDate(addDays(parseDate(task.start), deltaDays)),
            end: isoDate(addDays(parseDate(task.end), deltaDays)),
          };
        }),
      });
    },
    moveSelectedTasksByDays: (taskIds, deltaDays) => {
      const ids = new Set(taskIds);
      commitDoc({
        ...doc,
        categories: mapTaskList(doc.categories, (task) => {
          if (!ids.has(task.id)) return task;
          return {
            ...task,
            start: isoDate(addDays(parseDate(task.start), deltaDays)),
            end: isoDate(addDays(parseDate(task.end), deltaDays)),
          };
        }),
      });
    },
    shiftTaskEndByDays: noop,
    focusDetailName: () => {
      detailNameRef.current?.focus();
      detailNameRef.current?.select();
    },
    revealTaskRow,
    copyScheduleDiff: copyDiff,
    commandPaletteOpen: paletteOpen,
    onOpenCommandPalette: () => setPaletteOpen(true),
    onCloseCommandPalette: () => setPaletteOpen(false),
    onAddTask: () => setAddTaskOpen(true),
    onAddMilestone: () => setAddMilestoneOpen(true),
    onDuplicateTask: setDuplicateTaskId,
    commitTaskReorder: (taskId, _groupId, insertIndex) => {
      commitDoc({
        ...doc,
        categories: reorderTaskInGroup(doc.categories, taskId, insertIndex),
      });
    },
    filterPanelOpen: filterOpen,
    onOpenSettings: () => setSettingsOpen(true),
    onGoToday: noop,
    onSetViewTier: noop,
    onToggleLineage: () => {
      if (lineageTaskId != null) {
        setLineageTaskId(null);
        setLineageIncludesConnections(false);
        return;
      }
      if (selection.activeId != null) setLineageTaskId(selection.activeId);
    },
    onToggleFilterPanel: () => setFilterOpen((open) => !open),
    onToggleTaskConfidence: noop,
  });

  const menuHandlers: ContextMenuItemHandlers = {
    setMilestoneMarkVisible: (id, visible) => {
      setHiddenMarkIds((current) =>
        visible ? current.filter((item) => item !== id) : [...current, id],
      );
    },
    showOnlyMilestoneMark: (id) => {
      setHiddenMarkIds(doc.milestones.map((milestone) => milestone.id).filter((item) => item !== id));
    },
    openMilestoneEdit: noop,
    setMilestoneConfidence: noop,
    setDeleteMilestoneId: noop,
    removeTaskConnection: noop,
    removePredecessorLink: noop,
    openAddMilestone: () => setAddMilestoneOpen(true),
    setMilestoneGroupVisible: (id, visible) => {
      setHiddenGroupIds((current) =>
        visible ? current.filter((item) => item !== id) : [...current, id],
      );
    },
    showOnlyMilestoneGroup: (id) => {
      setHiddenGroupIds(doc.milestoneGroups.map((group) => group.id).filter((item) => item !== id));
    },
    openHierarchyEdit: (_kind, id) => {
      const category = doc.categories.find((item) => item.id === id);
      if (category) setHierarchyEdit({ title: "カテゴリ名", name: category.name, id });
    },
    openAddCategoryAfter: noop,
    openAddGroupToCategory: noop,
    openAddGroupAfter: noop,
    openAddOutlineSiblingAfter: noop,
    openAddOutlineChild: noop,
    openDeleteHierarchy: noop,
    setDeleteOpen,
    openTaskForEdit: (task) =>
      setSelection({ ids: [task.id], anchorId: task.id, activeId: task.id }),
    openDuplicateDialog: setDuplicateTaskId,
    setTaskConfidence: noop,
    openTaskNoteDialog: setNoteTaskId,
    clearLineage: () => {
      setLineageTaskId(null);
      setLineageIncludesConnections(false);
    },
    showLineage: (taskId) => {
      setLineageTaskId(taskId);
      setLineageIncludesConnections(false);
    },
  };
  const menuItems =
    menu == null
      ? []
      : buildContextMenuItems({
          target: menu,
          categories: doc.categories,
          outline: doc.outline,
          levels: doc.levels,
          milestones: doc.milestones,
          hierarchyAligned: true,
          visibleMilestoneGroupIds: new Set(
            doc.milestoneGroups
              .filter((group) => !hiddenGroupIds.includes(group.id))
              .map((group) => group.id),
          ),
          hiddenMilestoneIdSet: new Set(hiddenMarkIds),
          selectedTaskCount: selection.ids.length,
          lineageTaskId,
          commandKey: false,
          canDeleteOutlineBranch: () => false,
          handlers: menuHandlers,
        });
  const noteTask = noteTaskId == null ? null : findTask(doc.categories, noteTaskId);
  const duplicateTask =
    duplicateTaskId == null ? null : findTask(doc.categories, duplicateTaskId);
  const totalTasks = listTasks(doc.categories).length;

  return (
    <div>
      <p data-testid="scroll">
        {scrollX},{scrollY}
      </p>
      <p data-testid="sidebar-width">{sidebarWidth}</p>
      <p data-testid="selection">{selection.ids.join(",")}</p>
      <p data-testid="diff-jump">{diffNavigated == null ? "" : String(diffNavigated)}</p>
      <ul aria-label="見えている行">
        {visibleRows.map((row) => (
          <li key={`${row.type}-${row.type === "task" ? row.task.id : row.id}`}>
            {row.type === "task" ? row.task.name : row.label}
          </li>
        ))}
      </ul>
      <Toolbar
        title={doc.title}
        filters={filters}
        searchField={searchField}
        onSearchFieldChange={setSearchField}
        milestones={doc.milestones}
        milestoneGroups={doc.milestoneGroups}
        hiddenMilestoneGroupIds={hiddenGroupIds}
        hiddenMilestoneIds={hiddenMarkIds}
        onMilestoneGroupVisible={(id, visible) => {
          setHiddenGroupIds((current) =>
            visible ? current.filter((item) => item !== id) : [...current, id],
          );
        }}
        onMilestoneMarkVisible={(id, visible) => {
          setHiddenMarkIds((current) =>
            visible ? current.filter((item) => item !== id) : [...current, id],
          );
        }}
        onShowAllMilestoneMarks={() => setHiddenMarkIds([])}
        assigneeFilterOptions={assigneeFilterOptions}
        scheduleTags={scheduleTags}
        scheduleFields={fields}
        statuses={BUILTIN_STATUS_ITEMS}
        tier="day"
        lineageName={lineageName}
        canStartLineage={selection.activeId != null}
        canStartLineageWithConnections={selection.activeId != null}
        onToggleLineage={() => {
          if (lineageTaskId != null) {
            setLineageTaskId(null);
            setLineageIncludesConnections(false);
            return;
          }
          if (selection.activeId != null) setLineageTaskId(selection.activeId);
        }}
        onShowLineageWithConnections={() => {
          if (selection.activeId == null) return;
          setLineageTaskId(selection.activeId);
          setLineageIncludesConnections(true);
        }}
        linkSourceName={linkSourceId == null ? null : "線"}
        canStartLink={selection.activeId != null || linkSourceId != null}
        onToggleLink={() =>
          setLinkSourceId((current) => (current != null ? null : selection.activeId))
        }
        onFiltersChange={updateFilters}
        onPatchFieldFilter={(def, patch) => {
          setFilters((prev) => {
            const current =
              prev.fieldFilters?.[def.key] ?? defaultFieldFilterCondition();
            return {
              ...prev,
              fieldFilters: {
                ...prev.fieldFilters,
                [def.key]: { ...current, ...patch },
              },
            };
          });
          setSelection(emptyTaskSelection());
        }}
        onUpdateFieldFilters={(build) => {
          setFilters((prev) => ({ ...prev, fieldFilters: build(prev) }));
          setSelection(emptyTaskSelection());
        }}
        onGoToday={noop}
        onSetTier={noop}
        onFit={noop}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        onOpenGuide={() => setGuideOpen(true)}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        onShowJson={noop}
        onShowDiff={() => setDiffExpanded(true)}
        onCopyDiff={copyDiff}
        onExportHtml={noop}
        onOpen={noop}
        onSave={noop}
        onSaveAs={noop}
        onOpenSettings={() => setSettingsOpen(true)}
        canDelete={selection.ids.length > 0}
        onAdd={() => setAddTaskOpen(true)}
        onAddMilestone={() => setAddMilestoneOpen(true)}
        onDelete={() => {
          if (selection.ids.length === 0) return;
          setDeleteOpen(true);
        }}
        fileBusy={fileBusy}
        startupSettled
        taskSearchRef={taskSearchRef}
        onCommitTitle={() => ({ kind: "unchanged" })}
        onTitleEditingChange={noop}
        onTitleBlankCommit={noop}
        titleEditRequestToken={0}
        filterPanelOpen={filterOpen}
        onFilterPanelOpenChange={setFilterOpen}
      />
      <ActiveFilterBar
        filters={filters}
        milestones={doc.milestones}
        milestoneGroups={doc.milestoneGroups}
        hiddenMilestoneGroupIds={hiddenGroupIds}
        hiddenMilestoneIds={hiddenMarkIds}
        assigneeLabel={
          assigneeFilterOptions.find((option) => option.id === filters.assignee)?.label ??
          null
        }
        lineageName={lineageName}
        lineageIncludesConnections={lineageIncludesConnections}
        onFiltersChange={updateFilters}
        onClearLineage={() => {
          setLineageTaskId(null);
          setLineageIncludesConnections(false);
        }}
        onMilestoneGroupVisible={(id, visible) => {
          setHiddenGroupIds((current) =>
            visible ? current.filter((item) => item !== id) : [...current, id],
          );
        }}
        onMilestoneMarkVisible={(id, visible) => {
          setHiddenMarkIds((current) =>
            visible ? current.filter((item) => item !== id) : [...current, id],
          );
        }}
        onShowAllMilestoneGroups={() => setHiddenGroupIds([])}
        onShowAllMilestoneMarks={() => setHiddenMarkIds([])}
        scheduleTags={scheduleTags}
        scheduleFields={fields}
        statuses={BUILTIN_STATUS_ITEMS}
      />
      <div className="sidebar">
        {band.blocks.map((block) => (
          <div
            key={block.group.id}
            className="sidebar-milestones"
            onContextMenu={(event) => {
              event.preventDefault();
              setMenu({ kind: "milestoneGroup", groupId: block.group.id });
            }}
          >
            {block.group.name}
          </div>
        ))}
        {visibleRows.map((row) => {
          if (row.type === "task") {
            const display = resolveAssigneeRowDisplay(
              row.task.assigneeIds,
              memberMap,
              duplicateMemberNames(members ?? []),
            );
            const assignee =
              display.kind === "unassigned" ? "未割当" : assigneeSidebarLabel(display);
            return (
              <div
                key={row.task.id}
                className="sidebar-row"
                data-task-id={row.task.id}
                onClick={(event) =>
                  setSelection((current) =>
                    selectTaskClick(
                      visibleTaskIds,
                      current,
                      row.task.id,
                      {
                        shiftKey: event.shiftKey,
                        metaKey: event.metaKey,
                        ctrlKey: event.ctrlKey,
                      },
                      false,
                    ),
                  )
                }
                onContextMenu={(event) => {
                  event.preventDefault();
                  setMenu({ kind: "task", taskId: row.task.id });
                }}
              >
                <span>{row.task.name}</span>
                <span className="assignee">{assignee}</span>
              </div>
            );
          }
          return (
            <div
              key={`${row.type}-${row.id}`}
              className="sidebar-row"
              onContextMenu={(event) => {
                event.preventDefault();
                if (row.type === "category" || row.type === "group") {
                  setMenu({ kind: row.type, id: row.id });
                }
              }}
              onDoubleClick={() => {
                if (row.type !== "category") return;
                const category = doc.categories.find((item) => item.id === row.id);
                if (category) {
                  setHierarchyEdit({ title: "カテゴリ名", name: category.name, id: category.id });
                }
              }}
            >
              {row.label}
            </div>
          );
        })}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="タスク一覧の幅"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.ctrlKey || event.metaKey) return;
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              setSidebarWidth((current) => current - SIDEBAR_WIDTH_KEY_STEP);
            } else if (event.key === "ArrowRight") {
              event.preventDefault();
              setSidebarWidth((current) => current + SIDEBAR_WIDTH_KEY_STEP);
            }
          }}
        />
      </div>
      <div ref={chartRef} tabIndex={0} aria-label="チャート" className="chart-focus" />
      {detailTask != null ? (
        <div>
          <label htmlFor="detailName">タスク名</label>
          <input
            id="detailName"
            ref={detailNameRef}
            aria-label="タスク名"
            value={detailTask.name}
            onChange={(event) => {
              const name = event.target.value;
              setDoc((current) => ({
                ...current,
                categories: mapTaskList(current.categories, (task) =>
                  task.id === detailTask.id ? { ...task, name } : task,
                ),
              }));
            }}
          />
          {(detailTask.tags ?? []).map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => {
                commitDoc({
                  ...doc,
                  categories: mapTaskList(doc.categories, (task) =>
                    task.id === detailTask.id
                      ? { ...task, tags: (task.tags ?? []).filter((item) => item !== tag) }
                      : task,
                  ),
                });
              }}
            >
              {`タグ ${tag} を外す`}
            </button>
          ))}
        </div>
      ) : null}
      {diffText !== "" ? (
        <DiffStrip
          view={{ visible: true, kind: "body", text: diffText, showClose: false }}
          entries={diffEntries}
          expanded={diffExpanded}
          activeIndex={diffIndex}
          rowStatus={null}
          rowHeight={ROW_HEIGHT}
          onExpandFromPointer={() => {
            setDiffExpanded(true);
            chartRef.current?.focus();
          }}
          onExpandFromKeyboard={() => {
            setDiffExpanded(true);
            window.requestAnimationFrame(() => diffListRef.current?.focus());
          }}
          onCollapse={() => {
            setDiffExpanded(false);
            chartRef.current?.focus();
          }}
          onClose={() => setDiffExpanded(false)}
          onCopy={copyDiff}
          copyDisabled={fileBusy}
          listRef={diffListRef}
          onFocus={noop}
          onBlur={noop}
          onActiveIndexChange={(index, navigate) => {
            setDiffIndex(index);
            if (navigate) setDiffNavigated(index);
          }}
          focusListOnMount={false}
          onFocusListDone={noop}
        />
      ) : null}
      {copiedDiff != null ? <p data-testid="copied-diff">{copiedDiff}</p> : null}
      <StatusBar
        fileName="schedule.json"
        saveStatus="未保存"
        saveStatusClickable={false}
        onSaveStatusClick={noop}
        membersCatalogLabel={members == null ? null : "回帰メンバー"}
        membersCatalogError="メンバーの確認"
        calendarError={calendarError}
        colorsCatalogError={null}
        tier="day"
        visibleTaskCount={visibleTaskIds.length}
        totalTaskCount={totalTasks}
        showDeferredReload={false}
        onDeferredReload={noop}
        onOpenSettingsMembers={() => setSettingsOpen(true)}
        onOpenSettingsCalendar={() => setSettingsOpen(true)}
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />
      {menuItems.length > 0 ? (
        <ContextMenu x={8} y={8} items={menuItems} onClose={() => setMenu(null)} />
      ) : null}
      <CommandPalette
        open={paletteOpen}
        context={{
          fileBusy,
          isTauriDesktop: false,
          recentFilesStore: { schedules: [], workspaces: [] },
          storeDistribution: false,
          canUndo,
          canRedo,
          selectedTaskId: selection.activeId,
          selectedTaskCount: selection.ids.length,
          linkSourceId,
          lineageActive: lineageTaskId != null,
        }}
        onClose={() => setPaletteOpen(false)}
        onRun={(target) => {
          if (target.type !== "command") return;
          if (target.id === "copyDiff") copyDiff();
          if (target.id === "guide") setGuideOpen(true);
          if (target.id === "shortcuts") setShortcutsOpen(true);
          if (target.id === "find") {
            taskSearchRef.current?.focus();
            taskSearchRef.current?.select();
          }
          if (target.id === "deleteTask") setDeleteOpen(true);
        }}
      />
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <GuideDialog
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        onOpenShortcuts={() => {
          setGuideOpen(false);
          setShortcutsOpen(true);
        }}
      />
      {deleteOpen && detailTask != null ? (
        <DeleteTaskDialog
          taskName={detailTask.name}
          hasDependencies={false}
          onClose={() => setDeleteOpen(false)}
          onConfirm={() => {
            const ids = new Set(selection.ids);
            commitDoc({
              ...doc,
              categories: mapTaskList(doc.categories, (task) => (ids.has(task.id) ? null : task)),
            });
            setSelection(emptyTaskSelection());
            setDeleteOpen(false);
          }}
        />
      ) : null}
      {addTaskOpen ? (
        <TaskAddDialog
          categories={doc.categories}
          initialCategory={doc.categories[0]?.name ?? ""}
          initialGroup={doc.categories[0]?.groups[0]?.name ?? ""}
          initialStart="2026-04-15"
          initialEnd="2026-04-16"
          onClose={() => setAddTaskOpen(false)}
          onSave={() => setAddTaskOpen(false)}
        />
      ) : null}
      {addMilestoneOpen ? (
        <MilestoneAddDialog
          initialDate="2026-05-01"
          initialGroupId={doc.milestoneGroups[0]?.id ?? null}
          milestoneGroups={doc.milestoneGroups}
          onClose={() => setAddMilestoneOpen(false)}
          onSave={() => {
            setAddMilestoneOpen(false);
            return null;
          }}
        />
      ) : null}
      {duplicateTask != null ? (
        <TaskEditDialog
          mode="duplicate"
          task={duplicateTask}
          members={members ?? []}
          memberCatalog={memberMap}
          tasks={listTasks(doc.categories)}
          milestones={doc.milestones}
          successorIds={[]}
          statuses={BUILTIN_STATUS_ITEMS}
          colorScheme="light"
          onClose={() => setDuplicateTaskId(null)}
          onSave={() => null}
        />
      ) : null}
      {noteTask != null ? (
        <TaskNoteDialog
          task={noteTask}
          onClose={() => setNoteTaskId(null)}
          onSave={() => setNoteTaskId(null)}
        />
      ) : null}
      {hierarchyEdit != null ? (
        <HierarchyNameDialog
          title={hierarchyEdit.title}
          initialName={hierarchyEdit.name}
          onClose={() => setHierarchyEdit(null)}
          onSave={() => {
            setHierarchyEdit(null);
            return null;
          }}
        />
      ) : null}
      {levelsOpen ? (
        <HierarchyLevelsDialog
          open
          initialLevels={levelDefsForEditor(doc)}
          hadDocumentLevels={documentHasExplicitLevels(doc)}
          snapshot={{
            title: doc.title,
            categories: doc.categories,
            milestoneGroups: doc.milestoneGroups,
            milestones: doc.milestones,
            levels: doc.levels,
            outline: doc.outline,
          }}
          onClose={() => setLevelsOpen(false)}
          onCommit={() => setLevelsOpen(false)}
        />
      ) : null}
      {errorMessage != null ? (
        <ScheduleErrorDialog message={errorMessage} onClose={() => setErrorMessage(null)} />
      ) : null}
      {brokenOpenText != null ? (
        <button
          type="button"
          onClick={() => {
            const parsed = parseScheduleText(brokenOpenText);
            if (!parsed.ok) {
              setErrorMessage(parsed.message);
              return;
            }
            replaceDocument(parsed.document);
          }}
        >
          壊れたファイルを開く
        </button>
      ) : null}
      {calendarText != null ? (
        <button
          type="button"
          onClick={() => {
            try {
              parseCalendarText(calendarText);
              setCalendarError(null);
            } catch (error) {
              setCalendarError(
                error instanceof Error
                  ? error.message
                  : "カレンダー設定を読み込めませんでした。",
              );
            }
          }}
        >
          カレンダーを読む
        </button>
      ) : null}
      {settingsOpen && calendarError != null ? (
        <p className="settings-message">
          {calendarError} 表示は土日のみに戻しています。
        </p>
      ) : null}
      <h1>{doc.title}</h1>
    </div>
  );
});
