import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { DragBarGeometry, DragDatePreview } from "../model/dragDates";
import { buildTimelineDragDatePreviews } from "../model/timelineDragDatePreviews";
import { timelineVisibleBarObstacles } from "../model/timelineVisibleBarObstacles";
import type { ScheduleId, VisibleRow } from "../model/types";

type UseTimelineDragDatesOptions = {
  visibleRows: readonly VisibleRow[];
  selectedTaskIds: ReadonlySet<ScheduleId>;
  timelineStart: Date;
  xToDate: (x: number) => Date;
  pxPerDay: number;
  dateToX: (d: Date) => number;
  scrollY: number;
  rowHeight: number;
  barHeight: number;
  bodyHeight: number;
  onBarDragActiveChange?: (active: boolean) => void;
};

export function useTimelineDragDates({
  visibleRows,
  selectedTaskIds,
  timelineStart,
  xToDate,
  pxPerDay,
  dateToX,
  scrollY,
  rowHeight,
  barHeight,
  bodyHeight,
  onBarDragActiveChange,
}: UseTimelineDragDatesOptions): {
  dragPreviews: DragDatePreview[] | null;
  setDragPreviews: Dispatch<SetStateAction<DragDatePreview[] | null>>;
  registerDragCancel: (cancel: (() => void) | null) => void;
  onDragGeometry: (geometry: DragBarGeometry | null) => void;
  dragPreviewOverrides: Map<ScheduleId, { start: string; end: string }> | null;
  dragObstacles: ReturnType<typeof timelineVisibleBarObstacles>;
} {
  const [dragPreviews, setDragPreviews] = useState<DragDatePreview[] | null>(
    null,
  );
  const dragCancelRef = useRef<(() => void) | null>(null);
  const registerDragCancel = useCallback((cancel: (() => void) | null) => {
    dragCancelRef.current = cancel;
  }, []);

  useEffect(() => {
    if (dragPreviews == null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }
      dragCancelRef.current?.();
      dragCancelRef.current = null;
      setDragPreviews(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dragPreviews]);

  useEffect(() => {
    onBarDragActiveChange?.(dragPreviews != null);
  }, [dragPreviews, onBarDragActiveChange]);

  const onDragGeometry = useCallback(
    (geometry: DragBarGeometry | null) => {
      if (geometry == null) {
        setDragPreviews(null);
        return;
      }
      const previews = buildTimelineDragDatePreviews({
        geometry,
        visibleRows,
        selectedTaskIds,
        timelineStart,
        xToDate,
        pxPerDay,
        dateToX,
        scrollY,
        rowHeight,
        barHeight,
      });
      setDragPreviews(previews);
    },
    [
      barHeight,
      dateToX,
      pxPerDay,
      rowHeight,
      scrollY,
      selectedTaskIds,
      timelineStart,
      visibleRows,
      xToDate,
    ],
  );

  const dragPreviewOverrides = useMemo(() => {
    if (dragPreviews == null) return null;
    return new Map(
      dragPreviews.map((preview) => [
        preview.taskId,
        { start: preview.start, end: preview.end },
      ]),
    );
  }, [dragPreviews]);

  const dragObstacleSkipIds = useMemo(() => {
    if (dragPreviews == null) return new Set<ScheduleId>();
    return new Set(dragPreviews.map((preview) => preview.taskId));
  }, [dragPreviews]);

  const dragObstacles = useMemo(() => {
    if (dragPreviews == null || dragPreviews.length === 0) return [];
    return timelineVisibleBarObstacles({
      rows: [...visibleRows],
      scrollY,
      rowHeight,
      barHeight,
      bodyHeight,
      dateToX,
      pxPerDay,
      skipTaskIds: dragObstacleSkipIds,
    });
  }, [
    barHeight,
    bodyHeight,
    dateToX,
    dragObstacleSkipIds,
    dragPreviews,
    pxPerDay,
    rowHeight,
    scrollY,
    visibleRows,
  ]);

  return {
    dragPreviews,
    setDragPreviews,
    registerDragCancel,
    onDragGeometry,
    dragPreviewOverrides,
    dragObstacles,
  };
}
