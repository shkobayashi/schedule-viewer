import { describe, expect, it } from "vitest";
import { collectTasksFromDocument } from "./hierarchy";
import { cloneSnapshot, type DocumentSnapshot } from "./history";
import { documentToJsonString } from "./serialize";
import {
  connectionArcGeometry,
  connectionPairKey,
  layoutConnectionArcLabel,
  layoutConnectionArcLabelsInOrder,
  removeConnectionByPair,
  removeConnectionsForDeletedTasks,
  tryAddConnection,
  tryUpdateConnectionLabel,
  validateConnections,
  visibleConnectionsFromTasks,
  type TextObstacleRect,
} from "./connections";
import { validateSchedule } from "./validateSchedule";
import { removeTask } from "./tasks";
import { removeTaskFromOutline } from "./outlineTasks";
import { SCHEDULE_SCHEMA_VERSION, type ScheduleDocument, type TaskConnection } from "./types";
import { sampleScheduleDocument } from "../sample/schedule";
import connectionsExample from "../../examples/connections/schedule.json";

const TASK_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TASK_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const TASK_C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function minimalDoc(
  connections?: TaskConnection[],
  categories = [
    {
      id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      name: "C",
      groups: [
        {
          id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
          name: "G",
          tasks: [
            {
              id: TASK_A,
              name: "A",
              start: "2026-01-01",
              end: "2026-01-05",
              assigneeIds: [],
              status: "not-started",
              progress: 0,
              confidence: "committed" as const,
              predecessors: [],
              milestoneId: null,
            },
            {
              id: TASK_B,
              name: "B",
              start: "2026-01-10",
              end: "2026-01-12",
              assigneeIds: [],
              status: "not-started",
              progress: 0,
              confidence: "committed" as const,
              predecessors: [],
              milestoneId: null,
            },
          ],
        },
      ],
    },
  ],
): ScheduleDocument {
  return {
    schemaVersion: SCHEDULE_SCHEMA_VERSION,
    title: "T",
    milestoneGroups: [],
    milestones: [],
    categories,
    connections,
  };
}

describe("connectionPairKey", () => {
  it("treats reversed task order as the same pair", () => {
    expect(connectionPairKey(TASK_A, TASK_B)).toBe(
      connectionPairKey(TASK_B, TASK_A),
    );
  });
});

describe("validateConnections", () => {
  it("accepts two existing tasks and a label", () => {
    const doc = minimalDoc([
      { taskIds: [TASK_A, TASK_B], label: "関連" },
    ]);
    expect(validateConnections(doc)).toEqual([]);
  });

  it("rejects duplicate pairs regardless of order", () => {
    const doc = minimalDoc([
      { taskIds: [TASK_A, TASK_B], label: "1" },
      { taskIds: [TASK_B, TASK_A], label: "2" },
    ]);
    expect(validateConnections(doc).some((i) => i.path === "/connections/1")).toBe(
      true,
    );
  });

  it("rejects missing task ids and empty label", () => {
    const doc = minimalDoc([
      { taskIds: [TASK_A, TASK_C], label: " " },
    ]);
    const issues = validateConnections(doc);
    expect(issues.some((i) => i.message.includes("存在しない"))).toBe(true);
    expect(issues.some((i) => i.path.endsWith("/label"))).toBe(true);
  });
});

describe("validateSchedule connections", () => {
  it("accepts sample schedule without connections", () => {
    const doc = sampleScheduleDocument();
    expect(doc.connections).toBeUndefined();
    expect(validateSchedule(doc).ok).toBe(true);
  });

  it("accepts connections example schedule", () => {
    expect(validateSchedule(connectionsExample).ok).toBe(true);
  });

  it("accepts tasks whose dates ignore predecessor order", () => {
    const doc = minimalDoc([
      { taskIds: [TASK_A, TASK_B], label: "参考" },
    ]);
    doc.categories[0]!.groups[0]!.tasks[1]!.start = "2026-01-01";
    expect(validateSchedule(doc).ok).toBe(true);
  });
});

