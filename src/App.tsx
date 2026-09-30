import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Konva from "konva";
import { DeleteMilestoneDialog } from "./components/DeleteMilestoneDialog";
import { DeleteTaskDialog } from "./components/DeleteTaskDialog";
import { DiscardChangesDialog } from "./components/DiscardChangesDialog";
import { ExternalChangeDialog } from "./components/ExternalChangeDialog";
import { ExternalReloadDialog } from "./components/ExternalReloadDialog";
import { MissingScheduleFileDialog } from "./components/MissingScheduleFileDialog";
import { RecoveryConflictDialog } from "./components/RecoveryConflictDialog";
import { RecoveryInvalidDialog } from "./components/RecoveryInvalidDialog";
import { DiffDialog } from "./components/DiffDialog";
import { JsonDialog } from "./components/JsonDialog";
import { ScheduleErrorDialog } from "./components/ScheduleErrorDialog";
import { MilestoneAddDialog } from "./components/MilestoneAddDialog";
import { HierarchyNameDialog } from "./components/HierarchyNameDialog";
import { MilestoneEditDialog } from "./components/MilestoneEditDialog";
import { TaskAddDialog } from "./components/TaskAddDialog";
import { Sidebar } from "./components/Sidebar";
import { TaskEditDialog } from "./components/TaskEditDialog";
import { TaskNoteDialog } from "./components/TaskNoteDialog";
import { Timeline, type ChartPointer } from "./components/Timeline";
import { SettingsDialog } from "./components/SettingsDialog";
import { ExportFormatDialog } from "./components/ExportFormatDialog";
import { Toolbar } from "./components/Toolbar";
import { ContextMenu, type ContextMenuItem } from "./components/ContextMenu";
import { useMemberCatalog } from "./hooks/useMemberCatalog";
import { useAppCalendar } from "./hooks/useAppCalendar";
import { useSchedule } from "./hooks/useSchedule";
import { useScheduleFile } from "./hooks/useScheduleFile";
import { useTimelineView } from "./hooks/useTimelineView";
import { errorMessage } from "./model/errors";
import {
  NO_OPEN_SCHEDULE_FILE_MESSAGE,
  formatScheduleDiff,
} from "./model/scheduleDiff";
import {
  isTauri,
  parseScheduleText,
  readOpenScheduleFileViaTauri,
  scheduleJsonFilename,
  serializeScheduleDocument,
} from "./model/scheduleFile";
import { dependencyCount, listTasks, successorIds, visibleLinks } from "./model/dependencies";
import { milestoneLinkedByAnyTask } from "./model/milestones";
import {
  exportSchedule,
  ScheduleExportTooLargeError,
  type ScheduleExportFormat,
} from "./model/exportHtml";
import {
  describeActiveFilters,
  exportTimelineRange,
  milestonesForExport,
} from "./model/exportView";
import { parseDate } from "./model/dates";
import { resizeEndIso, resizeStartIso } from "./model/dragDates";
import {
  layoutMilestones,
  milestoneBandHeightPx,
} from "./model/milestones";
import { findTaskById } from "./model/rows";
import {
  blocksBrowserShortcut,
  blocksEditShortcut,
  blocksLinkShortcut,
  chartScrollOffset,
  matchAppShortcut,
  matchChartScroll,
} from "./model/shortcuts";
import { findTaskPlace } from "./model/tasks";
import { scaledLayoutSizes } from "./model/layoutSizes";
import { computeTimelineRange } from "./model/timeline";
import type { ScheduleId } from "./model/types";
import {
  applyResolvedColorScheme,
  readColorSchemePreference,
  resolveColorScheme,
  subscribeSystemColorScheme,
  type ColorSchemePreference,
} from "./model/colorScheme";
import type { ResolvedColorScheme } from "./model/palette";
import {
  readDisplayScalePreference,
  readUiScale,
  resolveUiScale,
  type DisplayScalePreference,
} from "./model/uiScale";
import {
  SIDEBAR_WIDTH_DEFAULT,
  SIDEBAR_WIDTH_MIN,
  TIMELINE_MIN_WIDTH,
  adjustSidebarWidth,
  appliedSidebarWidth,
  nudgeSidebarWidth,
  readSidebarWidth,
  writeSidebarWidth,
} from "./model/sidebarWidth";
import { seedSampleMemberCatalogOnce } from "./model/memberAppData";
import {
  SAMPLE_MEMBERS_CATALOG_ID,
} from "./sample/ids";
import { sampleMembersJson } from "./sample/members";
import {
  SAMPLE_PROJECT_TITLE,
  sampleCategories,
  sampleMilestones,
} from "./sample/schedule";

const INITIAL_BASELINE_JSON = serializeScheduleDocument(
  SAMPLE_PROJECT_TITLE,
  sampleCategories,
  sampleMilestones,
);

type ContextMenuState =
  | { kind: "task"; taskId: ScheduleId; x: number; y: number }
  | { kind: "milestone"; milestoneId: ScheduleId; x: number; y: number }
  | { kind: "category"; id: ScheduleId; x: number; y: number }
  | { kind: "group"; id: ScheduleId; x: number; y: number }
  | {
      kind: "link";
      fromId: ScheduleId;
      toId: ScheduleId;
      x: number;
      y: number;
    };

function shouldHandleDocumentUndo(target: EventTarget | null): boolean {
  if (document.querySelector('[role="dialog"]')) return false;
  if (!(target instanceof HTMLElement)) return true;
  if (target.isContentEditable) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return false;
  return true;
}

