import { linkPoints } from "./dependencies";
import type { TimelineLiveAnchor } from "./timelineLiveAnchors";
import type { ScheduleId } from "./types";

/** 系統モード中、ソースタスクからポインタ先へのプレビュー矢印用 polyline。 */
export function buildTimelineLinkPreviewPoints(input: {
  linkSourceId: ScheduleId | null;
  previewEnd: { x: number; y: number } | null;
  liveAnchors: ReadonlyMap<ScheduleId, TimelineLiveAnchor>;
  barHeight: number;
}): number[] | null {
  if (input.linkSourceId == null || input.previewEnd == null) return null;
  const from = input.liveAnchors.get(input.linkSourceId);
  if (!from) return null;
  return linkPoints(
    from.linkRight,
    from.y,
    input.previewEnd.x,
    input.previewEnd.y,
    input.barHeight,
  );
}