describe("removeConnectionsForDeletedTasks", () => {
  it("drops only connections touching deleted tasks", () => {
    const connections: TaskConnection[] = [
      { taskIds: [TASK_A, TASK_B], label: "残る" },
      { taskIds: [TASK_A, TASK_C], label: "消える" },
    ];
    const next = removeConnectionsForDeletedTasks(
      connections,
      new Set([TASK_C]),
    );
    expect(next).toEqual([{ taskIds: [TASK_A, TASK_B], label: "残る" }]);
  });
});

describe("visibleConnectionsFromTasks", () => {
  it("requires both endpoints visible", () => {
    const connections: TaskConnection[] = [
      { taskIds: [TASK_A, TASK_B], label: "x" },
    ];
    expect(
      visibleConnectionsFromTasks(connections, new Set([TASK_A])),
    ).toEqual([]);
    expect(
      visibleConnectionsFromTasks(connections, new Set([TASK_A, TASK_B])),
    ).toEqual(connections);
  });
});

describe("document persistence", () => {
  it("omits empty connections from saved JSON", () => {
    const json = documentToJsonString(minimalDoc(undefined));
    expect(json).not.toContain('"connections"');
  });

  it("round-trips connections through cloneSnapshot", () => {
    const connections: TaskConnection[] = [
      { taskIds: [TASK_A, TASK_B], label: "往復" },
    ];
    const doc = minimalDoc(connections);
    const snap: DocumentSnapshot = {
      title: doc.title,
      categories: doc.categories,
      milestoneGroups: doc.milestoneGroups,
      milestones: doc.milestones,
      connections: doc.connections,
    };
    expect(cloneSnapshot(snap).connections).toEqual(connections);
  });
});

describe("delete task pruning", () => {
  it("removes connections in categories storage", () => {
    const doc = minimalDoc([
      { taskIds: [TASK_A, TASK_B], label: "x" },
    ]);
    const next = removeConnectionsForDeletedTasks(
      doc.connections,
      new Set([TASK_B]),
    );
    const categories = removeTask(doc.categories, TASK_B);
    expect(next).toBeUndefined();
    expect(collectTasksFromDocument({ ...doc, categories }).length).toBe(1);
  });

  it("removes connections in outline storage", () => {
    const outline = [
      {
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        name: "B",
        children: [
          {
            id: TASK_A,
            name: "A",
            start: "2026-01-01",
            end: "2026-01-02",
            assigneeIds: [],
            status: "not-started",
            progress: 0,
            confidence: "committed" as const,
            predecessors: [],
            milestoneId: null,
          },
          {
            id: TASK_B,
            name: "B",
            start: "2026-01-03",
            end: "2026-01-04",
            assigneeIds: [],
            status: "not-started",
            progress: 0,
            confidence: "committed" as const,
            predecessors: [],
            milestoneId: null,
          },
        ],
      },
    ];
    const doc = minimalDoc(
      [{ taskIds: [TASK_A, TASK_B], label: "x" }],
      [],
    );
    doc.levels = [{ name: "L", meaning: "m" }];
    doc.outline = outline;
    const nextOutline = removeTaskFromOutline(outline, TASK_B);
    const nextConnections = removeConnectionsForDeletedTasks(
      doc.connections,
      new Set([TASK_B]),
    );
    expect(nextConnections).toBeUndefined();
    expect(nextOutline.length).toBe(1);
  });
});

describe("connectionArcGeometry", () => {
  it("bulges upward and caps bulge at one week width", () => {
    const geom = connectionArcGeometry(10, 40, 100, 200, 50, 140, 20, 10, []);
    const controlY = geom.points[3]!;
    expect(controlY).toBeLessThan(Math.min(90, 130));
    expect(geom.points[0]).toBe(30);
    expect(geom.points[1]).toBe(90);
  });

  it("routes above an obstacle bar between rows", () => {
    const geom = connectionArcGeometry(
      10,
      40,
      100,
      200,
      40,
      200,
      20,
      10,
      [{ left: 80, right: 180, topY: 170 }],
    );
    expect(geom.points[3]).toBeLessThan(170 - 2);
  });
});

