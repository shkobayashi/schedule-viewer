import { describe, expect, it } from "vitest";
import { validateScheduleSemantics } from "./scheduleSemantics";
import {
  applyTaskNote,
  hasTaskNote,
  normalizeTaskNote,
} from "./taskNote";
import { SCHEDULE_SCHEMA_VERSION, type ScheduleDocument, type Task } from "./types";

function task(note?: string): Task {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    name: "作業",
    start: "2026-01-01",
    end: "2026-01-02",
    assigneeId: null,
    status: "not-started",
    progress: 0,
    confidence: "committed",
    predecessors: [],
    milestoneId: null,
    note,
  };
}

function document(note?: string): ScheduleDocument {
  return {
    schemaVersion: SCHEDULE_SCHEMA_VERSION,
    title: "予定",
    milestoneGroups: [],
    milestones: [],
    categories: [
      {
        id: "00000000-0000-4000-8000-000000000010",
        name: "カテゴリ",
        groups: [
          {
            id: "00000000-0000-4000-8000-000000000020",
            name: "グループ",
            tasks: [task(note)],
          },
        ],
      },
    ],
  };
}

describe("normalizeTaskNote", () => {
  it("trims and drops blank", () => {
    expect(normalizeTaskNote("  hello  ")).toBe("hello");
    expect(normalizeTaskNote("   ")).toBeUndefined();
    expect(normalizeTaskNote(undefined)).toBeUndefined();
  });
});

describe("hasTaskNote", () => {
  it("reflects normalized content", () => {
    expect(hasTaskNote({ note: "x" })).toBe(true);
    expect(hasTaskNote({ note: "  " })).toBe(false);
    expect(hasTaskNote({})).toBe(false);
  });
});

describe("validateScheduleSemantics note", () => {
  it("rejects a whitespace-only note", () => {
    const issues = validateScheduleSemantics(document("   "));
    expect(issues).toEqual([
      { path: "/categories/0/groups/0/tasks/0/note", message: "ノートは空白にできません" },
    ]);
  });

  it("accepts a note with text", () => {
    expect(validateScheduleSemantics(document(" メモ "))).toEqual([]);
  });
});

describe("applyTaskNote", () => {
  it("sets or removes note", () => {
    expect(applyTaskNote({}, "  note ")).toEqual({ note: "note" });
    expect(applyTaskNote({ note: "old" }, "  ")).toEqual({});
  });
});
