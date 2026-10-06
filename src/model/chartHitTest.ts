import { parseDate } from "./dates";
import { nearestLinkHit, type LinkPolyline } from "./dependencies";
import { MILESTONE_LABEL_GAP, milestoneLabelWidth } from "./milestones";
import type { ScheduleId } from "./types";

/** ひし形の当たり円が、見た目の半径へ足す余裕。 */
const MILESTONE_HIT_SLOP = 2;

/** 選択中バーの端ハンドルが当たり判定へ広がる幅。 */
export const TASK_HANDLE_WIDTH = 8;

/** バー移動・期間変更を始めるポインタの移動量。 */
export const TASK_DRAG_THRESHOLD_PX = 8;

/** 期間ドラッグ専用の当たりが、バーの外へ出る幅。 */
export const RESIZE_EXCLUSIVE_OUTSIDE_PX = 12;

/** 期間ドラッグ専用の当たりが、バーの中へ入る最大幅。 */
export const RESIZE_EXCLUSIVE_INSIDE_PX = 16;

/** 端の当たりが重ならないとき、バー中央に残すクリック幅。 */
export const RESIZE_BODY_CLICK_PX = 8;

/** バーの中へ入る期間ドラッグ専用の幅。短いバーは中央のクリック幅を残す。 */
export function resizeExclusiveInside(barWidth: number): number {
  const room = (barWidth - RESIZE_BODY_CLICK_PX) / 2;
  return Math.max(
    TASK_HANDLE_WIDTH / 2,
    Math.min(RESIZE_EXCLUSIVE_INSIDE_PX, room),
  );
}

export type TaskBarEdge = "start" | "end";

/** バー左端を原点とした localX が、どちらの端か。 */
export function taskBarEdgeAt(
  localX: number,
  barWidth: number,
  edgeWidth: number = TASK_HANDLE_WIDTH / 2,
): TaskBarEdge | null {
  if (localX >= -edgeWidth && localX < edgeWidth) return "start";
  if (localX > barWidth - edgeWidth && localX <= barWidth + edgeWidth) {
    return "end";
  }
  return null;
}

/** バー左端を原点とした localX が、期間ドラッグ専用の端の当たりにあるか。 */
export function taskBarResizeEdgeAt(
  localX: number,
  barWidth: number,
): TaskBarEdge | null {
  const inside = resizeExclusiveInside(barWidth);
  if (
    localX >= -RESIZE_EXCLUSIVE_OUTSIDE_PX &&
    localX < inside
  ) {
    return "start";
  }
  if (
    localX > barWidth - inside &&
    localX <= barWidth + RESIZE_EXCLUSIVE_OUTSIDE_PX
  ) {
    return "end";
  }
  return null;
}

export type ChartPointerLink = {
  fromId: ScheduleId;
  toId: ScheduleId;
};

export type ChartPointer = {
  overTask: boolean;
  overMilestone: boolean;
  link: ChartPointerLink | null;
  hoverTaskId: ScheduleId | null;
};

export type ChartTaskAnchor = {
  x: number;
  right: number;
  y: number;
};

export function hitTaskResizeEdge(
  local: { x: number; y: number },
  anchors: Iterable<[ScheduleId, ChartTaskAnchor]>,
  barHeight: number,
): { taskId: ScheduleId; edge: TaskBarEdge } | null {
  for (const [taskId, anchor] of anchors) {
    const top = anchor.y - barHeight / 2;
    const bottom = anchor.y + barHeight / 2;
    if (local.y < top || local.y > bottom) continue;
    const edge = taskBarResizeEdgeAt(
      local.x - anchor.x,
      anchor.right - anchor.x,
    );
    if (edge != null) return { taskId, edge };
  }
  return null;
}

export type ChartHover = ChartPointer;

export function taskBarContainsPoint(
  local: { x: number; y: number },
  anchor: ChartTaskAnchor,
  barHeight: number,
  handlePad: number,
): boolean {
  const top = anchor.y - barHeight / 2;
  const bottom = anchor.y + barHeight / 2;
  return (
    local.x >= anchor.x - handlePad &&
    local.x <= anchor.right + handlePad &&
    local.y >= top &&
    local.y <= bottom
  );
}

export function hitTaskAnchor(
  local: { x: number; y: number },
  anchors: Iterable<[ScheduleId, ChartTaskAnchor]>,
  barHeight: number,
  options: { linkMode: boolean; selectedTaskId: ScheduleId | null },
): { taskId: ScheduleId; anchor: ChartTaskAnchor } | null {
  for (const [id, anchor] of anchors) {
    const handlePad = options.linkMode ? 0 : TASK_HANDLE_WIDTH / 2;
    if (taskBarContainsPoint(local, anchor, barHeight, handlePad)) {
      return { taskId: id, anchor };
    }
  }
  return null;
}

export type MilestoneMarkHit = {
  radius: number;
  /** 円の右端から名前の右端まで。名前幅が 0 のときは null。 */
  label: { x: number; y: number; width: number; height: number } | null;
};

