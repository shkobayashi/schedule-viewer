import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { DiffStrip } from "./components/DiffStrip";
import { JsonDialog } from "./components/JsonDialog";
import { ScheduleErrorDialog } from "./components/ScheduleErrorDialog";
import { MilestoneAddDialog } from "./components/MilestoneAddDialog";
import { DeleteHierarchyDialog } from "./components/DeleteHierarchyDialog";
import { HierarchyNameDialog } from "./components/HierarchyNameDialog";
import { OutlineHeadingAddDialog } from "./components/OutlineHeadingAddDialog";
import { MilestoneEditDialog } from "./components/MilestoneEditDialog";
import { TaskAddDialog } from "./components/TaskAddDialog";
import { Sidebar } from "./components/Sidebar";
import { BulkTaskDetailPanel } from "./components/BulkTaskDetailPanel";
import {
  TaskDetailPanel,
  type TaskDetailPanelHandle,
} from "./components/TaskDetailPanel";
import { visibleTaskIds } from "./model/taskSelection";
import { TaskEditDialog } from "./components/TaskEditDialog";
import { TaskNoteDialog } from "./components/TaskNoteDialog";
import { Timeline } from "./components/Timeline";
import { SettingsDialog } from "./components/SettingsDialog";
import { ExportFormatDialog } from "./components/ExportFormatDialog";
import { ActiveFilterBar } from "./components/ActiveFilterBar";
import { AppToast } from "./components/AppToast";
import { GuideDialog } from "./components/GuideDialog";
import { HierarchyLevelsDialog } from "./components/HierarchyLevelsDialog";
import { ShortcutsDialog } from "./components/ShortcutsDialog";
import { CommandPalette } from "./components/CommandPalette";
import type { CommandPaletteRunTarget } from "./model/commandPalette";
import { StatusBar } from "./components/StatusBar";
import { Toolbar } from "./components/Toolbar";
import type { ScheduleToolbarTitleHandle } from "./components/ScheduleToolbarTitle";
import { ContextMenu, type ContextMenuItem } from "./components/ContextMenu";
import {
  deleteShortcutHint,
  duplicateTaskShortcutHint,
  editShortcutHint,
  noteShortcutHint,
  usesCommandKey,
} from "./model/shortcuts";
import { useAppKeyboard } from "./hooks/useAppKeyboard";
import { useMacOSAppMenu } from "./hooks/useMacOSAppMenu";
import { useRecentFiles } from "./hooks/useRecentFiles";
import { useWindowTitle } from "./hooks/useWindowTitle";
import { useMemberCatalog } from "./hooks/useMemberCatalog";
import { useStatusCatalog } from "./hooks/useStatusCatalog";
import { useStatusCatalogEditorOverlay } from "./hooks/useStatusCatalogEditorOverlay";
import { StatusCatalogEditorOverlay } from "./components/StatusCatalogEditorOverlay";
import { useColorCatalog } from "./hooks/useColorCatalog";
import { useColorCatalogEditorOverlay } from "./hooks/useColorCatalogEditorOverlay";
import { useMemberCatalogEditorOverlay } from "./hooks/useMemberCatalogEditorOverlay";
import { MemberCatalogEditorOverlay } from "./components/MemberCatalogEditorOverlay";
import type { MemberCatalogEditorPanelHandle } from "./components/MemberCatalogEditorPanel";
import { ColorCatalogEditorOverlay } from "./components/ColorCatalogEditorOverlay";
import {
  FieldExtensionEditorOverlay,
  type FieldExtensionEditorOverlayHandle,
} from "./components/FieldExtensionEditorOverlay";
import { useFieldExtensionEditorOverlay } from "./hooks/useFieldExtensionEditorOverlay";
import {
  clearWorkspaceEditableFieldExtension,
  createWorkspaceEditableFieldExtension,
  deleteWorkspaceEditableFieldExtension,
  saveFieldExtensionJson,
} from "./model/fieldExtensionAppData";
import {
  fieldExtensionDocumentToJson,
  newEmptyExtensionDocument,
  nextFieldExtensionCatalogId,
} from "./model/fieldExtensionEdit";
import type { StatusCatalogEditorPanelHandle } from "./components/StatusCatalogEditorPanel";
import type { ColorCatalogEditorPanelHandle } from "./components/ColorCatalogEditorPanel";
import { starterColorCatalogDocument } from "./model/colorCatalog";
import { createWorkspaceColorsCatalog } from "./model/colorAppData";
import { colorsToJson } from "./model/colorEdit";
import { useAppCalendar } from "./hooks/useAppCalendar";
import { useWorkspaceBinding } from "./hooks/useWorkspaceBinding";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { exportWorkspaceBundleViaTauri } from "./model/workspaceExport";
import {
  buildFieldExtensionExportFiles,
  fieldExtensionExportTooLargeMessage,
} from "./model/workspaceFieldExtensionExport";
import { safeScheduleJsonFilename } from "./model/scheduleFile";
import {
  REPLACE_SCHEDULE_APPLIED_BASELINE_SAME_TOAST,
  REPLACE_SCHEDULE_APPLIED_TOAST,
  assessMcpReplaceUiBlocking,
  type ReplaceScheduleDocumentResult,
} from "./model/replaceSchedule";
import { memberMapFromList } from "./model/assigneeDisplay";
import { mcpMembersForReadTools } from "./model/screenContext";
import {
  catalogMismatchBannerText,
  catalogMismatchFlags,
  CATALOG_MISMATCH_CLEARED_ANNOUNCEMENT,
  type CatalogMismatchFlags,
} from "./model/catalogMismatch";
import { useFieldExtensionCatalog } from "./hooks/useFieldExtensionCatalog";
import {
  firstFieldKeyCollision,
  formatFieldKeyCollisionMessage,
  knownFieldKeysFromDefs,
  mergeExtensionFieldDefs,
} from "./model/fieldExtensionMerge";
import {
  parseFieldExtensionCatalogText,
  readFieldExtensionDocumentsForIds,
} from "./model/fieldExtensionAppData";
import { BUILTIN_STATUS_ITEMS } from "./model/statusCatalog";
import {
  workspaceCalendarError,
  workspaceCalendarForDisplay,
  workspaceMemberCatalogLabel,
  workspaceMemberError,
  workspaceMembersForDisplay,
  workspaceStatusesForDisplay,
  workspaceColorsForDisplay,
  workspaceColorsError,
  workspaceEditableFieldExtensionError,
  workspaceFieldExtensionsError,
  workspaceFieldExtensionsForDisplay,
  workspaceMergedFieldExtensionsForDisplay,
  workspacePinnedFieldExtensionPluginIds,
} from "./model/workspaceLoad";
import { useSchedule } from "./hooks/useSchedule";
import { useAppUpdateFlow } from "./hooks/useAppAutoUpdate";
import { readStoreDistribution } from "./model/storeDistribution";
import { UpdateOfferNotice } from "./components/UpdateOfferNotice";
import { getVersion } from "@tauri-apps/api/app";
import { pickSaveableBetaVersion } from "./model/betaRelease";
import { normalizeVersionLabel } from "./model/releaseNotes";
import {
  fetchBetaReleaseTagsViaTauri,
  saveBetaInstallerViaTauri,
} from "./model/windowSession";
import { useScheduleFile } from "./hooks/useScheduleFile";
import {
  addTopLevelMenuLabel as addTopLevelMenuLabelFromLayout,
  LEGACY_THREE_LEVEL_COUNT,
  LEGACY_THREE_LEVEL_DEFS,
  legacyCategoryParentSelectOptions,
  collectTasksFromDocument,
  findTaskInDocument,
  listTaskRefsFromDocument,
  HIERARCHY_MISMATCH_MESSAGE,
} from "./model/hierarchy";
import { useSharedSettingsRevision } from "./hooks/useSharedSettingsRevision";
import { useTimelineView } from "./hooks/useTimelineView";
import { NO_OPEN_SCHEDULE_FILE_MESSAGE } from "./model/scheduleDiff";
import { loadScheduleDiffText as loadScheduleDiffTextCore } from "./model/scheduleDiffLoad";
import {
  emptyDiffNavigationMark,
  resolveDiffNavigation,
  type DiffNavigationMark,
  type DiffRevealPlan,
} from "./model/diffNavigation";
import type { ScheduleDiffEntry } from "./model/scheduleDiffEntry";
import { collapsedSetFromIds } from "./model/scheduleFilterPersistence";
import { scrollXToRevealTask } from "./model/chartScroll";
import {
  type DiffStripContentKind,
  type DiffStripView,
  diffStripAriaStatus,
  resolveStripAfterAutoLoad,
  resolveStripAfterExplicitLoad,
  shouldDeferBodyUpdate,
} from "./model/diffStripVisibility";
import { useMcpScreenBridge } from "./hooks/useMcpScreenBridge";
import {
  isTauri,
  serializeScheduleDocument,
} from "./model/scheduleFile";
import {
  dependencyCountFromTasks,
  successorIdsFromTasks,
  visibleLinksFromTasks,
} from "./model/dependencies";
import { visibleConnectionsFromTasks, connectionsForTask } from "./model/connections";
import { milestoneLinkedByAnyTask } from "./model/milestones";
import {
  exportSchedule,
  ScheduleExportTooLargeError,
  type ScheduleExportFormat,
} from "./model/exportHtml";
import { exportScheduleExcel } from "./model/exportExcel";
import {
  DEFAULT_EXCEL_EXPORT_COLUMNS,
  readExcelExportFieldColumns,
  type ExcelExportFieldColumnsPreference,
} from "./model/excelExportColumns";
import {
  describeActiveFilters,
  exportTimelineRange,
  milestonesForExport,
} from "./model/exportView";
import { addDays, isoDateAtChartX, parseDate } from "./model/dates";
import { resizeEndIso, resizeStartIso } from "./model/dragDates";
import {
  layoutMilestoneBand,
  milestoneBandHeightPx,
  milestoneGroupIdAtBandY,
  toggleMilestoneGuideLinesForGroup,
  type MilestoneBandLayout,
} from "./model/milestones";
import type { ChartPointer } from "./model/chartHitTest";
import { hasOtherVisibleMilestoneBandGroup } from "./model/filterChips";
import {
  layoutStickyHeaders,
  scrollYToRevealTask,
  scrollYToShowSelectedTask,
} from "./model/stickyRows";
import {
  findOutlineBranchLevelIndex,
  taskParentLevelIndex,
} from "./model/outlineCrud";
import {
  canDeleteCategory,
  canDeleteGroup,
  findTaskPlace,
} from "./model/tasks";
import {
  LAYOUT_HEADER_HEIGHT,
  scaledLayoutSizes,
} from "./model/layoutSizes";
import {
  computeTimelineRange,
  gridTier,
  taskBarWidthPx,
} from "./model/timeline";
import { extraTimelineDaysForRightEdge } from "./model/timelineRightPadding";
import {
  SCHEDULE_SCHEMA_VERSION,
  type ScheduleDocument,
  type ScheduleId,
  type Task,
} from "./model/types";
import {
  AUTO_UPDATE_LS_KEY,
  readAutoUpdateEnabled,
  writeAutoUpdateEnabled,
} from "./model/autoUpdate";
import {
  applyResolvedColorScheme,
  COLOR_SCHEME_LS_KEY,
  readColorSchemePreference,
  resolveColorScheme,
  subscribeSystemColorScheme,
  type ColorSchemePreference,
} from "./model/colorScheme";
import type { ResolvedColorScheme } from "./model/palette";
import {
  DISPLAY_SCALE_LS_KEY,
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
  SIDEBAR_WIDTH_LS_KEY,
  writeSidebarWidth,
} from "./model/sidebarWidth";
import {
  readRowDensity,
  readShowLightning,
  readSidebarColumns,
  ROW_DENSITY_LS_KEY,
  SHOW_LIGHTNING_LS_KEY,
  SIDEBAR_COLUMNS_LS_KEY,
  type RowDensity,
  type SidebarColumnsPreference,
} from "./model/viewPreferences";
import { SETTINGS_REVISION_KEY } from "./model/sharedSettingsRevision";
import { seedSampleMemberCatalogOnce } from "./model/memberAppData";
import {
  SAMPLE_MEMBERS_CATALOG_ID,
} from "./sample/ids";
import { sampleMembersJson } from "./sample/members";
import {
  SAMPLE_PROJECT_TITLE,
  sampleCategories,
  sampleMilestoneGroups,
  sampleMilestones,
} from "./sample/schedule";

const INITIAL_BASELINE_JSON = serializeScheduleDocument(
  SAMPLE_PROJECT_TITLE,
  sampleCategories,
  sampleMilestoneGroups,
  sampleMilestones,
  null,
  null,
  null,
);

