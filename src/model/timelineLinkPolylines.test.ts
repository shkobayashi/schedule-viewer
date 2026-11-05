import { describe, expect, it } from "vitest";
import type { DependencyLink } from "./dependencies";
import { buildTimelineLinkPolylines } from "./timelineLinkPolylines";
import type { TimelineLiveAnchor } from "./timelineLiveAnchors";
import type { ScheduleId, Task, VisibleRow } from "./types";

const taskA: Task = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "A",
  start: "2026-04-01",
  end: "2026-04-03",
  assigneeIds: [],
  status: "in-progress",
  progress: 0,
  confidence: "committed",
  predecessors: [],
  milestoneId: null,
  note: "",
};

const taskB: Task = {
  ...taskA,
  id: "00000000-0000-4000-8000-000000000002",
  name: "B",
  start: "2026-04-04",
  end: "2026-04-05",
};

describe("buildTimelineLinkPolylines", () => {
  it("marks predecessor links broken when drag overrides break dependency dates", () => {
    const rows: VisibleRow[] = [
      { type: "task", task: taskA, y: 0 },
      { type: "task", task: taskB, y: 24 },
    ];
    const anchors = new Map<ScheduleId, TimelineLiveAnchor>([
      [taskA.id, { x: 0, right: 30, y: 12, linkRight: 30 }],
      [taskB.id, { x: 40, right: 70, y: 36, linkRight: 70 }],
    ]);
    const links: DependencyLink[] = [
      { fromId: taskA.id, toId: taskB.id, broken: false },
    ];
    const polylines = buildTimelineLinkPolylines({
      links,
      preparedConnectionArcs: [],
      liveAnchors: anchors,
      visibleRows: rows,
      dragPreviewOverrides: new Map([
        [taskA.id, { start: "2026-04-10", end: "2026-04-12" }],
      ]),
      barHeight: 16,
    });
    expect(polylines).toHaveLength(1);
    expect(polylines[0].broken).toBe(true);
    expect(polylines[0].kind).toBe("predecessor");
  });
});
