import { duplicateMemberNamesFromCatalog } from "./assigneeDisplay";
import { daysBetween, parseDate } from "./dates";
import { scrollXToRevealTask } from "./chartScroll";
import { scrollYToRevealTask } from "./stickyRows";
import { layoutStickyHeaders } from "./stickyRows";
import { taskBarExclusiveEnd, taskBarWidthPx } from "./timeline";
import {
  collectTaskBarLabelObstacles,
  estimateChartTextWidth,
  type TaskBarAnchor,
  type TextObstacleRect,
} from "./connections";
import type { ExplanationMark, ExplanationMarkKind } from "./explainOverlay";
import type { Member, MemberId } from "./memberTypes";
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

export type ExplanationBalloonPlacement = "above" | "below";

export type ExplanationBalloonLayout = {
  markIndex: number;
  left: number;
  top: number;
  maxWidth: number;
  label: string;
  number?: number;
  visible: boolean;
  placement: ExplanationBalloonPlacement;
};

const BALLOON_MAX_WIDTH = 160;
const BALLOON_LINE_HEIGHT = 1.35;
const BALLOON_FONT_PX = 11;
const BALLOON_PAD_X = 6;
const BALLOON_PAD_Y = 4;
const BALLOON_MAX_LINES = 3;
const BALLOON_EDGE_PAD = 8;
const BALLOON_GAP = 6;
const BALLOON_HORIZONTAL_SHIFT_STEP = 8;
const BALLOON_HORIZONTAL_SHIFT_MAX = 120;

type BalloonDraft = Omit<ExplanationBalloonLayout, "placement"> & {
  taskId?: ScheduleId;
};

export type BalloonDimensions = {
  width: number;
  height: number;
};

export function estimateBalloonDimensions(
  label: string,
  maxWidth: number,
  displayScale = 1,
): BalloonDimensions {
  const fontPx = BALLOON_FONT_PX * displayScale;
  const padX = BALLOON_PAD_X * displayScale;
  const padY = BALLOON_PAD_Y * displayScale;
  const boxMax = Math.min(maxWidth, BALLOON_MAX_WIDTH);
  const contentMax = Math.max(1, boxMax - padX * 2);
  const textWidth = estimateChartTextWidth(label, fontPx);
  const lines = Math.min(
    BALLOON_MAX_LINES,
    Math.max(1, Math.ceil(textWidth / contentMax)),
  );
  const height = padY * 2 + fontPx * BALLOON_LINE_HEIGHT * lines;
  const width = Math.min(boxMax, textWidth + padX * 2);
  return { width, height };
}

export function explanationBalloonScreenRect(
  anchorLeft: number,
  anchorTop: number,
  placement: ExplanationBalloonPlacement,
  dimensions: BalloonDimensions,
): TextObstacleRect {
  const halfW = dimensions.width / 2;
  const left = anchorLeft - halfW;
  const right = anchorLeft + halfW;
  if (placement === "above") {
    const bottom = anchorTop - BALLOON_GAP;
    return {
      left,
      top: bottom - dimensions.height,
      right,
      bottom,
    };
  }
  const top = anchorTop + BALLOON_GAP;
  return {
    left,
    top,
    right,
    bottom: top + dimensions.height,
  };
}

function contentXFromDate(
  d: Date,
  timelineStart: Date,
  pxPerDay: number,
): number {
  return daysBetween(timelineStart, d) * pxPerDay;
}

function rectsOverlap(
  aLeft: number,
  aTop: number,
  aRight: number,
  aBottom: number,
  b: TextObstacleRect,
): boolean {
  return !(
    aRight <= b.left ||
    aLeft >= b.right ||
    aBottom <= b.top ||
    aTop >= b.bottom
  );
}

function rectOverlapsAny(
  rect: TextObstacleRect,
  obstacles: readonly TextObstacleRect[],
): boolean {
  for (const obstacle of obstacles) {
    if (
      rectsOverlap(rect.left, rect.top, rect.right, rect.bottom, obstacle)
    ) {
      return true;
    }
  }
  return false;
}

