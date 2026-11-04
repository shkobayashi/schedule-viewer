import { parseDate } from "./dates";
import { scrollXToRevealTask } from "./chartScroll";
import { scrollYToRevealTask } from "./stickyRows";
import { layoutStickyHeaders } from "./stickyRows";
import { taskBarExclusiveEnd, taskBarWidthPx } from "./timeline";
import type { TaskBarAnchor } from "./connections";
import type { ExplanationMark, ExplanationMarkKind } from "./explainOverlay";
import type { Milestone, ScheduleId, VisibleRow } from "./types";

export function buildTaskBarAnchorsForOverlay(input: {
  visibleRows: readonly VisibleRow[];
  scrollY: number;
  rowHeight: number;
  dateToX: (d: Date) => number;
  pxPerDay: number;
}): Map<ScheduleId, TaskBarAnchor> {
  const byId = new Map<ScheduleId, TaskBarAnchor>();
  for (const row of input.visibleRows) {
    if (row.type !== "task") continue;
    const y = row.y - input.scrollY + input.rowHeight / 2;
    const x = input.dateToX(parseDate(row.task.start));
    const exclusive = input.dateToX(taskBarExclusiveEnd(row.task));
    byId.set(row.task.id, {
      x,
      right: x + Math.max(input.pxPerDay, exclusive - x),
      y,
    });
  }
  return byId;
}

export type OverlayRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ExplanationMarkHole = OverlayRect & {
  kind: ExplanationMarkKind;
  markIndex: number;
};

export type ExplanationBalloonLayout = {
  markIndex: number;
  left: number;
  top: number;
  maxWidth: number;
  label: string;
  number?: number;
  visible: boolean;
};

export type BuildExplanationOverlayGeometryInput = {
  marks: readonly ExplanationMark[];
  visibleRows: readonly VisibleRow[];
  dateToX: (d: Date) => number;
  pxPerDay: number;
  scrollY: number;
  rowHeight: number;
  barHeight: number;
  bodyHeight: number;
  headerHeight: number;
  milestoneBandHeight: number;
  timelineWidth: number;
  sidebarWidth: number;
  liveAnchors: ReadonlyMap<ScheduleId, TaskBarAnchor>;
  milestones: readonly Milestone[];
  milestoneCenterYById: ReadonlyMap<ScheduleId, number>;
  milestoneDiamondSize: number;
};

export type ExplanationOverlayGeometry = {
  timelineHoles: ExplanationMarkHole[];
  sidebarHoles: ExplanationMarkHole[];
  timelineBalloons: ExplanationBalloonLayout[];
};

function barRectForTask(
  row: Extract<VisibleRow, { type: "task" }>,
  input: BuildExplanationOverlayGeometryInput,
): OverlayRect {
  const anchor = input.liveAnchors.get(row.task.id);
  const yBody = row.y - input.scrollY;
  const top = anchor?.y ?? yBody + input.rowHeight / 2;
  const barTop = top - input.barHeight / 2;
  const x = anchor?.x ?? input.dateToX(parseDate(row.task.start));
  const right =
    anchor?.right ??
    x + taskBarWidthPx(row.task, input.dateToX, input.pxPerDay);
  return {
    x,
    y: barTop,
    width: Math.max(1, right - x),
    height: input.barHeight,
  };
}

function clipBarToDate(
  bar: OverlayRect,
  dateIso: string,
  dateToX: (d: Date) => number,
  pxPerDay: number,
): OverlayRect {
  const dayStart = dateToX(parseDate(dateIso));
  const dayEnd = dayStart + pxPerDay;
  const x = Math.max(bar.x, dayStart);
  const right = Math.min(bar.x + bar.width, dayEnd);
  return {
    x,
    y: bar.y,
    width: Math.max(1, right - x),
    height: bar.height,
  };
}

function findTaskRow(
  rows: readonly VisibleRow[],
  taskId: ScheduleId,
): Extract<VisibleRow, { type: "task" }> | null {
  for (const row of rows) {
    if (row.type === "task" && row.task.id === taskId) return row;
  }
  return null;
}

