import { describe, expect, it } from "vitest";
import {
  LINK_ARROW_CLEARANCE,
  LINK_HIT_DISTANCE,
  dropPredecessorLink,
  linkPoints,
  nearestLinkHit,
  tryAddPredecessorLink,
  type LinkPolyline,
} from "./dependencies";
import {
  validateDependencyCycles,
  validatePredecessorRefs,
} from "./scheduleSemantics";
import { SCHEDULE_SCHEMA_VERSION, type Category, type ScheduleDocument, type Task } from "./types";
import { formatValidationErrors } from "./validateSchedule";

const TASK_A = "00000000-0000-4000-8000-00000000000a";
const TASK_B = "00000000-0000-4000-8000-00000000000b";
const TASK_C = "00000000-0000-4000-8000-00000000000c";

function task(id: string, predecessors: string[] = []): Task {
  return {
    id,
    name: id,
    start: "2026-01-01",
    end: "2026-01-03",
    assigneeId: null,
    status: "not-started",
    progress: 0,
    confidence: "committed",
    predecessors,
    milestoneId: null,
  };
}

function categories(tasks: Task[]): Category[] {
  return [
    {
      id: "c1000001-0000-4000-8000-000000000001",
      name: "設計",
      groups: [
        { id: "d1000001-0000-4000-8000-000000000001", name: "上流", tasks },
      ],
    },
  ];
}

function dialogMessage(next: Category[]): string {
  const doc: ScheduleDocument = {
    schemaVersion: SCHEDULE_SCHEMA_VERSION,
    title: "link",
    categories: next,
    milestones: [],
  };
  return formatValidationErrors([
    ...validateDependencyCycles(doc),
    ...validatePredecessorRefs(doc),
  ]);
}

function finalSegment(points: number[]): { fromX: number; toX: number; y: number } {
  const n = points.length;
  return {
    fromX: points[n - 4]!,
    toX: points[n - 2]!,
    y: points[n - 1]!,
  };
}

describe("linkPoints", () => {
  it("keeps a right elbow when the gap fits the arrow", () => {
    expect(linkPoints(0, 10, 40, 40)).toEqual([0, 10, 12, 10, 12, 40, 40, 40]);
    expect(linkPoints(0, 80, 50, 80)).toEqual([0, 80, 50, 80]);
  });

  it("approaches from the left when the gap is shorter than the arrow", () => {
    const tight = linkPoints(100, 16, 108, 48, 20);
    const end = finalSegment(tight);
    expect(end).toEqual({ fromX: 108 - LINK_ARROW_CLEARANCE, toX: 108, y: 48 });
    expect(end.fromX).toBeLessThan(end.toX);
  });

  it("routes around a bar that starts before the predecessor ends", () => {
    const overlap = linkPoints(100, 16, 90, 48, 20);
    const end = finalSegment(overlap);
    expect(end.toX).toBe(90);
    expect(end.fromX).toBe(90 - LINK_ARROW_CLEARANCE);
    expect(end.y).toBe(48);
  });
});

describe("nearestLinkHit", () => {
  const elbow = linkPoints(0, 10, 40, 40);
  const straight = linkPoints(0, 80, 50, 80);
  const links: LinkPolyline[] = [
    { fromId: TASK_A, toId: TASK_B, points: elbow },
    { fromId: TASK_B, toId: TASK_C, points: straight },
  ];

  it("hits the segment, the elbow, and the endpoint", () => {
    expect(nearestLinkHit(links, 12, 25)?.toId).toBe(TASK_B);
    expect(nearestLinkHit(links, 12, 10)?.fromId).toBe(TASK_A);
    expect(nearestLinkHit(links, 0, 80)?.toId).toBe(TASK_C);
    expect(nearestLinkHit(links, 50, 80)?.toId).toBe(TASK_C);
  });

  it("picks the closer line and ignores points outside the threshold", () => {
    expect(nearestLinkHit(links, 12, 10 - (LINK_HIT_DISTANCE - 1))?.toId).toBe(
      TASK_B,
    );
    expect(nearestLinkHit(links, 20, 80)?.toId).toBe(TASK_C);
    expect(nearestLinkHit(links, 20, 80 + LINK_HIT_DISTANCE + 1)).toBeNull();
    expect(nearestLinkHit(links, 200, 200)).toBeNull();
  });
});

describe("tryAddPredecessorLink", () => {
  it("appends the predecessor in one list", () => {
    const current = categories([
      task(TASK_A),
      task(TASK_B),
      task(TASK_C),
    ]);
    const result = tryAddPredecessorLink(current, TASK_A, TASK_C);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.categories[0]?.groups[0]?.tasks[2]?.predecessors).toEqual([
      TASK_A,
    ]);
    expect(current[0]?.groups[0]?.tasks[2]?.predecessors).toEqual([]);
  });

  it("rejects a duplicate with the same message as a repeated predecessor id", () => {
    const current = categories([task(TASK_A), task(TASK_B, [TASK_A])]);
    const result = tryAddPredecessorLink(current, TASK_A, TASK_B);
    expect(result).toEqual({
      ok: false,
      message: "/categories/0/groups/0/tasks/1/predecessors/1: 先行 ID が重複しています",
    });
    expect(dialogMessage(current)).toBe("");
  });

  it("rejects a cycle with the edit dialog message", () => {
    const current = categories([
      task(TASK_A),
      task(TASK_B, [TASK_A]),
      task(TASK_C, [TASK_B]),
    ]);
    const next = categories([
      task(TASK_A, [TASK_C]),
      task(TASK_B, [TASK_A]),
      task(TASK_C, [TASK_B]),
    ]);
    const result = tryAddPredecessorLink(current, TASK_C, TASK_A);
    expect(result).toEqual({ ok: false, message: dialogMessage(next) });
    expect(dialogMessage(next)).toContain("循環");
  });
});

describe("dropPredecessorLink", () => {
  it("removes only that predecessor id", () => {
    const current = categories([
      task(TASK_A),
      task(TASK_B),
      task(TASK_C, [TASK_A, TASK_B]),
    ]);
    const next = dropPredecessorLink(current, TASK_A, TASK_C);
    expect(next[0]?.groups[0]?.tasks[2]?.predecessors).toEqual([TASK_B]);
    expect(next[0]?.groups[0]?.tasks[0]?.predecessors).toEqual([]);
    expect(current[0]?.groups[0]?.tasks[2]?.predecessors).toEqual([
      TASK_A,
      TASK_B,
    ]);
  });
});
