import { parseDate } from "./dates";
import {
  assigneeSidebarLabel,
  resolveAssigneeRowDisplay,
} from "./assigneeDisplay";
import { collectTasksFromDocument } from "./hierarchy";
import type { Member, MemberId } from "./memberTypes";
import type { ValidationIssue } from "./scheduleSemantics";
import { taskBarWidthPx } from "./timeline";
import type { ScheduleDocument, ScheduleId, Task, TaskConnection, VisibleRow } from "./types";

export const CONNECTION_STROKE_WIDTH = 2.25;
export const CONNECTION_HALO_STROKE_WIDTH = 4.75;

export function connectionPairKey(a: ScheduleId, b: ScheduleId): string {
  return a < b ? `${a}\0${b}` : `${b}\0${a}`;
}

export function validateConnections(doc: ScheduleDocument): ValidationIssue[] {
  const connections = doc.connections;
  if (connections == null || connections.length === 0) return [];

  const taskIds = new Set(
    collectTasksFromDocument(doc).map((task) => task.id),
  );
  const issues: ValidationIssue[] = [];
  const seenPairs = new Set<string>();

  for (let i = 0; i < connections.length; i += 1) {
    const connection = connections[i];
    const base = `/connections/${i}`;
    const [a, b] = connection.taskIds;
    if (a === b) {
      issues.push({
        path: `${base}/taskIds`,
        message: "同じタスク同士は指定できません",
      });
      continue;
    }
    if (!taskIds.has(a)) {
      issues.push({
        path: `${base}/taskIds/0`,
        message: "存在しないタスク ID です",
      });
    }
    if (!taskIds.has(b)) {
      issues.push({
        path: `${base}/taskIds/1`,
        message: "存在しないタスク ID です",
      });
    }
    const pair = connectionPairKey(a, b);
    if (seenPairs.has(pair)) {
      issues.push({
        path: base,
        message: "同じ2つのタスクの繋がりが重複しています",
      });
    } else {
      seenPairs.add(pair);
    }
    if (connection.label.trim().length === 0) {
      issues.push({
        path: `${base}/label`,
        message: "label は空白にできません",
      });
    }
  }
  return issues;
}

export function removeConnectionsForDeletedTasks(
  connections: readonly TaskConnection[] | undefined,
  deletedIds: ReadonlySet<ScheduleId>,
): TaskConnection[] | undefined {
  if (connections == null || connections.length === 0) return undefined;
  const next = connections.filter(
    (connection) =>
      !connection.taskIds.some((id) => deletedIds.has(id)),
  );
  return next.length > 0 ? [...next] : undefined;
}

export function cloneConnections(
  connections: readonly TaskConnection[] | undefined,
): TaskConnection[] | undefined {
  if (connections == null) return undefined;
  return connections.map((connection) => ({
    taskIds: [connection.taskIds[0], connection.taskIds[1]],
    label: connection.label,
  }));
}

/** 両方のタスクが見えている繋がりだけ返す。 */
export function visibleConnectionsFromTasks(
  connections: readonly TaskConnection[] | undefined,
  visibleIds: ReadonlySet<ScheduleId>,
): TaskConnection[] {
  if (connections == null) return [];
  return connections.filter(
    (connection) =>
      visibleIds.has(connection.taskIds[0]) &&
      visibleIds.has(connection.taskIds[1]),
  );
}

export type ConnectionBarObstacle = {
  left: number;
  right: number;
  topY: number;
};

const CONNECTION_MIN_BULGE_PX = 10;
const CONNECTION_OBSTACLE_GAP_PX = 2;
export const CONNECTION_LABEL_GAP_PX = 2;
export const CONNECTION_LABEL_DEFAULT_OFFSET_Y = 4;

export type TextObstacleRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

/** チャート上の文字幅。実フォントより少し広く見積もる。 */
export function estimateChartTextWidth(text: string, fontSize: number): number {
  let textWidth = 0;
  for (const ch of text) {
    textWidth += ch.charCodeAt(0) > 0xff ? fontSize : fontSize * 0.62;
  }
  return textWidth + fontSize * 0.25;
}

export function taskBarLabelFontSize(barHeight: number): number {
  return Math.max(10, Math.round(barHeight * 0.55));
}

