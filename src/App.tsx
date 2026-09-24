import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Konva from "konva";
import { JsonDialog } from "./components/JsonDialog";
import { Sidebar } from "./components/Sidebar";
import { TaskEditDialog } from "./components/TaskEditDialog";
import { Timeline } from "./components/Timeline";
import { Toolbar } from "./components/Toolbar";
import { useSchedule } from "./hooks/useSchedule";
import { useTimelineView } from "./hooks/useTimelineView";
import { isoDate, roundToDay } from "./model/dates";
import { computeTimelineRange } from "./model/timeline";
import {
  SAMPLE_PROJECT_TITLE,
  sampleCategories,
  scheduleToJson,
} from "./sample/schedule";

function App() {
  const timelineAreaRef = useRef<HTMLDivElement>(null);
  const [timelineWidth, setTimelineWidth] = useState(520);
  const [jsonOpen, setJsonOpen] = useState(false);

  useEffect(() => {
    const node = timelineAreaRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setTimelineWidth(entry.contentRect.width);
    });
    observer.observe(node);
    setTimelineWidth(node.clientWidth);
    return () => observer.disconnect();
  }, []);

  const schedule = useSchedule(sampleCategories);
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
    <div className="app">
      <Toolbar
        title={SAMPLE_PROJECT_TITLE}
        filters={schedule.filters}
        assignees={schedule.assignees}
        zoomLabel={view.tierLabel}
        onFiltersChange={schedule.updateFilters}
        onZoomIn={view.zoomIn}
        onZoomOut={view.zoomOut}
        onFit={view.fitToWidth}
        onShowJson={() => setJsonOpen(true)}
      />
      <div className="hint">
        Ctrl(⌘)+ホイールでズーム ・ Shift+ホイールで横スクロール ・
        ドラッグで縦横スクロール ・ ⌘/Ctrl+ドラッグでバー移動、端をドラッグで期間変更、ダブルクリックで詳細編集
      </div>
      <div className="main">
        <Sidebar
          rows={schedule.visibleRows}
          scrollY={view.scrollY}
          selectedTaskId={schedule.selectedTaskId}
        />
        <div ref={timelineAreaRef} style={{ flex: 1, minWidth: 0 }}>
          <Timeline
            visibleRows={schedule.visibleRows}
            width={Math.max(200, timelineWidth)}
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