/** ひし形の中心を原点にした、円と名前の当たり。 */
export function milestoneMarkHit(
  diamondSize: number,
  fontSize: number,
  name: string,
): MilestoneMarkHit {
  const radius = diamondSize / 2 + MILESTONE_HIT_SLOP;
  const labelWidth = milestoneLabelWidth(name, fontSize);
  if (labelWidth <= 0) return { radius, label: null };
  const height = Math.max(radius * 2, fontSize);
  const textLeft = diamondSize / 2 + MILESTONE_LABEL_GAP;
  return {
    radius,
    label: {
      x: radius,
      y: -height / 2,
      width: textLeft + labelWidth - radius,
      height,
    },
  };
}

export function milestoneMarkContainsPoint(
  local: { x: number; y: number },
  hit: MilestoneMarkHit,
): boolean {
  if (Math.hypot(local.x, local.y) <= hit.radius) return true;
  const label = hit.label;
  if (label == null) return false;
  return (
    local.x >= label.x &&
    local.x <= label.x + label.width &&
    local.y >= label.y &&
    local.y <= label.y + label.height
  );
}

export function hitMilestoneDiamond(
  local: { x: number; y: number },
  milestones: readonly { id: ScheduleId; date: string; name: string }[],
  centerYById: ReadonlyMap<ScheduleId, number>,
  displayLabels: ReadonlyMap<ScheduleId, string>,
  dateToX: (date: Date) => number,
  diamondSize: number,
  fontSize: number,
): boolean {
  for (const milestone of milestones) {
    const cx = dateToX(parseDate(milestone.date));
    const cy = centerYById.get(milestone.id);
    if (cy == null) continue;
    const label = displayLabels.get(milestone.id) ?? milestone.name;
    if (
      milestoneMarkContainsPoint(
        { x: local.x - cx, y: local.y - cy },
        milestoneMarkHit(diamondSize, fontSize, label),
      )
    ) {
      return true;
    }
  }
  return false;
}

export function linkPreviewEnd(input: {
  linkMode: boolean;
  local: { x: number; y: number } | null;
  sidebar: boolean;
  hoverAnchor: { x: number; y: number } | null;
}): { x: number; y: number } | null {
  if (!input.linkMode || input.local == null) return null;
  if (input.sidebar) return { x: 0, y: input.local.y };
  if (input.hoverAnchor) return { x: input.hoverAnchor.x, y: input.hoverAnchor.y };
  return input.local;
}

export function resolveChartHover(input: {
  insideBody: boolean;
  local: { x: number; y: number } | null;
  overMilestone: boolean;
  anchors: Iterable<[ScheduleId, ChartTaskAnchor]>;
  linkPolylines: readonly LinkPolyline[];
  barHeight: number;
  linkMode: boolean;
  selectedTaskId: ScheduleId | null;
  sidebar: boolean;
  /** これ未満は固定段。タスクと線には当てない。 */
  clipTop?: number;
}): { hover: ChartHover; previewEnd: { x: number; y: number } | null } {
  const clipTop = input.clipTop ?? 0;
  const belowSticky =
    input.local != null && input.local.y >= clipTop;
  let hoverTaskId: ScheduleId | null = null;
  let hoverAnchor: ChartTaskAnchor | null = null;
  if (input.insideBody && input.local && belowSticky) {
    const hit = hitTaskAnchor(input.local, input.anchors, input.barHeight, {
      linkMode: input.linkMode,
      selectedTaskId: input.selectedTaskId,
    });
    if (hit) {
      hoverTaskId = hit.taskId;
      hoverAnchor = hit.anchor;
    }
  }
  const overTask = hoverTaskId != null;
  const linkHit =
    input.insideBody &&
    input.local &&
    belowSticky &&
    !overTask &&
    !input.overMilestone
      ? nearestLinkHit(input.linkPolylines, input.local.x, input.local.y)
      : null;
  return {
    hover: {
      overTask,
      overMilestone: input.overMilestone,
      link: linkHit ? { fromId: linkHit.fromId, toId: linkHit.toId } : null,
      hoverTaskId,
    },
    previewEnd: linkPreviewEnd({
      linkMode: input.linkMode,
      local: input.local,
      sidebar: input.sidebar,
      hoverAnchor,
    }),
  };
}

export function chartHoverEquals(prev: ChartHover, next: ChartHover): boolean {
  return (
    prev.overTask === next.overTask &&
    prev.overMilestone === next.overMilestone &&
    prev.hoverTaskId === next.hoverTaskId &&
    prev.link?.fromId === next.link?.fromId &&
    prev.link?.toId === next.link?.toId
  );
}

export function previewEndEquals(
  prev: { x: number; y: number } | null,
  next: { x: number; y: number } | null,
): boolean {
  if (next == null) return prev == null;
  return prev != null && prev.x === next.x && prev.y === next.y;
}
