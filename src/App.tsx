import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Konva from "konva";
import { DeleteTaskDialog } from "./components/DeleteTaskDialog";
import { DiscardChangesDialog } from "./components/DiscardChangesDialog";
import { ExternalChangeDialog } from "./components/ExternalChangeDialog";
import { ExternalReloadDialog } from "./components/ExternalReloadDialog";
import { RecoveryConflictDialog } from "./components/RecoveryConflictDialog";
import { RecoveryInvalidDialog } from "./components/RecoveryInvalidDialog";
import { JsonDialog } from "./components/JsonDialog";
import { ScheduleErrorDialog } from "./components/ScheduleErrorDialog";
import { MilestoneEditDialog } from "./components/MilestoneEditDialog";
import { TaskAddDialog } from "./components/TaskAddDialog";
import { Sidebar } from "./components/Sidebar";
import { TaskEditDialog } from "./components/TaskEditDialog";
import { TaskNoteDialog } from "./components/TaskNoteDialog";
import { Timeline } from "./components/Timeline";
import { SettingsDialog } from "./components/SettingsDialog";
import { ExportFormatDialog } from "./components/ExportFormatDialog";
import { Toolbar } from "./components/Toolbar";
import { useMemberCatalog } from "./hooks/useMemberCatalog";
import { useAppCalendar } from "./hooks/useAppCalendar";
import { useSchedule } from "./hooks/useSchedule";
import { useScheduleFile } from "./hooks/useScheduleFile";
import { useTimelineView } from "./hooks/useTimelineView";
import { serializeScheduleDocument } from "./model/scheduleFile";
import { dependencyCount, listTasks, successorIds, visibleLinks } from "./model/dependencies";
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
import { addDays, isoDate, parseDate, roundToDay } from "./model/dates";
import {
  layoutMilestones,
  milestoneBandHeightPx,
} from "./model/milestones";
import { findTaskById } from "./model/rows";
import { findTaskPlace } from "./model/tasks";
import { scaledLayoutSizes } from "./model/layoutSizes";
import { computeTimelineRange } from "./model/timeline";
import type { ScheduleId } from "./model/types";
import {
  readDisplayScalePreference,
  readUiScale,
  resolveUiScale,
  type DisplayScalePreference,
} from "./model/uiScale";
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
  const [timelineWidth, setTimelineWidth] = useState(520);
  const [timelineSlotHeight, setTimelineSlotHeight] = useState(440);
  const [displayScalePreference, setDisplayScalePreference] = useState(
    readDisplayScalePreference,
  );
  const [uiScale, setUiScale] = useState(readUiScale);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [focusTaskId, setFocusTaskId] = useState<ScheduleId | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [pendingFit, setPendingFit] = useState(false);

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
      schedule.editingMilestone != null,
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
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
  }, [redo, undo]);

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
      const start = isoDate(
        roundToDay(range.timelineStart, xToDate(groupX)),
      );
      setTaskStart(taskId, start);
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
      const exclusiveEnd = roundToDay(
        range.timelineStart,
        xToDate(groupX + barWidth),
      );
      const end = isoDate(addDays(exclusiveEnd, -1));
      setTaskEnd(taskId, end);
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
    ],
  );

  return (
    <div className="app" style={{ ["--s" as string]: uiScale }}>
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
        onFiltersChange={schedule.updateFilters}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFit={fitToWidth}
        onShowJson={() => setJsonOpen(true)}
        onOpen={scheduleFile.requestOpen}
        onSave={() => void scheduleFile.save(false)}
        onSaveAs={() => void scheduleFile.save(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onExportHtml={() => setExportOpen(true)}
        canDelete={schedule.selectedTaskId != null}
        onAdd={() => setAddOpen(true)}
        onDelete={() => {
          if (schedule.selectedTaskId != null) setDeleteOpen(true);
        }}
        fileBusy={scheduleFile.fileBusy}
      />
      <div className="hint">
        Ctrl(⌘)+ホイールでズーム ・ Shift+ホイールで横スクロール ・
        ドラッグで縦横スクロール ・ 左の名前はドラッグで横にずらせます ・ ⌘/Ctrl+ドラッグでバー移動、端をドラッグで期間変更、ダブルクリックで詳細編集
        ・ タスクを選んで「系統」で前後だけ表示 ・ マイルストンは帯のひし形をドラッグ、ダブルクリックで編集
        ・ ⌘/Ctrl+Z で取り消し、Shift+Z または Ctrl+Y でやり直し
      </div>
      <div className="main">
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
          today={schedule.today}
          memberCatalog={memberCatalogState.memberMap}
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
            selectedTaskId={schedule.selectedTaskId}
            onSelectTask={schedule.selectTask}
            onClearSelection={schedule.clearSelection}
            onMoveTask={schedule.moveTaskByDays}
            onResizeStart={handleResizeStart}
            onResizeEnd={handleResizeEnd}
            links={links}
            onOpenEdit={schedule.openEditDialog}
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
            today={schedule.today}
            memberCatalog={memberCatalogState.memberMap}
            calendar={appCalendarState.calendar}
          />
        </div>
      </div>
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
          onOpenDisk={scheduleFile.confirmRecoveryOpenDisk}
          onRestoreEdits={scheduleFile.confirmRecoveryRestoreEdits}
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
    </div>
  );
}

export default App;
