import { describe, expect, it } from "vitest";
import { rowFillForColorId, type ColorItem } from "./colorCatalog";
import { paletteFor } from "./palette";
import {
  hierarchyRowBackgroundFill,
  taskRowBackgroundFill,
  visibleRowBackgroundFill,
} from "./taskRowBackground";
import type { Task, VisibleRow } from "./types";

const colors: ColorItem[] = [
  {
    id: "focus",
    name: "注力",
    description: "x",
    color: {
      light: { bg: "#FEF3C7" },
      dark: { bg: "#78350F" },
    },
  },
];

function taskRow(task: Task): Extract<VisibleRow, { type: "task" }> {
  return { type: "task", task, y: 0 };
}

describe("taskRowBackgroundFill", () => {
  it("uses light and dark fills for known id", () => {
    const task: Task = {
      id: "t",
      name: "t",
      start: "2026-01-01",
      end: "2026-01-02",
      assigneeIds: [],
      status: "not-started",
      progress: 0,
      confidence: "committed",
      predecessors: [],
      milestoneId: null,
      colorId: "focus",
    };
    expect(taskRowBackgroundFill(taskRow(task), colors, "light")).toBe("#FEF3C7");
    expect(taskRowBackgroundFill(taskRow(task), colors, "dark")).toBe("#78350F");
  });

  it("returns null without colorId or unknown id", () => {
    const base: Task = {
      id: "t",
      name: "t",
      start: "2026-01-01",
      end: "2026-01-02",
      assigneeIds: [],
      status: "not-started",
      progress: 0,
      confidence: "committed",
      predecessors: [],
      milestoneId: null,
    };
    expect(taskRowBackgroundFill(taskRow(base), colors, "light")).toBe(null);
    expect(
      rowFillForColorId(colors, "missing", "light"),
    ).toBe(null);
  });

  it("does not use color catalog for category rows", () => {
    const { chart } = paletteFor("light");
    const row: Extract<VisibleRow, { type: "category" }> = {
      type: "category",
      y: 0,
      id: "c1",
      label: "見出し",
      collapsed: false,
      summary: null,
      rollupPercent: null,
    };
    expect(visibleRowBackgroundFill(row, colors, "light")).toBe(
      hierarchyRowBackgroundFill(row, "light"),
    );
    expect(visibleRowBackgroundFill(row, colors, "light")).toBe(chart.categoryRow);
  });
});
