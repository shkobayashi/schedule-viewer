import { describe, expect, it } from "vitest";
import { isExplanationTrialVisibleRow } from "./explainOverlayTrialVisible";
import type { Task, VisibleRow } from "./types";

const task: Task = {
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

describe("explainOverlayTrialVisible", () => {
  it("detects explanation trial task rows", () => {
    const row: VisibleRow = {
      type: "task",
      task,
      y: 0,
      explanationTrial: { patternId: "p1", color: "#ff0000" },
    };
    expect(isExplanationTrialVisibleRow(row)).toBe(true);
    expect(isExplanationTrialVisibleRow({ type: "task", task, y: 0 })).toBe(
      false,
    );
  });
});
