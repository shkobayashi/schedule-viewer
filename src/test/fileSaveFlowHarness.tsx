import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { DiffStrip } from "../components/DiffStrip";
import { DiscardChangesDialog } from "../components/DiscardChangesDialog";
import { ExternalChangeDialog } from "../components/ExternalChangeDialog";
import { HierarchyLevelsDialog } from "../components/HierarchyLevelsDialog";
import { JsonDialog } from "../components/JsonDialog";
import { ScheduleErrorDialog } from "../components/ScheduleErrorDialog";
import { StatusBar } from "../components/StatusBar";
import { useAppKeyboard } from "../hooks/useAppKeyboard";
import { useRecentFiles } from "../hooks/useRecentFiles";
import { useSchedule } from "../hooks/useSchedule";
import { useScheduleFile } from "../hooks/useScheduleFile";
import { useTimelineView } from "../hooks/useTimelineView";
import { computeTimelineRange, gridTier } from "../model/timeline";
import { extraTimelineDaysForRightEdge } from "../model/timelineRightPadding";
import { listTasks, successorIds } from "../model/dependencies";
import { findTaskInDocument, levelBannerText } from "../model/hierarchy";
import {
  documentHasExplicitLevels,
  levelDefsForEditor,
} from "../model/hierarchyLevelEdit";
import { loadScheduleDiffText } from "../model/scheduleDiffLoad";
import {
  resolveStripAfterAutoLoad,
  resolveStripAfterExplicitLoad,
  type DiffStripView,
} from "../model/diffStripVisibility";
import { parseScheduleText } from "../model/scheduleFile";
import { BUILTIN_STATUS_ITEMS } from "../model/statusCatalog";
import { documentToJsonString } from "../model/serialize";
import { emptyTaskSelection, type TaskSelectionState } from "../model/taskSelection";
import type { ScheduleDiffEntry } from "../model/scheduleDiffEntry";
import type { ScheduleDocument, ScheduleId } from "../model/types";
import { loadRegressionMembers } from "./searchErrorKeysFixtures";

export type FileSaveFlowHandle = {
  scheduleFile: ReturnType<typeof useScheduleFile>;
  schedule: ReturnType<typeof useSchedule>;
  recentFiles: ReturnType<typeof useRecentFiles>;
  setScroll: (x: number, y: number) => void;
  getScroll: () => { x: number; y: number };
  setTaskEnd: (taskId: ScheduleId, end: string) => void;
  renameTask: (taskId: ScheduleId, name: string) => void;
  openJson: () => void;
  openHierarchy: () => void;
  getLevelBanner: () => string;
  canUndo: () => boolean;
  save: (saveAs: boolean) => Promise<void>;
  openSavedAtPath: (path: string, contents: string) => void;
};

type FileSaveFlowHarnessProps = {
  initialDocument: ScheduleDocument;
  initialBaselineJson?: string;
  startupSample?: boolean;
  openPathOnStartup?: string | null;
  openContentsOnStartup?: string | null;
};

const ROW_HEIGHT = 32;
const VIEWPORT_WIDTH = 1200;
const TIMELINE_HEIGHT = 480;

export const FileSaveFlowHarness = forwardRef<
  FileSaveFlowHandle,
  FileSaveFlowHarnessProps
