import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  GitBranch,
  Pencil,
  StickyNote,
  Trash2,
} from "lucide-react";
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
import { DeleteHierarchyDialog } from "./components/DeleteHierarchyDialog";
import { HierarchyNameDialog } from "./components/HierarchyNameDialog";
import { MilestoneEditDialog } from "./components/MilestoneEditDialog";
import { TaskAddDialog } from "./components/TaskAddDialog";
import { Sidebar } from "./components/Sidebar";
import {
  TaskDetailPanel,
  type TaskDetailPanelHandle,
} from "./components/TaskDetailPanel";
import { TaskEditDialog } from "./components/TaskEditDialog";
import { TaskNoteDialog } from "./components/TaskNoteDialog";
import { Timeline } from "./components/Timeline";
import { SettingsDialog } from "./components/SettingsDialog";
import { ExportFormatDialog } from "./components/ExportFormatDialog";
import { ActiveFilterBar } from "./components/ActiveFilterBar";
import { AppToast } from "./components/AppToast";
import { ShortcutsDialog } from "./components/ShortcutsDialog";
import { CommandPalette } from "./components/CommandPalette";
import type { CommandPaletteCommandId } from "./model/commandPalette";
import { StatusBar } from "./components/StatusBar";
import { Toolbar, type SearchField } from "./components/Toolbar";
import { ContextMenu, type ContextMenuItem } from "./components/ContextMenu";
import {
  deleteShortcutHint,
  editShortcutHint,
  noteShortcutHint,
  usesCommandKey,
} from "./model/shortcuts";
import { useAppKeyboard } from "./hooks/useAppKeyboard";
import { useMacOSAppMenu } from "./hooks/useMacOSAppMenu";
import { useWindowTitle } from "./hooks/useWindowTitle";
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
import { isoDateAtChartX, parseDate } from "./model/dates";
import { resizeEndIso, resizeStartIso } from "./model/dragDates";
import {
  layoutMilestones,
  milestoneBandHeightPx,
} from "./model/milestones";
import type { ChartPointer } from "./model/chartHitTest";
import { findTaskById } from "./model/rows";
import {
  layoutStickyHeaders,
  scrollYToRevealTask,
} from "./model/stickyRows";
import { findTaskPlace } from "./model/tasks";
import { scaledLayoutSizes } from "./model/layoutSizes";
import { computeTimelineRange, taskBarWidthPx } from "./model/timeline";
import type { ScheduleId, Task } from "./model/types";
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
  stepDisplayScale,
  writeDisplayScalePreference,
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
import {
  readRowDensity,
  readShowLightning,
  readSidebarColumns,
  type RowDensity,
  type SidebarColumnsPreference,
} from "./model/viewPreferences";
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
    }
  | { kind: "addMilestone"; date: string; x: number; y: number };

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
  const displayScalePreferenceRef = useRef(displayScalePreference);
  displayScalePreferenceRef.current = displayScalePreference;
  const [colorSchemePreference, setColorSchemePreference] = useState(
    readColorSchemePreference,
  );
  const [resolvedColorScheme, setResolvedColorScheme] = useState(
    (): ResolvedColorScheme => resolveColorScheme(readColorSchemePreference()),
  );
  const [uiScale, setUiScale] = useState(readUiScale);
  const uiScaleRef = useRef(uiScale);
  uiScaleRef.current = uiScale;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<
    "display" | "members" | "calendar"
  >("display");
  const [rowDensity, setRowDensity] = useState<RowDensity>(readRowDensity);
  const [showLightningLine, setShowLightningLine] = useState(readShowLightning);
  const [sidebarColumns, setSidebarColumns] = useState<SidebarColumnsPreference>(
    readSidebarColumns,
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [searchField, setSearchField] = useState<SearchField>("name");
  const [diffText, setDiffText] = useState<string | null>(null);
  const [diffError, setDiffError] = useState<string | null>(null);
  const diffRequestRef = useRef(0);
  const [addOpen, setAddOpen] = useState(false);
  const [addMilestoneOpen, setAddMilestoneOpen] = useState(false);
  const [addMilestoneInitialDate, setAddMilestoneInitialDate] = useState<
    string | null
  >(null);
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
    hoverTaskId: null,
  });
  const [hoveredTaskId, setHoveredTaskId] = useState<ScheduleId | null>(null);
  const [detailPanelEditing, setDetailPanelEditing] = useState(false);
  const detailPanelRef = useRef<TaskDetailPanelHandle>(null);
  const taskSearchRef = useRef<HTMLInputElement>(null);

  const { headerHeight, rowHeight, barHeight, milestoneLaneHeight } =
    scaledLayoutSizes(uiScale, rowDensity);
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

  const blockDocumentEditsRef = useRef(false);
  const schedule = useSchedule(
    SAMPLE_PROJECT_TITLE,
    sampleCategories,
    sampleMilestones,
    rowHeight,
    memberCatalogState.members,
    blockDocumentEditsRef,
  );
  const {
    redo,
    undo,
    setTaskStart,
    setTaskEnd,
    visibleRows,
    moveTaskByDays,
    shiftTaskEndByDays,
  } = schedule;
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
    schedule.today,
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
    setTierZoom,
    scrollToToday,
    panBy,
    scrollBy,
    tierLabel,
    handleWheel,
    xToDate,
    reveal,
    pxPerDay,
    scrollX,
    scrollY,
    tier,
    dateToX,
  } = view;

  const filterAssigneeLabel = useMemo(
    () =>
      schedule.assigneeFilterOptions.find(
        (option) => option.id === schedule.filters.assignee,
      )?.label ?? null,
    [schedule.assigneeFilterOptions, schedule.filters.assignee],
  );

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
      detailPanelEditing ||
      schedule.editingNoteTask != null ||
      schedule.editingMilestone != null ||
      schedule.editingHierarchyTarget != null ||
      schedule.addingHierarchyTarget != null ||
      schedule.deletingHierarchyTarget != null,
    blockDocumentEditsRef,
  });

  useWindowTitle(scheduleFile.displayFileName, scheduleFile.isDirty);

  useEffect(() => {
    if (!scheduleFile.reloadNotice) return;
    setToastMessage("ファイルを反映しました");
    const timer = window.setTimeout(() => setToastMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [scheduleFile.reloadNotice]);

  const { visibleTaskCount, totalTaskCount } = useMemo(() => {
    const total = listTasks(schedule.categories).length;
    const visible = schedule.visibleRows.filter((row) => row.type === "task").length;
    return { visibleTaskCount: visible, totalTaskCount: total };
  }, [schedule.categories, schedule.visibleRows]);

  const {
    categories,
    selectedTaskId,
    openEditDialog,
    openDuplicateDialog,
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
  const clearLinkMode = useCallback(() => {
    setLinkSourceId(null);
    setLinkError(null);
  }, []);
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);
  const requestDeleteTask = useCallback(() => {
    setDeleteOpen(true);
  }, []);

  const revealTaskRow = useCallback(
    (taskId: ScheduleId) => {
      const row = visibleRows.find(
        (item) => item.type === "task" && item.task.id === taskId,
      );
      if (!row || row.type !== "task") return;
      reveal(
        parseDate(row.task.start),
        scrollYToRevealTask(visibleRows, row.y, rowHeight, bodyHeight),
        taskBarWidthPx(row.task, dateToX, pxPerDay),
      );
    },
    [bodyHeight, dateToX, pxPerDay, reveal, rowHeight, visibleRows],
  );

  const focusDetailName = useCallback(() => {
    detailPanelRef.current?.focusName();
  }, []);

  const openTaskForEdit = useCallback(
    (task: Task) => {
      openEditDialog(task);
      requestAnimationFrame(() => focusDetailName());
    },
    [focusDetailName, openEditDialog],
  );

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

  const onWheelSidebar = useCallback(
    (event: WheelEvent) => {
      handleWheel(event, 0, "body");
    },
    [handleWheel],
  );

  const taskRefs = useMemo(
    () => listTasks(schedule.categories),
    [schedule.categories],
  );
  const selectedDetailTask = useMemo(
    () =>
      schedule.selectedTaskId == null
        ? null
        : findTaskById(schedule.categories, schedule.selectedTaskId),
    [schedule.categories, schedule.selectedTaskId],
  );
  const selectedDetailSuccessors = useMemo(
    () =>
      selectedDetailTask
        ? successorIds(schedule.categories, selectedDetailTask.id)
        : [],
    [schedule.categories, selectedDetailTask],
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

  const stickyLayout = useMemo(
    () => layoutStickyHeaders(visibleRows, scrollY, rowHeight, bodyHeight),
    [bodyHeight, rowHeight, scrollY, visibleRows],
  );

  useEffect(() => {
    if (focusTaskId == null) return;
    const row = visibleRows.find(
      (item) => item.type === "task" && item.task.id === focusTaskId,
    );
    if (!row || row.type !== "task") return;
    reveal(
      parseDate(row.task.start),
      scrollYToRevealTask(visibleRows, row.y, rowHeight, bodyHeight),
      taskBarWidthPx(row.task, dateToX, pxPerDay),
    );
    setFocusTaskId(null);
  }, [bodyHeight, dateToX, focusTaskId, pxPerDay, reveal, rowHeight, visibleRows]);

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
          showLightningLine,
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
      showLightningLine,
    ],
  );

  const loadScheduleDiffText = useCallback(async (): Promise<
    { ok: true; text: string } | { ok: false; message: string; showDialog: boolean }
  > => {
    if (!isTauri() || !scheduleFile.filePath) {
      return {
        ok: false,
        message: NO_OPEN_SCHEDULE_FILE_MESSAGE,
        showDialog: true,
      };
    }
    const screenJson = scheduleFile.currentJson;
    const filename = scheduleJsonFilename(scheduleFile.filePath) ?? "schedule.json";
    try {
      const contents = await readOpenScheduleFileViaTauri();
      const fileParsed = parseScheduleText(contents);
      if (!fileParsed.ok) {
        return { ok: false, message: fileParsed.message, showDialog: false };
      }
      const screenParsed = parseScheduleText(screenJson);
      if (!screenParsed.ok) {
        return { ok: false, message: screenParsed.message, showDialog: false };
      }
      return {
        ok: true,
        text: formatScheduleDiff(
          screenParsed.document,
          fileParsed.document,
          filename,
        ),
      };
    } catch (error: unknown) {
      return {
        ok: false,
        message: errorMessage(error, "ファイルを読めません。"),
        showDialog: false,
      };
    }
  }, [scheduleFile.currentJson, scheduleFile.filePath]);

  const showScheduleDiff = useCallback(() => {
    if (scheduleFile.fileBusy) return;
    const requestId = diffRequestRef.current + 1;
    diffRequestRef.current = requestId;
    const stillCurrent = () => diffRequestRef.current === requestId;
    void loadScheduleDiffText().then((result) => {
      if (!stillCurrent()) return;
      if (!result.ok) {
        if (result.showDialog) {
          setDiffError(null);
          setDiffText(result.message);
        } else {
          setDiffText(null);
          setDiffError(result.message);
        }
        return;
      }
      setDiffError(null);
      setDiffText(result.text);
    });
  }, [loadScheduleDiffText, scheduleFile.fileBusy]);

  const copyScheduleDiff = useCallback(() => {
    if (scheduleFile.fileBusy) return;
    void loadScheduleDiffText().then(async (result) => {
      if (!result.ok) {
        if (result.showDialog) {
          setDiffError(null);
          setDiffText(result.message);
        } else {
          setDiffText(null);
          setDiffError(result.message);
        }
        return;
      }
      try {
        await navigator.clipboard.writeText(result.text);
        setToastMessage("差分をコピーしました");
        window.setTimeout(() => setToastMessage(null), 3000);
      } catch {
        setDiffError(null);
        setDiffText(result.text);
      }
    });
  }, [loadScheduleDiffText, scheduleFile.fileBusy]);

  const commandPaletteContext = useMemo(
    () => ({
      fileBusy: scheduleFile.fileBusy,
      canUndo: schedule.canUndo,
      canRedo: schedule.canRedo,
      selectedTaskId: schedule.selectedTaskId,
      linkSourceId,
      lineageActive:
        schedule.lineageTask?.id != null &&
        schedule.lineageTask.id === schedule.selectedTaskId,
    }),
    [
      linkSourceId,
      schedule.canRedo,
      schedule.canUndo,
      schedule.lineageTask,
      schedule.selectedTaskId,
      scheduleFile.fileBusy,
    ],
  );

  const runCommandPalette = useCallback(
    (id: CommandPaletteCommandId) => {
      const stepScale = (direction: "in" | "out") => {
        const next = stepDisplayScale(
          displayScalePreferenceRef.current,
          uiScaleRef.current,
          direction,
        );
        if (next == null) return;
        displayScalePreferenceRef.current = next;
        uiScaleRef.current = resolveUiScale(
          window.innerWidth,
          window.innerHeight,
          next,
        );
        writeDisplayScalePreference(next);
        handleDisplayScaleChange(next);
      };
      switch (id) {
        case "open":
          scheduleFile.requestOpen();
          break;
        case "save":
          void scheduleFile.save(false);
          break;
        case "saveAs":
          void scheduleFile.save(true);
          break;
        case "find":
          taskSearchRef.current?.focus();
          taskSearchRef.current?.select();
          break;
        case "showDiff":
          showScheduleDiff();
          break;
        case "copyDiff":
          copyScheduleDiff();
          break;
        case "showJson":
          setJsonOpen(true);
          break;
        case "export":
          setExportOpen(true);
          break;
        case "settings":
          setSettingsSection("display");
          setSettingsOpen(true);
          break;
        case "shortcuts":
          setShortcutsOpen(true);
          break;
        case "goToday":
          scrollToToday();
          break;
        case "tierDay":
          setTierZoom("day");
          break;
        case "tierWeek":
          setTierZoom("week");
          break;
        case "tierMonth":
          setTierZoom("month");
          break;
        case "fit":
          fitToWidth();
          break;
        case "undo":
          undo();
          break;
        case "redo":
          redo();
          break;
        case "displayScaleIn":
          stepScale("in");
          break;
        case "displayScaleOut":
          stepScale("out");
          break;
        case "editTask":
          if (schedule.selectedTaskId == null) break;
          focusDetailName();
          break;
        case "deleteTask":
          requestDeleteTask();
          break;
        case "link":
          toggleLinkMode();
          break;
        case "note":
          if (schedule.selectedTaskId != null) {
            schedule.openTaskNoteDialog(schedule.selectedTaskId);
          }
          break;
        case "lineage":
          schedule.toggleLineage();
          break;
        default:
          break;
      }
    },
    [
      copyScheduleDiff,
      fitToWidth,
      focusDetailName,
      handleDisplayScaleChange,
      redo,
      requestDeleteTask,
      schedule,
      scheduleFile,
      scrollToToday,
      setTierZoom,
      showScheduleDiff,
      toggleLinkMode,
      undo,
    ],
  );

  useAppKeyboard({
    rowHeight,
    scrollBy,
    fileBusy,
    save,
    requestOpen,
    categories,
    selectedTaskId,
    linkSourceId,
    toggleLinkMode,
    openTaskNote: schedule.openTaskNoteDialog,
    clearLinkMode,
    removePredecessorLink,
    chartPointerRef,
    closeContextMenu,
    requestDeleteTask,
    undo,
    redo,
    taskSearchRef,
    displayScalePreferenceRef,
    uiScaleRef,
    onDisplayScaleChange: handleDisplayScaleChange,
    onOpenShortcuts: () => setShortcutsOpen(true),
    commandPaletteOpen,
    onOpenCommandPalette: () => setCommandPaletteOpen(true),
    onCloseCommandPalette: () => setCommandPaletteOpen(false),
    visibleRows,
    selectTask: (taskId) => {
      schedule.selectTask(taskId);
      revealTaskRow(taskId);
    },
    moveTaskByDays,
    shiftTaskEndByDays,
    focusDetailName,
    copyScheduleDiff,
  });

  useMacOSAppMenu({
    fileBusy: () => scheduleFile.fileBusy,
    onOpen: scheduleFile.requestOpen,
    onSave: () => void scheduleFile.save(false),
    onSaveAs: () => void scheduleFile.save(true),
    onExportHtml: () => setExportOpen(true),
    onShowJson: () => setJsonOpen(true),
    onShowDiff: showScheduleDiff,
    onOpenShortcuts: () => setShortcutsOpen(true),
    onOpenSettings: () => {
      setSettingsSection("display");
      setSettingsOpen(true);
    },
    onGoToday: scrollToToday,
    onSetTier: setTierZoom,
    onFit: fitToWidth,
    onUndo: undo,
    onRedo: redo,
  });

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

  const openAddMilestoneContextMenu = useCallback(
    (chartX: number, clientX: number, clientY: number) => {
      if (linkSourceId != null) return;
      const date = isoDateAtChartX(
        range.timelineStart,
        scrollX,
        pxPerDay,
        chartX,
        range.totalDays,
      );
      if (date == null) return;
      setContextMenu({ kind: "addMilestone", date, x: clientX, y: clientY });
    },
    [linkSourceId, pxPerDay, range.timelineStart, range.totalDays, scrollX],
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
          type: "item",
          id: "edit",
          label: "編集",
          icon: <Pencil size={14} strokeWidth={2} />,
          onSelect: () => openMilestoneEdit(milestoneId),
        },
        ...(milestone
          ? [
              {
                type: "item" as const,
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
        { type: "separator", id: "milestone-sep" },
        {
          type: "item",
          id: "delete",
          label: "削除",
          danger: true,
          icon: <Trash2 size={14} strokeWidth={2} />,
          onSelect: () => setDeleteMilestoneId(milestoneId),
        },
      ];
    }
    if (contextMenu.kind === "link") {
      const { fromId, toId } = contextMenu;
      return [
        {
          type: "item",
          id: "unlink",
          label: "線を外す",
          onSelect: () => removePredecessorLink(fromId, toId),
        },
      ];
    }
    if (contextMenu.kind === "addMilestone") {
      const date = contextMenu.date;
      return [
        {
          type: "item",
          id: "add-milestone",
          label: "マイルストンを追加",
          onSelect: () => {
            setAddMilestoneInitialDate(date);
            setAddMilestoneOpen(true);
          },
        },
      ];
    }
    if (contextMenu.kind === "category") {
      const { id } = contextMenu;
      const items: ContextMenuItem[] = [
        {
          type: "item",
          id: "rename",
          label: "名前を変更",
          onSelect: () => openHierarchyEdit("category", id),
        },
        {
          type: "item",
          id: "add-category",
          label: "下にカテゴリを追加",
          onSelect: () => schedule.openAddCategoryAfter(id),
        },
        {
          type: "item",
          id: "add-group",
          label: "グループを追加",
          onSelect: () => schedule.openAddGroupToCategory(id),
        },
      ];
      if (schedule.canDeleteCategory(id)) {
        items.push(
          { type: "separator", id: "category-sep" },
          {
            type: "item",
            id: "delete",
            label: "削除",
            danger: true,
            icon: <Trash2 size={14} strokeWidth={2} />,
            onSelect: () => schedule.openDeleteHierarchy("category", id),
          },
        );
      }
      return items;
    }
    if (contextMenu.kind === "group") {
      const { id } = contextMenu;
      const items: ContextMenuItem[] = [
        {
          type: "item",
          id: "rename",
          label: "名前を変更",
          onSelect: () => openHierarchyEdit("group", id),
        },
        {
          type: "item",
          id: "add-group",
          label: "下にグループを追加",
          onSelect: () => schedule.openAddGroupAfter(id),
        },
      ];
      if (schedule.canDeleteGroup(id)) {
        items.push(
          { type: "separator", id: "group-sep" },
          {
            type: "item",
            id: "delete",
            label: "削除",
            danger: true,
            icon: <Trash2 size={14} strokeWidth={2} />,
            onSelect: () => schedule.openDeleteHierarchy("group", id),
          },
        );
      }
      return items;
    }
    const taskId = contextMenu.taskId;
    const task = findTaskById(categories, taskId);
    const lineageActive = lineageTask?.id === taskId;
    const commandKey = usesCommandKey(navigator.platform || navigator.userAgent);
    return [
      {
        type: "item",
        id: "edit",
        label: "編集",
        icon: <Pencil size={14} strokeWidth={2} />,
        shortcut: editShortcutHint(),
        onSelect: () => {
          if (task) openTaskForEdit(task);
        },
      },
      {
        type: "item",
        id: "duplicate",
        label: "複製",
        icon: <Copy size={14} strokeWidth={2} />,
        onSelect: () => openDuplicateDialog(taskId),
      },
      { type: "separator", id: "task-sep-1" },
      ...(task
        ? [
            {
              type: "item" as const,
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
        type: "item",
        id: "note",
        label: "ノート",
        icon: <StickyNote size={14} strokeWidth={2} />,
        shortcut: noteShortcutHint(commandKey),
        onSelect: () => openTaskNoteDialog(taskId),
      },
      { type: "separator", id: "task-sep-2" },
      {
        type: "item",
        id: "lineage",
        label: lineageActive ? "系統を解除" : "系統を表示",
        icon: <GitBranch size={14} strokeWidth={2} />,
        onSelect: () => {
          if (lineageActive) clearLineage();
          else showLineage(taskId);
        },
      },
      { type: "separator", id: "task-sep-3" },
      {
        type: "item",
        id: "delete",
        label: "削除",
        danger: true,
        icon: <Trash2 size={14} strokeWidth={2} />,
        shortcut: deleteShortcutHint(),
        onSelect: () => setDeleteOpen(true),
      },
    ];
  }, [
    categories,
    clearLineage,
    contextMenu,
    lineageTask?.id,
    milestones,
    openDuplicateDialog,
    openTaskForEdit,
    openHierarchyEdit,
    setMilestoneConfidence,
    setTaskConfidence,
    openMilestoneEdit,
    openTaskNoteDialog,
    removePredecessorLink,
    schedule,
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
        filters={schedule.filters}
        searchField={searchField}
        onSearchFieldChange={setSearchField}
        milestones={schedule.milestones}
        assigneeFilterOptions={schedule.assigneeFilterOptions}
        tier={tier}
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
        onGoToday={scrollToToday}
        onSetTier={setTierZoom}
        onFit={fitToWidth}
        onUndo={undo}
        onRedo={redo}
        canUndo={schedule.canUndo}
        canRedo={schedule.canRedo}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        onShowJson={() => setJsonOpen(true)}
        onShowDiff={showScheduleDiff}
        onOpen={scheduleFile.requestOpen}
        onSave={() => void scheduleFile.save(false)}
        onSaveAs={() => void scheduleFile.save(true)}
        onOpenSettings={() => {
          setSettingsSection("display");
          setSettingsOpen(true);
        }}
        onExportHtml={() => setExportOpen(true)}
        canDelete={schedule.selectedTaskId != null}
        onAdd={() => setAddOpen(true)}
        onAddMilestone={() => {
          setAddMilestoneInitialDate(null);
          setAddMilestoneOpen(true);
        }}
        onDelete={() => {
          if (schedule.selectedTaskId != null) setDeleteOpen(true);
        }}
        fileBusy={scheduleFile.fileBusy}
        taskSearchRef={taskSearchRef}
      />
      <ActiveFilterBar
        filters={schedule.filters}
        milestones={schedule.milestones}
        assigneeLabel={filterAssigneeLabel}
        lineageName={schedule.lineageTask?.name ?? null}
        onFiltersChange={schedule.updateFilters}
        onClearLineage={schedule.clearLineage}
      />
      <div ref={mainRef} className="main">
        <Sidebar
          categories={schedule.categories}
          rows={schedule.visibleRows}
          reorderBaseRows={schedule.baseVisibleRows}
          scrollY={scrollY}
          viewportHeight={bodyHeight}
          rowHeight={rowHeight}
          selectedTaskId={schedule.selectedTaskId}
          hoveredTaskId={hoveredTaskId}
          onSelectTask={(taskId) => {
            schedule.selectTask(taskId);
            revealTaskRow(taskId);
          }}
          reorderingTaskId={
            schedule.reorderPreview?.kind === "task"
              ? schedule.reorderPreview.taskId
              : null
          }
          reorderingCategoryId={
            schedule.reorderPreview?.kind === "category"
              ? schedule.reorderPreview.categoryId
              : null
          }
          reorderingGroupId={
            schedule.reorderPreview?.kind === "group"
              ? schedule.reorderPreview.groupId
              : null
          }
          reorderMarkerY={schedule.reorderInsertMarkerY}
          canEditDocument={!blockDocumentEditsRef.current}
          onPreviewTaskReorder={schedule.previewTaskReorder}
          onCommitTaskReorder={schedule.commitTaskReorder}
          onPreviewCategoryReorder={schedule.previewCategoryReorder}
          onCommitCategoryReorder={schedule.commitCategoryReorder}
          onPreviewGroupReorder={schedule.previewGroupReorder}
          onCommitGroupReorder={schedule.commitGroupReorder}
          onCancelReorder={schedule.cancelReorder}
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
          onWheelRows={onWheelSidebar}
          sticky={stickyLayout}
          sidebarColumns={sidebarColumns}
        />
        <div className="chart-detail">
        <div ref={timelineAreaRef} className="timeline-slot">
          {linkSourceId != null ? (
            <div className="link-banner" role="status">
              <div>次にクリックしたタスクを後続にします。Esc で中止</div>
              {linkError ? <div className="hint-error">{linkError}</div> : null}
            </div>
          ) : null}
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
            onOpenEdit={openTaskForEdit}
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
            onAddMilestoneContextMenu={openAddMilestoneContextMenu}
            onChartPointer={(pointer) => {
              chartPointerRef.current = pointer;
              setHoveredTaskId(pointer.hoverTaskId);
            }}
            sticky={stickyLayout}
            showLightningLine={showLightningLine}
          />
        </div>
        {selectedDetailTask ? (
          <TaskDetailPanel
            key={`${selectedDetailTask.id}:${schedule.diskEpoch}`}
            panelRef={detailPanelRef}
            task={selectedDetailTask}
            members={memberCatalogState.members ?? []}
            memberCatalog={memberCatalogState.memberMap}
            tasks={taskRefs}
            milestones={schedule.milestones}
            successorIds={selectedDetailSuccessors}
            onPatch={(patch) =>
              schedule.applyTaskPatch(selectedDetailTask.id, patch)
            }
            onEditingChange={setDetailPanelEditing}
          />
        ) : null}
        </div>
      </div>
      <StatusBar
        fileName={scheduleFile.displayFileName}
        saveStatus={scheduleFile.saveStatusLabel}
        saveStatusClickable={scheduleFile.isDirty}
        onSaveStatusClick={showScheduleDiff}
        membersCatalogLabel={memberCatalogState.selectedCatalogLabel}
        membersCatalogError={memberCatalogState.error}
        calendarError={appCalendarState.error}
        tier={tier}
        visibleTaskCount={visibleTaskCount}
        totalTaskCount={totalTaskCount}
        showDeferredReload={scheduleFile.showDeferredReload}
        onDeferredReload={scheduleFile.requestDeferredReload}
        onOpenSettingsMembers={() => {
          setSettingsSection("members");
          setSettingsOpen(true);
        }}
        onOpenSettingsCalendar={() => {
          setSettingsSection("calendar");
          setSettingsOpen(true);
        }}
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />
      <AppToast message={toastMessage} />
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
      {schedule.duplicatingTask ? (
        <TaskEditDialog
          key={`duplicate-${schedule.duplicatingTask.id}:${schedule.diskEpoch}`}
          mode="duplicate"
          task={schedule.duplicatingTask}
          members={memberCatalogState.members ?? []}
          memberCatalog={memberCatalogState.memberMap}
          tasks={taskRefs}
          milestones={schedule.milestones}
          successorIds={[]}
          excludeTaskId={null}
          onClose={schedule.closeDuplicateDialog}
          onSave={(patch) => {
            const result = schedule.duplicateTask(patch);
            if (!result.ok) return result.error;
            setFocusTaskId(result.id);
            return null;
          }}
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
      {schedule.addingHierarchyTarget ? (
        <HierarchyNameDialog
          key={`add:${schedule.addingHierarchyTarget.title}:${schedule.diskEpoch}`}
          title={schedule.addingHierarchyTarget.title}
          initialName={schedule.addingHierarchyTarget.initialName}
          primaryLabel="追加"
          onClose={schedule.closeAddingHierarchy}
          onSave={schedule.saveHierarchyAdd}
        />
      ) : null}
      {schedule.deletingHierarchyTarget ? (
        <DeleteHierarchyDialog
          kind={schedule.deletingHierarchyTarget.kind}
          name={schedule.deletingHierarchyTarget.name}
          onClose={schedule.closeDeleteHierarchy}
          onConfirm={schedule.confirmDeleteHierarchy}
        />
      ) : null}
      {addMilestoneOpen ? (
        <MilestoneAddDialog
          initialDate={addMilestoneInitialDate ?? schedule.today}
          onClose={() => {
            setAddMilestoneOpen(false);
            setAddMilestoneInitialDate(null);
          }}
          onSave={(input) => {
            const message = schedule.addMilestone(input);
            if (message == null) {
              setAddMilestoneOpen(false);
              setAddMilestoneInitialDate(null);
            }
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
          rowDensity={rowDensity}
          onRowDensityChange={setRowDensity}
          showLightningLine={showLightningLine}
          onShowLightningLineChange={setShowLightningLine}
          sidebarColumns={sidebarColumns}
          onSidebarColumnsChange={setSidebarColumns}
          initialSection={settingsSection}
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
      <ShortcutsDialog
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
      <CommandPalette
        open={commandPaletteOpen}
        context={commandPaletteContext}
        onClose={() => setCommandPaletteOpen(false)}
        onRun={runCommandPalette}
      />
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