describe("layoutConnectionArcLabel", () => {
  const fontSize = 11;

  it("keeps default position when nothing overlaps", () => {
    const layout = layoutConnectionArcLabel(100, 80, "離れた関係", fontSize, [], 0);
    expect(layout).toEqual({ x: 100, y: 80, offsetX: layout.offsetX });
    expect(layout.offsetX).toBeGreaterThan(0);
  });

  it("shifts up when default overlaps", () => {
    const defaultBlock: TextObstacleRect = {
      left: 60,
      top: 102,
      right: 140,
      bottom: 114,
    };
    const layout = layoutConnectionArcLabel(
      100,
      100,
      "重なり",
      fontSize,
      [defaultBlock],
      0,
    );
    expect(layout.y).toBe(100 - fontSize);
    expect(layout.x).toBe(100);
  });

  it("shifts left when default and up overlap", () => {
    const obstacles: TextObstacleRect[] = [
      { left: 108, top: 96, right: 150, bottom: 108 },
      { left: 85, top: 78, right: 115, bottom: 90 },
    ];
    const layout = layoutConnectionArcLabel(100, 100, "重なり", fontSize, obstacles, 0);
    expect(layout.x).toBe(100 - fontSize * 2);
    expect(layout.y).toBe(100);
  });

  it("shifts right when other candidates overlap", () => {
    const obstacles: TextObstacleRect[] = [
      { left: 88, top: 96, right: 102, bottom: 108 },
      { left: 85, top: 78, right: 115, bottom: 90 },
      { left: 52, top: 96, right: 70, bottom: 108 },
    ];
    const layout = layoutConnectionArcLabel(100, 100, "重なり", fontSize, obstacles, 0);
    expect(layout.x).toBe(100 + fontSize * 2);
  });

  it("keeps default when all four candidates overlap", () => {
    const wide: TextObstacleRect = { left: 0, top: 0, right: 200, bottom: 200 };
    const layout = layoutConnectionArcLabel(100, 100, "塞がる", fontSize, [wide], 0);
    expect(layout).toEqual({
      x: 100,
      y: 100,
      offsetX: layout.offsetX,
    });
  });

  it("skips up candidate above chart body top", () => {
    const block: TextObstacleRect = {
      left: 60,
      top: 4,
      right: 140,
      bottom: 16,
    };
    const layout = layoutConnectionArcLabel(100, 8, "上端", fontSize, [block], 0);
    expect(layout.y).not.toBe(8 - fontSize);
    expect(layout.y).toBeGreaterThanOrEqual(0);
  });

  it("later labels avoid earlier connection labels", () => {
    const block: TextObstacleRect = {
      left: 108,
      top: 96,
      right: 150,
      bottom: 108,
    };
    const both = layoutConnectionArcLabelsInOrder(
      [
        { labelX: 100, labelY: 100, label: "先" },
        { labelX: 100, labelY: 100, label: "後" },
      ],
      [block],
      fontSize,
      0,
    );
    expect(both[0]!.x).toBe(100 - fontSize * 2);
    expect(both[1]!.x).toBe(100);
  });
});

describe("connection edit helpers", () => {
  it("rejects empty label, self, and duplicate pair", () => {
    expect(tryAddConnection(undefined, TASK_A, TASK_B, "  ").ok).toBe(false);
    expect(tryAddConnection(undefined, TASK_A, TASK_A, "x").ok).toBe(false);
    const first = tryAddConnection(undefined, TASK_A, TASK_B, "同じ");
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const dup = tryAddConnection(first.connections, TASK_A, TASK_B, "別");
    expect(dup.ok).toBe(false);
  });

  it("adds, updates label, and removes one pair", () => {
    const added = tryAddConnection(undefined, TASK_A, TASK_B, "初期");
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    const updated = tryUpdateConnectionLabel(
      added.connections,
      TASK_A,
      TASK_B,
      "変更後",
    );
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(
      updated.connections!.find((c) => c.taskIds.includes(TASK_A))?.label,
    ).toBe("変更後");
    const removed = removeConnectionByPair(updated.connections!, TASK_A, TASK_B);
    expect(removed).toBeUndefined();
  });
});