function App() {
  const timelineAreaRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const [timelineWidth, setTimelineWidth] = useState(520);
  const [timelineSlotHeight, setTimelineSlotHeight] = useState(440);
  const [mainWidth, setMainWidth] = useState(0);
  const [preferredSidebarWidth, setPreferredSidebarWidth] = useState(readSidebarWidth);
  const preferredSidebarWidthRef = useRef(preferredSidebarWidth);
  preferredSidebarWidthRef.current = preferredSidebarWidth;
  const [displayScalePreference, setDisplayScalePreference] = useState(
    readDisplayScalePreference,
  );
  const [colorSchemePreference, setColorSchemePreference] = useState(
    readColorSchemePreference,
  );
  const [resolvedColorScheme, setResolvedColorScheme] = useState(
    (): ResolvedColorScheme => resolveColorScheme(readColorSchemePreference()),
  );
  const [uiScale, setUiScale] = useState(readUiScale);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [diffText, setDiffText] = useState<string | null>(null);
  const [diffError, setDiffError] = useState<string | null>(null);
  const diffRequestRef = useRef(0);
  const [addOpen, setAddOpen] = useState(false);
  const [addMilestoneOpen, setAddMilestoneOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteMilestoneId, setDeleteMilestoneId] = useState<ScheduleId | null>(
    null,
  );
  const [focusTaskId, setFocusTaskId] = useState<ScheduleId | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [pendingFit, setPendingFit] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [linkSourceId, setLinkSourceId] = useState<ScheduleId | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const chartPointerRef = useRef<ChartPointer>({
    overTask: false,
    overMilestone: false,
    link: null,
  });
  const taskSearchRef = useRef<HTMLInputElement>(null);

  const { headerHeight, rowHeight, barHeight, milestoneLaneHeight } =
    scaledLayoutSizes(uiScale);
  const milestoneFontSize = Math.round(11 * uiScale);
  const milestoneDiamondSize = Math.max(8, Math.round(11 * uiScale));
  const refreshUiScale = useCallback(() => {
    setUiScale(
      resolveUiScale(
        window.innerWidth,
        window.innerHeight,
        displayScalePreference,
      ),
    );
  }, [displayScalePreference]);

  useEffect(() => {
    applyResolvedColorScheme(resolvedColorScheme);
  }, [resolvedColorScheme]);

  useEffect(() => {
    if (colorSchemePreference !== "system") return;
    return subscribeSystemColorScheme(() => {
      setResolvedColorScheme(resolveColorScheme("system"));
    });
  }, [colorSchemePreference]);

  const handleColorSchemeChange = useCallback(
    (preference: ColorSchemePreference) => {
      setColorSchemePreference(preference);
      setResolvedColorScheme(resolveColorScheme(preference));
    },
    [],
  );

  useEffect(() => {
    refreshUiScale();
    window.addEventListener("resize", refreshUiScale);
    return () => window.removeEventListener("resize", refreshUiScale);
  }, [refreshUiScale]);

  const handleDisplayScaleChange = useCallback(
    (preference: DisplayScalePreference) => {
      setDisplayScalePreference(preference);
      setUiScale(
        resolveUiScale(
          window.innerWidth,
          window.innerHeight,
          preference,
        ),
      );
    },
    [],
  );

  useEffect(() => {
    document.documentElement.style.setProperty("--s", String(uiScale));
  }, [uiScale]);

  useEffect(() => {
    const node = timelineAreaRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setTimelineWidth(entry.contentRect.width);
      setTimelineSlotHeight(entry.contentRect.height);
    });
    observer.observe(node);
    setTimelineWidth(node.clientWidth);
    setTimelineSlotHeight(node.clientHeight);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = mainRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setMainWidth(entry.contentRect.width);
    });
    observer.observe(node);
    setMainWidth(node.clientWidth);
    return () => observer.disconnect();
  }, []);

  const sidebarWidth = appliedSidebarWidth(
    preferredSidebarWidth,
    mainWidth,
    uiScale,
  );
  const sidebarWidthCeiling =
    uiScale > 0 ? Math.floor((mainWidth - TIMELINE_MIN_WIDTH) / uiScale) : 0;
  const sidebarWidthMax =
    mainWidth > 0 && uiScale > 0 && sidebarWidthCeiling >= SIDEBAR_WIDTH_MIN
      ? sidebarWidthCeiling
      : null;

  const handleSidebarWidthChange = useCallback(
    (requested: number) => {
      const next = adjustSidebarWidth(
        preferredSidebarWidthRef.current,
        requested,
        mainWidth,
        uiScale,
      );
      preferredSidebarWidthRef.current = next;
      setPreferredSidebarWidth(next);
    },
    [mainWidth, uiScale],
  );

  const handleSidebarWidthCommit = useCallback(() => {
    writeSidebarWidth(preferredSidebarWidthRef.current);
  }, []);

  const handleSidebarWidthReset = useCallback(() => {
    preferredSidebarWidthRef.current = SIDEBAR_WIDTH_DEFAULT;
    setPreferredSidebarWidth(SIDEBAR_WIDTH_DEFAULT);
    writeSidebarWidth(SIDEBAR_WIDTH_DEFAULT);
  }, []);

  const handleSidebarWidthNudge = useCallback(
    (delta: number) => {
      const next = nudgeSidebarWidth(
        preferredSidebarWidthRef.current,
        delta,
        mainWidth,
        uiScale,
      );
      preferredSidebarWidthRef.current = next;
      setPreferredSidebarWidth(next);
      writeSidebarWidth(next);
    },
    [mainWidth, uiScale],
  );

  const memberCatalogState = useMemberCatalog();
  const appCalendarState = useAppCalendar();

  useEffect(() => {
    void (async () => {
      await seedSampleMemberCatalogOnce(
        SAMPLE_MEMBERS_CATALOG_ID,
        sampleMembersJson(),
      );
      await memberCatalogState.refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 初回のみサンプルカタログを用意
  }, []);

  const schedule = useSchedule(
    SAMPLE_PROJECT_TITLE,
    sampleCategories,
    sampleMilestones,
    rowHeight,
    memberCatalogState.members,
  );
  const { redo, undo, setTaskStart, setTaskEnd, visibleRows } = schedule;
  const range = useMemo(
    () =>
      computeTimelineRange(
        schedule.categories,
        schedule.milestones,
        schedule.today,
      ),
    [schedule.categories, schedule.milestones, schedule.today],
  );

  const view = useTimelineView(
    {
      timelineStart: range.timelineStart,
      totalDays: range.totalDays,
    },
    timelineWidth,
    (pxPerDay) => {
      const band = milestoneBandHeightPx(
        schedule.milestones,
        pxPerDay,
        milestoneFontSize,
        milestoneDiamondSize,
        milestoneLaneHeight,
      );
      const body = Math.max(120, timelineSlotHeight - headerHeight - band);
      return Math.max(0, schedule.visibleRows.length * rowHeight - body);
    },
  );

  const milestoneLanes = useMemo(
    () =>
      layoutMilestones(
        schedule.milestones,
        view.pxPerDay,
        milestoneFontSize,
        milestoneDiamondSize,
      ),
    [
      milestoneDiamondSize,
      milestoneFontSize,
      schedule.milestones,
      view.pxPerDay,
    ],
  );
  const milestoneBandHeight =
    schedule.milestones.length === 0
      ? 0
      : (Math.max(...milestoneLanes.values(), 0) + 1) * milestoneLaneHeight;
  const bodyHeight = Math.max(
    120,
    timelineSlotHeight - headerHeight - milestoneBandHeight,
  );

  const {
    fitToWidth,
    panBy,
    scrollBy,
    zoomIn,
    zoomOut,
    tierLabel,
    handleWheel,
    xToDate,
    reveal,
    pxPerDay,
    scrollX,
    scrollY,
    tier,
  } = view;

  const onAfterOpenFile = useCallback(() => {
    setPendingFit(true);
  }, []);

  useEffect(() => {
    if (!pendingFit) return;
    fitToWidth();
    setPendingFit(false);
  }, [fitToWidth, pendingFit, range.totalDays]);

  const scheduleFile = useScheduleFile({
    title: schedule.title,
    categories: schedule.categories,
    milestones: schedule.milestones,
    replaceDocument: schedule.replaceDocument,
    reloadDocumentFromDisk: schedule.reloadDocumentFromDisk,
    onAfterOpen: onAfterOpenFile,
    initialBaselineJson: INITIAL_BASELINE_JSON,
    hasOpenEditDialog:
      schedule.editingTask != null ||
      schedule.editingNoteTask != null ||
      schedule.editingMilestone != null ||
      schedule.editingHierarchyTarget != null,
  });

  const {
    categories,
    selectedTaskId,
    openEditDialog,
    selectTask,
    milestones,
    openMilestoneEdit,
    openTaskNoteDialog,
    clearLineage,
    showLineage,
    lineageTask,
    addPredecessorLink,
    removePredecessorLink,
    setTaskConfidence,
    setMilestoneConfidence,
  } = schedule;
  const { fileBusy, requestOpen, save } = scheduleFile;

  useEffect(() => {
    if (linkSourceId == null) return;
    if (selectedTaskId !== linkSourceId) {
      setLinkSourceId(null);
      setLinkError(null);
    }
  }, [linkSourceId, selectedTaskId]);

  const toggleLinkMode = useCallback(() => {
    setLinkError(null);
    setLinkSourceId((current) => {
      if (current != null) return null;
      return selectedTaskId;
    });
  }, [selectedTaskId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const dialogOpen = document.querySelector('[role="dialog"]') != null;
      const target = e.target;
      const blocksEditKeys =
        target instanceof HTMLElement &&
        blocksEditShortcut({
          tagName: target.tagName,
          isContentEditable: target.isContentEditable,
        });
      const blocksLinkKeys =
        target instanceof HTMLElement &&
        blocksLinkShortcut({
          tagName: target.tagName,
          isContentEditable: target.isContentEditable,
        });
      const shortcutEvent = {
        key: e.key,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
      };
      const chartScroll = matchChartScroll(shortcutEvent, { dialogOpen });
      if (chartScroll) {
        e.preventDefault();
        setContextMenu(null);
        const offset = chartScrollOffset(chartScroll, rowHeight);
        scrollBy(offset.x, offset.y);
        return;
      }
      if (blocksBrowserShortcut(shortcutEvent)) e.preventDefault();
      if (
        shortcutEvent.key === "Escape" &&
        !dialogOpen &&
        !shortcutEvent.altKey &&
        !shortcutEvent.ctrlKey &&
        !shortcutEvent.metaKey &&
        !shortcutEvent.shiftKey
      ) {
        if (document.querySelector('[role="menu"]')) return;
        if (linkSourceId != null) {
          e.preventDefault();
          setLinkSourceId(null);
          setLinkError(null);
        }
        return;
      }
      const shortcut = matchAppShortcut(shortcutEvent, {
        dialogOpen,
        blocksEditKeys,
        blocksLinkKeys,
      });
      if (shortcut) {
        e.preventDefault();
        if (e.repeat) return;
        setContextMenu(null);
        if (shortcut === "link") {
          toggleLinkMode();
          return;
        }
        if (shortcut === "edit") {
          if (linkSourceId != null) return;
          const task =
            selectedTaskId == null
              ? null
              : findTaskById(categories, selectedTaskId);
          if (task) openEditDialog(task);
          return;
        }
        if (shortcut === "delete") {
          const pointer = chartPointerRef.current;
          const hovered = pointer.link;
          if (
            hovered &&
            !pointer.overTask &&
            !pointer.overMilestone
          ) {
            removePredecessorLink(hovered.fromId, hovered.toId);
            return;
          }
          if (selectedTaskId != null) setDeleteOpen(true);
          return;
        }
        if (fileBusy && shortcut !== "find") return;
        if (shortcut === "save") void save(false);
        else if (shortcut === "saveAs") void save(true);
        else if (shortcut === "open") requestOpen();
        else {
          taskSearchRef.current?.focus();
          taskSearchRef.current?.select();
        }
        return;
      }
      if (!shouldHandleDocumentUndo(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (key === "z" && mod && !e.altKey) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (key === "y" && e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    categories,
    fileBusy,
    openEditDialog,
    redo,
    requestOpen,
    rowHeight,
    save,
    scrollBy,
    selectedTaskId,
    linkSourceId,
    toggleLinkMode,
    removePredecessorLink,
    undo,
  ]);

  const onWheelBody = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      const pointerX =
        e.target.getStage()?.getPointerPosition()?.x ?? timelineWidth / 2;
      handleWheel(e.evt, pointerX, "body");
    },
    [handleWheel, timelineWidth],
  );

  const onWheelHeader = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      const pointerX =
        e.target.getStage()?.getPointerPosition()?.x ?? timelineWidth / 2;
      handleWheel(e.evt, pointerX, "header");
    },
    [handleWheel, timelineWidth],
  );

  const taskRefs = useMemo(
    () => listTasks(schedule.categories),
    [schedule.categories],
  );
  const editingSuccessors = useMemo(
    () =>
      schedule.editingTask
        ? successorIds(schedule.categories, schedule.editingTask.id)
        : [],
    [schedule.categories, schedule.editingTask],
  );
  const links = useMemo(() => {
    const visibleIds = new Set(
      schedule.visibleRows.flatMap((row) =>
        row.type === "task" ? [row.task.id] : [],
      ),
    );
    const links = visibleLinks(schedule.categories, visibleIds);
    if (schedule.filters.relation !== "broken") return links;
    return links.filter((link) => link.broken);
  }, [schedule.categories, schedule.filters.relation, schedule.visibleRows]);

  const handleResizeStart = useCallback(
    (taskId: ScheduleId, groupX: number) => {
      setTaskStart(taskId, resizeStartIso(range.timelineStart, xToDate, groupX));
    },
    [range.timelineStart, setTaskStart, xToDate],
  );

  useEffect(() => {
    if (focusTaskId == null) return;
    const row = visibleRows.find(
      (item) => item.type === "task" && item.task.id === focusTaskId,
    );
    if (!row || row.type !== "task") return;
    reveal(parseDate(row.task.start), row.y);
    setFocusTaskId(null);
  }, [focusTaskId, reveal, visibleRows]);

  const handleResizeEnd = useCallback(
    (taskId: ScheduleId, groupX: number, barWidth: number) => {
      setTaskEnd(
        taskId,
        resizeEndIso(range.timelineStart, xToDate, groupX, barWidth),
      );
    },
    [range.timelineStart, setTaskEnd, xToDate],
  );

  const runScheduleExport = useCallback(
    (format: ScheduleExportFormat) => {
      const milestones = milestonesForExport(
        schedule.filters.milestone,
        schedule.milestones,
        schedule.visibleRows,
      );
      const exportedRange = exportTimelineRange(
        schedule.visibleRows,
        milestones,
        schedule.today,
      );
      const exportedLanes = layoutMilestones(
        milestones,
        pxPerDay,
        milestoneFontSize,
        milestoneDiamondSize,
      );
      const exportedBandHeight =
        milestones.length === 0
          ? 0
          : (Math.max(...exportedLanes.values(), 0) + 1) * milestoneLaneHeight;
      const assigneeLabel =
        schedule.assigneeFilterOptions.find(
          (option) => option.id === schedule.filters.assignee,
        )?.label ?? null;
      void exportSchedule(
        {
          title: schedule.title,
          tierLabel,
          lineageName: schedule.lineageTask?.name ?? null,
          visibleRows: schedule.visibleRows,
          milestones,
          milestoneLanes: exportedLanes,
          links,
          timelineStart: exportedRange.timelineStart,
          timelineEnd: exportedRange.timelineEnd,
          totalDays: exportedRange.totalDays,
          pxPerDay,
          tier,
          headerHeight,
          rowHeight,
          barHeight,
          milestoneBandHeight: exportedBandHeight,
          milestoneLaneHeight,
          milestoneDiamondSize,
          milestoneFontSize,
          labelScale: uiScale,
          today: schedule.today,
          memberCatalog: memberCatalogState.memberMap,
          calendar: appCalendarState.calendar,
          filterSummary: describeActiveFilters(
            schedule.filters,
            schedule.milestones,
            assigneeLabel,
          ),
          colorScheme: resolvedColorScheme,
        },
        format,
      ).catch((error: unknown) => {
        if (error instanceof ScheduleExportTooLargeError) {
          setExportError(error.message);
          return;
        }
        setExportError(
          error instanceof Error ? error.message : "書き出せませんでした。",
        );
      });
    },
    [
      appCalendarState.calendar,
      headerHeight,
      links,
      memberCatalogState.memberMap,
      milestoneDiamondSize,
      milestoneFontSize,
      milestoneLaneHeight,
      pxPerDay,
      rowHeight,
      barHeight,
      schedule,
      tier,
      tierLabel,
      uiScale,
      resolvedColorScheme,
    ],
  );

  const showScheduleDiff = useCallback(() => {
    if (scheduleFile.fileBusy) return;
    const requestId = diffRequestRef.current + 1;
    diffRequestRef.current = requestId;
    const stillCurrent = () => diffRequestRef.current === requestId;
    if (!isTauri() || !scheduleFile.filePath) {
      setDiffError(null);
      setDiffText(NO_OPEN_SCHEDULE_FILE_MESSAGE);
      return;
    }
    const screenJson = scheduleFile.currentJson;
    const filename = scheduleJsonFilename(scheduleFile.filePath) ?? "schedule.json";
    void readOpenScheduleFileViaTauri()
      .then((contents) => {
        if (!stillCurrent()) return;
        const fileParsed = parseScheduleText(contents);
        if (!fileParsed.ok) {
          setDiffText(null);
          setDiffError(fileParsed.message);
          return;
        }
        const screenParsed = parseScheduleText(screenJson);
        if (!screenParsed.ok) {
          setDiffText(null);
          setDiffError(screenParsed.message);
          return;
        }
        setDiffError(null);
        setDiffText(
          formatScheduleDiff(screenParsed.document, fileParsed.document, filename),
        );
      })
      .catch((error: unknown) => {
        if (!stillCurrent()) return;
        setDiffText(null);
        setDiffError(errorMessage(error, "ファイルを読めません。"));
      });
  }, [scheduleFile.currentJson, scheduleFile.fileBusy, scheduleFile.filePath]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  useEffect(() => {
    if (contextMenu == null) return;
    const closeIfDialog = () => {
      if (document.querySelector('[role="dialog"]') != null) {
        setContextMenu(null);
      }
    };
    closeIfDialog();
    const observer = new MutationObserver(closeIfDialog);
    observer.observe(document.body, { childList: true });
    return () => observer.disconnect();
  }, [contextMenu]);

  const openTaskContextMenu = useCallback(
    (taskId: ScheduleId, x: number, y: number) => {
      if (linkSourceId != null) return;
      selectTask(taskId);
      setContextMenu({ kind: "task", taskId, x, y });
    },
    [linkSourceId, selectTask],
  );

  const openMilestoneContextMenu = useCallback(
    (milestoneId: ScheduleId, x: number, y: number) => {
      if (linkSourceId != null) return;
      setContextMenu({ kind: "milestone", milestoneId, x, y });
    },
    [linkSourceId],
  );

  const openHierarchyContextMenu = useCallback(
    (kind: "category" | "group", id: ScheduleId, x: number, y: number) => {
      if (linkSourceId != null) return;
      setContextMenu({ kind, id, x, y });
    },
    [linkSourceId],
  );

  const openHierarchyEdit = useCallback(
    (kind: "category" | "group", id: ScheduleId) => {
      if (linkSourceId != null) return;
      schedule.openHierarchyEdit(kind, id);
    },
    [linkSourceId, schedule],
  );

  const openLinkContextMenu = useCallback(
    (fromId: ScheduleId, toId: ScheduleId, x: number, y: number) => {
      setContextMenu({ kind: "link", fromId, toId, x, y });
    },
    [],
  );

  const onLinkTargetClick = useCallback(
    (taskId: ScheduleId) => {
      if (linkSourceId == null) return;
      if (taskId === linkSourceId) {
        setLinkSourceId(null);
        setLinkError(null);
        return;
      }
      setLinkError(addPredecessorLink(linkSourceId, taskId));
    },
    [addPredecessorLink, linkSourceId],
  );

  const contextMenuItems = useMemo((): ContextMenuItem[] => {
    if (contextMenu == null) return [];
    if (contextMenu.kind === "milestone") {
      const milestoneId = contextMenu.milestoneId;
      const milestone = milestones.find((item) => item.id === milestoneId);
      return [
        {
          id: "edit",
          label: "編集",
          onSelect: () => openMilestoneEdit(milestoneId),
        },
        ...(milestone
          ? [
              {
                id: "confidence",
                label:
                  milestone.confidence === "tentative"
                    ? "確定にする"
                    : "未確定にする",
                onSelect: () => {
                  setMilestoneConfidence(
                    milestoneId,
                    milestone.confidence === "tentative" ? "committed" : "tentative",
                  );
                },
              },
            ]
          : []),
        {
          id: "delete",
          label: "削除",
          onSelect: () => setDeleteMilestoneId(milestoneId),
        },
      ];
    }
    if (contextMenu.kind === "link") {
      const { fromId, toId } = contextMenu;
      return [
        {
          id: "unlink",
          label: "線を外す",
          onSelect: () => removePredecessorLink(fromId, toId),
        },
      ];
    }
    if (contextMenu.kind === "category" || contextMenu.kind === "group") {
      const { kind, id } = contextMenu;
      return [
        {
          id: "rename",
          label: "名前を変更",
          onSelect: () => openHierarchyEdit(kind, id),
        },
      ];
    }
    const taskId = contextMenu.taskId;
    const task = findTaskById(categories, taskId);
    const lineageActive = lineageTask?.id === taskId;
    return [
      {
        id: "edit",
        label: "編集",
        onSelect: () => {
          if (task) openEditDialog(task);
        },
      },
      ...(task
        ? [
            {
              id: "confidence",
              label:
                task.confidence === "tentative" ? "確定にする" : "未確定にする",
              onSelect: () => {
                setTaskConfidence(
                  taskId,
                  task.confidence === "tentative" ? "committed" : "tentative",
                );
              },
            },
          ]
        : []),
      {
        id: "note",
        label: "ノート",
        onSelect: () => openTaskNoteDialog(taskId),
      },
      {
        id: "lineage",
        label: lineageActive ? "系統を解除" : "系統を表示",
        onSelect: () => {
          if (lineageActive) clearLineage();
          else showLineage(taskId);
        },
      },
      {
        id: "delete",
        label: "削除",
        onSelect: () => setDeleteOpen(true),
      },
    ];
  }, [
    categories,
    clearLineage,
    contextMenu,
    lineageTask?.id,
    milestones,
    openEditDialog,
    openHierarchyEdit,
    setMilestoneConfidence,
    setTaskConfidence,
    openMilestoneEdit,
    openTaskNoteDialog,
    removePredecessorLink,
    showLineage,
  ]);

  return (
    <div
      className="app"
      style={{
        ["--s" as string]: uiScale,
        ["--sidebar-w" as string]: sidebarWidth,
      }}
    >
      <Toolbar
        title={schedule.title}
        fileStatusLabel={scheduleFile.statusLabel}
        showDeferredReload={scheduleFile.showDeferredReload}
        onDeferredReload={scheduleFile.requestDeferredReload}
        membersCatalogLabel={memberCatalogState.selectedCatalogLabel}
        membersCatalogError={memberCatalogState.error}
        calendarError={appCalendarState.error}
        filters={schedule.filters}
        milestones={schedule.milestones}
        assigneeFilterOptions={schedule.assigneeFilterOptions}
        zoomLabel={tierLabel}
        lineageName={schedule.lineageTask?.name ?? null}
        canStartLineage={schedule.selectedTaskId != null}
        onToggleLineage={schedule.toggleLineage}
        linkSourceName={
          linkSourceId == null
            ? null
            : (findTaskById(schedule.categories, linkSourceId)?.name ?? null)
        }
        canStartLink={schedule.selectedTaskId != null}
        onToggleLink={toggleLinkMode}
        onFiltersChange={schedule.updateFilters}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFit={fitToWidth}
        onShowJson={() => setJsonOpen(true)}
        onShowDiff={showScheduleDiff}
        onOpen={scheduleFile.requestOpen}
        onSave={() => void scheduleFile.save(false)}
        onSaveAs={() => void scheduleFile.save(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onExportHtml={() => setExportOpen(true)}
        canDelete={schedule.selectedTaskId != null}
        onAdd={() => setAddOpen(true)}
        onAddMilestone={() => setAddMilestoneOpen(true)}
        onDelete={() => {
          if (schedule.selectedTaskId != null) setDeleteOpen(true);
        }}
        fileBusy={scheduleFile.fileBusy}
        taskSearchRef={taskSearchRef}
      />
      <div className="hint">
        {linkSourceId != null ? (
          <>
            <div>次にクリックしたタスクを後続にします。Esc で中止</div>
            {linkError ? <div className="hint-error">{linkError}</div> : null}
          </>
        ) : (
          <>
            Ctrl(⌘)+ホイールでズーム ・ Shift+ホイールで横スクロール ・
            ドラッグで縦横スクロール ・ 左の名前はドラッグで横にずらせます ・ 境界をドラッグで左の幅を変える
            ・ ⌘/Ctrl+ドラッグでバー移動、端をドラッグで期間変更（操作中は開始日と終了日）、ダブルクリックで詳細編集
            ・ タスクを選んで「系統」で前後だけ表示 ・
            タスクを選んで「線を引く」または ⌘/Ctrl+L で後続を足す。線の上で Delete か右クリックで外す
            ・ マイルストンは「マイルストン追加」で足し、帯のひし形をドラッグ、ダブルクリックで編集、右クリックで削除
            ・ ⌘/Ctrl+Z で取り消し、Shift+Z または Ctrl+Y でやり直し
          </>
        )}
      </div>
      <div ref={mainRef} className="main">
        <Sidebar
          rows={schedule.visibleRows}
          scrollY={scrollY}
          viewportHeight={bodyHeight}
          rowHeight={rowHeight}
          selectedTaskId={schedule.selectedTaskId}
          milestoneBandHeight={milestoneBandHeight}
          milestones={schedule.milestones}
          onToggleCollapse={schedule.toggleCollapsed}
          onOpenTaskNote={schedule.openTaskNoteDialog}
          onTaskContextMenu={openTaskContextMenu}
          onHierarchyContextMenu={openHierarchyContextMenu}
          onHierarchyDoubleClick={openHierarchyEdit}
          today={schedule.today}
          memberCatalog={memberCatalogState.memberMap}
          uiScale={uiScale}
          sidebarWidth={sidebarWidth}
          preferredSidebarWidth={preferredSidebarWidth}
          sidebarWidthMax={sidebarWidthMax}
          onSidebarWidthChange={handleSidebarWidthChange}
          onSidebarWidthCommit={handleSidebarWidthCommit}
          onSidebarWidthReset={handleSidebarWidthReset}
          onSidebarWidthNudge={handleSidebarWidthNudge}
        />
        <div ref={timelineAreaRef} className="timeline-slot">
          <Timeline
            visibleRows={schedule.visibleRows}
            width={Math.max(200, timelineWidth)}
            rowHeight={rowHeight}
            barHeight={barHeight}
            headerHeight={headerHeight}
            bodyHeight={bodyHeight}
            pxPerDay={pxPerDay}
            scrollX={scrollX}
            scrollY={scrollY}
            tier={tier}
            timelineStart={range.timelineStart}
            timelineEnd={range.timelineEnd}
            totalDays={range.totalDays}
            dateToX={view.dateToX}
            xToDate={view.xToDate}
            selectedTaskId={schedule.selectedTaskId}
            onSelectTask={schedule.selectTask}
            onClearSelection={schedule.clearSelection}
            onMoveTask={schedule.moveTaskByDays}
            onResizeStart={handleResizeStart}
            onResizeEnd={handleResizeEnd}
            links={links}
            onOpenEdit={schedule.openEditDialog}
            onTaskContextMenu={openTaskContextMenu}
            onWheelBody={onWheelBody}
            onWheelHeader={onWheelHeader}
            onPan={panBy}
            milestones={schedule.milestones}
            milestoneLanes={milestoneLanes}
            milestoneBandHeight={milestoneBandHeight}
            milestoneLaneHeight={milestoneLaneHeight}
            milestoneDiamondSize={milestoneDiamondSize}
            milestoneFontSize={milestoneFontSize}
            onMoveMilestone={schedule.moveMilestoneByDays}
            onOpenMilestone={schedule.openMilestoneEdit}
            onMilestoneContextMenu={openMilestoneContextMenu}
            today={schedule.today}
            memberCatalog={memberCatalogState.memberMap}
            calendar={appCalendarState.calendar}
            colorScheme={resolvedColorScheme}
            linkSourceId={linkSourceId}
            onLinkTargetClick={onLinkTargetClick}
            onLinkContextMenu={openLinkContextMenu}
            onChartPointer={(pointer) => {
              chartPointerRef.current = pointer;
            }}
          />
        </div>
      </div>
      {contextMenu ? (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={closeContextMenu}
        />
      ) : null}
      {schedule.editingNoteTask ? (
        <TaskNoteDialog
          key={`note-${schedule.editingNoteTask.id}:${schedule.diskEpoch}`}
          task={schedule.editingNoteTask}
          onClose={schedule.closeTaskNoteDialog}
          onSave={(note) => {
            const task = schedule.editingNoteTask;
            if (task) schedule.saveTaskNote(task.id, note);
          }}
        />
      ) : null}
      {schedule.editingTask ? (
        <TaskEditDialog
          key={`${schedule.editingTask.id}:${schedule.diskEpoch}`}
          task={schedule.editingTask}
          members={memberCatalogState.members ?? []}
          memberCatalog={memberCatalogState.memberMap}
          tasks={taskRefs}
          milestones={schedule.milestones}
          successorIds={editingSuccessors}
          onClose={schedule.closeEditDialog}
          onSave={schedule.saveTaskEdit}
        />
      ) : null}
      {schedule.editingMilestone ? (
        <MilestoneEditDialog
          key={`${schedule.editingMilestone.id}:${schedule.diskEpoch}`}
          milestone={schedule.editingMilestone}
          onClose={schedule.closeMilestoneEdit}
          onSave={schedule.saveMilestoneEdit}
        />
      ) : null}
      {schedule.editingHierarchyTarget ? (
        <HierarchyNameDialog
          key={`${schedule.editingHierarchyTarget.title}:${schedule.editingHierarchyTarget.name}:${schedule.diskEpoch}`}
          title={schedule.editingHierarchyTarget.title}
          initialName={schedule.editingHierarchyTarget.name}
          onClose={schedule.closeHierarchyEdit}
          onSave={schedule.saveHierarchyName}
        />
      ) : null}
      {addMilestoneOpen ? (
        <MilestoneAddDialog
          initialDate={schedule.today}
          onClose={() => setAddMilestoneOpen(false)}
          onSave={(input) => {
            const message = schedule.addMilestone(input);
            if (message == null) setAddMilestoneOpen(false);
            return message;
          }}
        />
      ) : null}
      {addOpen ? (
        <TaskAddDialog
          categories={schedule.categories}
          initialCategory={
            (schedule.selectedTaskId
              ? findTaskPlace(schedule.categories, schedule.selectedTaskId)
              : null
            )?.category ??
            schedule.categories[0]?.name ??
            ""
          }
          initialGroup={
            (schedule.selectedTaskId
              ? findTaskPlace(schedule.categories, schedule.selectedTaskId)
              : null
            )?.group ??
            schedule.categories[0]?.groups[0]?.name ??
            ""
          }
          initialStart={
            findTaskById(schedule.categories, schedule.selectedTaskId)?.start ??
            schedule.today
          }
          initialEnd={
            findTaskById(schedule.categories, schedule.selectedTaskId)?.end ??
            schedule.today
          }
          onClose={() => setAddOpen(false)}
          onSave={(input) => {
            const id = schedule.addTask(input);
            setAddOpen(false);
            if (id != null) setFocusTaskId(id);
          }}
        />
      ) : null}
      {deleteMilestoneId != null ? (
        <DeleteMilestoneDialog
          milestoneName={
            schedule.milestones.find((item) => item.id === deleteMilestoneId)
              ?.name ?? "このマイルストン"
          }
          hasLinkedTasks={milestoneLinkedByAnyTask(
            schedule.categories,
            deleteMilestoneId,
          )}
          onClose={() => setDeleteMilestoneId(null)}
          onConfirm={() => {
            schedule.deleteMilestone(deleteMilestoneId);
            setDeleteMilestoneId(null);
          }}
        />
      ) : null}
      {deleteOpen && schedule.selectedTaskId != null ? (
        <DeleteTaskDialog
          taskName={
            findTaskById(schedule.categories, schedule.selectedTaskId)?.name ??
            "このタスク"
          }
          hasDependencies={
            dependencyCount(schedule.categories, schedule.selectedTaskId) > 0
          }
          onClose={() => setDeleteOpen(false)}
          onConfirm={() => {
            if (schedule.selectedTaskId != null) {
              schedule.deleteTask(schedule.selectedTaskId);
            }
            setDeleteOpen(false);
          }}
        />
      ) : null}
      {settingsOpen ? (
        <SettingsDialog
          open={settingsOpen}
          settings={memberCatalogState.settings}
          selectedCatalogLabel={memberCatalogState.selectedCatalogLabel}
          displayScalePreference={displayScalePreference}
          onDisplayScaleChange={handleDisplayScaleChange}
          colorSchemePreference={colorSchemePreference}
          onColorSchemeChange={handleColorSchemeChange}
          onClose={() => setSettingsOpen(false)}
          onImport={memberCatalogState.importCatalog}
          onSelectCatalog={memberCatalogState.selectCatalog}
          onDeleteCatalog={memberCatalogState.removeCatalog}
          calendarLabel={appCalendarState.label}
          calendarError={appCalendarState.error}
          onImportCalendar={appCalendarState.importCalendar}
          onDeleteCalendar={appCalendarState.removeCalendar}
        />
      ) : null}
      <JsonDialog
        json={jsonOpen ? scheduleFile.currentJson : ""}
        open={jsonOpen}
        onClose={() => setJsonOpen(false)}
      />
      <DiffDialog
        text={diffText ?? ""}
        open={diffText != null}
        onClose={() => setDiffText(null)}
      />
      {scheduleFile.discardPromptOpen ? (
        <DiscardChangesDialog
          onConfirm={scheduleFile.confirmDiscardAndOpen}
          onCancel={scheduleFile.cancelDiscard}
        />
      ) : null}
      {scheduleFile.closePromptOpen ? (
        <DiscardChangesDialog
          title="未保存の変更があります"
          message="サンプルの変更は保存されていません。閉じると失われます。ウィンドウを閉じますか？"
          confirmLabel="閉じる"
          onConfirm={scheduleFile.confirmDiscardAndClose}
          onCancel={scheduleFile.cancelClose}
        />
      ) : null}
      {scheduleFile.recoveryConflictOpen &&
      scheduleFile.recoveryConflictLabel ? (
        <RecoveryConflictDialog
          fileLabel={scheduleFile.recoveryConflictLabel}
          missing={scheduleFile.recoveryConflictMissing}
          onOpenDisk={scheduleFile.confirmRecoveryOpenDisk}
          onRestoreEdits={scheduleFile.confirmRecoveryRestoreEdits}
        />
      ) : null}
      {scheduleFile.missingScheduleLabel ? (
        <MissingScheduleFileDialog
          fileLabel={scheduleFile.missingScheduleLabel}
          onClose={scheduleFile.dismissMissingSchedule}
        />
      ) : null}
      {scheduleFile.recoveryInvalidOpen &&
      scheduleFile.recoveryInvalidMessage ? (
        <RecoveryInvalidDialog
          message={scheduleFile.recoveryInvalidMessage}
          onClose={scheduleFile.dismissRecoveryInvalid}
          onDiscard={scheduleFile.discardRecoveryDraft}
        />
      ) : null}
      {scheduleFile.externalChangeOpen ? (
        <ExternalChangeDialog
          onOverwrite={scheduleFile.confirmExternalOverwrite}
          onSaveAs={scheduleFile.confirmExternalSaveAs}
          onCancel={scheduleFile.cancelExternalChange}
        />
      ) : null}
      {scheduleFile.externalReloadOpen ? (
        <ExternalReloadDialog
          onReload={scheduleFile.confirmExternalReload}
          onKeepLocal={scheduleFile.keepLocalEditsOnExternalReload}
        />
      ) : null}
      {scheduleFile.errorMessage ? (
        <ScheduleErrorDialog
          message={scheduleFile.errorMessage}
          onClose={scheduleFile.dismissError}
        />
      ) : null}
      {exportOpen ? (
        <ExportFormatDialog
          onCancel={() => setExportOpen(false)}
          onExport={(format) => {
            setExportOpen(false);
            void runScheduleExport(format);
          }}
        />
      ) : null}
      {exportError ? (
        <ScheduleErrorDialog
          title="書き出しに失敗しました"
          message={exportError}
          onClose={() => setExportError(null)}
        />
      ) : null}
      {diffError ? (
        <ScheduleErrorDialog
          message={diffError}
          onClose={() => setDiffError(null)}
        />
      ) : null}
    </div>
  );
}

export default App;