function clampBalloonAnchorX(
  anchorX: number,
  halfWidth: number,
  timelineWidth: number,
): number {
  let left = anchorX;
  if (left + halfWidth > timelineWidth - BALLOON_EDGE_PAD) {
    left = timelineWidth - BALLOON_EDGE_PAD - halfWidth;
  }
  if (left - halfWidth < BALLOON_EDGE_PAD) {
    left = BALLOON_EDGE_PAD + halfWidth;
  }
  return left;
}

function labelObstacleOverlapArea(
  rect: TextObstacleRect,
  labelObstacles: readonly TextObstacleRect[],
): number {
  let area = 0;
  for (const obstacle of labelObstacles) {
    const overlapLeft = Math.max(rect.left, obstacle.left);
    const overlapRight = Math.min(rect.right, obstacle.right);
    const overlapTop = Math.max(rect.top, obstacle.top);
    const overlapBottom = Math.min(rect.bottom, obstacle.bottom);
    if (overlapRight > overlapLeft && overlapBottom > overlapTop) {
      area += (overlapRight - overlapLeft) * (overlapBottom - overlapTop);
    }
  }
  return area;
}

function layoutExplanationBalloons(
  balloons: BalloonDraft[],
  input: {
    headerHeight: number;
    milestoneBandHeight: number;
    bodyHeight: number;
    timelineWidth: number;
    displayScale: number;
    obstacles: readonly TextObstacleRect[];
    labelObstacles: readonly TextObstacleRect[];
  },
): ExplanationBalloonLayout[] {
  const chartTop = input.headerHeight + input.milestoneBandHeight;
  const chartBottom = chartTop + input.bodyHeight;
  const headerObstacle: TextObstacleRect = {
    left: 0,
    top: 0,
    right: input.timelineWidth,
    bottom: input.headerHeight,
  };
  const placed: TextObstacleRect[] = [];

  return balloons.map((balloon) => {
    const dimensions = estimateBalloonDimensions(
      balloon.label,
      balloon.maxWidth,
      input.displayScale,
    );
    const halfW = dimensions.width / 2;
    const anchorY = balloon.top;
    const baseLeft = clampBalloonAnchorX(
      balloon.left,
      halfW,
      input.timelineWidth,
    );

    type Candidate = {
      placement: ExplanationBalloonPlacement;
      left: number;
      rect: TextObstacleRect;
    };

    const candidates: Candidate[] = [];
    const xOffsets = [0];
    for (
      let delta = BALLOON_HORIZONTAL_SHIFT_STEP;
      delta <= BALLOON_HORIZONTAL_SHIFT_MAX;
      delta += BALLOON_HORIZONTAL_SHIFT_STEP
    ) {
      xOffsets.push(delta, -delta);
    }

    for (const placement of ["above", "below"] as const) {
      for (const offset of xOffsets) {
        const left = clampBalloonAnchorX(
          baseLeft + offset,
          halfW,
          input.timelineWidth,
        );
        const rect = explanationBalloonScreenRect(
          left,
          anchorY,
          placement,
          dimensions,
        );
        if (rect.top < 0 || rect.bottom > chartBottom) continue;
        if (placement === "above" && rect.top < input.headerHeight) continue;
        candidates.push({ placement, left, rect });
      }
    }

    const blockers = [...input.obstacles, headerObstacle, ...placed];
    const clear = candidates.find(
      (candidate) => !rectOverlapsAny(candidate.rect, blockers),
    );

    let chosen: Candidate;
    if (clear != null) {
      chosen = clear;
    } else if (candidates.length === 0) {
      const left = baseLeft;
      const placement: ExplanationBalloonPlacement = "above";
      chosen = {
        placement,
        left,
        rect: explanationBalloonScreenRect(
          left,
          anchorY,
          placement,
          dimensions,
        ),
      };
    } else {
      chosen = candidates.reduce((best, candidate) => {
        const bestArea = labelObstacleOverlapArea(best.rect, input.labelObstacles);
        const area = labelObstacleOverlapArea(
          candidate.rect,
          input.labelObstacles,
        );
        if (area < bestArea) return candidate;
        if (area > bestArea) return best;
        if (candidate.placement === "below" && best.placement === "above") {
          return candidate;
        }
        return best;
      });
    }

    placed.push(chosen.rect);

    return {
      markIndex: balloon.markIndex,
      left: chosen.left,
      top: anchorY,
      maxWidth: balloon.maxWidth,
      label: balloon.label,
      number: balloon.number,
      visible: balloon.visible,
      placement: chosen.placement,
    };
  });
}

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
  tier?: "day" | "week" | "month";
  memberCatalog?: Map<MemberId, Member> | null;
  assigneeDuplicateNames?: ReadonlySet<string>;
  displayScale?: number;
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

