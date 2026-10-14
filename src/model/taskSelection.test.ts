import { describe, expect, it } from "vitest";
import {
  adjacentVisibleTaskId,
  extendSelectionByArrow,
  moveSelectionByArrow,
  rangeBetweenVisible,
  selectTaskClick,
  singleTaskSelection,
  visibleTaskIds,
} from "./taskSelection";
import type { Task, VisibleRow } from "./types";

function task(id: string): Task {
  return {
    id,
    name: id,
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

const rows: VisibleRow[] = [
  {
    type: "category",
    id: "c1",
    label: "A",
    y: 0,
    collapsed: false,
    summary: null,
  },
  { type: "task", y: 32, task: task("t1") },
  { type: "task", y: 64, task: task("t2") },
  { type: "task", y: 96, task: task("t3") },
];

describe("taskSelection", () => {
  it("lists only task rows", () => {
    expect(visibleTaskIds(rows)).toEqual(["t1", "t2", "t3"]);
  });

  it("moves selection along visible tasks", () => {
    expect(adjacentVisibleTaskId(rows, "t1", "next")).toBe("t2");
    expect(adjacentVisibleTaskId(rows, "t2", "prev")).toBe("t1");
    expect(adjacentVisibleTaskId(rows, "t1", "prev")).toBe("t1");
    expect(adjacentVisibleTaskId(rows, "t3", "next")).toBe("t3");
  });

  it("selects a range with shift+click", () => {
    const visible = visibleTaskIds(rows);
    const next = selectTaskClick(
      visible,
      singleTaskSelection("t1"),
      "t3",
      { shiftKey: true, metaKey: false, ctrlKey: false },
      true,
    );
    expect(next.ids).toEqual(["t1", "t2", "t3"]);
    expect(next.anchorId).toBe("t1");
    expect(next.activeId).toBe("t3");
  });

  it("toggles with meta+click", () => {
    const visible = visibleTaskIds(rows);
    const next = selectTaskClick(
      visible,
      singleTaskSelection("t1"),
      "t2",
      { shiftKey: false, metaKey: true, ctrlKey: false },
      true,
    );
    expect(next.ids).toEqual(["t1", "t2"]);
  });

  it("does not toggle with ctrl+click on Mac", () => {
    const visible = visibleTaskIds(rows);
    const next = selectTaskClick(
      visible,
      singleTaskSelection("t1"),
      "t2",
      { shiftKey: false, metaKey: false, ctrlKey: true },
      true,
    );
    expect(next.ids).toEqual(["t2"]);
  });

  it("shrinks range when extending back with shift+arrow", () => {
    const extended = extendSelectionByArrow(rows, singleTaskSelection("t1"), "next");
    const shrunk = extendSelectionByArrow(rows, extended, "prev");
    expect(shrunk.ids).toEqual(["t1"]);
  });

  it("extends selection with shift+arrow", () => {
    const state = singleTaskSelection("t1");
    const next = extendSelectionByArrow(rows, state, "next");
    expect(next.ids).toEqual(["t1", "t2"]);
    const again = extendSelectionByArrow(rows, next, "next");
    expect(again.ids).toEqual(["t1", "t2", "t3"]);
  });

  it("moves single selection with arrow", () => {
    const next = moveSelectionByArrow(rows, singleTaskSelection("t1"), "next");
    expect(next.ids).toEqual(["t2"]);
  });

  it("ranges between visible ids", () => {
    expect(rangeBetweenVisible(["t1", "t2", "t3"], "t3", "t1")).toEqual([
      "t1",
      "t2",
      "t3",
    ]);
  });
});
