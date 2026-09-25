import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Konva from "konva";
import { DeleteTaskDialog } from "./components/DeleteTaskDialog";
import { DiscardChangesDialog } from "./components/DiscardChangesDialog";
import { ExternalChangeDialog } from "./components/ExternalChangeDialog";
import { JsonDialog } from "./components/JsonDialog";
import { ScheduleErrorDialog } from "./components/ScheduleErrorDialog";
import { MilestoneEditDialog } from "./components/MilestoneEditDialog";
import { TaskAddDialog } from "./components/TaskAddDialog";
import { Sidebar } from "./components/Sidebar";
import { TaskEditDialog } from "./components/TaskEditDialog";
import { Timeline } from "./components/Timeline";
import { Toolbar } from "./components/Toolbar";
import { useSchedule } from "./hooks/useSchedule";
import { useScheduleFile } from "./hooks/useScheduleFile";
import { useTimelineView } from "./hooks/useTimelineView";
import { serializeScheduleDocument } from "./model/scheduleFile";
import { dependencyCount, listTasks, successorIds, visibleLinks } from "./model/dependencies";
import { exportScheduleHtml } from "./model/exportHtml";
import { addDays, isoDate, parseDate, roundToDay } from "./model/dates";
import { layoutMilestones } from "./model/milestones";
import { findTaskById } from "./model/rows";
import { findTaskPlace } from "./model/tasks";
import { computeTimelineRange } from "./model/timeline";
import type { ScheduleId } from "./model/types";
import { readUiScale } from "./model/uiScale";
import {
  SAMPLE_PROJECT_TITLE,
  sampleCategories,
  sampleMilestones,
  scheduleToJson,
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
  const [uiScale, setUiScale] = useState(readUiScale);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [focusTaskId, setFocusTaskId] = useState<ScheduleId | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [pendingFit, setPendingFit] = useState(false);

  const headerHeight = Math.round(40 * uiScale);
  const rowHeight = Math.round(32 * uiScale);
  const barHeight = Math.round(20 * uiScale);
  const milestoneFontSize = Math.round(11 * uiScale);
  const milestoneDiamondSize = Math.max(8, Math.round(11 * uiScale));
  const milestoneLaneHeight = Math.round(26 * uiScale);
  const [milestoneBandHeight, setMilestoneBandHeight] = useState(() =>
    Math.round(26 * readUiScale()),
  );
  const bodyHeight = Math.max(
    120,
    timelineSlotHeight - headerHeight - milestoneBandHeight,
  );

  useEffect(() => {
    const onResize = () => setUiScale(readUiScale());
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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

  const schedule = useSchedule(
    SAMPLE_PROJECT_TITLE,
    sampleCategories,
    sampleMilestones,
    rowHeight,
    bodyHeight,
  );
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
    schedule.maxScrollY,
    timelineWidth,
  );

  const onAfterOpenFile = useCallback(() => {
    setPendingFit(true);
  }, []);

  useEffect(() => {
    if (!pendingFit) return;
    view.fitToWidth();
    setPendingFit(false);
  }, [pendingFit, range.totalDays, view.fitToWidth]);

  const scheduleFile = useScheduleFile({
    title: schedule.title,
    categories: schedule.categories,
    milestones: schedule.milestones,
    replaceDocument: schedule.replaceDocument,
    onAfterOpen: onAfterOpenFile,
    initialBaselineJson: INITIAL_BASELINE_JSON,
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!shouldHandleDocumentUndo(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (key === "z" && mod && !e.altKey) {
        e.preventDefault();
        if (e.shiftKey) schedule.redo();
        else schedule.undo();
        return;
      }
      if (key === "y" && e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        schedule.redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [schedule.redo, schedule.undo]);

  const onWheelBody = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      const pointerX =
        e.target.getStage()?.getPointerPosition()?.x ?? timelineWidth / 2;
      view.handleWheel(e.evt, pointerX, "body");
    },
    [timelineWidth, view],
  );

  const onWheelHeader = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      const pointerX =
        e.target.getStage()?.getPointerPosition()?.x ?? timelineWidth / 2;
      view.handleWheel(e.evt, pointerX, "header");
    },
    [timelineWidth, view],
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
  const nextMilestoneBandHeight =
    schedule.milestones.length === 0
      ? 0
      : (Math.max(...milestoneLanes.values(), 0) + 1) * milestoneLaneHeight;
  if (nextMilestoneBandHeight !== milestoneBandHeight) {
    setMilestoneBandHeight(nextMilestoneBandHeight);
  }

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

  const jsonText = useMemo(
    () =>
      JSON.stringify(
        scheduleToJson(schedule.title, schedule.categories, schedule.milestones),
        null,
        2,
      ),
    [schedule.categories, schedule.milestones, schedule.title],
  );

  const handleResizeStart = useCallback(
    (taskId: ScheduleId, groupX: number) => {
      const start = isoDate(
        roundToDay(range.timelineStart, view.xToDate(groupX)),
      );
      schedule.setTaskStart(taskId, start);
    },
    [range.timelineStart, schedule, view],
  );

  useEffect(() => {
    if (focusTaskId == null) return;
    const row = schedule.visibleRows.find(
      (item) => item.type === "task" && item.task.id === focusTaskId,
    );
    if (!row || row.type !== "task") return;
    view.reveal(parseDate(row.task.start), row.y);
    setFocusTaskId(null);
  }, [focusTaskId, schedule.visibleRows, view]);

  const handleResizeEnd = useCallback(
    (taskId: ScheduleId, groupX: number, barWidth: number) => {
      const exclusiveEnd = roundToDay(
        range.timelineStart,
        view.xToDate(groupX + barWidth),
      );
      const end = isoDate(addDays(exclusiveEnd, -1));
      schedule.setTaskEnd(taskId, end);
    },
    [range.timelineStart, schedule, view],
  );

  return (
    <div className="app" style={{ ["--s" as string]: uiScale }}>
      <Toolbar
        title={schedule.title}
        fileStatusLabel={scheduleFile.statusLabel}
        filters={schedule.filters}
        assignees={schedule.assignees}
        zoomLabel={view.tierLabel}
        lineageName={schedule.lineageTask?.name ?? null}
        canStartLineage={schedule.selectedTaskId != null}
        onToggleLineage={schedule.toggleLineage}
        onFiltersChange={schedule.updateFilters}
        onZoomIn={view.zoomIn}
        onZoomOut={view.zoomOut}
        onFit={view.fitToWidth}
        onShowJson={() => setJsonOpen(true)}
        onOpen={scheduleFile.requestOpen}
        onSave={() => void scheduleFile.save(false)}
        onSaveAs={() => void scheduleFile.save(true)}
        onExportHtml={() => {
          void exportScheduleHtml({
            title: schedule.title,
            tierLabel: view.tierLabel,
            lineageName: schedule.lineageTask?.name ?? null,
            visibleRows: schedule.visibleRows,
            milestones: schedule.milestones,
            milestoneLanes,
            links,
            timelineStart: range.timelineStart,
            timelineEnd: range.timelineEnd,
            totalDays: range.totalDays,
            pxPerDay: view.pxPerDay,
            tier: view.tier,
            headerHeight,
            rowHeight,
            barHeight,
            milestoneBandHeight,
            milestoneLaneHeight,
            milestoneDiamondSize,
            milestoneFontSize,
            labelScale: uiScale,
            today: schedule.today,
          }).catch((error: unknown) => {
            setExportError(
              error instanceof Error
                ? error.message
                : "HTML を書き出せませんでした。",
            );
          });
        }}
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
          scrollY={view.scrollY}
          rowHeight={rowHeight}
          selectedTaskId={schedule.selectedTaskId}
          milestoneBandHeight={milestoneBandHeight}
          milestones={schedule.milestones}
          onToggleCollapse={schedule.toggleCollapsed}
          today={schedule.today}
        />
        <div ref={timelineAreaRef} className="timeline-slot">
          <Timeline
            visibleRows={schedule.visibleRows}
            width={Math.max(200, timelineWidth)}
            rowHeight={rowHeight}
            barHeight={barHeight}
            headerHeight={headerHeight}
            bodyHeight={bodyHeight}
            pxPerDay={view.pxPerDay}
            scrollY={view.scrollY}
            tier={view.tier}
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
            onPan={view.panBy}
            milestones={schedule.milestones}
            milestoneLanes={milestoneLanes}
            milestoneBandHeight={milestoneBandHeight}
            milestoneLaneHeight={milestoneLaneHeight}
            milestoneDiamondSize={milestoneDiamondSize}
            milestoneFontSize={milestoneFontSize}
            onMoveMilestone={schedule.moveMilestoneByDays}
            onOpenMilestone={schedule.openMilestoneEdit}
            today={schedule.today}
          />
        </div>
      </div>
      <TaskEditDialog
        task={schedule.editingTask}
        assignees={schedule.assignees}
        tasks={taskRefs}
        milestones={schedule.milestones}
        successorIds={editingSuccessors}
        onClose={schedule.closeEditDialog}
        onSave={schedule.saveTaskEdit}
      />
      <MilestoneEditDialog
        milestone={schedule.editingMilestone}
        onClose={schedule.closeMilestoneEdit}
        onSave={schedule.saveMilestoneEdit}
      />
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
      <JsonDialog
        json={jsonText}
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
          message="保存していない変更は失われます。ウィンドウを閉じますか？"
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
      {scheduleFile.errorMessage ? (
        <ScheduleErrorDialog
          message={scheduleFile.errorMessage}
          onClose={scheduleFile.dismissError}
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
