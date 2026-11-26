import { describe, expect, it } from "vitest";
import { appendConnectionScheduleDiff } from "./connectionScheduleDiff";
import { SCHEDULE_SCHEMA_VERSION, type ScheduleDocument } from "./types";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function doc(connections?: ScheduleDocument["connections"]): ScheduleDocument {
  return {
    schemaVersion: SCHEDULE_SCHEMA_VERSION,
    title: "t",
    milestoneGroups: [],
    milestones: [],
    categories: [
      {
        id: "c",
        name: "C",
        groups: [
          {
            id: "g",
            name: "G",
            tasks: [
              {
                id: A,
                name: "Alpha",
                start: "2026-01-01",
                end: "2026-01-02",
                assigneeIds: [],
                status: "not-started",
                progress: 0,
                confidence: "tentative",
                predecessors: [],
                milestoneId: null,
              },
              {
                id: B,
                name: "Beta",
                start: "2026-01-03",
                end: "2026-01-04",
                assigneeIds: [],
                status: "not-started",
                progress: 0,
                confidence: "tentative",
                predecessors: [],
                milestoneId: null,
              },
            ],
          },
        ],
      },
    ],
    connections,
  };
}

describe("appendConnectionScheduleDiff", () => {
  it("reports add, label change, and ignores reversed taskIds order", () => {
    const file = doc([{ taskIds: [A, B], label: "旧" }]);
    const screen = doc([{ taskIds: [B, A], label: "新" }]);
    const names = new Map([
      [A, "Alpha"],
      [B, "Beta"],
    ]);
    const lines: string[] = [];
    appendConnectionScheduleDiff(
      (text) => lines.push(text),
      screen,
      file,
      names,
      names,
      new Set(),
    );
    expect(lines.some((line) => line.startsWith("変更 繋がり"))).toBe(true);
    expect(lines.filter((line) => line.includes("追加 繋がり"))).toHaveLength(0);
  });
});
