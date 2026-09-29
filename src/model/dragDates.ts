import { addDays, isoDate, parseDate, roundToDay } from "./dates";
import { isBrokenLink } from "./dependencies";
import type { ScheduleId } from "./types";

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DragDateChipLayout = {
  start: Rect;
  end: Rect;
};

const EPS = 0.01;

/** 二つの矩形が、間に gap 以上の空きを残して離れている。 */
export function dragDateRectsClear(a: Rect, b: Rect, gap: number): boolean {
  return (
    a.x + a.width + gap <= b.x + EPS ||
    b.x + b.width + gap <= a.x + EPS ||
    a.y + a.height + gap <= b.y + EPS ||
    b.y + b.height + gap <= a.y + EPS
  );
}

function insideViewport(
  box: Rect,
  viewport: { width: number; height: number },
): boolean {
  return (
    box.x >= -EPS &&
    box.y >= -EPS &&
    box.x + box.width <= viewport.width + EPS &&
    box.y + box.height <= viewport.height + EPS
  );
}

function acceptable(
  start: Rect,
  end: Rect,
  blocked: Rect,
  gap: number,
  viewport: { width: number; height: number },
): boolean {
  return (
    insideViewport(start, viewport) &&
    insideViewport(end, viewport) &&
    dragDateRectsClear(start, end, gap) &&
    dragDateRectsClear(start, blocked, gap) &&
    dragDateRectsClear(end, blocked, gap)
  );
}

function obstacleHits(
  start: Rect,
  end: Rect,
  obstacles: readonly Rect[],
  gap: number,
): number {
  let hits = 0;
  for (const obstacle of obstacles) {
    if (
      !dragDateRectsClear(start, obstacle, gap) ||
      !dragDateRectsClear(end, obstacle, gap)
    ) {
      hits += 1;
    }
  }
  return hits;
}

function pushApart(
  start: Rect,
  end: Rect,
  gap: number,
): { start: Rect; end: Rect } {
  if (dragDateRectsClear(start, end, gap)) return { start, end };
  const leftIsStart = start.x <= end.x;
  const left = leftIsStart ? start : end;
  const right = leftIsStart ? end : start;
  const overlap = left.x + left.width + gap - right.x;
  if (overlap <= 0) return { start, end };
  const nextLeft = { ...left, x: left.x - overlap / 2 };
  const nextRight = { ...right, x: right.x + overlap / 2 };
  return leftIsStart
    ? { start: nextLeft, end: nextRight }
    : { start: nextRight, end: nextLeft };
}

function clampX(box: Rect, viewportWidth: number): Rect {
  const maxX = Math.max(0, viewportWidth - box.width);
  return { ...box, x: Math.min(Math.max(0, box.x), maxX) };
}

function consider(
  candidates: Array<{ start: Rect; end: Rect }>,
  start: Rect,
  end: Rect,
  gap: number,
  viewportWidth: number,
  push: boolean,
) {
  const placed = push ? pushApart(start, end, gap) : { start, end };
  candidates.push(placed);
  const clamped = {
    start: clampX(placed.start, viewportWidth),
    end: clampX(placed.end, viewportWidth),
  };
  if (
    (clamped.start.x !== placed.start.x || clamped.end.x !== placed.end.x) &&
    dragDateRectsClear(clamped.start, clamped.end, gap)
  ) {
    candidates.push(clamped);
  }
}

function box(x: number, y: number, width: number, height: number): Rect {
  return { x, y, width, height };
}

/**
 * 開始日と終了日の地を、棒と互いに重ならない位置へ置く。
 * 空いていれば各端の上。他の棒に重なるときは、重なりが少ない別の位置を優先する。
 * 画面の端では、収まるよう横へずらす。
 */
export function layoutDragDateChips(input: {
  bar: Rect;
  /** ハンドルを含む、重ねてはいけない範囲。省略時は bar。 */
  avoid?: Rect;
  start: { width: number; height: number };
  end: { width: number; height: number };
  viewport: { width: number; height: number };
  gap: number;
  obstacles?: readonly Rect[];
}): DragDateChipLayout {
  const blocked = input.avoid ?? input.bar;
  const { bar, viewport, gap } = input;
  const obstacles = input.obstacles ?? [];
  const { width: sw, height: sh } = input.start;
  const { width: ew, height: eh } = input.end;
  const above = (height: number) => blocked.y - gap - height;
  const below = blocked.y + blocked.height + gap;
  const mid = (height: number) => blocked.y + (blocked.height - height) / 2;
  const candidates: Array<{ start: Rect; end: Rect }> = [];

  consider(
    candidates,
    box(bar.x - sw / 2, above(sh), sw, sh),
    box(bar.x + bar.width - ew / 2, above(eh), ew, eh),
    gap,
    viewport.width,
    true,
  );
  consider(
    candidates,
    box(bar.x - sw, above(sh), sw, sh),
    box(bar.x + bar.width, above(eh), ew, eh),
    gap,
    viewport.width,
    true,
  );
  consider(
    candidates,
    box(blocked.x - gap - sw, mid(sh), sw, sh),
    box(blocked.x + blocked.width + gap, mid(eh), ew, eh),
    gap,
    viewport.width,
    false,
  );
  consider(
    candidates,
    box(bar.x - sw / 2, below, sw, sh),
    box(bar.x + bar.width - ew / 2, below, ew, eh),
    gap,
    viewport.width,
    true,
  );
  consider(
    candidates,
    box(bar.x - sw / 2, above(sh), sw, sh),
    box(bar.x - ew / 2, above(sh) - gap - eh, ew, eh),
    gap,
    viewport.width,
    false,
  );
  consider(
    candidates,
    box(bar.x - sw / 2, below, sw, sh),
    box(bar.x + ew / 2, below + sh + gap, ew, eh),
    gap,
    viewport.width,
    false,
  );

  let best: { start: Rect; end: Rect; hits: number } | null = null;
  for (const candidate of candidates) {
    if (!acceptable(candidate.start, candidate.end, blocked, gap, viewport)) {
      continue;
    }
    const hits = obstacleHits(candidate.start, candidate.end, obstacles, gap);
    if (hits === 0) return candidate;
    if (best == null || hits < best.hits) best = { ...candidate, hits };
  }
  return best ?? fallbackChips(input);
}

