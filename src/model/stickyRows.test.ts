import { describe, expect, it } from "vitest";
import { layoutStickyHeaders, scrollYToRevealTask } from "./stickyRows";
import type { SummarySpan } from "./summary";
import type { Task, VisibleRow } from "./types";

const H = 32;
const VIEWPORT = 200;

const summary: SummarySpan = {
  start: "2026-01-01",
  end: "2026-01-02",
  covered: [{ start: "2026-01-01", end: "2026-01-02" }],
};

function taskAt(index: number): Task {
  return {
    id: `task-${index}`,
    name: `task-${index}`,
    start: "2026-01-01",
    end: "2026-01-02",
    assigneeId: null,
    status: "not-started",
    progress: 0,
    confidence: "committed",
    predecessors: [],
    milestoneId: null,
  };
}

type RowSpec =
  | { kind: "category"; collapsed?: boolean }
  | { kind: "group"; collapsed?: boolean }
  | { kind: "task" };

function rowsFrom(specs: readonly RowSpec[]): VisibleRow[] {
  return specs.map((spec, index) => {
    const y = index * H;
    if (spec.kind === "category") {
      return {
        type: "category",
        id: `cat-${index}`,
        label: `cat-${index}`,
        y,
        collapsed: spec.collapsed ?? false,
        summary,
      };
    }
    if (spec.kind === "group") {
      return {
        type: "group",
        id: `group-${index}`,
        categoryId: "cat",
        category: "cat",
        label: `group-${index}`,
        y,
        collapsed: spec.collapsed ?? false,
        summary,
      };
    }
    return { type: "task", task: taskAt(index), y };
  });
}

/** カテゴリ2、展開グループ3、タスク10。y は index * 32。 */
const sample = rowsFrom([
  { kind: "category" },
  { kind: "group" },
  { kind: "task" },
  { kind: "task" },
  { kind: "group" },
  { kind: "task" },
  { kind: "task" },
  { kind: "task" },
  { kind: "category" },
  { kind: "group" },
  { kind: "task" },
  { kind: "task" },
  { kind: "task" },
  { kind: "task" },
  { kind: "task" },
]);

function layoutAt(scrollY: number, rows: readonly VisibleRow[] = sample, viewport = VIEWPORT) {
  return layoutStickyHeaders(rows, scrollY, H, viewport);
}