export function buildExplanationOverlayGeometry(
  input: BuildExplanationOverlayGeometryInput,
): ExplanationOverlayGeometry {
  const timelineHoles: ExplanationMarkHole[] = [];
  const sidebarHoles: ExplanationMarkHole[] = [];
  const timelineBalloons: ExplanationBalloonLayout[] = [];
  const chartTop = input.headerHeight + input.milestoneBandHeight;
  const balloonMaxWidth = 160;

  for (let markIndex = 0; markIndex < input.marks.length; markIndex += 1) {
    const mark = input.marks[markIndex]!;
    const kind = mark.kind;

    if (mark.taskId != null) {
      const row = findTaskRow(input.visibleRows, mark.taskId);
      if (row == null) continue;
      let bar = barRectForTask(row, input);
      if (mark.date != null) {
        bar = clipBarToDate(bar, mark.date, input.dateToX, input.pxPerDay);
      }
      const timelineBar: OverlayRect = {
        x: bar.x,
        y: chartTop + bar.y,
        width: bar.width,
        height: bar.height,
      };
      timelineHoles.push({ ...timelineBar, kind, markIndex });
      sidebarHoles.push({
        x: 0,
        y: input.milestoneBandHeight + (row.y - input.scrollY),
        width: input.sidebarWidth,
        height: input.rowHeight,
        kind,
        markIndex,
      });
      const anchorX = timelineBar.x + timelineBar.width / 2;
      const anchorY = timelineBar.y;
      timelineBalloons.push({
        markIndex,
        left: anchorX,
        top: anchorY,
        maxWidth: balloonMaxWidth,
        label: mark.label,
        number: mark.number,
        visible: balloonVisible(anchorX, anchorY, input),
      });
      continue;
    }

    if (mark.date != null) {
      const dayX = input.dateToX(parseDate(mark.date));
      timelineHoles.push({
        x: dayX,
        y: 0,
        width: input.pxPerDay,
        height: input.headerHeight,
        kind,
        markIndex,
      });
      for (const milestone of input.milestones) {
        if (milestone.date !== mark.date) continue;
        const cy = input.milestoneCenterYById.get(milestone.id);
        if (cy == null) continue;
        const half = input.milestoneDiamondSize / 2;
        timelineHoles.push({
          x: dayX + input.pxPerDay / 2 - half,
          y: input.headerHeight + cy - half,
          width: input.milestoneDiamondSize,
          height: input.milestoneDiamondSize,
          kind,
          markIndex,
        });
      }
      const anchorX = dayX + input.pxPerDay / 2;
      const anchorY = 0;
      timelineBalloons.push({
        markIndex,
        left: anchorX,
        top: anchorY,
        maxWidth: balloonMaxWidth,
        label: mark.label,
        number: mark.number,
        visible: balloonVisible(anchorX, anchorY, input),
      });
    }
  }

  return { timelineHoles, sidebarHoles, timelineBalloons };
}

function balloonVisible(
  x: number,
  y: number,
  input: BuildExplanationOverlayGeometryInput,
): boolean {
  if (x < 0 || x > input.timelineWidth) return false;
  const totalHeight =
    input.headerHeight + input.milestoneBandHeight + input.bodyHeight;
  if (y < 0 || y > totalHeight) return false;
  return true;
}

export type ExplanationScrollPlan = {
  scrollX: number;
  scrollY: number;
};

export type PlanExplanationScrollInput = {
  marks: readonly ExplanationMark[];
  visibleRows: readonly VisibleRow[];
  dateToX: (d: Date) => number;
  pxPerDay: number;
  scrollX: number;
  scrollY: number;
  rowHeight: number;
  barHeight: number;
  bodyHeight: number;
  chartWidth: number;
  timelineStart: Date;
  totalDays: number;
  liveAnchors: ReadonlyMap<ScheduleId, TaskBarAnchor>;
};