function shiftObstacleToTimeline(
  obstacle: TextObstacleRect,
  chartTop: number,
): TextObstacleRect {
  return {
    left: obstacle.left,
    top: obstacle.top + chartTop,
    right: obstacle.right,
    bottom: obstacle.bottom + chartTop,
  };
}

function buildTimelineBalloonObstacles(
  input: BuildExplanationOverlayGeometryInput,
  chartTop: number,
): { obstacles: TextObstacleRect[]; labelObstacles: TextObstacleRect[] } {
  if (input.tier == null) {
    return { obstacles: [], labelObstacles: [] };
  }
  const assigneeDuplicateNames =
    input.assigneeDuplicateNames ??
    duplicateMemberNamesFromCatalog(input.memberCatalog ?? null);
  const labelObstacles = collectTaskBarLabelObstacles(
    input.visibleRows,
    input.scrollY,
    input.rowHeight,
    input.barHeight,
    input.bodyHeight,
    input.dateToX,
    input.pxPerDay,
    input.tier,
    input.memberCatalog ?? null,
    assigneeDuplicateNames,
    input.liveAnchors,
  ).map((obstacle) => shiftObstacleToTimeline(obstacle, chartTop));

  const barObstacles: TextObstacleRect[] = [];
  for (const row of input.visibleRows) {
    if (row.type !== "task") continue;
    const bar = barRectForTask(row, input);
    barObstacles.push({
      left: bar.x,
      top: chartTop + bar.y,
      right: bar.x + bar.width,
      bottom: chartTop + bar.y + bar.height,
    });
  }

  return {
    obstacles: [...labelObstacles, ...barObstacles],
    labelObstacles,
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
  const balloonDrafts: BalloonDraft[] = [];

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
      balloonDrafts.push({
        markIndex,
        left: anchorX,
        top: anchorY,
        maxWidth: BALLOON_MAX_WIDTH,
        label: mark.label,
        number: mark.number,
        visible: balloonVisible(anchorX, anchorY, input),
        taskId: mark.taskId,
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
      balloonDrafts.push({
        markIndex,
        left: anchorX,
        top: anchorY,
        maxWidth: BALLOON_MAX_WIDTH,
        label: mark.label,
        number: mark.number,
        visible: balloonVisible(anchorX, anchorY, input),
      });
    }
  }

  const { obstacles, labelObstacles } = buildTimelineBalloonObstacles(
    input,
    chartTop,
  );

  timelineBalloons.push(
    ...layoutExplanationBalloons(balloonDrafts, {
      headerHeight: input.headerHeight,
      milestoneBandHeight: input.milestoneBandHeight,
      bodyHeight: input.bodyHeight,
      timelineWidth: input.timelineWidth,
      displayScale: input.displayScale ?? 1,
      obstacles,
      labelObstacles,
    }),
  );

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

  let contentMinX = Infinity;
  let contentMaxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const mark of input.marks) {
    if (mark.taskId != null) {
      const row = findTaskRow(input.visibleRows, mark.taskId);
      if (row == null) continue;
      const startIso =
        mark.date != null &&
        mark.date >= row.task.start &&
        mark.date <= row.task.end
          ? mark.date
          : row.task.start;
      const anchor = input.liveAnchors.get(mark.taskId);
      const contentLeft = anchor
        ? anchor.x + input.scrollX
        : contentXFromDate(
            parseDate(startIso),
            input.timelineStart,
            input.pxPerDay,
          );
      const contentWidth =
        mark.date != null
          ? input.pxPerDay
          : anchor != null
            ? Math.max(1, anchor.right - anchor.x)
            : taskBarWidthPx(
                row.task,
                (d) =>
                  contentXFromDate(d, input.timelineStart, input.pxPerDay),
                input.pxPerDay,
              );
      contentMinX = Math.min(contentMinX, contentLeft);
      contentMaxX = Math.max(contentMaxX, contentLeft + contentWidth);
      const rowTop = row.y - input.scrollY;
      minY = Math.min(minY, rowTop);
      maxY = Math.max(maxY, rowTop + input.rowHeight);
      continue;
    }
    if (mark.date != null) {
      const contentX = contentXFromDate(
        parseDate(mark.date),
        input.timelineStart,
        input.pxPerDay,
      );
      contentMinX = Math.min(contentMinX, contentX);
      contentMaxX = Math.max(contentMaxX, contentX + input.pxPerDay);
    }
  }

  if (!Number.isFinite(contentMinX)) return null;

  const maxScrollX = Math.max(
    0,
    input.totalDays * input.pxPerDay - input.chartWidth,
  );
  const contentHeight =
    input.visibleRows.length === 0
      ? 0
      : input.visibleRows[input.visibleRows.length - 1]!.y + input.rowHeight;
  const maxScrollY = Math.max(0, contentHeight - input.bodyHeight);

  const pad = 40;
  const needW = contentMaxX - contentMinX + pad * 2;
  const needH = maxY - minY + pad * 2;
  const hasVerticalExtent = Number.isFinite(minY);

  let targetScrollX = input.scrollX;
  let targetScrollY = input.scrollY;

  if (needW <= input.chartWidth) {
    targetScrollX = clamp(contentMinX - pad, 0, maxScrollX);
    if (hasVerticalExtent) {
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
    } else {
      return { scrollX: targetScrollX, scrollY: input.scrollY };
    }
  }

  const first = input.marks[0]!;
  if (first.taskId != null) {
    const row = findTaskRow(input.visibleRows, first.taskId);
    if (row != null) {
      let revealDate = parseDate(row.task.start);
      let barWidth = taskBarWidthPx(
        row.task,
        (d) => contentXFromDate(d, input.timelineStart, input.pxPerDay),
        input.pxPerDay,
      );
      if (
        first.date != null &&
        first.date >= row.task.start &&
        first.date <= row.task.end
      ) {
        revealDate = parseDate(first.date);
        barWidth = input.pxPerDay;
      }
      targetScrollX = scrollXToRevealTask(
        revealDate,
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
  pxPerDay: number;
  scrollX: number;
  scrollY: number;
  rowHeight: number;
  bodyHeight: number;
  chartWidth: number;
  timelineStart: Date;
  liveAnchors: ReadonlyMap<ScheduleId, TaskBarAnchor>;
}): boolean {
  const { mark } = input;
  if (mark.taskId != null) {
    const row = findTaskRow(input.visibleRows, mark.taskId);
    if (row == null) return false;
    const anchor = input.liveAnchors.get(mark.taskId);
    const contentLeft = anchor
      ? anchor.x + input.scrollX
      : contentXFromDate(
          parseDate(row.task.start),
          input.timelineStart,
          input.pxPerDay,
        );
    const contentWidth =
      mark.date != null
        ? input.pxPerDay
        : anchor != null
          ? Math.max(1, anchor.right - anchor.x)
          : taskBarWidthPx(
              row.task,
              (d) =>
                contentXFromDate(d, input.timelineStart, input.pxPerDay),
              input.pxPerDay,
            );
    const viewportLeft = contentLeft - input.scrollX;
    if (viewportLeft + contentWidth < 0 || viewportLeft > input.chartWidth) {
      return false;
    }
    const y = row.y - input.scrollY;
    if (y + input.rowHeight < 0 || y > input.bodyHeight) return false;
    return true;
  }
  if (mark.date != null) {
    const contentX = contentXFromDate(
      parseDate(mark.date),
      input.timelineStart,
      input.pxPerDay,
    );
    const viewportX = contentX - input.scrollX;
    return viewportX + input.pxPerDay >= 0 && viewportX <= input.chartWidth;
  }
  return false;
}