function fallbackChips(input: {
  start: { width: number; height: number };
  end: { width: number; height: number };
  viewport: { width: number; height: number };
  gap: number;
}): DragDateChipLayout {
  const { viewport, gap } = input;
  const start: Rect = {
    x: 0,
    y: 0,
    width: Math.min(input.start.width, Math.max(0, viewport.width)),
    height: Math.min(input.start.height, Math.max(0, viewport.height)),
  };
  const end: Rect = {
    x: 0,
    y: Math.min(
      start.height + gap,
      Math.max(0, viewport.height - input.end.height),
    ),
    width: Math.min(input.end.width, Math.max(0, viewport.width)),
    height: Math.min(input.end.height, Math.max(0, viewport.height)),
  };
  return { start, end };
}

/**
 * 日付チップの大きさ。チャートのズームは見ない。
 * 呼び出し側が、画面の表示倍率を fontSize と余白に掛けて渡す。
 * 実フォントより少し広く見積もり、地が文字からはみ出さないようにする。
 */
export function dragDateChipSize(
  text: string,
  fontSize: number,
  padX: number,
  padY: number,
): { width: number; height: number } {
  let textWidth = 0;
  for (const ch of text) {
    textWidth += ch.charCodeAt(0) > 0xff ? fontSize : fontSize * 0.62;
  }
  textWidth += fontSize * 0.25;
  return {
    width: Math.ceil(textWidth + padX * 2),
    height: Math.ceil(fontSize + padY * 2),
  };
}

export type DragBarGeometry = {
  taskId: ScheduleId;
  kind: "move" | "start" | "end";
  barLeft: number;
  barWidth: number;
  barTop: number;
  originX: number;
};

export type DragDatePreview = {
  taskId: ScheduleId;
  kind: DragBarGeometry["kind"];
  start: string;
  end: string;
  barLeft: number;
  barWidth: number;
  barTop: number;
};

export function dragMoveDeltaDays(
  originX: number,
  nextX: number,
  pxPerDay: number,
): number {
  return Math.round((nextX - originX) / pxPerDay);
}

export function datesMovedBy(
  task: { start: string; end: string },
  deltaDays: number,
): { start: string; end: string } {
  return {
    start: isoDate(addDays(parseDate(task.start), deltaDays)),
    end: isoDate(addDays(parseDate(task.end), deltaDays)),
  };
}

export function resizeStartIso(
  timelineStart: Date,
  xToDate: (x: number) => Date,
  groupX: number,
): string {
  return isoDate(roundToDay(timelineStart, xToDate(groupX)));
}

export function resizeEndIso(
  timelineStart: Date,
  xToDate: (x: number) => Date,
  groupX: number,
  barWidth: number,
): string {
  const exclusiveEnd = roundToDay(timelineStart, xToDate(groupX + barWidth));
  return isoDate(addDays(exclusiveEnd, -1));
}

export function datesResizedFromStart(
  task: { end: string },
  timelineStart: Date,
  xToDate: (x: number) => Date,
  groupX: number,
): { start: string; end: string } {
  const start = resizeStartIso(timelineStart, xToDate, groupX);
  return { start, end: start > task.end ? start : task.end };
}

export function datesResizedFromEnd(
  task: { start: string },
  timelineStart: Date,
  xToDate: (x: number) => Date,
  groupX: number,
  barWidth: number,
): { start: string; end: string } {
  const end = resizeEndIso(timelineStart, xToDate, groupX, barWidth);
  return { start: task.start, end: end < task.start ? task.start : end };
}

export function previewDatesForDrag(
  task: { start: string; end: string },
  geometry: Pick<DragBarGeometry, "kind" | "barLeft" | "barWidth" | "originX">,
  timelineStart: Date,
  xToDate: (x: number) => Date,
  pxPerDay: number,
): { start: string; end: string } {
  if (geometry.kind === "move") {
    return datesMovedBy(
      task,
      dragMoveDeltaDays(geometry.originX, geometry.barLeft, pxPerDay),
    );
  }
  if (geometry.kind === "start") {
    return datesResizedFromStart(
      task,
      timelineStart,
      xToDate,
      geometry.barLeft,
    );
  }
  return datesResizedFromEnd(
    task,
    timelineStart,
    xToDate,
    geometry.barLeft,
    geometry.barWidth,
  );
}

/** 触っているタスクが端の線だけ、離したときに入る日付で破綻を見る。 */
export function previewLinkBroken(
  link: { fromId: ScheduleId; toId: ScheduleId; broken: boolean },
  tasks: ReadonlyMap<ScheduleId, { start: string; end: string }>,
  preview: { taskId: ScheduleId; start: string; end: string } | null,
): boolean {
  if (
    preview == null ||
    (link.fromId !== preview.taskId && link.toId !== preview.taskId)
  ) {
    return link.broken;
  }
  const from = tasks.get(link.fromId);
  const to = tasks.get(link.toId);
  if (!from || !to) return link.broken;
  return isBrokenLink(
    { end: link.fromId === preview.taskId ? preview.end : from.end },
    { start: link.toId === preview.taskId ? preview.start : to.start },
  );
}
