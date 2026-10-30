import { describe, expect, it } from "vitest";
import type { BaselineDiffClassification } from "./baselineDiffs";
import {
  appendConnectionBaselineClassification,
  mergeBaselineConnections,
} from "./baselineDiffsConnections";
import { SCHEDULE_SCHEMA_VERSION, type ScheduleDocument, type Task } from "./types";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function t(id: string, name = id): Task {
  return {
    id,
    name,
    start: "2026-01-01",
    end: "2026-01-02",
    assigneeIds: [],
    status: "not-started",
    progress: 0,
    confidence: "tentative",
    predecessors: [],
    milestoneId: null,
  };
}

function doc(
  tasks: Task[],
  connections?: ScheduleDocument["connections"],
): ScheduleDocument {
  return {
    schemaVersion: SCHEDULE_SCHEMA_VERSION,
    title: "t",
    milestoneGroups: [],
    milestones: [],
    categories: [
      {
        id: "c",
        name: "C",
        groups: [{ id: "g", name: "G", tasks }],
      },
    ],
    connections,
  };
}

function conn(a: string, b: string, label: string) {
  return { taskIds: [a, b] as [string, string], label };
}

describe("appendConnectionBaselineClassification", () => {
  it("classifies screen-only removal as 画面のみ", () => {
    const baseline = doc([t(A), t(B)], [conn(A, B, "x")]);
    const screen = doc([t(A), t(B)]);
    const file = doc([t(A), t(B)], [conn(A, B, "x")]);
    const lines: { label: BaselineDiffClassification; headline: string }[] = [];
    appendConnectionBaselineClassification(lines, baseline, screen, file);
    expect(lines.some((line) => line.label === "画面のみ")).toBe(true);
  });

  it("classifies task delete on screen and new connection on file as 追加と削除", () => {
    const baseline = doc([t(A), t(B), t(C)]);
    const screen = doc([t(B), t(C)]);
    const file = doc([t(A), t(B), t(C)], [conn(A, C, "新")]);
    const lines: { label: BaselineDiffClassification; headline: string }[] = [];
    appendConnectionBaselineClassification(lines, baseline, screen, file);
    expect(lines.some((line) => line.label === "追加と削除")).toBe(true);
  });
});

describe("mergeBaselineConnections", () => {
  it("removes a pair when only the screen dropped it", () => {
    const baseline = doc([t(A), t(B)], [conn(A, B, "x")]);
    const screen = doc([t(A), t(B)]);
    const file = doc([t(A), t(B)], [conn(A, B, "x")]);
    expect(mergeBaselineConnections(baseline, screen, file)).toBeUndefined();
  });

  it("keeps both sides' adds when labels match", () => {
    const baseline = doc([t(A), t(B), t(C)]);
    const screen = doc([t(A), t(B), t(C)], [conn(A, B, "s")]);
    const file = doc([t(A), t(B), t(C)], [conn(B, C, "f")]);
    const merged = mergeBaselineConnections(baseline, screen, file);
    expect(merged?.length).toBe(2);
  });

  it("returns undefined when the same pair has different labels", () => {
    const baseline = doc([t(A), t(B)]);
    const screen = doc([t(A), t(B)], [conn(A, B, "画面")]);
    const file = doc([t(A), t(B)], [conn(A, B, "ファイル")]);
    expect(mergeBaselineConnections(baseline, screen, file)).toBeUndefined();
  });

  it("applies one-sided delete in conflict-free merge", () => {
    const baseline = doc([t(A), t(B), t(C)], [conn(A, B, "ab"), conn(B, C, "bc")]);
    const screen = doc([t(A), t(B), t(C)], [conn(B, C, "bc")]);
    const file = doc([t(A), t(B), t(C)], [conn(A, B, "ab"), conn(B, C, "bc")]);
    const merged = mergeBaselineConnections(baseline, screen, file);
    expect(merged?.map((c) => c.label)).toEqual(["bc"]);
  });
});
