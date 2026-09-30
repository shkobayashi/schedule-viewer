import { parseDate } from "./dates";
import { nearestLinkHit, type LinkPolyline } from "./dependencies";
import type { ScheduleId } from "./types";

/** 選択中バーの端ハンドルが当たり判定へ広がる幅。 */
export const TASK_HANDLE_WIDTH = 8;

export type ChartPointerLink = {
  fromId: ScheduleId;
  toId: ScheduleId;
};

export type ChartPointer = {
  overTask: boolean;
  overMilestone: boolean;
  link: ChartPointerLink | null;
};

export type ChartTaskAnchor = {
  x: number;
  right: number;
  y: number;
};

export type ChartHover = ChartPointer & {
  hoverTaskId: ScheduleId | null;
};

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
    const handlePad =
      !options.linkMode && id === options.selectedTaskId
        ? TASK_HANDLE_WIDTH / 2
        : 0;
    if (taskBarContainsPoint(local, anchor, barHeight, handlePad)) {
      return { taskId: id, anchor };
    }
  }
  return null;
}

export function hitMilestoneDiamond(
  local: { x: number; y: number },
  milestones: readonly { id: ScheduleId; date: string }[],
  lanes: ReadonlyMap<ScheduleId, number>,
  dateToX: (date: Date) => number,
  diamondSize: number,
  laneHeight: number,
): boolean {
  const radius = diamondSize / 2 + 2;
  for (const milestone of milestones) {
    const cx = dateToX(parseDate(milestone.date));
    const lane = lanes.get(milestone.id) ?? 0;
    const cy = lane * laneHeight + laneHeight / 2;
    if (Math.hypot(local.x - cx, local.y - cy) <= radius) return true;
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
}): { hover: ChartHover; previewEnd: { x: number; y: number } | null } {
  let hoverTaskId: ScheduleId | null = null;
  let hoverAnchor: ChartTaskAnchor | null = null;
  if (input.insideBody && input.local) {
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
    input.insideBody && input.local && !overTask && !input.overMilestone
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