export function planExplanationOverlayScroll(
  input: PlanExplanationScrollInput,
): ExplanationScrollPlan | null {
  if (input.marks.length === 0) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const mark of input.marks) {
    if (mark.taskId != null) {
      const row = findTaskRow(input.visibleRows, mark.taskId);
      if (row == null) continue;
      const start = parseDate(
        mark.date != null && mark.date >= row.task.start && mark.date <= row.task.end
          ? mark.date
          : row.task.start,
      );
      const anchor = input.liveAnchors.get(mark.taskId);
      const barLeft = anchor?.x ?? input.dateToX(start);
      const barWidth =
        mark.date != null
          ? input.pxPerDay
          : anchor != null
            ? Math.max(1, anchor.right - anchor.x)
            : taskBarWidthPx(row.task, input.dateToX, input.pxPerDay);
      minX = Math.min(minX, barLeft);
      maxX = Math.max(maxX, barLeft + barWidth);
      const rowTop = row.y - input.scrollY;
      minY = Math.min(minY, rowTop);
      maxY = Math.max(maxY, rowTop + input.rowHeight);
      continue;
    }
    if (mark.date != null) {
      const x = input.dateToX(parseDate(mark.date));
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x + input.pxPerDay);
    }
  }

  if (!Number.isFinite(minX)) return null;

  const maxScrollX = Math.max(0, input.totalDays * input.pxPerDay - input.chartWidth);
  const contentHeight =
    input.visibleRows.length === 0
      ? 0
      : input.visibleRows[input.visibleRows.length - 1]!.y + input.rowHeight;
  const maxScrollY = Math.max(0, contentHeight - input.bodyHeight);

  const pad = 40;
  const needW = maxX - minX + pad * 2;
  const needH = maxY - minY + pad * 2;

  let targetScrollX = input.scrollX;
  let targetScrollY = input.scrollY;

  if (needW <= input.chartWidth && Number.isFinite(minY)) {
    targetScrollX = clamp(minX - pad, 0, maxScrollX);
    const layout = layoutStickyHeaders(
      input.visibleRows,
      targetScrollY,
      input.rowHeight,
      input.bodyHeight,
    );
    const desiredY = Math.max(0, minY - layout.clipTop - pad);
    targetScrollY = clamp(desiredY, 0, maxScrollY);
    if (needH <= input.bodyHeight) {
      return { scrollX: targetScrollX, scrollY: targetScrollY };
    }
  }

  const first = input.marks[0]!;
  if (first.taskId != null) {
    const row = findTaskRow(input.visibleRows, first.taskId);
    if (row != null) {
      const start = parseDate(row.task.start);
      const barWidth = taskBarWidthPx(row.task, input.dateToX, input.pxPerDay);
      targetScrollX = scrollXToRevealTask(
        start,
        barWidth,
        input.scrollX,
        input.timelineStart,
        input.totalDays,
        input.pxPerDay,
        input.chartWidth,
      );
      targetScrollY = scrollYToRevealTask(
        input.visibleRows,
        row.y,
        input.rowHeight,
        input.bodyHeight,
      );
    }
  } else if (first.date != null) {
    targetScrollX = scrollXToRevealTask(
      parseDate(first.date),
      input.pxPerDay,
      input.scrollX,
      input.timelineStart,
      input.totalDays,
      input.pxPerDay,
      input.chartWidth,
    );
  }

  return { scrollX: targetScrollX, scrollY: targetScrollY };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function explanationMarkVisibleInViewport(input: {
  mark: ExplanationMark;
  visibleRows: readonly VisibleRow[];
  dateToX: (d: Date) => number;
  pxPerDay: number;
  scrollY: number;
  rowHeight: number;
  bodyHeight: number;
  chartWidth: number;
  headerHeight: number;
  milestoneBandHeight: number;
  liveAnchors: ReadonlyMap<ScheduleId, TaskBarAnchor>;
}): boolean {
  const { mark } = input;
  if (mark.taskId != null) {
    const row = findTaskRow(input.visibleRows, mark.taskId);
    if (row == null) return false;
    const anchor = input.liveAnchors.get(mark.taskId);
    const barLeft = anchor?.x ?? input.dateToX(parseDate(row.task.start));
    const barWidth =
      mark.date != null
        ? input.pxPerDay
        : anchor != null
          ? Math.max(1, anchor.right - anchor.x)
          : taskBarWidthPx(row.task, input.dateToX, input.pxPerDay);
    if (barLeft + barWidth < 0 || barLeft > input.chartWidth) return false;
    const y = row.y - input.scrollY;
    if (y + input.rowHeight < 0 || y > input.bodyHeight) return false;
    return true;
  }
  if (mark.date != null) {
    const x = input.dateToX(parseDate(mark.date));
    return x + input.pxPerDay >= 0 && x <= input.chartWidth;
  }
  return false;
}