type ContextMenuState =
  | { kind: "task"; taskId: ScheduleId; x: number; y: number }
  | { kind: "milestone"; milestoneId: ScheduleId; x: number; y: number }
  | { kind: "category"; id: ScheduleId; x: number; y: number }
  | { kind: "group"; id: ScheduleId; x: number; y: number }
  | { kind: "hierarchy"; id: ScheduleId; x: number; y: number }
  | {
      kind: "link";
      fromId: ScheduleId;
      toId: ScheduleId;
      linkKind: "predecessor" | "connection";
      x: number;
      y: number;
    }
  | {
      kind: "addMilestone";
      date: string;
      groupId: ScheduleId | null;
      x: number;
      y: number;
    }
  | { kind: "milestoneGroup"; groupId: ScheduleId; x: number; y: number };

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
  const statusEditorOverlayRef = useRef<
    ReturnType<typeof useStatusCatalogEditorOverlay> | null
  >(null);
  const colorEditorOverlayRef = useRef<
    ReturnType<typeof useColorCatalogEditorOverlay> | null
  >(null);
  const memberEditorOverlayRef = useRef<
    ReturnType<typeof useMemberCatalogEditorOverlay> | null
  >(null);
  const statusCatalogEditorPanelRef = useRef<StatusCatalogEditorPanelHandle | null>(
    null,
  );
  const colorCatalogEditorPanelRef = useRef<ColorCatalogEditorPanelHandle | null>(
    null,
  );
  const memberCatalogEditorPanelRef = useRef<MemberCatalogEditorPanelHandle | null>(
    null,
  );
  const fieldExtensionEditorPanelRef =
    useRef<FieldExtensionEditorOverlayHandle | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [openColorCatalogEditorAfterWorkspaceCreate, setOpenColorCatalogEditorAfterWorkspaceCreate] =
    useState(false);
  const [settingsSection, setSettingsSection] = useState<
    | "display"
    | "members"
    | "fieldExtensions"
    | "statuses"
    | "colors"
    | "calendar"
    | "updates"
    | "mcp"
    | "jsonSkills"
  >("display");
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(
    readAutoUpdateEnabled,
  );
  const [rowDensity, setRowDensity] = useState<RowDensity>(readRowDensity);
  const [showLightningLine, setShowLightningLine] = useState(readShowLightning);
  const [sidebarColumns, setSidebarColumns] = useState<SidebarColumnsPreference>(
    readSidebarColumns,
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [updateOfferHeight, setUpdateOfferHeight] = useState(0);
  const [betaInstallerStatusLine, setBetaInstallerStatusLine] = useState<
    string | null
  >(null);
  const [storeDistribution, setStoreDistribution] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const openGuide = useCallback(() => {
    setShortcutsOpen(false);
    setGuideOpen(true);
  }, []);
  const openShortcuts = useCallback(() => {
    setGuideOpen(false);
    setShortcutsOpen(true);
  }, []);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [diffStrip, setDiffStrip] = useState<DiffStripView>({ visible: false });
  const [diffPanelExpanded, setDiffPanelExpanded] = useState(false);
  const [diffLiveStatus, setDiffLiveStatus] = useState<string | null>(null);
  const [diffFocusListOnMount, setDiffFocusListOnMount] = useState(false);
  const [diffEntries, setDiffEntries] = useState<ScheduleDiffEntry[]>([]);
  const [diffActiveIndex, setDiffActiveIndex] = useState(0);
  const [diffRowStatus, setDiffRowStatus] = useState<string | null>(null);
  const [diffNavigationMark, setDiffNavigationMark] =
    useState<DiffNavigationMark>(emptyDiffNavigationMark());
  const clearDiffNavigationMark = useCallback(() => {
    setDiffNavigationMark(emptyDiffNavigationMark());
    setDiffRowStatus(null);
  }, []);
  const [explicitEmptyPinned, setExplicitEmptyPinned] = useState(false);
  const explicitEmptyPinnedRef = useRef(false);
  explicitEmptyPinnedRef.current = explicitEmptyPinned;
  const [diffError, setDiffError] = useState<string | null>(null);
  const diffRequestRef = useRef(0);
  const diffStripFocusedRef = useRef(false);
  const pendingDiffBodyRef = useRef<string | null>(null);
  const pendingDiffEntriesRef = useRef<ScheduleDiffEntry[] | null>(null);
  const diffListRef = useRef<HTMLDivElement>(null);
  const prevDiffStripKindRef = useRef<DiffStripContentKind | null>(null);
  const diffStripRef = useRef<DiffStripView>({ visible: false });
  diffStripRef.current = diffStrip;
  const [addOpen, setAddOpen] = useState(false);
  const [addMilestoneOpen, setAddMilestoneOpen] = useState(false);
  const [addMilestoneInitialDate, setAddMilestoneInitialDate] = useState<
    string | null
  >(null);
  const [addMilestoneInitialGroupId, setAddMilestoneInitialGroupId] = useState<
    ScheduleId | null
  >(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteMilestoneId, setDeleteMilestoneId] = useState<ScheduleId | null>(
    null,
  );
  const [focusTaskId, setFocusTaskId] = useState<ScheduleId | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [linkSourceId, setLinkSourceId] = useState<ScheduleId | null>(null);
  const [milestoneGuideLineIds, setMilestoneGuideLineIds] = useState<
    ReadonlySet<ScheduleId>
  >(() => new Set());
  const toggleMilestoneGuideLine = useCallback((id: ScheduleId) => {
    setMilestoneGuideLineIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const [linkError, setLinkError] = useState<string | null>(null);
  const chartTopBannersRef = useRef<HTMLDivElement>(null);
  const [chartTopBannerHeight, setChartTopBannerHeight] = useState(0);
  const chartPointerRef = useRef<ChartPointer>({
    overTask: false,
    overMilestone: false,
    link: null,
    hoverTaskId: null,
  });
  const [hoveredTaskId, setHoveredTaskId] = useState<ScheduleId | null>(null);
  const [detailPanelEditing, setDetailPanelEditing] = useState(false);
  const [connectionAddDialogOpen, setConnectionAddDialogOpen] = useState(false);
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleEditRequestToken, setTitleEditRequestToken] = useState(0);
  const [titleBlankNotice, setTitleBlankNotice] = useState<string | null>(null);
  const titleEditHandleRef = useRef<ScheduleToolbarTitleHandle | null>(null);
  const hierarchyButtonRef = useRef<HTMLButtonElement | null>(null);
  const [hierarchyLevelsOpen, setHierarchyLevelsOpen] = useState(false);
  const [hierarchyHadDocumentLevels, setHierarchyHadDocumentLevels] =
    useState(false);
  const [sidebarReorderDragging, setSidebarReorderDragging] = useState(false);
  const [bulkDiscardNotice, setBulkDiscardNotice] = useState<string | null>(null);
  const detailPanelRef = useRef<TaskDetailPanelHandle>(null);
  const bulkHadDraftRef = useRef(false);
  const bulkPanelHadFocusRef = useRef(false);
  const prevSelectionCountRef = useRef(0);
  const taskSearchRef = useRef<HTMLInputElement>(null);
  const commandKey = usesCommandKey(
    typeof navigator !== "undefined"
      ? navigator.platform || navigator.userAgent
      : "",
  );

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
  const fieldExtensionCatalogState = useFieldExtensionCatalog();
  const statusCatalogState = useStatusCatalog();
  const colorCatalogState = useColorCatalog();
  const appCalendarState = useAppCalendar();
  const {
    workspaceBinding,
    setWorkspaceBinding,
    clearWorkspaceBinding,
    reloadWorkspaceBinding,
  } = useWorkspaceBinding();
  const workspaceBindingRef = useRef(workspaceBinding);
  workspaceBindingRef.current = workspaceBinding;

  const displayMembers = useMemo(() => {
    if (workspaceBinding) {
      return workspaceMembersForDisplay(workspaceBinding.members);
    }
    return memberCatalogState.members;
  }, [workspaceBinding, memberCatalogState.members]);

  const displayMemberMap = useMemo(
    () => memberMapFromList(displayMembers),
    [displayMembers],
  );

  const displayCalendar = useMemo(() => {
    if (workspaceBinding) {
      return workspaceCalendarForDisplay(workspaceBinding.calendar);
    }
    return appCalendarState.calendar;
  }, [workspaceBinding, appCalendarState.calendar]);

  const membersCatalogLabel = workspaceBinding
    ? workspaceMemberCatalogLabel(workspaceBinding.members)
    : memberCatalogState.selectedCatalogLabel;

  const membersCatalogError = workspaceBinding
    ? workspaceMemberError(workspaceBinding.members)
    : memberCatalogState.error;

  const calendarDisplayError = workspaceBinding
    ? workspaceCalendarError(workspaceBinding.calendar)
    : appCalendarState.error;

  const displayStatuses = useMemo(() => {
    if (!workspaceBinding) return statusCatalogState.statuses;
    const fromFile = workspaceStatusesForDisplay(workspaceBinding.statuses);
    if (fromFile) return fromFile;
    return BUILTIN_STATUS_ITEMS;
  }, [workspaceBinding, statusCatalogState.statuses]);

  const displayColors = useMemo(() => {
    if (workspaceBinding) {
      return workspaceColorsForDisplay(workspaceBinding.colors);
    }
    return colorCatalogState.items;
  }, [workspaceBinding, colorCatalogState.items]);

  const colorsCatalogError = workspaceBinding
    ? workspaceColorsError(workspaceBinding.colors)
    : colorCatalogState.error;

  const statusesReady = workspaceBinding ? true : !statusCatalogState.loading;

  const fieldExtensionCatalogSettled =
    workspaceBinding != null || !fieldExtensionCatalogState.loading;

  const extensionFieldDefs = useMemo(() => {
    if (workspaceBinding) {
      const docs = workspaceMergedFieldExtensionsForDisplay(
        workspaceBinding.fieldExtensions,
        workspaceBinding.editableFieldExtension,
      );
      return mergeExtensionFieldDefs(docs);
    }
    return fieldExtensionCatalogState.extensionFieldDefs;
  }, [
    fieldExtensionCatalogState.extensionFieldDefs,
    workspaceBinding,
  ]);

  const fieldExtensionsCatalogError = workspaceBinding
    ? workspaceFieldExtensionsError(workspaceBinding.fieldExtensions)
    : fieldExtensionCatalogState.error;

  const workspaceEditableFieldExtensionErrorMessage = workspaceBinding
    ? workspaceEditableFieldExtensionError(workspaceBinding.editableFieldExtension)
    : null;

  const workspaceStatusEditTarget = useMemo(() => {
    if (!workspaceBinding) return null;
    if (workspaceBinding.statuses.kind !== "loaded") return null;
    if (!workspaceBinding.resolved.statusesPath) return null;
    return {
      statusesPath: workspaceBinding.resolved.statusesPath,
      workspacePath: workspaceBinding.workspacePath,
      items: workspaceBinding.statuses.items,
      fileLabel: workspaceBinding.statuses.label,
    };
  }, [workspaceBinding]);

  const workspaceColorEditTarget = useMemo(() => {
    if (!workspaceBinding) return null;
    if (workspaceBinding.colors.kind !== "loaded") return null;
    if (!workspaceBinding.resolved.colorsPath) return null;
    return {
      colorsPath: workspaceBinding.resolved.colorsPath,
      workspacePath: workspaceBinding.workspacePath,
      items: workspaceBinding.colors.items,
      fileLabel: workspaceBinding.colors.label,
    };
  }, [workspaceBinding]);

  const workspaceMemberEditTarget = useMemo(() => {
    if (!workspaceBinding) return null;
    if (workspaceBinding.members.kind !== "loaded") return null;
    if (!workspaceBinding.resolved.membersPath) return null;
    return {
      membersPath: workspaceBinding.resolved.membersPath,
      workspacePath: workspaceBinding.workspacePath,
      items: workspaceBinding.members.members,
      fileLabel: workspaceBinding.members.label,
    };
  }, [workspaceBinding]);

  const mcpMembers = useMemo(() => {
    return mcpMembersForReadTools({
      inWorkspace: workspaceBinding != null,
      workspaceMembers: workspaceBinding?.members ?? null,
      workspaceMembersPath: workspaceBinding?.resolved.membersPath ?? null,
      appMembers: memberCatalogState.members,
    });
  }, [workspaceBinding, memberCatalogState.members]);

  const workspaceFieldExtensionEditTarget = useMemo(() => {
    if (!workspaceBinding) return null;
    if (workspaceBinding.editableFieldExtension.kind !== "loaded") return null;
    const { document, path } = workspaceBinding.editableFieldExtension;
    return {
      pluginId: document.id,
      path,
      workspacePath: workspaceBinding.workspacePath,
      document,
      fileLabel: document.name,
    };
  }, [workspaceBinding]);

  const workspacePinnedFieldExtensionDocuments = useMemo(() => {
    if (!workspaceBinding) return [];
    return workspaceFieldExtensionsForDisplay(workspaceBinding.fieldExtensions) ?? [];
  }, [workspaceBinding]);

  const fieldExtensionEditorOverlay = useFieldExtensionEditorOverlay({
    settings: fieldExtensionCatalogState.settings,
    selectedDocuments: fieldExtensionCatalogState.documents,
    workspacePinnedDocuments: workspacePinnedFieldExtensionDocuments,
    saveCatalog: fieldExtensionCatalogState.saveCatalog,
    removeCatalog: fieldExtensionCatalogState.removeCatalog,
    refreshCatalogs: fieldExtensionCatalogState.refresh,
    workspaceTarget: workspaceFieldExtensionEditTarget,
    onWorkspaceWritten: async () => {
      await reloadWorkspaceBinding();
    },
    exportJson: saveFieldExtensionJson,
    onClosedByUser: () => {
      setSettingsSection("fieldExtensions");
      setSettingsOpen(true);
    },
  });

  const refreshMemberCatalog = memberCatalogState.refresh;
  const refreshStatusCatalog = statusCatalogState.refresh;
  const refreshColorCatalog = colorCatalogState.refresh;
  const refreshAppCalendar = appCalendarState.refresh;
  const refreshSharedSettings = useCallback((key: string | null) => {
    const all = key == null;
    if (all || key === SETTINGS_REVISION_KEY) {
      void refreshMemberCatalog().then(() => {
        const overlay = memberEditorOverlayRef.current;
        if (overlay?.open && overlay.editingCatalogId) {
          overlay.notifyExternalCatalogImport(overlay.editingCatalogId);
        }
      });
      void refreshStatusCatalog().then(() => {
        const overlay = statusEditorOverlayRef.current;
        if (overlay?.open && overlay.editingCatalogId) {
          overlay.notifyExternalCatalogImport(overlay.editingCatalogId);
        }
      });
      void refreshColorCatalog().then(() => {
        const overlay = colorEditorOverlayRef.current;
        if (overlay?.open && overlay.editingCatalogId) {
          overlay.notifyExternalCatalogImport(overlay.editingCatalogId);
        }
      });
      void refreshAppCalendar();
      void fieldExtensionCatalogState.refresh();
    }
    if (all || key === DISPLAY_SCALE_LS_KEY || key === SETTINGS_REVISION_KEY) {
      setDisplayScalePreference(readDisplayScalePreference());
    }
    if (all || key === COLOR_SCHEME_LS_KEY) {
      const preference = readColorSchemePreference();
      setColorSchemePreference(preference);
      setResolvedColorScheme(resolveColorScheme(preference));
    }
    if (all || key === SIDEBAR_WIDTH_LS_KEY) {
      const next = readSidebarWidth();
      preferredSidebarWidthRef.current = next;
      setPreferredSidebarWidth(next);
    }
    if (all || key === ROW_DENSITY_LS_KEY) {
      setRowDensity(readRowDensity());
    }
    if (all || key === SHOW_LIGHTNING_LS_KEY) {
      setShowLightningLine(readShowLightning());
    }
    if (all || key === SIDEBAR_COLUMNS_LS_KEY) {
      setSidebarColumns(readSidebarColumns());
    }
    if (all || key === AUTO_UPDATE_LS_KEY) {
      setAutoUpdateEnabled(readAutoUpdateEnabled());
    }
  }, [
    fieldExtensionCatalogState.refresh,
    refreshAppCalendar,
    refreshMemberCatalog,
    refreshStatusCatalog,
    refreshColorCatalog,
  ]);

  useSharedSettingsRevision(refreshSharedSettings);

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
  const applyMergedDocumentRef = useRef<
    (
      document: ScheduleDocument,
    ) => { before: import("./model/history").DocumentSnapshot; after: import("./model/history").DocumentSnapshot } | null
  >(() => null);
  const externalReloadHistoryUndoRef = useRef<
    (landed: import("./model/history").DocumentSnapshot) => void
  >(() => {});
  const externalReloadHistoryRedoRef = useRef<
    (landed: import("./model/history").DocumentSnapshot) => void
  >(() => {});
  const schedule = useSchedule(
    SAMPLE_PROJECT_TITLE,
    sampleCategories,
    sampleMilestoneGroups,
    sampleMilestones,
    rowHeight,
    displayMembers,
    !memberCatalogState.loading,
    blockDocumentEditsRef,
    (landed) => externalReloadHistoryUndoRef.current(landed),
    (landed) => externalReloadHistoryRedoRef.current(landed),
    displayStatuses,
    statusesReady,
    extensionFieldDefs,
    fieldExtensionCatalogSettled,
  );
  applyMergedDocumentRef.current = schedule.applyMergedDocument;
  const replaceScheduleDocumentRef = useRef(schedule.replaceScheduleDocument);
  replaceScheduleDocumentRef.current = schedule.replaceScheduleDocument;
  const {
    redo,
    undo,
    commitTitle,
    getCanonicalJson,
    getDocumentTitle,
    setTaskStart,
    setTaskEnd,
    visibleRows,
    moveTaskByDays,
    shiftTaskEndByDays,
    openAddCategoryAfter,
    openAddGroupToCategory,
    openAddGroupAfter,
    openDeleteHierarchy,
    setMilestoneGroupVisible,
    showOnlyMilestoneGroup,
    visibleMilestoneGroupIds,
  } = schedule;

  useEffect(() => {
    const ids = new Set(schedule.milestones.map((milestone) => milestone.id));
    setMilestoneGuideLineIds((prev) => {
      let changed = false;
      const next = new Set<ScheduleId>();
      for (const id of prev) {
        if (ids.has(id)) next.add(id);
        else changed = true;
      }
      if (!changed && next.size === prev.size) return prev;
      return next;
    });
  }, [schedule.milestones]);

  const editableFieldDefs = extensionFieldDefs;

  const knownFieldKeys = useMemo(
    () => knownFieldKeysFromDefs(editableFieldDefs),
    [editableFieldDefs],
  );

  const catalogMismatch = useMemo(() => {
    const tasks = collectTasksFromDocument({
      schemaVersion: SCHEDULE_SCHEMA_VERSION,
      title: schedule.title,
      categories: schedule.categories,
      milestoneGroups: schedule.milestoneGroups,
      milestones: schedule.milestones,
      levels: schedule.levels,
      outline: schedule.outline,
    });
    return catalogMismatchFlags(
      tasks,
      displayStatuses,
      displayMemberMap,
      knownFieldKeys,
      displayColors,
    );
  }, [
    displayColors,
    displayMemberMap,
    displayStatuses,
    knownFieldKeys,
    schedule.categories,
    schedule.levels,
    schedule.milestoneGroups,
    schedule.milestones,
    schedule.outline,
    schedule.title,
  ]);

  const catalogMismatchText = catalogMismatchBannerText(catalogMismatch);

  const catalogMismatchPrevRef = useRef<CatalogMismatchFlags | undefined>(
    undefined,
  );
  const [catalogMismatchAnnouncement, setCatalogMismatchAnnouncement] = useState<
    string | null
  >(null);

  useEffect(() => {
    const prev = catalogMismatchPrevRef.current;
    const prevActive =
      prev != null &&
      (prev.status || prev.assignee || prev.color || prev.fieldValues);
    const active =
      catalogMismatch.status ||
      catalogMismatch.assignee ||
      catalogMismatch.color ||
      catalogMismatch.fieldValues;
    if (
      prev?.status === catalogMismatch.status &&
      prev?.assignee === catalogMismatch.assignee &&
      prev?.color === catalogMismatch.color &&
      prev?.fieldValues === catalogMismatch.fieldValues
    ) {
      return;
    }
    catalogMismatchPrevRef.current = catalogMismatch;
    if (active) {
      setCatalogMismatchAnnouncement(catalogMismatchBannerText(catalogMismatch));
      return;
    }
    if (prevActive) {
      setCatalogMismatchAnnouncement(CATALOG_MISMATCH_CLEARED_ANNOUNCEMENT);
      return;
    }
    setCatalogMismatchAnnouncement(null);
  }, [catalogMismatch]);

  const hierarchyTopBanner =
    schedule.levels != null &&
    schedule.levels.length > 0 &&
    !schedule.hierarchyLayout.aligned
      ? "mismatch"
      : schedule.hierarchyLevelBanner
        ? "levels"
        : null;

  const showChartTopBanners =
    catalogMismatchText != null ||
    linkSourceId != null ||
    hierarchyTopBanner != null;

  useLayoutEffect(() => {
    const node = chartTopBannersRef.current;
    if (!node) {
      setChartTopBannerHeight(0);
      return;
    }
    const measure = () => {
      setChartTopBannerHeight(node.getBoundingClientRect().height);
    };
    measure();
    const observer = new ResizeObserver(() => measure());
    observer.observe(node);
    return () => observer.disconnect();
  }, [
    showChartTopBanners,
    catalogMismatchText,
    hierarchyTopBanner,
    schedule.hierarchyLevelBanner,
    linkSourceId,
    linkError,
  ]);

  const range = useMemo(
    () =>
      computeTimelineRange(
        schedule.categories,
        schedule.milestones,
        schedule.today,
        schedule.outline,
      ),
    [schedule.categories, schedule.milestones, schedule.today, schedule.outline],
  );

  const monthHeaderFontSize = 12 * (headerHeight / LAYOUT_HEADER_HEIGHT);

  const extraDaysForPxPerDay = useCallback(
    (px: number) =>
      extraTimelineDaysForRightEdge({
        timelineStart: range.timelineStart,
        baseTotalDays: range.totalDays,
        pxPerDay: px,
        tier: gridTier(px),
        milestoneGroups: schedule.milestoneGroups,
        milestones: schedule.milestones,
        visibleGroupIds: schedule.visibleMilestoneGroupIds,
        milestoneFontSize,
        milestoneDiamondSize,
        monthHeaderFontSize,
        mode: "screen",
      }),
    [
      milestoneDiamondSize,
      milestoneFontSize,
      monthHeaderFontSize,
      range.timelineStart,
      range.totalDays,
      schedule.milestoneGroups,
      schedule.milestones,
      schedule.visibleMilestoneGroupIds,
    ],
  );

  const [timelineEpoch, setTimelineEpoch] = useState(0);
  const view = useTimelineView(
    {
      timelineStart: range.timelineStart,
      baseTotalDays: range.totalDays,
    },
    timelineWidth,
    (pxPerDay) => {
      const band = milestoneBandHeightPx(
        schedule.milestoneGroups,
        schedule.milestones,
        schedule.visibleMilestoneGroupIds,
        pxPerDay,
        milestoneFontSize,
        milestoneDiamondSize,
        milestoneLaneHeight,
      );
      const body = Math.max(
        120,
        timelineSlotHeight - headerHeight - band - chartTopBannerHeight,
      );
      const rows = schedule.visibleRows;
      const contentHeight =
        rows.length === 0 ? 0 : rows[rows.length - 1].y + rowHeight;
      return Math.max(0, contentHeight - body);
    },
    schedule.today,
    timelineEpoch,
    schedule.diskEpoch,
    extraDaysForPxPerDay,
  );

  const milestoneBandLayout: MilestoneBandLayout = useMemo(
    () =>
      layoutMilestoneBand(
        schedule.milestoneGroups,
        schedule.milestones,
        schedule.visibleMilestoneGroupIds,
        view.pxPerDay,
        milestoneFontSize,
        milestoneDiamondSize,
        milestoneLaneHeight,
        "screen",
      ),
    [
      milestoneDiamondSize,
      milestoneFontSize,
      milestoneLaneHeight,
      schedule.milestoneGroups,
      schedule.milestones,
      schedule.visibleMilestoneGroupIds,
      view.pxPerDay,
    ],
  );
  const milestoneBandHeight = milestoneBandLayout.totalHeight;
  const toggleMilestoneGroupGuideLines = useCallback(
    (groupId: ScheduleId) => {
      const block = milestoneBandLayout.blocks.find(
        (item) => item.group.id === groupId,
      );
      if (block == null) return;
      setMilestoneGuideLineIds((prev) =>
        toggleMilestoneGuideLinesForGroup(
          prev,
          block.milestones.map((milestone) => milestone.id),
        ),
      );
    },
    [milestoneBandLayout.blocks],
  );
  const bodyHeight = Math.max(
    120,
    timelineSlotHeight -
      headerHeight -
      milestoneBandHeight -
      chartTopBannerHeight,
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
    timelineStart: viewStart,
    totalDays: viewTotalDays,
    timelineEnd: viewTimelineEnd,
  } = view;

  const filterAssigneeLabel = useMemo(
    () =>
      schedule.assigneeFilterOptions.find(
        (option) => option.id === schedule.filters.assignee,
      )?.label ?? null,
    [schedule.assigneeFilterOptions, schedule.filters.assignee],
  );

  const onAfterOpenFile = useCallback(() => {
    setTimelineEpoch((epoch) => epoch + 1);
  }, []);

  const flushTitleEdit = useCallback(() => {
    titleEditHandleRef.current?.commitIfEditing();
  }, []);

  const showTitleBlankNotice = useCallback(() => {
    setTitleBlankNotice(null);
    requestAnimationFrame(() =>
      setTitleBlankNotice("タイトルは変更していません"),
    );
  }, []);

  const onCommitTitle = useCallback(
    (raw: string) => commitTitle(raw),
    [commitTitle],
  );

  const reportFileErrorRef = useRef<(message: string) => void>(() => {});
  const {
    recentFilesStore,
    setRecentFilesStore,
    refreshRecentFiles,
    clearRecentHistory,
  } = useRecentFiles((message) => reportFileErrorRef.current(message));

  const scheduleFile = useScheduleFile({
    title: schedule.title,
    categories: schedule.categories,
    milestoneGroups: schedule.milestoneGroups,
    milestones: schedule.milestones,
    levels: schedule.levels,
    outline: schedule.outline,
    connections: schedule.connections,
    replaceDocument: schedule.replaceDocument,
    applyMergedDocument: (document) => applyMergedDocumentRef.current(document),
    reloadDocumentFromDisk: schedule.reloadDocumentFromDisk,
    onAfterOpen: onAfterOpenFile,
    initialBaselineJson: INITIAL_BASELINE_JSON,
    hasOpenEditDialog:
      titleEditing ||
      detailPanelEditing ||
      connectionAddDialogOpen ||
      hierarchyLevelsOpen ||
      fieldExtensionEditorOverlay.open ||
      (statusEditorOverlayRef.current?.open ?? false) ||
      (colorEditorOverlayRef.current?.open ?? false) ||
      (memberEditorOverlayRef.current?.open ?? false) ||
      schedule.editingNoteTask != null ||
      schedule.editingMilestone != null ||
      schedule.editingHierarchyTarget != null ||
      schedule.addingHierarchyTarget != null ||
      schedule.outlineHeadingAddOpen ||
      schedule.deletingHierarchyTarget != null,
    blockDocumentEditsRef,
    setFilterViewState: schedule.setFilterViewState,
    getFilterViewState: schedule.getFilterViewState,
    knownMemberIds: schedule.knownMemberIds,
    memberCatalogSettled: !memberCatalogState.loading,
    fieldExtensionCatalogSettled,
    extraFieldDefs: extensionFieldDefs,
    sidebarReorderDragging,
    getCanonicalJson,
    getDocumentTitle,
    onRecentFilesStoreUpdated: setRecentFilesStore,
    onWorkspaceBindingChange: (binding) => {
      if (binding) setWorkspaceBinding(binding);
      else clearWorkspaceBinding();
    },
  });
  reportFileErrorRef.current = scheduleFile.showError;
  externalReloadHistoryUndoRef.current = scheduleFile.onHistoryUndoApplied;
  externalReloadHistoryRedoRef.current = scheduleFile.onHistoryRedoApplied;

  const handleWorkspaceBindingReloadRef = useRef(
    scheduleFile.handleWorkspaceBindingReload,
  );
  handleWorkspaceBindingReloadRef.current =
    scheduleFile.handleWorkspaceBindingReload;

  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    void listen<string>("workspace-reload", (event) => {
      if (workspaceBindingRef.current?.workspacePath !== event.payload) return;
      void handleWorkspaceBindingReloadRef.current(event.payload);
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, []);

  useWindowTitle(scheduleFile.displayFileName, scheduleFile.isDirty);

  const showUpdateToast = useCallback((message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 4000);
  }, []);

  const statusEditorOverlay = useStatusCatalogEditorOverlay({
    settings: statusCatalogState.settings,
    appliedCatalogId: workspaceBinding
      ? null
      : statusCatalogState.settings.selectedCatalogId,
    saveCatalog: statusCatalogState.saveCatalog,
    removeCatalog: statusCatalogState.removeCatalog,
    workspaceTarget: workspaceStatusEditTarget,
    onWorkspaceStatusesWritten: async () => {
      await reloadWorkspaceBinding();
    },
    onRemovedWhileEditing: () => {
      showUpdateToast(
        "編集していた一覧が設定で外されたため、編集を閉じました。",
      );
    },
  });
  statusEditorOverlayRef.current = statusEditorOverlay;

  const colorEditorOverlay = useColorCatalogEditorOverlay({
    settings: colorCatalogState.settings,
    appliedCatalogId: workspaceBinding
      ? null
      : colorCatalogState.settings.selectedCatalogId,
    saveCatalog: colorCatalogState.saveCatalog,
    removeCatalog: colorCatalogState.removeCatalog,
    workspaceTarget: workspaceColorEditTarget,
    onWorkspaceColorsWritten: async () => {
      await reloadWorkspaceBinding();
    },
    onRemovedWhileEditing: () => {
      showUpdateToast(
        "編集していた一覧が設定で外されたため、編集を閉じました。",
      );
    },
  });
  colorEditorOverlayRef.current = colorEditorOverlay;

  const memberEditorOverlay = useMemberCatalogEditorOverlay({
    settings: memberCatalogState.settings,
    appliedCatalogId: workspaceBinding
      ? null
      : memberCatalogState.settings.selectedCatalogId,
    saveCatalog: memberCatalogState.saveCatalog,
    removeCatalog: memberCatalogState.removeCatalog,
    workspaceTarget: workspaceMemberEditTarget,
    onWorkspaceMembersWritten: async () => {
      await reloadWorkspaceBinding();
    },
    onRemovedWhileEditing: () => {
      showUpdateToast(
        "編集していた一覧が設定で外されたため、編集を閉じました。",
      );
    },
  });
  memberEditorOverlayRef.current = memberEditorOverlay;

  useEffect(() => {
    if (!openColorCatalogEditorAfterWorkspaceCreate) return;
    if (!workspaceColorEditTarget) return;
    setOpenColorCatalogEditorAfterWorkspaceCreate(false);
    setSettingsOpen(false);
    colorEditorOverlay.openEditor();
  }, [
    colorEditorOverlay.openEditor,
    openColorCatalogEditorAfterWorkspaceCreate,
    workspaceColorEditTarget,
  ]);

  const handleStatusCatalogImport = useCallback(
    async (catalogId: string, contents: string, overwrite: boolean) => {
      await statusCatalogState.importCatalog(catalogId, contents, overwrite);
      statusEditorOverlayRef.current?.notifyExternalCatalogImport(catalogId);
    },
    [statusCatalogState.importCatalog],
  );

  const handleCreateWorkspaceEditableFieldExtension = useCallback(async () => {
    if (!workspaceBinding) return;
    if (workspaceBinding.editableFieldExtension.kind !== "unset") return;
    const usedIds = [
      ...workspacePinnedFieldExtensionPluginIds(workspaceBinding.fieldExtensions),
    ];
    const pluginId = nextFieldExtensionCatalogId(usedIds);
    const document = newEmptyExtensionDocument(pluginId);
    const relativeFileName = `${pluginId}.fields.json`;
    await createWorkspaceEditableFieldExtension(
      workspaceBinding.workspacePath,
      relativeFileName,
      fieldExtensionDocumentToJson(document),
    );
    await reloadWorkspaceBinding();
  }, [reloadWorkspaceBinding, workspaceBinding]);

  const handleDeleteWorkspaceEditableFieldExtension = useCallback(async () => {
    if (!workspaceBinding) return;
    await deleteWorkspaceEditableFieldExtension(workspaceBinding.workspacePath);
    await reloadWorkspaceBinding();
  }, [reloadWorkspaceBinding, workspaceBinding]);

  const handleClearWorkspaceEditableFieldExtension = useCallback(async () => {
    if (!workspaceBinding) return;
    await clearWorkspaceEditableFieldExtension(workspaceBinding.workspacePath);
    await reloadWorkspaceBinding();
  }, [reloadWorkspaceBinding, workspaceBinding]);

  const handleStatusCatalogDelete = useCallback(
    async (catalogId: string) => {
      await statusCatalogState.removeCatalog(catalogId);
      statusEditorOverlayRef.current?.notifyExternalCatalogRemoved(catalogId);
    },
    [statusCatalogState.removeCatalog],
  );

  const handleColorCatalogImport = useCallback(
    async (catalogId: string, contents: string, overwrite: boolean) => {
      await colorCatalogState.importCatalog(catalogId, contents, overwrite);
      colorEditorOverlayRef.current?.notifyExternalCatalogImport(catalogId);
    },
    [colorCatalogState.importCatalog],
  );

  const handleColorCatalogDelete = useCallback(
    async (catalogId: string) => {
      await colorCatalogState.removeCatalog(catalogId);
      colorEditorOverlayRef.current?.notifyExternalCatalogRemoved(catalogId);
    },
    [colorCatalogState.removeCatalog],
  );

  const handleMemberCatalogImport = useCallback(
    async (catalogId: string, contents: string, overwrite: boolean) => {
      await memberCatalogState.importCatalog(catalogId, contents, overwrite);
      memberEditorOverlayRef.current?.notifyExternalCatalogImport(catalogId);
    },
    [memberCatalogState.importCatalog],
  );

  const handleMemberCatalogDelete = useCallback(
    async (catalogId: string) => {
      await memberCatalogState.removeCatalog(catalogId);
      memberEditorOverlayRef.current?.notifyExternalCatalogRemoved(catalogId);
    },
    [memberCatalogState.removeCatalog],
  );

  const handleCreateWorkspaceColorsCatalog = useCallback(async () => {
    if (!workspaceBinding) return;
    if (workspaceBinding.document.colors != null) return;
    if (workspaceColorsError(workspaceBinding.colors)) return;
    const doc = starterColorCatalogDocument();
    const contents = colorsToJson(doc.colors);
    await createWorkspaceColorsCatalog(
      workspaceBinding.workspacePath,
      "colors.json",
      contents,
    );
    await reloadWorkspaceBinding();
    setOpenColorCatalogEditorAfterWorkspaceCreate(true);
  }, [reloadWorkspaceBinding, workspaceBinding]);

  const handleExportWorkspace = useCallback(async () => {
    if (!isTauri() || workspaceBinding) return;
    try {
      const scheduleContents = getCanonicalJson();
      const scheduleFileName = safeScheduleJsonFilename(scheduleFile.filePath);
      let membersContents: string | null = null;
      let membersFileName: string | null = null;
      const selectedId = memberCatalogState.settings.selectedCatalogId;
      if (selectedId) {
        const text = await invoke<string | null>("read_member_catalog", {
          catalogId: selectedId,
        });
        if (text) {
          membersContents = text.endsWith("\n") ? text : `${text}\n`;
          const label =
            memberCatalogState.selectedCatalogLabel ?? selectedId;
          membersFileName = `${label}.members.json`;
        }
      }
      let calendarContents: string | null = null;
      let calendarFileName: string | null = null;
      if (appCalendarState.label) {
        const text = await invoke<string | null>("read_app_calendar");
        if (text) {
          calendarContents = text.endsWith("\n") ? text : `${text}\n`;
          calendarFileName = appCalendarState.label.endsWith(".json")
            ? appCalendarState.label
            : `${appCalendarState.label}.calendar.json`;
        }
      }
      let statusesContents: string | null = null;
      let statusesFileName: string | null = null;
      const selectedStatusId = statusCatalogState.settings.selectedCatalogId;
      if (selectedStatusId) {
        const text = await invoke<string | null>("read_status_catalog", {
          catalogId: selectedStatusId,
        });
        if (text) {
          statusesContents = text.endsWith("\n") ? text : `${text}\n`;
          const label =
            statusCatalogState.selectedCatalogLabel ?? selectedStatusId;
          statusesFileName = label.endsWith(".json")
            ? label
            : `${label}.statuses.json`;
        }
      }
      let colorsContents: string | null = null;
      let colorsFileName: string | null = null;
      const selectedColorId = colorCatalogState.settings.selectedCatalogId;
      if (selectedColorId) {
        const text = await invoke<string | null>("read_color_catalog", {
          catalogId: selectedColorId,
        });
        if (text) {
          colorsContents = text.endsWith("\n") ? text : `${text}\n`;
          const label =
            colorCatalogState.selectedCatalogLabel ?? selectedColorId;
          colorsFileName = label.endsWith(".json")
            ? label
            : `${label}.colors.json`;
        }
      }
      const selectedExtensionIds =
        fieldExtensionCatalogState.settings.selectedCatalogIds;
      const extensionContentsById: Record<string, string | null> = {};
      for (const catalogId of selectedExtensionIds) {
        const text = await invoke<string | null>("read_field_extension_catalog", {
          catalogId,
        });
        extensionContentsById[catalogId] = text;
      }
      const fieldExtensions = buildFieldExtensionExportFiles(
        selectedExtensionIds,
        extensionContentsById,
      );
      for (const entry of fieldExtensions) {
        const tooLarge = fieldExtensionExportTooLargeMessage(entry.contents);
        if (tooLarge) {
          throw tooLarge;
        }
      }
      await exportWorkspaceBundleViaTauri({
        scheduleContents,
        scheduleFileName,
        membersContents,
        membersFileName,
        calendarContents,
        calendarFileName,
        statusesContents,
        statusesFileName,
        colorsContents,
        colorsFileName,
        fieldExtensions,
      });
      const parts = [
        "設定ファイルを書き出しました。このウィンドウはアプリの設定のままです。",
      ];
      if (!membersContents) {
        parts.push("メンバーは未選択のため書いていません。");
      }
      if (!calendarContents) {
        parts.push("稼働日は未設定のため書いていません。");
      }
      if (!statusesContents) {
        parts.push("ステータスは組み込みの三件のため書いていません。");
      }
      if (!colorsContents) {
        parts.push("色は未選択のため書いていません。");
      }
      if (fieldExtensions.length === 0) {
        parts.push("拡張項目は選んでいないため書いていません。");
      }
      showUpdateToast(parts.join(" "));
    } catch (error) {
      const message =
        typeof error === "string"
          ? error
          : error instanceof Error
            ? error.message
            : "書き出しに失敗しました。";
      scheduleFile.showError(message, "書き出しに失敗しました");
    }
  }, [
    appCalendarState.label,
    getCanonicalJson,
    memberCatalogState.selectedCatalogLabel,
    memberCatalogState.settings.selectedCatalogId,
    statusCatalogState.selectedCatalogLabel,
    statusCatalogState.settings.selectedCatalogId,
    colorCatalogState.selectedCatalogLabel,
    colorCatalogState.settings.selectedCatalogId,
    fieldExtensionCatalogState.settings.selectedCatalogIds,
    scheduleFile,
    showUpdateToast,
    workspaceBinding,
  ]);

  const showReplaceScreenToast = useCallback(() => {
    setToastMessage("画面を置き換えました");
    window.setTimeout(() => setToastMessage(null), 4000);
  }, []);

  const completeReplaceDuringConflictReloadRef = useRef(
    scheduleFile.completeReplaceDuringConflictReload,
  );
  completeReplaceDuringConflictReloadRef.current =
    scheduleFile.completeReplaceDuringConflictReload;

  const mcpReplaceUiBlocking = useCallback(() => {
    const assessment = scheduleFile.externalReloadAssessment;
    const externalReloadConflictDialogOpen =
      scheduleFile.externalReloadOpen &&
      assessment?.kind === "blocked" &&
      assessment.conflictLines.length > 0;
    return assessMcpReplaceUiBlocking({
      fileBusy: scheduleFile.fileBusy,
      titleEditing,
      detailPanelEditing,
      scheduleInlineEditing:
        schedule.editingNoteTask != null ||
        schedule.editingMilestone != null ||
        schedule.editingHierarchyTarget != null ||
        schedule.addingHierarchyTarget != null ||
        schedule.outlineHeadingAddOpen ||
        schedule.deletingHierarchyTarget != null,
      reorderDragging: schedule.reorderPreview != null,
      sidebarReorderDragging,
      modalDialogOpen: document.querySelector('[role="dialog"]') != null,
      externalReloadConflictDialogOpen,
    });
  }, [
    detailPanelEditing,
    titleEditing,
    schedule.addingHierarchyTarget,
    schedule.outlineHeadingAddOpen,
    schedule.deletingHierarchyTarget,
    schedule.editingHierarchyTarget,
    schedule.editingMilestone,
    schedule.editingNoteTask,
    schedule.reorderPreview,
    scheduleFile.externalReloadAssessment,
    scheduleFile.externalReloadOpen,
    scheduleFile.fileBusy,
    sidebarReorderDragging,
  ]);

  const onReplaceScheduleApplied = useCallback(
    (result: ReplaceScheduleDocumentResult) => {
      if (result.outcome !== "applied") return;
      const assessment = scheduleFile.externalReloadAssessment;
      const conflictOpen =
        scheduleFile.externalReloadOpen &&
        assessment?.kind === "blocked" &&
        assessment.conflictLines.length > 0;
      if (conflictOpen) {
        completeReplaceDuringConflictReloadRef.current({
          before: result.before,
          after: result.after,
        });
        const sameAsBaseline = result.screenJson === scheduleFile.baselineJson;
        setToastMessage(
          sameAsBaseline
            ? REPLACE_SCHEDULE_APPLIED_BASELINE_SAME_TOAST
            : REPLACE_SCHEDULE_APPLIED_TOAST,
        );
        window.setTimeout(() => setToastMessage(null), 4000);
        return;
      }
      showReplaceScreenToast();
    },
    [
      scheduleFile.baselineJson,
      scheduleFile.externalReloadAssessment,
      scheduleFile.externalReloadOpen,
      showReplaceScreenToast,
    ],
  );

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
  }, []);

  const {
    uiState: updateUiState,
    showCornerNotice,
    requestManualUpdateCheck,
    onLater: onUpdateLater,
    beginInstall: onUpdateInstall,
    dismissUpdateInfo,
    offerLiveAnnouncementKey,
    registerOfferAnnouncement,
    markOfferAnnounced,
  } = useAppUpdateFlow({
    startupSettled: scheduleFile.startupSettled,
    settingsOpen,
    settingsSection,
    storeDistribution,
    onCloseSettings: closeSettings,
    onUpdateToast: showUpdateToast,
    prepareForApplicationUpdate: scheduleFile.prepareForApplicationUpdate,
    onUpdatePromptCancel: scheduleFile.onUpdatePromptCancel,
  });

  const handleSettingsClose = useCallback(() => {
    if (
      settingsSection === "updates" &&
      updateUiState.phase === "info" &&
      !updateUiState.infoEphemeral
    ) {
      dismissUpdateInfo();
    }
    setSettingsOpen(false);
  }, [dismissUpdateInfo, settingsSection, updateUiState]);

  useEffect(() => {
    if (!isTauri()) return;
    void readStoreDistribution().then(setStoreDistribution);
  }, []);

  const handleCheckForUpdates = useCallback(
    (inSettings = false) => {
      requestManualUpdateCheck(inSettings);
    },
    [requestManualUpdateCheck],
  );

  const handleSaveBetaInstaller = useCallback(async () => {
    if (!isTauri() || storeDistribution) return;
    if (updateUiState.phase === "installing") return;
    const previousLine = betaInstallerStatusLine;
    setBetaInstallerStatusLine(null);
    try {
      const raw = await getVersion();
      const installed =
        normalizeVersionLabel(raw) ?? raw.replace(/^[vV]/, "");
      const tags = await fetchBetaReleaseTagsViaTauri();
      const version = pickSaveableBetaVersion(installed, tags);
      if (!version) {
        setBetaInstallerStatusLine("公開中のベータはありません");
        return;
      }
      const saved = await saveBetaInstallerViaTauri(version);
      if (saved) {
        setBetaInstallerStatusLine(saved);
      } else {
        setBetaInstallerStatusLine(previousLine);
      }
    } catch {
      setBetaInstallerStatusLine("ベータの取得に失敗しました");
    }
  }, [betaInstallerStatusLine, storeDistribution, updateUiState.phase]);

  const updateCornerMessage =
    updateUiState.phase === "checking"
      ? "確認しています"
      : updateUiState.message ?? "";

  const updateCornerMode =
    updateUiState.phase === "offer"
      ? "offer"
      : updateUiState.phase === "installing"
        ? "installing"
        : "info";

  useEffect(() => {
    if (!scheduleFile.reloadNotice) return;
    setToastMessage("ファイルを反映しました");
    const timer = window.setTimeout(() => setToastMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [scheduleFile.reloadNotice]);

  useEffect(() => {
    if (!scheduleFile.mergeNotice) return;
    setToastMessage("両方の変更を画面へ反映しました");
    const timer = window.setTimeout(() => setToastMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [scheduleFile.mergeNotice]);

  const peerNoticeMessage = useMemo(() => {
    const notice = scheduleFile.peerNotice.peerNotice;
    if (!notice) return null;
    const statusLabel = notice.status === "applied" ? "反映した" : "確認待ち";
    return `${notice.fileName} — ${statusLabel}`;
  }, [scheduleFile.peerNotice.peerNotice]);

  const ephemeralToastBottom =
    showCornerNotice && updateOfferHeight > 0
      ? `calc(36px * var(--s) + ${updateOfferHeight}px + 8px * var(--s))`
      : showCornerNotice
        ? `calc(110px * var(--s))`
        : peerNoticeMessage
          ? `calc(72px * var(--s))`
          : undefined;

  const peerToastBottom =
    showCornerNotice && updateOfferHeight > 0 && toastMessage
      ? `calc(36px * var(--s) + ${updateOfferHeight}px + 8px * var(--s) + 40px * var(--s))`
      : showCornerNotice
        ? `calc(110px * var(--s))`
        : `calc(72px * var(--s))`;

  const diffPanelInset =
    !diffStrip.visible
      ? "0px"
      : diffPanelExpanded || diffStrip.kind === "empty"
        ? `calc(320px * var(--s))`
        : `calc(28px * var(--s))`;

  const { visibleTaskCount, totalTaskCount } = useMemo(() => {
    const total = collectTasksFromDocument({
      schemaVersion: SCHEDULE_SCHEMA_VERSION,
      title: schedule.title,
      categories: schedule.categories,
      milestoneGroups: schedule.milestoneGroups,
      milestones: schedule.milestones,
      levels: schedule.levels,
      outline: schedule.outline,
    }).length;
    const visible = schedule.visibleRows.filter((row) => row.type === "task").length;
    return { visibleTaskCount: visible, totalTaskCount: total };
  }, [
    schedule.categories,
    schedule.levels,
    schedule.milestoneGroups,
    schedule.milestones,
    schedule.outline,
    schedule.title,
    schedule.visibleRows,
  ]);

  const documentTasks = useMemo(
    () =>
      collectTasksFromDocument({
        schemaVersion: SCHEDULE_SCHEMA_VERSION,
        title: schedule.title,
        categories: schedule.categories,
        milestoneGroups: schedule.milestoneGroups,
        milestones: schedule.milestones,
        levels: schedule.levels,
        outline: schedule.outline,
      }),
    [
      schedule.categories,
      schedule.levels,
      schedule.milestoneGroups,
      schedule.milestones,
      schedule.outline,
      schedule.title,
    ],
  );

  const {
    categories,
    selectedTaskId,
    openEditDialog,
    openDuplicateDialog,
    milestones,
    openMilestoneEdit,
    openTaskNoteDialog,
    clearLineage,
    showLineage,
    lineageTask,
    addPredecessorLink,
    removePredecessorLink,
    addTaskConnection,
    updateTaskConnectionLabel,
    removeTaskConnection,
    setTaskConfidence,
    setMilestoneConfidence,
    openAddOutlineSiblingAfter,
    openAddOutlineChild,
    canDeleteOutlineBranch,
    levels,
    outline,
    hierarchyLayout,
  } = schedule;

  const addTopLevelMenuLabel = useMemo(
    () => addTopLevelMenuLabelFromLayout(schedule.hierarchyLayoutForMenus),
    [schedule.hierarchyLayoutForMenus],
  );
  const {
    fileBusy,
    requestOpen,
    requestOpenFromRecent,
    requestOpenInNewWindow,
    save,
  } = scheduleFile;

  const requestOpenWithTitleFlush = useCallback(() => {
    flushTitleEdit();
    requestOpen();
  }, [flushTitleEdit, requestOpen]);

  const requestOpenFromRecentWithTitleFlush = useCallback(
    (path: string) => {
      flushTitleEdit();
      requestOpenFromRecent(path);
    },
    [flushTitleEdit, requestOpenFromRecent],
  );

  const requestOpenInNewWindowWithTitleFlush = useCallback(() => {
    flushTitleEdit();
    requestOpenInNewWindow();
  }, [flushTitleEdit, requestOpenInNewWindow]);

  const handleClearRecentHistory = useCallback(() => {
    void clearRecentHistory();
  }, [clearRecentHistory]);

  const saveWithTitleFlush = useCallback(
    (saveAs: boolean) => {
      flushTitleEdit();
      void save(saveAs);
    },
    [flushTitleEdit, save],
  );

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
  const closeFloatingMenus = useCallback(() => {
    setContextMenu(null);
    document.dispatchEvent(new Event("schedule-viewer:close-menus"));
  }, []);
  const requestDeleteTask = useCallback(() => {
    if (schedule.selectedTaskIds.length === 0) return;
    setDeleteOpen(true);
  }, [schedule.selectedTaskIds.length]);

  const revealTaskRow = useCallback(
    (taskId: ScheduleId) => {
      const row = visibleRows.find(
        (item) => item.type === "task" && item.task.id === taskId,
      );
      if (!row || row.type !== "task") return;
      reveal(
        parseDate(row.task.start),
        scrollYToShowSelectedTask(
          visibleRows,
          row.y,
          rowHeight,
          bodyHeight,
          scrollY,
        ),
        taskBarWidthPx(row.task, dateToX, pxPerDay),
      );
    },
    [bodyHeight, dateToX, pxPerDay, reveal, rowHeight, scrollY, visibleRows],
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
    () =>
      listTaskRefsFromDocument({
        schemaVersion: SCHEDULE_SCHEMA_VERSION,
        title: schedule.title,
        categories: schedule.categories,
        milestoneGroups: schedule.milestoneGroups,
        milestones: schedule.milestones,
        levels: schedule.levels,
        outline: schedule.outline,
      }),
    [
      schedule.categories,
      schedule.levels,
      schedule.milestoneGroups,
      schedule.milestones,
      schedule.outline,
      schedule.title,
    ],
  );
  const selectedTaskIdSet = useMemo(
    () => new Set(schedule.selectedTaskIds),
    [schedule.selectedTaskIds],
  );
  const selectedDetailTask = useMemo(
    () =>
      schedule.selectedTaskId == null
        ? null
        : findTaskInDocument(
            schedule.categories,
            schedule.outline,
            schedule.selectedTaskId,
          ),
    [schedule.categories, schedule.outline, schedule.selectedTaskId],
  );
  const bulkDetailTasks = useMemo(() => {
    if (schedule.selectedTaskIds.length <= 1) return [];
    return schedule.selectedTaskIds
      .map((id) =>
        findTaskInDocument(schedule.categories, schedule.outline, id),
      )
      .filter((task): task is NonNullable<typeof task> => task != null);
  }, [schedule.categories, schedule.outline, schedule.selectedTaskIds]);

  useEffect(() => {
    setConnectionAddDialogOpen(false);
  }, [schedule.selectedTaskId, schedule.selectedTaskIds.length]);

  const handleBulkEditingChange = useCallback((editing: boolean) => {
    bulkHadDraftRef.current = editing;
    setDetailPanelEditing(editing);
  }, []);

  useEffect(() => {
    const count = schedule.selectedTaskIds.length;
    const prev = prevSelectionCountRef.current;
    if (prev > 1 && count <= 1) {
      if (bulkHadDraftRef.current) {
        setBulkDiscardNotice("入力は破棄しました");
        bulkHadDraftRef.current = false;
        window.setTimeout(() => setBulkDiscardNotice(null), 5000);
      }
      if (bulkPanelHadFocusRef.current) {
        bulkPanelHadFocusRef.current = false;
        requestAnimationFrame(() => {
          if (count === 1) detailPanelRef.current?.focusPanelHeading();
          else timelineAreaRef.current?.focus();
        });
      }
    }
    prevSelectionCountRef.current = count;
  }, [schedule.selectedTaskIds.length]);

  const handleSelectTask = useCallback(
    (
      taskId: ScheduleId,
      mod: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean },
    ) => {
      clearDiffNavigationMark();
      schedule.selectTaskWithClick(
        taskId,
        mod,
        visibleTaskIds(visibleRows),
        commandKey,
      );
      revealTaskRow(taskId);
    },
    [clearDiffNavigationMark, commandKey, revealTaskRow, schedule, visibleRows],
  );

  const handleMoveTask = useCallback(
    (_taskId: ScheduleId, deltaDays: number, taskIds: readonly ScheduleId[]) => {
      schedule.moveSelectedTasksByDays(taskIds, deltaDays);
    },
    [schedule],
  );

  const navigateTaskSelection = useCallback(
    (
      rows: typeof visibleRows,
      direction: "prev" | "next",
      extend: boolean,
      onAfter?: (activeId: ScheduleId | null) => void,
    ) => {
      schedule.navigateTaskSelection(rows, direction, extend, (next) => {
        onAfter?.(next.activeId);
      });
    },
    [schedule],
  );

  const openTaskFromChart = useCallback(
    (task: Task) => {
      if (schedule.selectedTaskIds.length > 1) return;
      openTaskForEdit(task);
    },
    [openTaskForEdit, schedule.selectedTaskIds.length],
  );

  const selectedDetailSuccessors = useMemo(() => {
    if (!selectedDetailTask) return [];
    const tasks = collectTasksFromDocument({
      schemaVersion: SCHEDULE_SCHEMA_VERSION,
      title: schedule.title,
      categories: schedule.categories,
      milestoneGroups: schedule.milestoneGroups,
      milestones: schedule.milestones,
      levels: schedule.levels,
      outline: schedule.outline,
    });
    return successorIdsFromTasks(tasks, selectedDetailTask.id);
  }, [
    selectedDetailTask,
    schedule.categories,
    schedule.levels,
    schedule.milestoneGroups,
    schedule.milestones,
    schedule.outline,
    schedule.title,
  ]);
  const links = useMemo(() => {
    const visibleIds = new Set(
      schedule.visibleRows.flatMap((row) =>
        row.type === "task" ? [row.task.id] : [],
      ),
    );
    const tasks = collectTasksFromDocument({
      schemaVersion: SCHEDULE_SCHEMA_VERSION,
      title: schedule.title,
      categories: schedule.categories,
      milestoneGroups: schedule.milestoneGroups,
      milestones: schedule.milestones,
      levels: schedule.levels,
      outline: schedule.outline,
    });
    const links = visibleLinksFromTasks(tasks, visibleIds);
    if (schedule.filters.relation !== "broken") return links;
    return links.filter((link) => link.broken);
  }, [
    schedule.categories,
    schedule.filters.relation,
    schedule.levels,
    schedule.milestoneGroups,
    schedule.milestones,
    schedule.outline,
    schedule.title,
    schedule.visibleRows,
  ]);

  const taskConnections = useMemo(() => {
    const visibleIds = new Set(
      schedule.visibleRows.flatMap((row) =>
        row.type === "task" ? [row.task.id] : [],
      ),
    );
    return visibleConnectionsFromTasks(schedule.connections, visibleIds);
  }, [schedule.connections, schedule.visibleRows]);

  const handleResizeStart = useCallback(
    (taskId: ScheduleId, groupX: number) => {
      setTaskStart(taskId, resizeStartIso(viewStart, xToDate, groupX));
    },
    [viewStart, setTaskStart, xToDate],
  );

  const stickyLayout = useMemo(
    () => layoutStickyHeaders(visibleRows, scrollY, rowHeight, bodyHeight),
    [bodyHeight, rowHeight, scrollY, visibleRows],
  );

  useLayoutEffect(() => {
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
        resizeEndIso(viewStart, xToDate, groupX, barWidth),
      );
    },
    [viewStart, setTaskEnd, xToDate],
  );

  const runScheduleExport = useCallback(
    (
      format: ScheduleExportFormat,
      excelColumns?: typeof DEFAULT_EXCEL_EXPORT_COLUMNS,
      excelFieldColumns?: ExcelExportFieldColumnsPreference,
    ) => {
      flushTitleEdit();
      const milestones = milestonesForExport(
        schedule.filters.milestone,
        schedule.milestoneGroups,
        schedule.visibleMilestoneGroupIds,
        schedule.milestones,
        schedule.visibleRows,
      );
      const baseExportedRange = exportTimelineRange(
        schedule.visibleRows,
        milestones,
        schedule.today,
      );
      const exportedGroups = schedule.milestoneGroups.filter((group) =>
        schedule.visibleMilestoneGroupIds.has(group.id),
      );
      const exportExtraDays = extraTimelineDaysForRightEdge({
        timelineStart: baseExportedRange.timelineStart,
        baseTotalDays: baseExportedRange.totalDays,
        pxPerDay,
        tier: gridTier(pxPerDay),
        milestoneGroups: exportedGroups,
        milestones,
        visibleGroupIds: schedule.visibleMilestoneGroupIds,
        milestoneFontSize,
        milestoneDiamondSize,
        monthHeaderFontSize,
        mode: "export",
      });
      const exportedTotalDays = baseExportedRange.totalDays + exportExtraDays;
      const exportedRange = {
        timelineStart: baseExportedRange.timelineStart,
        timelineEnd: addDays(
          baseExportedRange.timelineStart,
          exportedTotalDays,
        ),
        totalDays: exportedTotalDays,
      };
      const exportedBandLayout = layoutMilestoneBand(
        exportedGroups,
        milestones,
        schedule.visibleMilestoneGroupIds,
        pxPerDay,
        milestoneFontSize,
        milestoneDiamondSize,
        milestoneLaneHeight,
        "export",
      );
      const exportedBandHeight = exportedBandLayout.totalHeight;
      const assigneeLabel =
        schedule.assigneeFilterOptions.find(
          (option) => option.id === schedule.filters.assignee,
        )?.label ?? null;
      const exportInput = {
        title: getDocumentTitle(),
        tierLabel,
        lineageName: schedule.lineageTask?.name ?? null,
        visibleRows: schedule.visibleRows,
        milestones: schedule.milestones,
        milestoneBandLayout: exportedBandLayout,
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
        statuses: displayStatuses,
        memberCatalog: displayMemberMap,
        calendar: displayCalendar,
        filterSummary: describeActiveFilters(
          schedule.filters,
          schedule.milestones,
          assigneeLabel,
          schedule.milestoneGroups,
          schedule.hiddenMilestoneGroupIds,
          schedule.scheduleTags,
          displayStatuses,
        ),
        colorScheme: resolvedColorScheme,
        colors: displayColors,
        showLightningLine,
        milestoneGuideLineIds,
      };
      const onExportError = (error: unknown) => {
        if (error instanceof ScheduleExportTooLargeError) {
          setExportError(error.message);
          return;
        }
        setExportError(
          error instanceof Error ? error.message : "書き出せませんでした。",
        );
      };
      if (format === "xlsx") {
        const exportTasks = collectTasksFromDocument({
          schemaVersion: SCHEDULE_SCHEMA_VERSION,
          title: schedule.title,
          categories: schedule.categories,
          milestoneGroups: schedule.milestoneGroups,
          milestones: schedule.milestones,
          levels: schedule.levels,
          outline: schedule.outline,
        });
        const taskNames = new Map(
          exportTasks.map((task) => [task.id, task.name]),
        );
        void exportScheduleExcel({
          ...exportInput,
          exportMilestones: milestones,
          milestoneGroups: schedule.milestoneGroups,
          taskNames,
          exportedAtIso: new Date().toISOString(),
          excelColumns: excelColumns ?? DEFAULT_EXCEL_EXPORT_COLUMNS,
          fieldDefs: editableFieldDefs,
          excelFieldColumns:
            excelFieldColumns ??
            readExcelExportFieldColumns(editableFieldDefs),
        }).catch(onExportError);
        return;
      }
      void exportSchedule(exportInput, format).catch(onExportError);
    },
    [
      displayCalendar,
      displayColors,
      displayStatuses,
      headerHeight,
      links,
      displayMemberMap,
      milestoneDiamondSize,
      milestoneFontSize,
      milestoneLaneHeight,
      milestoneGuideLineIds,
      monthHeaderFontSize,
      pxPerDay,
      rowHeight,
      barHeight,
      schedule,
      tier,
      tierLabel,
      uiScale,
      resolvedColorScheme,
      flushTitleEdit,
      getDocumentTitle,
      showLightningLine,
      editableFieldDefs,
    ],
  );

  const loadScheduleDiffText = useCallback(async (): Promise<
    | { ok: true; text: string; entries: ScheduleDiffEntry[] }
    | { ok: false; message: string; showDialog: boolean }
  > => {
    const result = await loadScheduleDiffTextCore(
      scheduleFile.filePath,
      getCanonicalJson(),
      editableFieldDefs,
    );
    if (result.ok) {
      return { ok: true, text: result.text, entries: result.entries };
    }
    return {
      ok: false,
      message: result.message,
      showDialog:
        !result.isError &&
        result.message === NO_OPEN_SCHEDULE_FILE_MESSAGE,
    };
  }, [editableFieldDefs, getCanonicalJson, scheduleFile.filePath]);

  useMcpScreenBridge({
    statuses: displayStatuses,
    colors: displayColors,
    categories: schedule.categories,
    outline: schedule.outline,
    title: schedule.title,
    milestones: schedule.milestones,
    milestoneGroups: schedule.milestoneGroups,
    filters: schedule.filters,
    lineageTaskId: schedule.lineageTaskId,
    lineageIds: schedule.lineageIds,
    hiddenMilestoneGroupIds: schedule.hiddenMilestoneGroupIds,
    selectedTaskId: schedule.selectedTaskId,
    selectedTaskIds: schedule.selectedTaskIds,
    today: schedule.today,
    memberMap: displayMemberMap,
    mcpMembers,
    levels: schedule.levels,
    fields: editableFieldDefs,
    scheduleFilePath: scheduleFile.filePath,
    scheduleCurrentJson: scheduleFile.currentJson,
    scheduleBaselineJson: scheduleFile.baselineJson,
    startupSettled: scheduleFile.startupSettled,
    startupRecoveryDialogOpen:
      scheduleFile.recoveryConflictOpen ||
      scheduleFile.missingScheduleLabel != null ||
      scheduleFile.recoveryInvalidOpen,
    mcpReplaceUiBlocking,
    replaceScheduleDocument: (document) =>
      replaceScheduleDocumentRef.current(document),
    onReplaceScheduleApplied,
  });

  const announceDiffStrip = useCallback((kind: DiffStripContentKind, text: string) => {
    const message = diffStripAriaStatus(kind, text);
    setDiffLiveStatus(null);
    window.requestAnimationFrame(() => setDiffLiveStatus(message));
  }, []);

  const applyDiffReveal = useCallback(
    (plan: DiffRevealPlan) => {
      switch (plan.kind) {
        case "task":
          reveal(plan.scrollXDate, plan.scrollY, plan.barWidthPx);
          break;
        case "category":
        case "group":
          view.scrollBy(0, plan.scrollY - view.scrollY);
          break;
        case "milestoneGroup":
          break;
        case "milestone": {
          const nextX = scrollXToRevealTask(
            plan.scrollXDate,
            12,
            view.scrollX,
            view.timelineStart,
            view.totalDays,
            view.pxPerDay,
            timelineWidth,
          );
          view.scrollBy(nextX - view.scrollX, 0);
          break;
        }
        case "title":
          break;
        default:
          break;
      }
    },
    [reveal, timelineWidth, view],
  );

  const commitDiffStripView = useCallback(
    (
      next: DiffStripView,
      announce: boolean,
      entries?: ScheduleDiffEntry[],
    ) => {
      if (!next.visible) {
        if (!diffStripRef.current.visible) {
          return;
        }
        setDiffStrip({ visible: false });
        setDiffPanelExpanded(false);
        prevDiffStripKindRef.current = null;
        pendingDiffBodyRef.current = null;
        pendingDiffEntriesRef.current = null;
        setDiffEntries([]);
        clearDiffNavigationMark();
        return;
      }
      if (
        shouldDeferBodyUpdate(
          diffStripRef.current,
          next,
          diffStripFocusedRef.current,
        )
      ) {
        pendingDiffBodyRef.current = next.text;
        if (entries != null) {
          pendingDiffEntriesRef.current = entries;
        }
        return;
      }
      const prev = diffStripRef.current;
      const wasVisible = prev.visible;
      const prevStatus =
        prev.visible ? diffStripAriaStatus(prev.kind, prev.text) : null;
      const nextStatus = diffStripAriaStatus(next.kind, next.text);
      if (
        prev.visible &&
        prev.kind === next.kind &&
        prev.text === next.text &&
        prev.showClose === next.showClose
      ) {
        return;
      }
      if (next.kind === "empty") {
        setDiffPanelExpanded(true);
      }
      if (entries != null) {
        setDiffEntries(entries);
        setDiffActiveIndex(0);
      }
      setDiffStrip(next);
      prevDiffStripKindRef.current = next.kind;
      if (announce && (!wasVisible || prevStatus !== nextStatus)) {
        announceDiffStrip(next.kind, next.text);
      }
    },
    [announceDiffStrip, clearDiffNavigationMark],
  );

  const closeDiffStrip = useCallback(() => {
    setExplicitEmptyPinned(false);
    commitDiffStripView({ visible: false }, false);
  }, [commitDiffStripView]);

  const copyDiffStripText = useCallback(async () => {
    if (scheduleFile.fileBusy) return;
    const strip = diffStripRef.current;
    if (!strip.visible) return;
    try {
      await navigator.clipboard.writeText(strip.text);
      setToastMessage("差分をコピーしました");
      window.setTimeout(() => setToastMessage(null), 3000);
    } catch {
      setDiffPanelExpanded(true);
      setDiffFocusListOnMount(true);
      diffListRef.current?.focus();
    }
  }, [scheduleFile.fileBusy]);

  const onDiffActiveIndexChange = useCallback(
    (index: number, navigate: boolean) => {
      setDiffActiveIndex(index);
      if (!navigate) {
        const entry = diffEntries[index];
        if (entry?.nav.kind === "title") {
          setDiffNavigationMark({
            sidebar: null,
            chartMilestoneId: null,
            milestoneGroupId: null,
            title: true,
          });
        } else {
          clearDiffNavigationMark();
        }
        setDiffRowStatus(null);
        return;
      }
      const entry = diffEntries[index];
      if (!entry) return;
      const filterState = schedule.getFilterViewState();
      const collapsed = collapsedSetFromIds(
        filterState.collapsedCategoryIds,
        filterState.collapsedGroupIds,
      );
      const outcome = resolveDiffNavigation(entry, {
        visibleRows: schedule.visibleRows,
        categories: schedule.categories,
        outline: schedule.outline,
        collapsed,
        filters: schedule.filters,
        today: schedule.today,
        memberMap: displayMemberMap,
        lineageIds: schedule.lineageIds,
        hiddenMilestoneGroupIds: new Set(schedule.hiddenMilestoneGroupIds),
        milestones: schedule.milestones,
        scrollY: view.scrollY,
        rowHeight,
        bodyHeight,
        dateToX: view.dateToX,
        pxPerDay: view.pxPerDay,
        taskBarWidthPx: (task) =>
          taskBarWidthPx(task, view.dateToX, view.pxPerDay),
      });
      if (outcome.status === "blocked") {
        clearDiffNavigationMark();
        setDiffRowStatus(outcome.message || null);
        return;
      }
      setDiffRowStatus(null);
      setDiffNavigationMark(outcome.mark);
      applyDiffReveal(outcome.reveal);
    },
    [
      applyDiffReveal,
      bodyHeight,
      clearDiffNavigationMark,
      diffEntries,
      displayMemberMap,
      rowHeight,
      schedule,
      view,
    ],
  );

  const processDiffLoadResult = useCallback(
    (
      result:
        | { ok: true; text: string; entries: ScheduleDiffEntry[] }
        | { ok: false; message: string; showDialog: boolean },
      source: "auto" | "explicit",
    ) => {
      if (!result.ok) {
        if (result.showDialog) {
          if (source === "auto") return;
          setDiffError(null);
          setExplicitEmptyPinned(true);
          setDiffPanelExpanded(true);
          commitDiffStripView(
            resolveStripAfterExplicitLoad(result.message),
            true,
          );
          return;
        }
        if (source === "auto") return;
        setDiffError(result.message);
        return;
      }
      setDiffError(null);
      if (source === "auto") {
        const wasVisible = diffStripRef.current.visible;
        const view = resolveStripAfterAutoLoad(
          result.text,
          explicitEmptyPinnedRef.current,
        );
        if (view == null) {
          return;
        }
        if (view.visible && view.kind === "body") {
          setExplicitEmptyPinned(false);
          if (!wasVisible) {
            setDiffPanelExpanded(false);
          }
        }
        commitDiffStripView(view, true, result.entries);
        return;
      }
      const explicitView = resolveStripAfterExplicitLoad(result.text);
      const strip = diffStripRef.current;
      if (
        strip.visible &&
        strip.kind === "body" &&
        explicitView.kind === "body" &&
        result.text === strip.text
      ) {
        return;
      }
      const view = explicitView;
      setExplicitEmptyPinned(view.kind === "empty");
      setDiffPanelExpanded(true);
      if (view.kind === "body") {
        setDiffFocusListOnMount(true);
      }
      commitDiffStripView(view, true, result.entries);
    },
    [commitDiffStripView],
  );

  useEffect(() => {
    setExplicitEmptyPinned(false);
    commitDiffStripView({ visible: false }, false);
  }, [commitDiffStripView, scheduleFile.filePath]);

  useEffect(() => {
    if (!scheduleFile.isDirty) {
      commitDiffStripView({ visible: false }, false);
      setExplicitEmptyPinned(false);
    }
  }, [commitDiffStripView, scheduleFile.isDirty]);

  useEffect(() => {
    if (scheduleFile.filePath || explicitEmptyPinned) return;
    commitDiffStripView({ visible: false }, false);
  }, [commitDiffStripView, explicitEmptyPinned, scheduleFile.filePath]);

  useEffect(() => {
    if (scheduleFile.fileBusy || !scheduleFile.isDirty || !scheduleFile.filePath) {
      diffRequestRef.current += 1;
      return;
    }
    const requestId = diffRequestRef.current + 1;
    diffRequestRef.current = requestId;
    void loadScheduleDiffText().then((result) => {
      if (diffRequestRef.current !== requestId) return;
      processDiffLoadResult(result, "auto");
    });
  }, [
    loadScheduleDiffText,
    processDiffLoadResult,
    scheduleFile.currentJson,
    scheduleFile.fileBusy,
    scheduleFile.filePath,
    scheduleFile.isDirty,
  ]);

  const showScheduleDiff = useCallback(() => {
    if (scheduleFile.fileBusy) return;
    flushTitleEdit();
    setDiffPanelExpanded(true);
    if (
      diffStripRef.current.visible &&
      diffStripRef.current.kind === "body"
    ) {
      setDiffFocusListOnMount(true);
    }
    const requestId = diffRequestRef.current + 1;
    diffRequestRef.current = requestId;
    const stillCurrent = () => diffRequestRef.current === requestId;
    void loadScheduleDiffText().then((result) => {
      if (!stillCurrent()) return;
      processDiffLoadResult(result, "explicit");
    });
  }, [
    flushTitleEdit,
    loadScheduleDiffText,
    processDiffLoadResult,
    scheduleFile.fileBusy,
  ]);

  const copyScheduleDiff = useCallback(() => {
    if (scheduleFile.fileBusy) return;
    flushTitleEdit();
    void loadScheduleDiffText().then(async (result) => {
      if (!result.ok) {
        if (result.showDialog) {
          setDiffError(null);
          setExplicitEmptyPinned(true);
          setDiffPanelExpanded(true);
          commitDiffStripView(
            resolveStripAfterExplicitLoad(result.message),
            true,
          );
        } else {
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
        const view = resolveStripAfterExplicitLoad(result.text);
        setDiffPanelExpanded(true);
        if (view.kind === "body") {
          setDiffFocusListOnMount(true);
        }
        commitDiffStripView(view, false, result.entries);
      }
    });
  }, [
    commitDiffStripView,
    flushTitleEdit,
    loadScheduleDiffText,
    scheduleFile.fileBusy,
  ]);

  const onDiffStripFocus = useCallback(() => {
    diffStripFocusedRef.current = true;
  }, []);

  const onDiffStripBlur = useCallback(() => {
    diffStripFocusedRef.current = false;
    const pending = pendingDiffBodyRef.current;
    const pendingEntries = pendingDiffEntriesRef.current;
    if (pending == null && pendingEntries == null) return;
    pendingDiffBodyRef.current = null;
    pendingDiffEntriesRef.current = null;
    if (pending == null) return;
    commitDiffStripView(
      {
        visible: true,
        text: pending,
        kind: "body",
        showClose: false,
      },
      false,
      pendingEntries ?? undefined,
    );
  }, [commitDiffStripView]);

  const collapseDiffPanel = useCallback(() => {
    setDiffPanelExpanded(false);
    timelineAreaRef.current?.focus();
  }, []);

  const expandDiffPanelFromPointer = useCallback(() => {
    setDiffPanelExpanded(true);
    timelineAreaRef.current?.focus();
  }, []);

  const expandDiffPanelFromKeyboard = useCallback(() => {
    setDiffPanelExpanded(true);
    window.requestAnimationFrame(() => {
      diffListRef.current?.focus();
    });
  }, []);

  const commandPaletteContext = useMemo(
    () => ({
      fileBusy: scheduleFile.fileBusy || !scheduleFile.startupSettled,
      isTauriDesktop: isTauri(),
      recentFilesStore,
      refreshRecentFiles: isTauri() ? refreshRecentFiles : undefined,
      storeDistribution,
      canUndo: schedule.canUndo,
      canRedo: schedule.canRedo,
      selectedTaskId: schedule.selectedTaskId,
      selectedTaskCount: schedule.selectedTaskIds.length,
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
      schedule.selectedTaskIds.length,
      scheduleFile.fileBusy,
      scheduleFile.startupSettled,
      recentFilesStore,
      refreshRecentFiles,
      storeDistribution,
    ],
  );

  const runCommandPalette = useCallback(
    (target: CommandPaletteRunTarget) => {
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
      if (target.type === "openRecent") {
        requestOpenFromRecentWithTitleFlush(target.path);
        return;
      }
      switch (target.id) {
        case "clearRecentHistory":
          handleClearRecentHistory();
          break;
        case "editTitle":
          setTitleEditRequestToken((token) => token + 1);
          break;
        case "open":
          flushTitleEdit();
          scheduleFile.requestOpen();
          break;
        case "openNewWindow":
          flushTitleEdit();
          scheduleFile.requestOpenInNewWindow();
          break;
        case "save":
          flushTitleEdit();
          void scheduleFile.save(false);
          break;
        case "saveAs":
          flushTitleEdit();
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
          flushTitleEdit();
          setJsonOpen(true);
          break;
        case "export":
          flushTitleEdit();
          setExportOpen(true);
          break;
        case "settings":
          setSettingsSection("display");
          setSettingsOpen(true);
          break;
        case "guide":
          openGuide();
          break;
        case "shortcuts":
          openShortcuts();
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
        case "addTask":
          setAddOpen(true);
          break;
        case "addMilestone":
          setAddMilestoneInitialDate(null);
          setAddMilestoneInitialGroupId(null);
          setAddMilestoneOpen(true);
          break;
        case "duplicateTask":
          if (schedule.selectedTaskId != null) {
            openDuplicateDialog(schedule.selectedTaskId);
          }
          break;
        case "checkForUpdates":
          handleCheckForUpdates(false);
          break;
        default:
          break;
      }
    },
    [
      copyScheduleDiff,
      fitToWidth,
      flushTitleEdit,
      focusDetailName,
      handleCheckForUpdates,
      handleClearRecentHistory,
      handleDisplayScaleChange,
      openDuplicateDialog,
      openGuide,
      openShortcuts,
      redo,
      requestDeleteTask,
      requestOpenFromRecentWithTitleFlush,
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
    save: saveWithTitleFlush,
    requestOpen: requestOpenWithTitleFlush,
    requestOpenInNewWindow: requestOpenInNewWindowWithTitleFlush,
    categories,
    selectedTaskId,
    linkSourceId,
    startupSettled: scheduleFile.startupSettled,
    toggleLinkMode,
    openTaskNote: schedule.openTaskNoteDialog,
    clearLinkMode,
    removePredecessorLink,
    removeTaskConnection,
    chartPointerRef,
    closeFloatingMenus,
    requestDeleteTask,
    undo,
    redo,
    taskSearchRef,
    displayScalePreferenceRef,
    uiScaleRef,
    onDisplayScaleChange: handleDisplayScaleChange,
    onOpenShortcuts: openShortcuts,
    commandPaletteOpen,
    onOpenCommandPalette: () => setCommandPaletteOpen(true),
    onCloseCommandPalette: () => setCommandPaletteOpen(false),
    visibleRows,
    selectTask: (taskId) => {
      clearDiffNavigationMark();
      schedule.selectTask(taskId);
      revealTaskRow(taskId);
    },
    selectedTaskIds: schedule.selectedTaskIds,
    navigateTaskSelection: (rows, direction, extend, onAfter) => {
      clearDiffNavigationMark();
      navigateTaskSelection(rows, direction, extend, onAfter);
    },
    moveTaskByDays,
    moveSelectedTasksByDays: schedule.moveSelectedTasksByDays,
    shiftTaskEndByDays,
    focusDetailName,
    revealTaskRow,
    copyScheduleDiff,
    onAddTask: () => setAddOpen(true),
    onAddMilestone: () => {
      setAddMilestoneInitialDate(null);
      setAddMilestoneInitialGroupId(null);
      setAddMilestoneOpen(true);
    },
    onDuplicateTask: openDuplicateDialog,
    commitTaskReorder: schedule.commitTaskReorder,
  });

  useMacOSAppMenu(
    {
    fileBusy: () => scheduleFile.fileBusy || !scheduleFile.startupSettled,
    onOpen: requestOpenWithTitleFlush,
    onOpenRecent: requestOpenFromRecentWithTitleFlush,
    onClearRecentHistory: handleClearRecentHistory,
    onOpenInNewWindow: requestOpenInNewWindowWithTitleFlush,
    onSave: () => saveWithTitleFlush(false),
    onSaveAs: () => saveWithTitleFlush(true),
    onExportHtml: () => {
      flushTitleEdit();
      setExportOpen(true);
    },
    onExportWorkspace: workspaceBinding ? undefined : () => {
      flushTitleEdit();
      void handleExportWorkspace();
    },
    onShowJson: () => {
      flushTitleEdit();
      setJsonOpen(true);
    },
    onShowDiff: showScheduleDiff,
    onOpenGuide: openGuide,
    onOpenShortcuts: openShortcuts,
    onOpenSettings: () => {
      setSettingsSection("display");
      setSettingsOpen(true);
    },
    onCheckForUpdates: storeDistribution
      ? undefined
      : () => handleCheckForUpdates(false),
    onGoToday: scrollToToday,
    onSetTier: setTierZoom,
    onFit: fitToWidth,
    statusCatalogEditorBlocksDocumentUndo: () =>
      (statusEditorOverlayRef.current?.open ?? false) ||
      (colorEditorOverlayRef.current?.open ?? false) ||
      (memberEditorOverlayRef.current?.open ?? false) ||
      fieldExtensionEditorOverlay.open,
    onUndo: () => {
      if (fieldExtensionEditorOverlay.open) {
        if (fieldExtensionEditorOverlay.discardPrompt) {
          return;
        }
        fieldExtensionEditorPanelRef.current?.undo();
        return;
      }
      const colorOverlay = colorEditorOverlayRef.current;
      if (colorOverlay?.open) {
        if (
          colorOverlay.discardPrompt ||
          colorOverlay.copyConfirmOpen ||
          colorOverlay.removeConfirmOpen
        ) {
          return;
        }
        colorCatalogEditorPanelRef.current?.undo();
        return;
      }
      const memberOverlay = memberEditorOverlayRef.current;
      if (memberOverlay?.open) {
        if (
          memberOverlay.discardPrompt ||
          memberOverlay.copyConfirmOpen ||
          memberOverlay.removeConfirmOpen
        ) {
          return;
        }
        memberCatalogEditorPanelRef.current?.undo();
        return;
      }
      const overlay = statusEditorOverlayRef.current;
      if (overlay?.open) {
        if (
          overlay.discardPrompt ||
          overlay.copyConfirmOpen ||
          overlay.removeConfirmOpen
        ) {
          return;
        }
        statusCatalogEditorPanelRef.current?.undo();
        return;
      }
      undo();
    },
    onRedo: () => {
      if (fieldExtensionEditorOverlay.open) {
        if (fieldExtensionEditorOverlay.discardPrompt) {
          return;
        }
        fieldExtensionEditorPanelRef.current?.redo();
        return;
      }
      const colorOverlay = colorEditorOverlayRef.current;
      if (colorOverlay?.open) {
        if (
          colorOverlay.discardPrompt ||
          colorOverlay.copyConfirmOpen ||
          colorOverlay.removeConfirmOpen
        ) {
          return;
        }
        colorCatalogEditorPanelRef.current?.redo();
        return;
      }
      const memberOverlay = memberEditorOverlayRef.current;
      if (memberOverlay?.open) {
        if (
          memberOverlay.discardPrompt ||
          memberOverlay.copyConfirmOpen ||
          memberOverlay.removeConfirmOpen
        ) {
          return;
        }
        memberCatalogEditorPanelRef.current?.redo();
        return;
      }
      const overlay = statusEditorOverlayRef.current;
      if (overlay?.open) {
        if (
          overlay.discardPrompt ||
          overlay.copyConfirmOpen ||
          overlay.removeConfirmOpen
        ) {
          return;
        }
        statusCatalogEditorPanelRef.current?.redo();
        return;
      }
      redo();
    },
  },
    recentFilesStore,
  );

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
      schedule.selectTaskFromContextMenu(taskId);
      setContextMenu({ kind: "task", taskId, x, y });
    },
    [linkSourceId, schedule],
  );

  const openMilestoneContextMenu = useCallback(
    (milestoneId: ScheduleId, x: number, y: number) => {
      if (linkSourceId != null) return;
      setContextMenu({ kind: "milestone", milestoneId, x, y });
    },
    [linkSourceId],
  );

  const openMilestoneGroupContextMenu = useCallback(
    (groupId: ScheduleId, x: number, y: number) => {
      if (linkSourceId != null) return;
      setContextMenu({ kind: "milestoneGroup", groupId, x, y });
    },
    [linkSourceId],
  );

  const openHierarchyContextMenu = useCallback(
    (
      kind: "category" | "group" | "outline",
      id: ScheduleId,
      x: number,
      y: number,
    ) => {
      if (linkSourceId != null) return;
      if (kind === "outline") {
        setContextMenu({ kind: "hierarchy", id, x, y });
        return;
      }
      setContextMenu({ kind, id, x, y });
    },
    [linkSourceId],
  );

  const openHierarchyEdit = useCallback(
    (kind: "category" | "group" | "outline", id: ScheduleId) => {
      if (linkSourceId != null) return;
      schedule.openHierarchyEdit(kind, id);
    },
    [linkSourceId, schedule],
  );

  const openLinkContextMenu = useCallback(
    (
      fromId: ScheduleId,
      toId: ScheduleId,
      x: number,
      y: number,
      linkKind: "predecessor" | "connection",
    ) => {
      setContextMenu({ kind: "link", fromId, toId, linkKind, x, y });
    },
    [],
  );

  const openAddMilestoneContextMenu = useCallback(
    (chartX: number, clientX: number, clientY: number, bandY?: number) => {
      if (linkSourceId != null) return;
      const date = isoDateAtChartX(
        viewStart,
        scrollX,
        pxPerDay,
        chartX,
        viewTotalDays,
      );
      if (date == null) return;
      const groupId =
        bandY != null
          ? milestoneGroupIdAtBandY(milestoneBandLayout.blocks, bandY)
          : null;
      setContextMenu({
        kind: "addMilestone",
        date,
        groupId,
        x: clientX,
        y: clientY,
      });
    },
    [
      linkSourceId,
      milestoneBandLayout,
      pxPerDay,
      viewStart,
      viewTotalDays,
      scrollX,
    ],
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
      const { fromId, toId, linkKind } = contextMenu;
      return [
        {
          type: "item",
          id: "unlink",
          label: linkKind === "connection" ? "繋がりを外す" : "線を外す",
          onSelect: () =>
            linkKind === "connection"
              ? removeTaskConnection(fromId, toId)
              : removePredecessorLink(fromId, toId),
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
            setAddMilestoneInitialGroupId(contextMenu.groupId);
            setAddMilestoneOpen(true);
          },
        },
      ];
    }
    if (contextMenu.kind === "milestoneGroup") {
      const groupId = contextMenu.groupId;
      const items: ContextMenuItem[] = [
        {
          type: "item",
          id: "hide-milestone-group",
          label: "非表示",
          onSelect: () => setMilestoneGroupVisible(groupId, false),
        },
      ];
      if (
        hasOtherVisibleMilestoneBandGroup(
          visibleMilestoneGroupIds,
          milestones,
          groupId,
        )
      ) {
        items.push({
          type: "item",
          id: "show-only-milestone-group",
          label: "この行だけ表示",
          onSelect: () => showOnlyMilestoneGroup(groupId),
        });
      }
      return items;
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
          onSelect: () => openAddCategoryAfter(id),
        },
        {
          type: "item",
          id: "add-group",
          label: "グループを追加",
          onSelect: () => openAddGroupToCategory(id),
        },
      ];
      if (canDeleteCategory(categories, id)) {
        items.push(
          { type: "separator", id: "category-sep" },
          {
            type: "item",
            id: "delete",
            label: "削除",
            danger: true,
            icon: <Trash2 size={14} strokeWidth={2} />,
            onSelect: () => openDeleteHierarchy("category", id),
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
          onSelect: () => openAddGroupAfter(id),
        },
      ];
      if (canDeleteGroup(categories, id)) {
        items.push(
          { type: "separator", id: "group-sep" },
          {
            type: "item",
            id: "delete",
            label: "削除",
            danger: true,
            icon: <Trash2 size={14} strokeWidth={2} />,
            onSelect: () => openDeleteHierarchy("group", id),
          },
        );
      }
      return items;
    }
    if (contextMenu.kind === "hierarchy") {
      if (!hierarchyLayout.aligned || levels == null || outline == null) {
        return [];
      }
      const { id } = contextMenu;
      const levelIndex = findOutlineBranchLevelIndex(outline, id);
      if (levelIndex == null) return [];
      const levelName = levels[levelIndex]?.name ?? "階層";
      const items: ContextMenuItem[] = [
        {
          type: "item",
          id: "rename",
          label: "名前を変更",
          onSelect: () => openHierarchyEdit("outline", id),
        },
        {
          type: "item",
          id: "add-sibling",
          label: `下に${levelName}を追加`,
          onSelect: () => openAddOutlineSiblingAfter(id),
        },
      ];
      if (levelIndex < taskParentLevelIndex(levels.length)) {
        const childName = levels[levelIndex + 1]?.name ?? "階層";
        items.push({
          type: "item",
          id: "add-child",
          label: `${childName}を追加`,
          onSelect: () => openAddOutlineChild(id),
        });
      }
      if (canDeleteOutlineBranch(id)) {
        items.push(
          { type: "separator", id: "hierarchy-sep" },
          {
            type: "item",
            id: "delete",
            label: "削除",
            danger: true,
            icon: <Trash2 size={14} strokeWidth={2} />,
            onSelect: () => openDeleteHierarchy("outline", id),
          },
        );
      }
      return items;
    }
    const taskId = contextMenu.taskId;
    const task = findTaskInDocument(categories, outline, taskId);
    const multiCount = schedule.selectedTaskIds.length;
    if (multiCount > 1) {
      return [
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
    }
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
        shortcut: duplicateTaskShortcutHint(),
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
    outline,
    milestones,
    openDuplicateDialog,
    openTaskForEdit,
    openHierarchyEdit,
    setMilestoneConfidence,
    setTaskConfidence,
    openMilestoneEdit,
    openTaskNoteDialog,
    removePredecessorLink,
    removeTaskConnection,
    openAddCategoryAfter,
    openAddGroupToCategory,
    openAddGroupAfter,
    openAddOutlineSiblingAfter,
    openAddOutlineChild,
    openDeleteHierarchy,
    canDeleteOutlineBranch,
    hierarchyLayout.aligned,
    levels,
    outline,
    setMilestoneGroupVisible,
    showOnlyMilestoneGroup,
    visibleMilestoneGroupIds,
    showLineage,
    schedule.selectedTaskIds.length,
  ]);

  return (
    <div
      className="app"
      style={{
        ["--s" as string]: uiScale,
        ["--sidebar-w" as string]: sidebarWidth,
        ["--diff-panel-inset" as string]: diffPanelInset,
      }}
    >
      <p className="filter-panel-sr-only" role="status" aria-live="polite">
        {titleBlankNotice}
      </p>
      <div className="app-workspace">
        <div
          className="app-workspace-content"
          inert={
            statusEditorOverlay.open ||
            colorEditorOverlay.open ||
            memberEditorOverlay.open ||
            fieldExtensionEditorOverlay.open
              ? true
              : undefined
          }
        >
      <Toolbar
        title={schedule.title}
        titleDiffMarked={diffNavigationMark.title}
        statuses={displayStatuses}
        filters={schedule.filters}
        searchField={schedule.searchField}
        onSearchFieldChange={schedule.setSearchField}
        milestones={schedule.milestones}
        milestoneGroups={schedule.milestoneGroups}
        hiddenMilestoneGroupIds={schedule.hiddenMilestoneGroupIds}
        onMilestoneGroupVisible={schedule.setMilestoneGroupVisible}
        assigneeFilterOptions={schedule.assigneeFilterOptions}
        scheduleTags={schedule.scheduleTags}
        scheduleFields={editableFieldDefs}
        tier={tier}
        lineageName={schedule.lineageTask?.name ?? null}
        canStartLineage={schedule.selectedTaskId != null}
        canStartLineageWithConnections={schedule.selectedTaskIds.length === 1}
        onToggleLineage={schedule.toggleLineage}
        onShowLineageWithConnections={() => {
          const id = schedule.selectedTaskIds[0];
          if (id != null) schedule.showLineageWithConnections(id);
        }}
        linkSourceName={
          linkSourceId == null
            ? null
            : (findTaskInDocument(
                schedule.categories,
                schedule.outline,
                linkSourceId,
              )?.name ?? null)
        }
        canStartLink={schedule.selectedTaskId != null}
        onToggleLink={toggleLinkMode}
        onFiltersChange={schedule.updateFilters}
        onPatchFieldFilter={schedule.patchFieldFilter}
        onUpdateFieldFilters={schedule.updateFieldFilters}
        onGoToday={scrollToToday}
        onSetTier={setTierZoom}
        onFit={fitToWidth}
        onUndo={undo}
        onRedo={redo}
        canUndo={schedule.canUndo}
        canRedo={schedule.canRedo}
        onOpenGuide={openGuide}
        onOpenShortcuts={openShortcuts}
        onShowJson={() => {
          flushTitleEdit();
          setJsonOpen(true);
        }}
        onShowDiff={showScheduleDiff}
        onOpen={() => {
          flushTitleEdit();
          scheduleFile.requestOpen();
        }}
        recentFilesStore={recentFilesStore}
        onRefreshRecentFiles={refreshRecentFiles}
        onOpenRecent={requestOpenFromRecentWithTitleFlush}
        onClearRecentHistory={handleClearRecentHistory}
        onOpenInNewWindow={() => {
          flushTitleEdit();
          scheduleFile.requestOpenInNewWindow();
        }}
        onSave={() => {
          flushTitleEdit();
          void scheduleFile.save(false);
        }}
        onSaveAs={() => {
          flushTitleEdit();
          void scheduleFile.save(true);
        }}
        onCommitTitle={onCommitTitle}
        onTitleEditingChange={setTitleEditing}
        onTitleBlankCommit={showTitleBlankNotice}
        titleEditHandleRef={titleEditHandleRef}
        titleEditRequestToken={titleEditRequestToken}
        hierarchyEditDisabled={
          scheduleFile.fileBusy || !scheduleFile.startupSettled
        }
        hierarchyButtonRef={hierarchyButtonRef}
        onOpenHierarchy={() => {
          flushTitleEdit();
          setHierarchyHadDocumentLevels(schedule.documentHasExplicitLevels());
          setHierarchyLevelsOpen(true);
        }}
        onOpenSettings={() => {
          setSettingsSection("display");
          setSettingsOpen(true);
        }}
        onCheckForUpdates={
          isTauri() && !storeDistribution
            ? () => handleCheckForUpdates(false)
            : undefined
        }
        onExportHtml={() => {
          flushTitleEdit();
          setExportOpen(true);
        }}
        onExportWorkspace={
          isTauri() && !workspaceBinding ? handleExportWorkspace : undefined
        }
        canDelete={schedule.selectedTaskIds.length > 0}
        onAdd={() => setAddOpen(true)}
        onAddMilestone={() => {
          setAddMilestoneInitialDate(null);
          setAddMilestoneInitialGroupId(null);
          setAddMilestoneOpen(true);
        }}
        addTopLevelMenuLabel={addTopLevelMenuLabel}
        onAddTopLevel={() => {
          if (
            schedule.hierarchyLayout.useLegacyCategoryRows ||
            schedule.usesOutlineStorage
          ) {
            schedule.openAddOutlineHeadingFromToolbar();
          }
        }}
        onDelete={() => {
          if (schedule.selectedTaskIds.length > 0) setDeleteOpen(true);
        }}
        fileBusy={scheduleFile.fileBusy}
        startupSettled={scheduleFile.startupSettled}
        taskSearchRef={taskSearchRef}
      />
      <ActiveFilterBar
        statuses={displayStatuses}
        filters={schedule.filters}
        milestones={schedule.milestones}
        milestoneGroups={schedule.milestoneGroups}
        hiddenMilestoneGroupIds={schedule.hiddenMilestoneGroupIds}
        assigneeLabel={filterAssigneeLabel}
        lineageName={schedule.lineageTask?.name ?? null}
        lineageIncludesConnections={schedule.lineageIncludesConnections}
        onFiltersChange={schedule.updateFilters}
        onClearLineage={schedule.clearLineage}
        onMilestoneGroupVisible={schedule.setMilestoneGroupVisible}
        onShowAllMilestoneGroups={schedule.showAllMilestoneGroups}
        scheduleTags={schedule.scheduleTags}
        scheduleFields={editableFieldDefs}
      />
      <div ref={mainRef} className="main">
        <Sidebar
          statuses={displayStatuses}
          rowColors={displayColors}
          colorScheme={resolvedColorScheme}
          categories={schedule.categories}
          outline={schedule.outline}
          levelCount={schedule.hierarchyLayout.levelCount}
          usesOutlineStorage={schedule.usesOutlineStorage}
          allowCrossParentTaskMove={schedule.allowCrossParentTaskMove}
          rows={schedule.visibleRows}
          reorderBaseRows={schedule.baseVisibleRows}
          scrollY={scrollY}
          viewportHeight={bodyHeight}
          rowHeight={rowHeight}
          selectedTaskIds={selectedTaskIdSet}
          hoveredTaskId={hoveredTaskId}
          diffMarkedSidebar={diffNavigationMark.sidebar}
          diffMarkedMilestoneGroupId={diffNavigationMark.milestoneGroupId}
          onSelectTask={handleSelectTask}
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
          canEditDocument={scheduleFile.startupSettled}
          onPreviewTaskReorder={schedule.previewTaskReorder}
          onCommitTaskReorder={schedule.commitTaskReorder}
          onPreviewCategoryReorder={schedule.previewCategoryReorder}
          onCommitCategoryReorder={schedule.commitCategoryReorder}
          onPreviewGroupReorder={schedule.previewGroupReorder}
          onCommitGroupReorder={schedule.commitGroupReorder}
          onCancelReorder={schedule.cancelReorder}
          onReorderDragActiveChange={setSidebarReorderDragging}
          milestoneBandHeight={milestoneBandHeight}
          milestoneBandLayout={milestoneBandLayout}
          milestones={schedule.milestones}
          onToggleCollapse={schedule.toggleCollapsed}
          onOpenTaskNote={schedule.openTaskNoteDialog}
          onTaskContextMenu={openTaskContextMenu}
          onHierarchyContextMenu={openHierarchyContextMenu}
          onMilestoneGroupContextMenu={openMilestoneGroupContextMenu}
          onToggleMilestoneGroupGuideLines={toggleMilestoneGroupGuideLines}
          linkMode={linkSourceId != null}
          onHierarchyDoubleClick={openHierarchyEdit}
          today={schedule.today}
          memberCatalog={displayMemberMap}
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
          chartTopBannerHeight={chartTopBannerHeight}
        />
        <div className="chart-detail">
        {bulkDiscardNotice ? (
          <p className="filter-panel-sr-only" role="status" aria-live="polite">
            {bulkDiscardNotice}
          </p>
        ) : null}
        <div
          ref={timelineAreaRef}
          className="timeline-slot"
          tabIndex={-1}
          aria-label="スケジュールチャート"
        >
          <p
            className="filter-panel-sr-only"
            aria-live="polite"
            aria-atomic="true"
          >
            {catalogMismatchAnnouncement ?? ""}
          </p>
          {showChartTopBanners ? (
            <div ref={chartTopBannersRef} className="chart-top-banners">
              {hierarchyTopBanner === "mismatch" ? (
                <div className="hierarchy-banner hierarchy-banner-mismatch" role="status">
                  <div>{HIERARCHY_MISMATCH_MESSAGE}</div>
                </div>
              ) : hierarchyTopBanner === "levels" ? (
                <div className="hierarchy-banner" role="status">
                  <div>{schedule.hierarchyLevelBanner}</div>
                </div>
              ) : null}
              {catalogMismatchText ? (
                <div className="catalog-mismatch-banner">
                  <div>{catalogMismatchText}</div>
                </div>
              ) : null}
              {linkSourceId != null ? (
                <div className="link-banner" role="status">
                  <div>次にクリックしたタスクを後続にします。Esc で中止</div>
                  {linkError ? (
                    <div className="hint-error">{linkError}</div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
          <Timeline
            statuses={displayStatuses}
            rowColors={displayColors}
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
            timelineStart={viewStart}
            timelineEnd={viewTimelineEnd}
            totalDays={viewTotalDays}
            dateToX={view.dateToX}
            xToDate={view.xToDate}
            selectedTaskIds={selectedTaskIdSet}
            selectedTaskId={schedule.selectedTaskId}
            onSelectTask={handleSelectTask}
            onClearSelection={schedule.clearSelection}
            onMoveTask={handleMoveTask}
            onResizeStart={handleResizeStart}
            onResizeEnd={handleResizeEnd}
            links={links}
            connections={taskConnections}
            onOpenEdit={openTaskFromChart}
            onTaskContextMenu={openTaskContextMenu}
            onWheelBody={onWheelBody}
            onWheelHeader={onWheelHeader}
            onPan={panBy}
            milestones={schedule.milestones}
            milestoneBandLayout={milestoneBandLayout}
            milestoneBandHeight={milestoneBandHeight}
            milestoneLaneHeight={milestoneLaneHeight}
            milestoneDiamondSize={milestoneDiamondSize}
            milestoneFontSize={milestoneFontSize}
            onMoveMilestone={schedule.moveMilestoneByDays}
            onOpenMilestone={schedule.openMilestoneEdit}
            onMilestoneContextMenu={openMilestoneContextMenu}
            milestoneGuideLineIds={milestoneGuideLineIds}
            onToggleMilestoneGuideLine={toggleMilestoneGuideLine}
            diffMarkedMilestoneId={diffNavigationMark.chartMilestoneId}
            diffMarkStrokeWidth={Math.max(2, Math.round(3 * uiScale))}
            today={schedule.today}
            memberCatalog={displayMemberMap}
            calendar={displayCalendar}
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
            statuses={displayStatuses}
            colors={displayColors}
            colorScheme={resolvedColorScheme}
            key={`${selectedDetailTask.id}:${schedule.diskEpoch}`}
            panelRef={detailPanelRef}
            task={selectedDetailTask}
            members={displayMembers ?? []}
            memberCatalog={displayMemberMap}
            tasks={taskRefs}
            milestones={schedule.milestones}
            successorIds={selectedDetailSuccessors}
            onPatch={(patch) =>
              schedule.applyTaskPatch(selectedDetailTask.id, patch)
            }
            documentTags={schedule.scheduleTags}
            onAddTag={(tag) => schedule.appendTaskTag(selectedDetailTask.id, tag)}
            onRemoveTag={(tag) => schedule.dropTaskTag(selectedDetailTask.id, tag)}
            onUpdateTodos={(items) =>
              schedule.setTaskTodos(selectedDetailTask.id, items)
            }
            scheduleFields={editableFieldDefs}
            onSetTaskField={(fieldKey, raw) =>
              schedule.setTaskFieldValue(selectedDetailTask.id, fieldKey, raw)
            }
            onEditingChange={setDetailPanelEditing}
            connections={connectionsForTask(
              schedule.connections,
              selectedDetailTask.id,
            )}
            onAddConnection={(otherTaskId, label) =>
              addTaskConnection(selectedDetailTask.id, otherTaskId, label)
            }
            onUpdateConnectionLabel={(otherTaskId, label) =>
              updateTaskConnectionLabel(
                selectedDetailTask.id,
                otherTaskId,
                label,
              )
            }
            onRemoveConnection={(otherTaskId) =>
              removeTaskConnection(selectedDetailTask.id, otherTaskId)
            }
            connectionAddDialogOpen={connectionAddDialogOpen}
            onConnectionAddDialogOpenChange={setConnectionAddDialogOpen}
          />
        ) : bulkDetailTasks.length > 1 ? (
          <BulkTaskDetailPanel
            statuses={displayStatuses}
            colors={displayColors}
            colorScheme={resolvedColorScheme}
            key={`bulk:${schedule.selectedTaskIds.join(",")}:${schedule.diskEpoch}`}
            tasks={bulkDetailTasks}
            selectedIds={schedule.selectedTaskIds}
            members={displayMembers ?? []}
            memberCatalog={displayMemberMap}
            taskRefs={taskRefs}
            milestones={schedule.milestones}
            documentTags={schedule.scheduleTags}
            onApply={schedule.applyBulkTaskDraft}
            onEditingChange={handleBulkEditingChange}
            onPanelFocus={() => {
              bulkPanelHadFocusRef.current = true;
            }}
          />
        ) : null}
        {diffStrip.visible ? (
          <DiffStrip
            view={diffStrip}
            entries={diffEntries}
            expanded={diffPanelExpanded || diffStrip.kind === "empty"}
            activeIndex={diffActiveIndex}
            rowStatus={diffRowStatus}
            onExpandFromPointer={expandDiffPanelFromPointer}
            onExpandFromKeyboard={expandDiffPanelFromKeyboard}
            onCollapse={collapseDiffPanel}
            onClose={closeDiffStrip}
            onCopy={() => void copyDiffStripText()}
            copyDisabled={scheduleFile.fileBusy}
            listRef={diffListRef}
            onFocus={onDiffStripFocus}
            onBlur={onDiffStripBlur}
            onActiveIndexChange={onDiffActiveIndexChange}
            focusListOnMount={diffFocusListOnMount}
            onFocusListDone={() => setDiffFocusListOnMount(false)}
            rowHeight={rowHeight}
          />
        ) : null}
        </div>
      </div>
        </div>
        <FieldExtensionEditorOverlay
          ref={fieldExtensionEditorPanelRef}
          state={fieldExtensionEditorOverlay}
        />
        {statusEditorOverlay.open ? (
          <StatusCatalogEditorOverlay
            mode={statusEditorOverlay.mode}
            catalogs={statusEditorOverlay.catalogs}
            editingCatalogId={statusEditorOverlay.editingCatalogId}
            editingItems={statusEditorOverlay.editingItems}
            itemsRevision={statusEditorOverlay.itemsRevision}
            appliedCatalogId={statusEditorOverlay.appliedCatalogId}
            workspaceFileLabel={statusEditorOverlay.workspaceFileLabel}
            workspaceAppliedNote={statusEditorOverlay.workspaceAppliedNote}
            busy={statusEditorOverlay.busy}
            message={statusEditorOverlay.message}
            setMessage={statusEditorOverlay.setMessage}
            onDirtyChange={statusEditorOverlay.setDirty}
            discardPrompt={statusEditorOverlay.discardPrompt}
            copyConfirmOpen={statusEditorOverlay.copyConfirmOpen}
            removeConfirmOpen={statusEditorOverlay.removeConfirmOpen}
            dirty={statusEditorOverlay.dirty}
            onConfirmDiscard={() => void statusEditorOverlay.confirmDiscard()}
            onCancelDiscard={statusEditorOverlay.cancelDiscard}
            onConfirmCopy={statusEditorOverlay.confirmCopy}
            onCancelCopy={statusEditorOverlay.cancelCopy}
            onRequestRemoveCatalog={statusEditorOverlay.requestRemoveCatalog}
            onConfirmRemoveCatalog={() =>
              void statusEditorOverlay.confirmRemoveCatalog()
            }
            onCancelRemoveCatalog={statusEditorOverlay.cancelRemoveCatalog}
            onSelectCatalog={statusEditorOverlay.selectCatalog}
            onRequestClose={statusEditorOverlay.requestClose}
            onRequestNewList={statusEditorOverlay.requestNewList}
            onRequestCopyList={statusEditorOverlay.requestCopyList}
            onSaveApp={statusEditorOverlay.save}
            onSaveWorkspace={statusEditorOverlay.saveWorkspace}
            editorPanelRef={statusCatalogEditorPanelRef}
          />
        ) : null}
        {colorEditorOverlay.open ? (
          <ColorCatalogEditorOverlay
            mode={colorEditorOverlay.mode}
            catalogs={colorEditorOverlay.catalogs}
            editingCatalogId={colorEditorOverlay.editingCatalogId}
            editingItems={colorEditorOverlay.editingItems}
            itemsRevision={colorEditorOverlay.itemsRevision}
            appliedCatalogId={colorEditorOverlay.appliedCatalogId}
            workspaceFileLabel={colorEditorOverlay.workspaceFileLabel}
            workspaceAppliedNote={colorEditorOverlay.workspaceAppliedNote}
            busy={colorEditorOverlay.busy}
            message={colorEditorOverlay.message}
            setMessage={colorEditorOverlay.setMessage}
            onDirtyChange={colorEditorOverlay.setDirty}
            discardPrompt={colorEditorOverlay.discardPrompt}
            copyConfirmOpen={colorEditorOverlay.copyConfirmOpen}
            removeConfirmOpen={colorEditorOverlay.removeConfirmOpen}
            dirty={colorEditorOverlay.dirty}
            onConfirmDiscard={() => void colorEditorOverlay.confirmDiscard()}
            onCancelDiscard={colorEditorOverlay.cancelDiscard}
            onConfirmCopy={colorEditorOverlay.confirmCopy}
            onCancelCopy={colorEditorOverlay.cancelCopy}
            onRequestRemoveCatalog={colorEditorOverlay.requestRemoveCatalog}
            onConfirmRemoveCatalog={() =>
              void colorEditorOverlay.confirmRemoveCatalog()
            }
            onCancelRemoveCatalog={colorEditorOverlay.cancelRemoveCatalog}
            onSelectCatalog={colorEditorOverlay.selectCatalog}
            onRequestClose={colorEditorOverlay.requestClose}
            onRequestNewList={colorEditorOverlay.requestNewList}
            onRequestCopyList={colorEditorOverlay.requestCopyList}
            onSaveApp={colorEditorOverlay.save}
            onSaveWorkspace={colorEditorOverlay.saveWorkspace}
            editorPanelRef={colorCatalogEditorPanelRef}
          />
        ) : null}
        {memberEditorOverlay.open ? (
          <MemberCatalogEditorOverlay
            mode={memberEditorOverlay.mode}
            catalogs={memberEditorOverlay.catalogs}
            editingCatalogId={memberEditorOverlay.editingCatalogId}
            editingItems={memberEditorOverlay.editingItems}
            itemsRevision={memberEditorOverlay.itemsRevision}
            appliedCatalogId={memberEditorOverlay.appliedCatalogId}
            workspaceFileLabel={memberEditorOverlay.workspaceFileLabel}
            workspaceAppliedNote={memberEditorOverlay.workspaceAppliedNote}
            busy={memberEditorOverlay.busy}
            message={memberEditorOverlay.message}
            setMessage={memberEditorOverlay.setMessage}
            onDirtyChange={memberEditorOverlay.setDirty}
            discardPrompt={memberEditorOverlay.discardPrompt}
            copyConfirmOpen={memberEditorOverlay.copyConfirmOpen}
            removeConfirmOpen={memberEditorOverlay.removeConfirmOpen}
            dirty={memberEditorOverlay.dirty}
            onConfirmDiscard={() => void memberEditorOverlay.confirmDiscard()}
            onCancelDiscard={memberEditorOverlay.cancelDiscard}
            onConfirmCopy={memberEditorOverlay.confirmCopy}
            onCancelCopy={memberEditorOverlay.cancelCopy}
            onRequestRemoveCatalog={memberEditorOverlay.requestRemoveCatalog}
            onConfirmRemoveCatalog={() =>
              void memberEditorOverlay.confirmRemoveCatalog()
            }
            onCancelRemoveCatalog={memberEditorOverlay.cancelRemoveCatalog}
            onSelectCatalog={memberEditorOverlay.selectCatalog}
            onRequestClose={memberEditorOverlay.requestClose}
            onRequestNewList={memberEditorOverlay.requestNewList}
            onRequestCopyList={memberEditorOverlay.requestCopyList}
            onSaveApp={memberEditorOverlay.save}
            onSaveWorkspace={memberEditorOverlay.saveWorkspace}
            editorPanelRef={memberCatalogEditorPanelRef}
          />
        ) : null}
      </div>
      <p className="filter-panel-sr-only" role="status" aria-live="polite">
        {diffLiveStatus ?? ""}
      </p>
      <StatusBar
        fileName={scheduleFile.displayFileName}
        saveStatus={scheduleFile.saveStatusLabel}
        saveStatusClickable={scheduleFile.isDirty}
        onSaveStatusClick={showScheduleDiff}
        membersCatalogLabel={membersCatalogLabel}
        membersCatalogError={membersCatalogError}
        calendarError={calendarDisplayError}
        colorsCatalogError={colorsCatalogError}
        tier={tier}
        visibleTaskCount={visibleTaskCount}
        totalTaskCount={totalTaskCount}
        showDeferredReload={scheduleFile.showDeferredReload}
        onDeferredReload={scheduleFile.requestDeferredConfirm}
        onOpenSettingsMembers={() => {
          setSettingsSection("members");
          setSettingsOpen(true);
        }}
        onOpenSettingsCalendar={() => {
          setSettingsSection("calendar");
          setSettingsOpen(true);
        }}
        onOpenShortcuts={openShortcuts}
      />
      {showCornerNotice && updateCornerMessage ? (
        updateCornerMode === "offer" || updateCornerMode === "installing" ? (
          <UpdateOfferNotice
            message={updateCornerMessage}
            mode={updateCornerMode}
            onLater={onUpdateLater}
            onInstall={() => void onUpdateInstall()}
            onHeightChange={setUpdateOfferHeight}
            liveAnnouncementKey={offerLiveAnnouncementKey}
            shouldAnnounceOffer={registerOfferAnnouncement}
            onOfferAnnounced={markOfferAnnounced}
          />
        ) : (
          <p
            className="app-update-offer app-update-offer--status"
            role="status"
            aria-live="polite"
          >
            {updateCornerMessage}
          </p>
        )
      ) : null}
      <AppToast
        message={toastMessage}
        style={
          ephemeralToastBottom ? { bottom: ephemeralToastBottom } : undefined
        }
      />
      <AppToast
        message={peerNoticeMessage}
        onClick={() => void scheduleFile.peerNotice.focusPeerTarget()}
        style={peerNoticeMessage ? { bottom: peerToastBottom } : undefined}
      />
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
          statuses={displayStatuses}
          colors={displayColors}
          colorScheme={resolvedColorScheme}
          key={`duplicate-${schedule.duplicatingTask.id}:${schedule.diskEpoch}`}
          mode="duplicate"
          task={schedule.duplicatingTask}
          members={displayMembers ?? []}
          memberCatalog={displayMemberMap}
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
          milestoneGroups={schedule.milestoneGroups}
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
      {schedule.outlineHeadingAddOpen &&
      (schedule.hierarchyLayout.useLegacyCategoryRows ||
        (schedule.outline != null && schedule.levels != null)) ? (
        <OutlineHeadingAddDialog
          key={`outline-heading:${schedule.diskEpoch}`}
          levels={
            schedule.hierarchyLayout.useLegacyCategoryRows
              ? LEGACY_THREE_LEVEL_DEFS
              : schedule.levels!
          }
          outline={schedule.outline}
          categoryParentOptions={
            schedule.hierarchyLayout.useLegacyCategoryRows
              ? legacyCategoryParentSelectOptions(schedule.categories)
              : undefined
          }
          levelCount={
            schedule.hierarchyLayout.useLegacyCategoryRows
              ? LEGACY_THREE_LEVEL_COUNT
              : schedule.levels!.length
          }
          onClose={schedule.closeAddingHierarchy}
          onSave={schedule.saveOutlineHeadingAdd}
        />
      ) : null}
      {schedule.deletingHierarchyTarget ? (
        <DeleteHierarchyDialog
          label={schedule.deletingHierarchyTarget.label}
          name={schedule.deletingHierarchyTarget.name}
          onClose={schedule.closeDeleteHierarchy}
          onConfirm={schedule.confirmDeleteHierarchy}
        />
      ) : null}
      {addMilestoneOpen ? (
        <MilestoneAddDialog
          initialDate={addMilestoneInitialDate ?? schedule.today}
          initialGroupId={addMilestoneInitialGroupId}
          milestoneGroups={schedule.milestoneGroups}
          onClose={() => {
            setAddMilestoneOpen(false);
            setAddMilestoneInitialDate(null);
            setAddMilestoneInitialGroupId(null);
          }}
          onSave={(input) => {
            const message = schedule.addMilestone(input);
            if (message == null) {
              setAddMilestoneOpen(false);
              setAddMilestoneInitialDate(null);
              setAddMilestoneInitialGroupId(null);
            }
            return message;
          }}
        />
      ) : null}
      {addOpen ? (
        <TaskAddDialog
          categories={schedule.categories}
          parentBranches={
            schedule.taskParentBranches.length > 0
              ? schedule.taskParentBranches
              : undefined
          }
          initialParentBranchId={schedule.taskParentBranches[0]?.id ?? null}
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
            findTaskInDocument(
              schedule.categories,
              schedule.outline,
              schedule.selectedTaskId,
            )?.start ?? schedule.today
          }
          initialEnd={
            findTaskInDocument(
              schedule.categories,
              schedule.outline,
              schedule.selectedTaskId,
            )?.end ?? schedule.today
          }
          onClose={() => setAddOpen(false)}
          onSave={(input) => {
            const id = schedule.addTask({
              ...input,
              parentBranchId: input.parentBranchId,
            });
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
      {deleteOpen && schedule.selectedTaskIds.length > 0 ? (
        <DeleteTaskDialog
          taskName={
            schedule.selectedTaskIds.length === 1
              ? (findTaskInDocument(
                  schedule.categories,
                  schedule.outline,
                  schedule.selectedTaskIds[0]!,
                )?.name ?? "このタスク")
              : undefined
          }
          bulkCount={
            schedule.selectedTaskIds.length > 1
              ? schedule.selectedTaskIds.length
              : undefined
          }
          hasDependencies={schedule.selectedTaskIds.some(
            (id) => dependencyCountFromTasks(documentTasks, id) > 0,
          )}
          onClose={() => setDeleteOpen(false)}
          onConfirm={() => {
            if (schedule.selectedTaskIds.length === 1) {
              schedule.deleteTask(schedule.selectedTaskIds[0]!);
            } else {
              schedule.deleteTasks(schedule.selectedTaskIds);
            }
            setDeleteOpen(false);
          }}
        />
      ) : null}
      {settingsOpen ? (
        <SettingsDialog
          open={settingsOpen}
          statusCatalog={{
            settings: statusCatalogState.settings,
            selectedCatalogLabel: statusCatalogState.selectedCatalogLabel,
            onImport: handleStatusCatalogImport,
            onSelectCatalog: statusCatalogState.selectCatalog,
            onDeleteCatalog: handleStatusCatalogDelete,
            onOpenEditor: () => {
              setSettingsOpen(false);
              statusEditorOverlay.openEditor();
            },
          }}
          colorCatalog={{
            settings: colorCatalogState.settings,
            selectedCatalogLabel: colorCatalogState.selectedCatalogLabel,
            onImport: handleColorCatalogImport,
            onSelectCatalog: colorCatalogState.selectCatalog,
            onDeleteCatalog: handleColorCatalogDelete,
            onOpenEditor: () => {
              setSettingsOpen(false);
              colorEditorOverlay.openEditor();
            },
          }}
          memberCatalog={{
            settings: memberCatalogState.settings,
            selectedCatalogLabel: memberCatalogState.selectedCatalogLabel,
            onImport: handleMemberCatalogImport,
            onSelectCatalog: memberCatalogState.selectCatalog,
            onDeleteCatalog: handleMemberCatalogDelete,
            onOpenEditor: () => {
              setSettingsOpen(false);
              memberEditorOverlay.openEditor();
            },
          }}
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
          onClose={handleSettingsClose}
          calendarLabel={appCalendarState.label}
          calendarError={appCalendarState.error}
          onImportCalendar={appCalendarState.importCalendar}
          onDeleteCalendar={appCalendarState.removeCalendar}
          workspaceBinding={workspaceBinding}
          workspaceStatusEditor={
            workspaceStatusEditTarget
              ? {
                  onOpenEditor: () => {
                    setSettingsOpen(false);
                    statusEditorOverlay.openEditor();
                  },
                }
              : undefined
          }
          workspaceColorEditor={
            workspaceColorEditTarget
              ? {
                  onOpenEditor: () => {
                    setSettingsOpen(false);
                    colorEditorOverlay.openEditor();
                  },
                }
              : undefined
          }
          workspaceMemberEditor={
            workspaceMemberEditTarget
              ? {
                  onOpenEditor: () => {
                    setSettingsOpen(false);
                    memberEditorOverlay.openEditor();
                  },
                }
              : undefined
          }
          onCreateWorkspaceColorsCatalog={
            workspaceBinding &&
            workspaceBinding.document.colors == null &&
            !workspaceColorsError(workspaceBinding.colors)
              ? () => handleCreateWorkspaceColorsCatalog()
              : undefined
          }
          autoUpdateEnabled={autoUpdateEnabled}
          onAutoUpdateChange={(enabled) => {
            writeAutoUpdateEnabled(enabled);
            setAutoUpdateEnabled(enabled);
          }}
          onCheckForUpdates={() => handleCheckForUpdates(true)}
          updateUiPhase={updateUiState.phase}
          updateUiMessage={updateUiState.message ?? null}
          onUpdateLater={onUpdateLater}
          onUpdateInstall={() => void onUpdateInstall()}
          updateOfferLiveAnnouncementKey={offerLiveAnnouncementKey}
          registerOfferAnnouncement={registerOfferAnnouncement}
          markOfferAnnounced={markOfferAnnounced}
          onSaveBetaInstaller={() => void handleSaveBetaInstaller()}
          betaInstallerStatusLine={betaInstallerStatusLine}
          storeDistribution={storeDistribution}
          fieldExtensionSettings={fieldExtensionCatalogState.settings}
          fieldExtensionSelectedLabels={fieldExtensionCatalogState.selectedLabels}
          fieldExtensionsError={fieldExtensionsCatalogError}
          onImportFieldExtension={async (contents, overwrite) => {
            const doc = parseFieldExtensionCatalogText(contents);
            const current =
              fieldExtensionCatalogState.settings.selectedCatalogIds;
            const nextSelected = current.includes(doc.id)
              ? current
              : [...current, doc.id];
            const documents = await readFieldExtensionDocumentsForIds(
              nextSelected.filter((id) => id !== doc.id),
            );
            documents.push(doc);
            const collision = firstFieldKeyCollision(documents);
            if (collision != null) {
              throw new Error(formatFieldKeyCollisionMessage(collision));
            }
            await fieldExtensionCatalogState.importCatalog(contents, overwrite);
          }}
          onToggleFieldExtension={async (catalogId, selected) => {
            const current = fieldExtensionCatalogState.settings.selectedCatalogIds;
            const next = selected
              ? [...current, catalogId]
              : current.filter((id) => id !== catalogId);
            if (selected) {
              const documents = await readFieldExtensionDocumentsForIds(next);
              const collision = firstFieldKeyCollision(documents);
              if (collision != null) {
                throw new Error(formatFieldKeyCollisionMessage(collision));
              }
            }
            await fieldExtensionCatalogState.setSelectedCatalogIds(next);
          }}
          onDeleteFieldExtension={fieldExtensionCatalogState.removeCatalog}
          workspaceEditableFieldExtensionError={
            workspaceEditableFieldExtensionErrorMessage
          }
          onCreateWorkspaceEditableFieldExtension={
            workspaceBinding &&
            workspaceBinding.editableFieldExtension.kind === "unset"
              ? () => handleCreateWorkspaceEditableFieldExtension()
              : undefined
          }
          onDeleteWorkspaceEditableFieldExtension={
            workspaceBinding &&
            workspaceBinding.editableFieldExtension.kind === "loaded"
              ? () => handleDeleteWorkspaceEditableFieldExtension()
              : undefined
          }
          onClearWorkspaceEditableFieldExtension={
            workspaceBinding &&
            workspaceBinding.document.editableFieldExtension != null &&
            workspaceBinding.editableFieldExtension.kind === "error"
              ? () => handleClearWorkspaceEditableFieldExtension()
              : undefined
          }
          workspaceFieldExtensionEditor={
            workspaceFieldExtensionEditTarget
              ? {
                  onOpenEditor: () => {
                    setSettingsOpen(false);
                    void fieldExtensionEditorOverlay.openEditor();
                  },
                }
              : undefined
          }
          fieldExtensionEditor={
            !workspaceBinding
              ? {
                  onOpenEditor: () => {
                    setSettingsOpen(false);
                    void fieldExtensionEditorOverlay.openEditor();
                  },
                }
              : undefined
          }
        />
      ) : null}
      <HierarchyLevelsDialog
        open={hierarchyLevelsOpen}
        initialLevels={schedule.levelDefsForEditor()}
        hadDocumentLevels={hierarchyHadDocumentLevels}
        snapshot={schedule.getDocumentSnapshot()}
        onClose={() => {
          setHierarchyLevelsOpen(false);
          hierarchyButtonRef.current?.focus();
        }}
        onCommit={(levels) => {
          schedule.commitLevelDefinitions(levels, hierarchyHadDocumentLevels);
        }}
      />
      <GuideDialog
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        onOpenShortcuts={openShortcuts}
      />
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
        json={jsonOpen ? getCanonicalJson() : ""}
        open={jsonOpen}
        onClose={() => setJsonOpen(false)}
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
          message={
            scheduleFile.closePromptForUpdate
              ? "サンプルの変更は保存されていません。更新を入れると失われます。入れ直しますか？"
              : "サンプルの変更は保存されていません。閉じると失われます。ウィンドウを閉じますか？"
          }
          confirmLabel={
            scheduleFile.closePromptForUpdate ? "入れ直す" : "閉じる"
          }
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
      {scheduleFile.externalReloadOpen && scheduleFile.externalReloadAssessment ? (
        <ExternalReloadDialog
          assessment={scheduleFile.externalReloadAssessment}
          review={scheduleFile.externalReloadReview}
          conflictReview={scheduleFile.externalReloadConflictReview}
          hasOpenEditDialog={
            titleEditing ||
            detailPanelEditing ||
            connectionAddDialogOpen ||
            hierarchyLevelsOpen ||
            fieldExtensionEditorOverlay.open ||
            statusEditorOverlay.open ||
            colorEditorOverlay.open ||
            memberEditorOverlay.open ||
            schedule.editingNoteTask != null ||
            schedule.editingMilestone != null ||
            schedule.editingHierarchyTarget != null ||
            schedule.addingHierarchyTarget != null ||
            schedule.outlineHeadingAddOpen ||
            schedule.deletingHierarchyTarget != null
          }
          diskUpdatedAgain={scheduleFile.diskUpdatedAgain}
          onReload={() => {
            setHierarchyLevelsOpen(false);
            setConnectionAddDialogOpen(false);
            fieldExtensionEditorOverlay.forceClose();
            colorEditorOverlay.forceClose();
            memberEditorOverlay.forceClose();
            scheduleFile.confirmExternalReload();
          }}
          onKeepLocal={scheduleFile.keepLocalEditsOnExternalReload}
          onApplyMerge={() => {
            setDetailPanelEditing(false);
            setConnectionAddDialogOpen(false);
            setHierarchyLevelsOpen(false);
            fieldExtensionEditorOverlay.forceClose();
            colorEditorOverlay.forceClose();
            memberEditorOverlay.forceClose();
            scheduleFile.confirmBaselineMerge();
          }}
        />
      ) : null}
      {scheduleFile.errorMessage ? (
        <ScheduleErrorDialog
          title={scheduleFile.errorDialogTitle}
          message={scheduleFile.errorMessage}
          onClose={scheduleFile.dismissError}
        />
      ) : null}
      {exportOpen ? (
        <ExportFormatDialog
          fieldDefs={editableFieldDefs}
          onCancel={() => setExportOpen(false)}
          onExport={(format, excelColumns, excelFieldColumns) => {
            setExportOpen(false);
            void runScheduleExport(format, excelColumns, excelFieldColumns);
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