export function taskBarChartLabelStrings(
  task: Pick<Task, "name" | "progress">,
  barWidthPx: number,
  tier: "day" | "week" | "month",
  assigneeLabel: string,
): { inside: string | null; outside: string | null } {
  const inside =
    barWidthPx >= 72 && tier !== "month"
      ? `${task.name}${task.progress > 0 ? ` ${task.progress}%` : ""}`
      : null;
  const outside =
    tier === "month" || barWidthPx < 72
      ? `${task.name} ${assigneeLabel}`.trim()
      : assigneeLabel
        ? assigneeLabel
        : null;
  return { inside, outside };
}

function textObstacleRectCentered(
  centerX: number,
  topY: number,
  width: number,
  height: number,
): TextObstacleRect {
  return {
    left: centerX - width / 2,
    top: topY,
    right: centerX + width / 2,
    bottom: topY + height,
  };
}

function textObstacleRectLeft(
  leftX: number,
  topY: number,
  width: number,
  height: number,
): TextObstacleRect {
  return {
    left: leftX,
    top: topY,
    right: leftX + width,
    bottom: topY + height,
  };
}

function rectsOverlap(
  a: TextObstacleRect,
  b: TextObstacleRect,
  gap: number,
): boolean {
  return !(
    a.right + gap <= b.left ||
    a.left >= b.right + gap ||
    a.bottom + gap <= b.top ||
    a.top >= b.bottom + gap
  );
}

/** 円弧の短い言葉を、既定位置と近く3か所だけから選ぶ。 */
export function layoutConnectionArcLabel(
  labelX: number,
  labelY: number,
  label: string,
  fontSize: number,
  obstacles: readonly TextObstacleRect[],
  chartBodyTopY: number,
): { x: number; y: number; offsetX: number } {
  const width = estimateChartTextWidth(label, fontSize);
  const height = fontSize;
  const offsetX = width / 2;

  const candidates: Array<{ x: number; y: number }> = [
    { x: labelX, y: labelY },
    { x: labelX, y: labelY - fontSize },
    { x: labelX - fontSize * 2, y: labelY },
    { x: labelX + fontSize * 2, y: labelY },
  ];

  for (const cand of candidates) {
    if (cand.y < chartBodyTopY) continue;
    const rect = textObstacleRectCentered(cand.x, cand.y, width, height);
    const hits = obstacles.some((o) =>
      rectsOverlap(rect, o, CONNECTION_LABEL_GAP_PX),
    );
    if (!hits) {
      return { x: cand.x, y: cand.y, offsetX };
    }
  }

  return { x: labelX, y: labelY, offsetX };
}

export function layoutConnectionArcLabelsInOrder(
  items: ReadonlyArray<{ labelX: number; labelY: number; label: string }>,
  barObstacles: readonly TextObstacleRect[],
  fontSize: number,
  chartBodyTopY: number,
): Array<{ x: number; y: number; offsetX: number }> {
  const placed: TextObstacleRect[] = [...barObstacles];
  const results: Array<{ x: number; y: number; offsetX: number }> = [];
  for (const item of items) {
    const layout = layoutConnectionArcLabel(
      item.labelX,
      item.labelY,
      item.label,
      fontSize,
      placed,
      chartBodyTopY,
    );
    results.push(layout);
    const width = estimateChartTextWidth(item.label, fontSize);
    placed.push(
      textObstacleRectCentered(layout.x, layout.y, width, fontSize),
    );
  }
  return results;
}

export type TaskBarAnchor = {
  x: number;
  right: number;
  y: number;
};