>(function FileSaveFlowHarness(
  { initialDocument, initialBaselineJson, startupSample = false }: FileSaveFlowHarnessProps,
  ref,
) {
  const members = useMemo(() => loadRegressionMembers(), []);
  const blockDocumentEditsRef = useRef(false);
  const applyMergedDocumentRef = useRef<
    (
      document: ScheduleDocument,
    ) => { before: import("../model/history").DocumentSnapshot; after: import("../model/history").DocumentSnapshot } | null
  >(() => null);
  const onHistoryUndoRef = useRef<(landed: import("../model/history").DocumentSnapshot) => void>(
    () => {},
  );
  const onHistoryRedoRef = useRef<(landed: import("../model/history").DocumentSnapshot) => void>(
    () => {},
  );

  const schedule = useSchedule(
    initialDocument.title,
    initialDocument.categories,
    initialDocument.milestoneGroups,
    initialDocument.milestones,
    ROW_HEIGHT,
    members,
    true,
    blockDocumentEditsRef,
    (landed) => onHistoryUndoRef.current(landed),
    (landed) => onHistoryRedoRef.current(landed),
    BUILTIN_STATUS_ITEMS,
    true,
    [],
    true,
  );

  const [timelineEpoch, setTimelineEpoch] = useState(0);
  const onAfterOpen = useCallback(() => {
    setTimelineEpoch((value) => value + 1);
  }, []);

  const {
    recentFilesStore,
    setRecentFilesStore,
    clearRecentHistory,
  } = useRecentFiles(() => {});

  const baseline = useMemo(() => {
    if (initialBaselineJson != null) return initialBaselineJson;
    const parsed = parseScheduleText(documentToJsonString(initialDocument));
    return parsed.ok ? parsed.canonicalJson : documentToJsonString(initialDocument);
  }, [initialBaselineJson, initialDocument]);

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
    onAfterOpen,
    initialBaselineJson: baseline,
    hasOpenEditDialog: false,
    blockDocumentEditsRef,
    setFilterViewState: schedule.setFilterViewState,
    getFilterViewState: schedule.getFilterViewState,
    knownMemberIds: schedule.knownMemberIds,
    memberCatalogSettled: true,
    fieldExtensionCatalogSettled: true,
    extraFieldDefs: [...schedule.fieldDefs],
    sidebarReorderDragging: false,
    getCanonicalJson: schedule.getCanonicalJson,
    getDocumentTitle: schedule.getDocumentTitle,
    onRecentFilesStoreUpdated: setRecentFilesStore,
  });

  applyMergedDocumentRef.current = schedule.applyMergedDocument;
  onHistoryUndoRef.current = scheduleFile.onHistoryUndoApplied;
  onHistoryRedoRef.current = scheduleFile.onHistoryRedoApplied;

  const [selection] = useState<TaskSelectionState>(emptyTaskSelection());
  const [jsonOpen, setJsonOpen] = useState(false);
  const [hierarchyOpen, setHierarchyOpen] = useState(false);
  const [diffStrip, setDiffStrip] = useState<DiffStripView>({ visible: false });
  const [diffExpanded, setDiffExpanded] = useState(false);
  const [diffEntries, setDiffEntries] = useState<ScheduleDiffEntry[]>([]);
  const [diffError, setDiffError] = useState<string | null>(null);
  const [explicitEmptyPinned, setExplicitEmptyPinned] = useState(false);
  const diffRequestRef = useRef(0);

  const range = useMemo(
    () =>
      computeTimelineRange(
        schedule.categories,
        schedule.milestones,
        schedule.today,
        schedule.outline,
      ),
    [schedule.categories, schedule.milestones, schedule.outline, schedule.today],
  );

  const view = useTimelineView(
    {
      timelineStart: range.timelineStart,
      baseTotalDays: range.totalDays,
    },
    VIEWPORT_WIDTH,
    () => 0,
    schedule.today,
    timelineEpoch,
    schedule.diskEpoch,
    (px) =>
      extraTimelineDaysForRightEdge({
        timelineStart: range.timelineStart,
        baseTotalDays: range.totalDays,
        pxPerDay: px,
        tier: gridTier(px),
        milestoneGroups: schedule.milestoneGroups,
        milestones: schedule.milestones,
        visibleGroupIds: schedule.visibleMilestoneGroupIds,
        hiddenMilestoneIds: schedule.hiddenMilestoneIdSet,
        milestoneFontSize: 12,
        milestoneDiamondSize: 8,
        monthHeaderFontSize: 12,
        mode: "screen",
      }),
  );

  const saveWithTitleFlush = useCallback(
    (saveAs: boolean) => {
      void scheduleFile.save(saveAs);
    },
    [scheduleFile],
  );

  useAppKeyboard({
    rowHeight: ROW_HEIGHT,
    scrollBy: view.scrollBy,
    fileBusy: scheduleFile.fileBusy || !scheduleFile.startupSettled,
    save: saveWithTitleFlush,
    requestOpen: scheduleFile.requestOpen,
    requestOpenInNewWindow: scheduleFile.requestOpenInNewWindow,
    categories: schedule.categories,
    selectedTaskId: selection.activeId,
    selectedTaskIds: selection.ids,
    linkSourceId: null,
    startupSettled: scheduleFile.startupSettled,
    toggleLinkMode: () => {},
    openTaskNote: () => {},
    clearLinkMode: () => {},
    removePredecessorLink: () => {},
    removeTaskConnection: () => {},
    chartPointerRef: {
      current: { overTask: false, overMilestone: false, link: null, hoverTaskId: null },
    },
    closeFloatingMenus: () => {},
    requestDeleteTask: () => {},
    undo: schedule.undo,
    redo: schedule.redo,
    taskSearchRef: { current: null },
    displayScalePreferenceRef: { current: "auto" },
    uiScaleRef: { current: 1 },
    onDisplayScaleChange: () => {},
    onOpenShortcuts: () => {},
    commandPaletteOpen: false,
    onOpenCommandPalette: () => {},
    onCloseCommandPalette: () => {},
    visibleRows: schedule.visibleRows,
    selectTask: () => {},
    navigateTaskSelection: () => {},
    moveTaskByDays: schedule.moveTaskByDays,
    moveSelectedTasksByDays: schedule.moveSelectedTasksByDays,
    shiftTaskEndByDays: schedule.shiftTaskEndByDays,
    focusDetailName: () => {},
    revealTaskRow: () => {},
    copyScheduleDiff: async () => {},
    onAddTask: () => {},
    onAddMilestone: () => {},
    onDuplicateTask: () => {},
    commitTaskReorder: () => {},
    filterPanelOpen: false,
    onOpenSettings: () => {},
    onGoToday: () => {},
    onSetViewTier: () => {},
    onToggleLineage: () => {},
    onToggleFilterPanel: () => {},
    onToggleTaskConfidence: () => {},
  });

  const processDiffLoadResult = useCallback(
    (
      result: Awaited<ReturnType<typeof loadScheduleDiffText>>,
      source: "auto" | "explicit",
    ) => {
      if (!result.ok) {
        if (source === "explicit") {
          if (result.isError) {
            setDiffError(result.message);
            setDiffStrip({ visible: false });
            setDiffEntries([]);
            setDiffExpanded(true);
            return;
          }
          setDiffError(null);
          setExplicitEmptyPinned(!result.isError);
          setDiffExpanded(true);
          setDiffStrip(resolveStripAfterExplicitLoad(result.message));
          setDiffEntries([]);
        } else if (!result.isError) {
          setDiffStrip(resolveStripAfterAutoLoad(result.message, explicitEmptyPinned) ?? {
            visible: false,
          });
        }
        return;
      }
      setDiffError(null);
      setExplicitEmptyPinned(false);
      const viewState =
        source === "auto"
          ? resolveStripAfterAutoLoad(result.text, explicitEmptyPinned)
          : resolveStripAfterExplicitLoad(result.text);
      if (viewState == null) {
        setDiffStrip({ visible: false });
        setDiffEntries([]);
        return;
      }
      setDiffStrip(viewState);
      setDiffEntries(result.entries);
      if (
        source === "explicit" &&
        viewState.visible &&
        viewState.kind === "body"
      ) {
        setDiffExpanded(true);
      }
    },
    [explicitEmptyPinned],
  );

  const showScheduleDiff = useCallback(() => {
    if (scheduleFile.fileBusy) return;
    const requestId = diffRequestRef.current + 1;
    diffRequestRef.current = requestId;
    void loadScheduleDiffText(
      scheduleFile.filePath,
      scheduleFile.currentJson,
      schedule.fieldDefs,
    ).then((result) => {
      if (diffRequestRef.current !== requestId) return;
      processDiffLoadResult(result, "explicit");
    });
  }, [
    processDiffLoadResult,
    schedule.fieldDefs,
    scheduleFile.currentJson,
    scheduleFile.fileBusy,
    scheduleFile.filePath,
  ]);

  useEffect(() => {
    if (!scheduleFile.filePath || explicitEmptyPinned) return;
    if (!scheduleFile.isDirty) {
      setDiffStrip({ visible: false });
    }
  }, [explicitEmptyPinned, scheduleFile.filePath, scheduleFile.isDirty]);

  useEffect(() => {
    if (scheduleFile.fileBusy || !scheduleFile.isDirty || !scheduleFile.filePath) {
      diffRequestRef.current += 1;
      return;
    }
    const requestId = diffRequestRef.current + 1;
    diffRequestRef.current = requestId;
    void loadScheduleDiffText(
      scheduleFile.filePath,
      scheduleFile.currentJson,
      schedule.fieldDefs,
    ).then((result) => {
      if (diffRequestRef.current !== requestId) return;
      processDiffLoadResult(result, "auto");
    });
  }, [
    processDiffLoadResult,
    schedule.fieldDefs,
    scheduleFile.currentJson,
    scheduleFile.fileBusy,
    scheduleFile.filePath,
    scheduleFile.isDirty,
  ]);

  useImperativeHandle(
    ref,
    () => ({
      scheduleFile,
      schedule,
      recentFiles: {
        recentFilesStore,
        setRecentFilesStore,
        clearRecentHistory,
        refreshRecentFiles: async () => {},
      },
      setScroll: (x, y) => {
        view.applyScrollPosition(x, y);
      },
      getScroll: () => ({ x: view.scrollX, y: view.scrollY }),
      setTaskEnd: (taskId, end) => schedule.setTaskEnd(taskId, end),
      renameTask: (taskId, name) => {
        const task = findTaskInDocument(
          schedule.categories,
          schedule.outline,
          taskId,
        );
        if (!task) return;
        schedule.applyTaskPatch(taskId, {
          name,
          start: task.start,
          end: task.end,
          assigneeIds: task.assigneeIds,
          status: task.status,
          progress: task.progress,
          confidence: task.confidence,
          predecessors: task.predecessors,
          successors: successorIds(schedule.categories, taskId),
          milestoneId: task.milestoneId ?? null,
          note: task.note ?? "",
        });
      },
      openJson: () => setJsonOpen(true),
      openHierarchy: () => setHierarchyOpen(true),
      getLevelBanner: () => levelBannerText(schedule.levels ?? []),
      canUndo: () => schedule.canUndo,
      save: (saveAs) => scheduleFile.save(saveAs),
      openSavedAtPath: (path, contents) => {
        const parsed = parseScheduleText(contents);
        if (!parsed.ok) return;
        schedule.replaceDocument(parsed.document);
        scheduleFile.markSavedAtPath(parsed.canonicalJson, path);
      },
    }),
    [
      recentFilesStore,
      schedule,
      scheduleFile,
      setRecentFilesStore,
      clearRecentHistory,
      view,
    ],
  );

  const designTask = findTaskInDocument(
    schedule.categories,
    schedule.outline,
    "e1000001-0000-4000-8000-000000000002",
  );

  return (
    <div>
      <span data-testid="startup-settled">
        {scheduleFile.startupSettled ? "yes" : "no"}
      </span>
      <span data-testid="file-path">{scheduleFile.filePath ?? ""}</span>
      <span data-testid="design-end">{designTask?.end ?? ""}</span>
      <span data-testid="design-name">{designTask?.name ?? ""}</span>
      <span data-testid="scroll">{`${view.scrollX},${view.scrollY}`}</span>
      <span data-testid="timeline-epoch">{timelineEpoch}</span>
      <span data-testid="level-banner">{levelBannerText(schedule.levels ?? [])}</span>
      <span data-testid="startup-sample">{startupSample ? "yes" : "no"}</span>
      <span data-testid="recent-schedules">{recentFilesStore.schedules.join("|")}</span>
      <StatusBar
        fileName={scheduleFile.displayFileName}
        saveStatus={scheduleFile.saveStatusLabel}
        saveStatusClickable={scheduleFile.isDirty}
        onSaveStatusClick={showScheduleDiff}
        membersCatalogLabel="members"
        membersCatalogError={null}
        calendarError={null}
        colorsCatalogError={null}
        tier={view.tier}
        visibleTaskCount={schedule.visibleRows.filter((row) => row.type === "task").length}
        totalTaskCount={listTasks(schedule.categories).length}
        showDeferredReload={scheduleFile.showDeferredReload}
        onDeferredReload={scheduleFile.requestDeferredConfirm}
        onOpenSettingsMembers={() => {}}
        onOpenSettingsCalendar={() => {}}
        onOpenShortcuts={() => {}}
      />
      {diffError ? (
        <pre className="error-text" data-testid="diff-error">
          {diffError}
        </pre>
      ) : null}
      {diffStrip.visible ? (
        <DiffStrip
          view={diffStrip}
          entries={diffEntries}
          expanded={diffExpanded}
          activeIndex={0}
          rowStatus={null}
          rowHeight={ROW_HEIGHT}
          onExpandFromPointer={() => setDiffExpanded(true)}
          onExpandFromKeyboard={() => setDiffExpanded(true)}
          onCollapse={() => setDiffExpanded(false)}
          onClose={() => {
            setDiffExpanded(false);
            setExplicitEmptyPinned(false);
            setDiffStrip({ visible: false });
          }}
          onCopy={() => {}}
          copyDisabled={false}
          listRef={{ current: null }}
          onFocus={() => {}}
          onBlur={() => {}}
          onActiveIndexChange={() => {}}
          focusListOnMount={false}
          onFocusListDone={() => {}}
        />
      ) : null}
      {scheduleFile.errorMessage ? (
        <ScheduleErrorDialog
          title={scheduleFile.errorDialogTitle}
          message={scheduleFile.errorMessage}
          onClose={scheduleFile.dismissError}
        />
      ) : null}
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
      {scheduleFile.externalChangeOpen ? (
        <ExternalChangeDialog
          onOverwrite={scheduleFile.confirmExternalOverwrite}
          onSaveAs={scheduleFile.confirmExternalSaveAs}
          onCancel={scheduleFile.cancelExternalChange}
        />
      ) : null}
      <JsonDialog
        open={jsonOpen}
        json={jsonOpen ? scheduleFile.currentJson : ""}
        onClose={() => setJsonOpen(false)}
      />
      <HierarchyLevelsDialog
        open={hierarchyOpen}
        initialLevels={levelDefsForEditor({ levels: schedule.levels })}
        hadDocumentLevels={documentHasExplicitLevels({ levels: schedule.levels })}
        snapshot={{
          ...schedule.getDocumentSnapshot(),
          levels: schedule.levels,
          outline: schedule.outline,
        }}
        onClose={() => setHierarchyOpen(false)}
        onCommit={(levels) => {
          schedule.commitLevelDefinitions(
            levels,
            documentHasExplicitLevels({ levels: schedule.levels }),
          );
          setHierarchyOpen(false);
        }}
      />
      <button type="button" onClick={() => void scheduleFile.save(false)}>
        保存
      </button>
      <button type="button" onClick={() => void scheduleFile.save(true)}>
        別名保存
      </button>
      <button type="button" onClick={() => void clearRecentHistory()}>
        履歴を消す
      </button>
      <div style={{ height: TIMELINE_HEIGHT }} data-testid="timeline-slot" />
    </div>
  );
});