describe("layoutStickyHeaders", () => {
  it("sticks nothing at the top of the list", () => {
    const layout = layoutAt(0);
    expect(layout.draws).toEqual([]);
    expect(layout.clipTop).toBe(0);
    expect(layout.hiddenIndexes).toEqual([]);
  });

  it("sticks the open category and its first group after a short scroll", () => {
    const layout = layoutAt(16);
    expect(layout.draws).toEqual([
      { index: 0, top: 0, clipTop: 0, clipBottom: 32 },
      { index: 1, top: 32, clipTop: 32, clipBottom: 64 },
    ]);
    expect(layout.clipTop).toBe(64);
    expect(layout.hiddenIndexes).toEqual([0, 1]);
  });

  it("keeps those headers when the next task meets the band", () => {
    const layout = layoutAt(32);
    expect(layout.draws).toEqual([
      { index: 0, top: 0, clipTop: 0, clipBottom: 32 },
      { index: 1, top: 32, clipTop: 32, clipBottom: 64 },
    ]);
    expect(layout.clipTop).toBe(64);
    expect(layout.hiddenIndexes).toEqual([0, 1]);
    expect(sample[3].y - 32).toBe(64);
    expect(layout.hiddenIndexes).not.toContain(3);
  });

  it("slides the next group into the group slot", () => {
    const layout = layoutAt(80);
    expect(layout.draws).toEqual([
      { index: 0, top: 0, clipTop: 0, clipBottom: 32 },
      { index: 1, top: 16, clipTop: 32, clipBottom: 48 },
      { index: 4, top: 48, clipTop: 48, clipBottom: 80 },
    ]);
    expect(layout.clipTop).toBe(80);
    expect(layout.hiddenIndexes).toEqual([0, 1, 4]);
  });

  it("releases the finished group and keeps the next one", () => {
    const layout = layoutAt(96);
    expect(layout.draws).toEqual([
      { index: 0, top: 0, clipTop: 0, clipBottom: 32 },
      { index: 4, top: 32, clipTop: 32, clipBottom: 64 },
    ]);
    expect(layout.clipTop).toBe(64);
    expect(layout.hiddenIndexes).toEqual([0, 4]);
    expect(layout.hiddenIndexes).not.toContain(1);
    expect(layout.draws.some((draw) => draw.index === 1 || draw.index === 3)).toBe(false);
    expect(sample[5].y - 96).toBe(64);
  });

  it("keeps the current headers before the next category arrives", () => {
    const layout = layoutAt(128);
    expect(layout.draws).toEqual([
      { index: 0, top: 0, clipTop: 0, clipBottom: 32 },
      { index: 4, top: 32, clipTop: 32, clipBottom: 64 },
    ]);
    expect(layout.clipTop).toBe(64);
    expect(layout.hiddenIndexes).not.toContain(8);
  });

  it("swaps categories while the group stays in its slot", () => {
    const layout = layoutAt(240);
    expect(layout.draws).toEqual([
      { index: 0, top: -16, clipTop: 0, clipBottom: 16 },
      { index: 8, top: 16, clipTop: 16, clipBottom: 32 },
      { index: 4, top: 32, clipTop: 32, clipBottom: 64 },
    ]);
    expect(layout.clipTop).toBe(64);
    expect(layout.hiddenIndexes).toEqual([0, 8, 4]);
  });

  it("switches to the next category and group together", () => {
    const layout = layoutAt(256);
    expect(layout.draws).toEqual([
      { index: 8, top: 0, clipTop: 0, clipBottom: 32 },
      { index: 9, top: 32, clipTop: 32, clipBottom: 64 },
    ]);
    expect(layout.clipTop).toBe(64);
    expect(layout.draws.some((draw) => draw.index === 0 || draw.index === 4)).toBe(false);
    expect(layout.hiddenIndexes).not.toContain(0);
    expect(layout.hiddenIndexes).not.toContain(4);
  });

  it("places the later task just below the sticky band", () => {
    const layout = layoutAt(320);
    expect(layout.draws).toEqual([
      { index: 8, top: 0, clipTop: 0, clipBottom: 32 },
      { index: 9, top: 32, clipTop: 32, clipBottom: 64 },
    ]);
    expect(layout.clipTop).toBe(64);
    expect(layout.hiddenIndexes).not.toContain(12);
    expect(sample[12].y - 320).toBe(64);
  });

  it("sticks nothing when the viewport is taller than the content", () => {
    const layout = layoutAt(400, sample, sample.length * H + 1);
    expect(layout.draws).toEqual([]);
    expect(layout.clipTop).toBe(0);
  });

  it("skips a collapsed group", () => {
    const rows = rowsFrom([
      { kind: "category" },
      { kind: "group", collapsed: true },
      { kind: "group" },
      { kind: "task" },
      { kind: "task" },
      { kind: "task" },
      { kind: "task" },
      { kind: "task" },
    ]);
    const layout = layoutStickyHeaders(rows, 80, H, VIEWPORT);
    expect(layout.draws.map((draw) => draw.index)).toEqual([0, 2]);
    expect(layout.hiddenIndexes).toEqual([0, 2]);
    expect(layout.hiddenIndexes).not.toContain(1);
  });

  it("skips a collapsed category", () => {
    const rows = rowsFrom([
      { kind: "category", collapsed: true },
      { kind: "category" },
      { kind: "group" },
      { kind: "task" },
      { kind: "task" },
      { kind: "task" },
      { kind: "task" },
      { kind: "task" },
    ]);
    const layout = layoutStickyHeaders(rows, 80, H, VIEWPORT);
    expect(layout.draws.map((draw) => draw.index)).toEqual([1, 2]);
    expect(layout.hiddenIndexes).not.toContain(0);
  });

  it("sticks only the category when every group is collapsed", () => {
    const rows = rowsFrom([
      { kind: "category" },
      { kind: "group", collapsed: true },
      { kind: "group", collapsed: true },
      { kind: "group", collapsed: true },
    ]);
    const layout = layoutStickyHeaders(rows, 16, H, 50);
    expect(layout.draws).toEqual([
      { index: 0, top: 0, clipTop: 0, clipBottom: 32 },
    ]);
    expect(layout.clipTop).toBe(H);
    expect(layout.hiddenIndexes).toEqual([0]);
  });

  it("returns no draws for an empty list", () => {
    const layout = layoutStickyHeaders([], 10, H, VIEWPORT);
    expect(layout.draws).toEqual([]);
    expect(layout.clipTop).toBe(0);
  });
});

describe("scrollYToRevealTask", () => {
  it("scrolls a task to just under the sticky headers", () => {
    expect(scrollYToRevealTask(sample, 64, H, VIEWPORT)).toBe(0);
    expect(scrollYToRevealTask(sample, 96, H, VIEWPORT)).toBe(32);
    expect(scrollYToRevealTask(sample, 384, H, VIEWPORT)).toBe(320);
  });

  it("returns the task offset when the list fits", () => {
    expect(scrollYToRevealTask(sample, 96, H, sample.length * H + 40)).toBe(96);
    expect(scrollYToRevealTask(sample, 0, H, sample.length * H + 40)).toBe(0);
  });
});