/** 見えているタスク棒の中と右の文字の占有矩形。 */
export function collectTaskBarLabelObstacles(
  rows: readonly VisibleRow[],
  scrollY: number,
  rowHeight: number,
  barHeight: number,
  bodyHeight: number,
  dateToX: (d: Date) => number,
  pxPerDay: number,
  tier: "day" | "week" | "month",
  memberCatalog: Map<MemberId, Member> | null,
  assigneeDuplicateNames: ReadonlySet<string>,
  liveAnchors: ReadonlyMap<ScheduleId, TaskBarAnchor>,
): TextObstacleRect[] {
  const fontSize = taskBarLabelFontSize(barHeight);
  const rects: TextObstacleRect[] = [];
  for (const row of rows) {
    if (row.type !== "task") continue;
    const y = row.y - scrollY;
    if (y + rowHeight < 0 || y > bodyHeight) continue;
    const anchor = liveAnchors.get(row.task.id);
    const barLeft = anchor?.x ?? dateToX(parseDate(row.task.start));
    const barWidth =
      anchor != null
        ? Math.max(1, anchor.right - anchor.x)
        : taskBarWidthPx(row.task, dateToX, pxPerDay);
    const centerY = anchor?.y ?? y + rowHeight / 2;
    const barTop = centerY - barHeight / 2;
    const textTop = barTop + barHeight / 2 - fontSize / 2;
    const assigneeDisplay = resolveAssigneeRowDisplay(
      row.task.assigneeIds,
      memberCatalog,
      assigneeDuplicateNames,
    );
    const assigneeLabel = assigneeSidebarLabel(assigneeDisplay);
    const { inside, outside } = taskBarChartLabelStrings(
      row.task,
      barWidth,
      tier,
      assigneeLabel,
    );
    if (inside) {
      const maxInside = Math.max(0, barWidth - 12);
      const width = Math.min(estimateChartTextWidth(inside, fontSize), maxInside);
      if (width > 0) {
        rects.push(textObstacleRectLeft(barLeft + 6, textTop, width, fontSize));
      }
    }
    if (outside) {
      const width = estimateChartTextWidth(outside, fontSize);
      rects.push(textObstacleRectLeft(barLeft + barWidth + 4, textTop, width, fontSize));
    }
  }
  return rects;
}

/** 二次ベジェを折れ線点列に分割する。 */
function sampleQuadraticBezier(
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number,
  steps = 20,
): number[] {
  const points: number[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const u = 1 - t;
    points.push(
      u * u * x0 + 2 * u * t * cx + t * t * x1,
      u * u * y0 + 2 * u * t * cy + t * t * y1,
    );
  }
  return points;
}

export type ConnectionArcGeometry = {
  points: number[];
  labelX: number;
  labelY: number;
};

/**
 * 棒の上端中央同士を、上へふくらむ二次ベジェで結ぶ。
 * fromRowCenterY / toRowCenterY は行内のバー中心の y。
 */
export function connectionArcGeometry(
  fromBarLeft: number,
  fromBarWidth: number,
  fromRowCenterY: number,
  toBarLeft: number,
  toBarWidth: number,
  toRowCenterY: number,
  barHeight: number,
  pxPerDay: number,
  obstacles: readonly ConnectionBarObstacle[],
): ConnectionArcGeometry {
  const fromTopY = fromRowCenterY - barHeight / 2;
  const toTopY = toRowCenterY - barHeight / 2;
  const x0 = fromBarLeft + fromBarWidth / 2;
  const y0 = fromTopY;
  const x1 = toBarLeft + toBarWidth / 2;
  const y1 = toTopY;
  const cx = (x0 + x1) / 2;

  const maxBulge = Math.max(pxPerDay * 7, CONNECTION_MIN_BULGE_PX);
  const endpointTop = Math.min(fromTopY, toTopY);
  let cy = endpointTop - CONNECTION_MIN_BULGE_PX;

  const spanLeft = Math.min(fromBarLeft, toBarLeft);
  const spanRight = Math.max(
    fromBarLeft + fromBarWidth,
    toBarLeft + toBarWidth,
  );

  for (const obstacle of obstacles) {
    if (obstacle.right < spanLeft || obstacle.left > spanRight) continue;
    const betweenRows =
      obstacle.topY > Math.min(fromTopY, toTopY) &&
      obstacle.topY < Math.max(fromTopY, toTopY);
    if (!betweenRows) continue;
    cy = Math.min(cy, obstacle.topY - CONNECTION_OBSTACLE_GAP_PX);
  }

  cy = Math.max(cy, endpointTop - maxBulge);

  const points = sampleQuadraticBezier(x0, y0, cx, cy, x1, y1);
  return {
    points,
    labelX: cx,
    labelY: cy - CONNECTION_LABEL_DEFAULT_OFFSET_Y,
  };
}
