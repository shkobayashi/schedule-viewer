import { connectionArcGeometry } from "./connections";
import type { ConnectionBarObstacle } from "./connections";
import { timelineVisibleBarObstacles } from "./timelineVisibleBarObstacles";
import type { TimelineLiveAnchor } from "./timelineLiveAnchors";
import type { ScheduleId, TaskConnection, VisibleRow } from "./types";

export type PreparedTimelineConnectionArc = {
  connection: TaskConnection;
  taskA: ScheduleId;
  taskB: ScheduleId;
  geom: ReturnType<typeof connectionArcGeometry>;
};

export function prepareTimelineConnectionArcs(input: {
  connections: readonly TaskConnection[];
  visibleRows: readonly VisibleRow[];
  scrollY: number;
  rowHeight: number;
  barHeight: number;
  bodyHeight: number;
  dateToX: (d: Date) => number;
  pxPerDay: number;
  liveAnchors: ReadonlyMap<ScheduleId, TimelineLiveAnchor>;
}): PreparedTimelineConnectionArc[] {
  if (input.connections.length === 0) return [];
  const prepared: PreparedTimelineConnectionArc[] = [];
  for (const connection of input.connections) {
    const [taskA, taskB] = connection.taskIds;
    const skipIds = new Set<ScheduleId>([taskA, taskB]);
    const obstacles: ConnectionBarObstacle[] = timelineVisibleBarObstacles({
      rows: [...input.visibleRows],
      scrollY: input.scrollY,
      rowHeight: input.rowHeight,
      barHeight: input.barHeight,
      bodyHeight: input.bodyHeight,
      dateToX: input.dateToX,
      pxPerDay: input.pxPerDay,
      skipTaskIds: skipIds,
    }).map((rect) => ({
      left: rect.x,
      right: rect.x + rect.width,
      topY: rect.y,
    }));
    const anchorFor = (taskId: ScheduleId) => {
      const anchor = input.liveAnchors.get(taskId);
      if (!anchor) return null;
      return {
        left: anchor.x,
        width: Math.max(anchor.right - anchor.x, 1),
        centerY: anchor.y,
      };
    };
    const from = anchorFor(taskA);
    const to = anchorFor(taskB);
    if (!from || !to) continue;
    const geom = connectionArcGeometry(
      from.left,
      from.width,
      from.centerY,
      to.left,
      to.width,
      to.centerY,
      input.barHeight,
      input.pxPerDay,
      obstacles,
    );
    prepared.push({ connection, taskA, taskB, geom });
  }
  return prepared;
}
