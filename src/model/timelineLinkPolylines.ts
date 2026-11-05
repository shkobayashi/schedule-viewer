import { linkPoints, type DependencyLink, type LinkPolyline } from "./dependencies";
import { previewLinkBrokenWithOverrides } from "./dragDates";
import { isExplanationTrialVisibleRow } from "./explainOverlayPatterns";
import type { PreparedTimelineConnectionArc } from "./timelinePreparedConnectionArcs";
import type { TimelineLiveAnchor } from "./timelineLiveAnchors";
import type { ScheduleId, VisibleRow } from "./types";

export type TimelineLinkPolyline = LinkPolyline & { broken: boolean };

export function buildTimelineLinkPolylines(input: {
  links: readonly DependencyLink[];
  preparedConnectionArcs: readonly PreparedTimelineConnectionArc[];
  liveAnchors: ReadonlyMap<ScheduleId, TimelineLiveAnchor>;
  visibleRows: readonly VisibleRow[];
  dragPreviewOverrides: ReadonlyMap<ScheduleId, { start: string; end: string }> | null;
  barHeight: number;
}): TimelineLinkPolyline[] {
  const dates = new Map<ScheduleId, { start: string; end: string }>();
  for (const row of input.visibleRows) {
    if (row.type === "task" && !isExplanationTrialVisibleRow(row)) {
      dates.set(row.task.id, row.task);
    }
  }
  const polylines: TimelineLinkPolyline[] = [];
  for (const link of input.links) {
    const from = input.liveAnchors.get(link.fromId);
    const to = input.liveAnchors.get(link.toId);
    if (!from || !to) continue;
    polylines.push({
      fromId: link.fromId,
      toId: link.toId,
      kind: "predecessor",
      broken: previewLinkBrokenWithOverrides(
        link,
        dates,
        input.dragPreviewOverrides ?? new Map(),
      ),
      points: linkPoints(from.linkRight, from.y, to.x, to.y, input.barHeight),
    });
  }
  for (const item of input.preparedConnectionArcs) {
    polylines.push({
      fromId: item.taskA,
      toId: item.taskB,
      kind: "connection",
      broken: false,
      points: item.geom.points,
    });
  }
  return polylines;
}
