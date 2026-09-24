import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Konva from "konva";
import { JsonDialog } from "./components/JsonDialog";
import { Sidebar } from "./components/Sidebar";
import { TaskEditDialog } from "./components/TaskEditDialog";
import { Timeline } from "./components/Timeline";
import { Toolbar } from "./components/Toolbar";
import { useSchedule } from "./hooks/useSchedule";
import { useTimelineView } from "./hooks/useTimelineView";
import { listTasks, successorIds, visibleLinks } from "./model/dependencies";
import { isoDate, roundToDay } from "./model/dates";
import { computeTimelineRange } from "./model/timeline";
import { readUiScale } from "./model/uiScale";
import {
  SAMPLE_PROJECT_TITLE,
  sampleCategories,
  scheduleToJson,
} from "./sample/schedule";

function App() {
  const timelineAreaRef = useRef<HTMLDivElement>(null);
  const [timelineWidth, setTimelineWidth] = useState(520);
  const [timelineSlotHeight, setTimelineSlotHeight] = useState(440);
  const [uiScale, setUiScale] = useState(readUiScale);
  const [jsonOpen, setJsonOpen] = useState(false);

  const headerHeight = Math.round(40 * uiScale);
  const rowHeight = Math.round(32 * uiScale);
  const barHeight = Math.round(20 * uiScale);
  const bodyHeight = Math.max(120, timelineSlotHeight - headerHeight);

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

  const schedule = useSchedule(sampleCategories, rowHeight, bodyHeight);
  const range = useMemo(
    () => computeTimelineRange(sampleCategories),
    [],
  );

  const view = useTimelineView(
    {
      timelineStart: range.timelineStart,
      totalDays: range.totalDays,
    },
    schedule.maxScrollY,
    timelineWidth,
  );

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
    () => JSON.stringify(scheduleToJson(schedule.categories), null, 2),
    [schedule.categories],
  );

  const handleResizeStart = useCallback(
    (taskId: number, groupX: number) => {
      const start = isoDate(
        roundToDay(range.timelineStart, view.xToDate(groupX)),
      );
      schedule.setTaskStart(taskId, start);
    },
    [range.timelineStart, schedule, view],
  );

  const handleResizeEnd = useCallback(
    (taskId: number, groupX: number, barWidth: number) => {
      const end = isoDate(
        roundToDay(range.timelineStart, view.xToDate(groupX + barWidth)),
      );
      schedule.setTaskEnd(taskId, end);
    },
    [range.timelineStart, schedule, view],
  );

  return (
    <div className="app" style={{ ["--s" as string]: uiScale }}>
      <Toolbar
        title={SAMPLE_PROJECT_TITLE}
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
      />
      <div className="hint">
        Ctrl(⌘)+ホイールでズーム ・ Shift+ホイールで横スクロール ・
        ドラッグで縦横スクロール ・ ⌘/Ctrl+ドラッグでバー移動、端をドラッグで期間変更、ダブルクリックで詳細編集
        ・ タスクを選んで「系統」で前後だけ表示
      </div>
      <div className="main">
        <Sidebar
          rows={schedule.visibleRows}
          scrollY={view.scrollY}
          rowHeight={rowHeight}
          selectedTaskId={schedule.selectedTaskId}
          onToggleCollapse={schedule.toggleCollapsed}
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
          />
        </div>
      </div>
      <TaskEditDialog
        task={schedule.editingTask}
        assignees={schedule.assignees}
        tasks={taskRefs}
        successorIds={editingSuccessors}
        onClose={schedule.closeEditDialog}
        onSave={schedule.saveTaskEdit}
      />
      <JsonDialog
        json={jsonText}
        open={jsonOpen}
        onClose={() => setJsonOpen(false)}
      />
    </div>
  );
}

export default App;
