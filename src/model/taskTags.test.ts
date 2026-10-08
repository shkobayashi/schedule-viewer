import { describe, expect, it } from "vitest";
import { migrateScheduleV6ToV7 } from "./scheduleMigrate";
import { validateScheduleSemantics } from "./scheduleSemantics";
import {
  collectTagsInDocumentOrder,
  formatTaskTagsForDiff,
  normalizeTaskTags,
} from "./taskTags";
import { SCHEDULE_SCHEMA_VERSION, type Category, type ScheduleDocument, type Task } from "./types";

function task(tags?: string[]): Task {
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
    tags,
  };
}

function document(tags?: string[]): ScheduleDocument {
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
            tasks: [task(tags)],
          },
        ],
      },
    ],
  };
}

describe("normalizeTaskTags", () => {
  it("trims, dedupes, and omits empty", () => {
    expect(normalizeTaskTags(["  a ", "a", "", "b"])).toEqual(["a", "b"]);
    expect(normalizeTaskTags([])).toBeUndefined();
    expect(normalizeTaskTags(["   "])).toBeUndefined();
  });
});

describe("collectTagsInDocumentOrder", () => {
  it("returns first-seen order across the document", () => {
    const categories: Category[] = [
      {
        id: "c1",
        name: "C",
        groups: [
          {
            id: "g1",
            name: "G",
            tasks: [
              {
                id: "t1",
                name: "T1",
                start: "2026-01-01",
                end: "2026-01-01",
                assigneeId: null,
                status: "not-started",
                progress: 0,
                confidence: "committed",
                predecessors: [],
                milestoneId: null,
                tags: ["b", "a"],
              },
              {
                id: "t2",
                name: "T2",
                start: "2026-01-01",
                end: "2026-01-01",
                assigneeId: null,
                status: "not-started",
                progress: 0,
                confidence: "committed",
                predecessors: [],
                milestoneId: null,
                tags: ["a", "c"],
              },
            ],
          },
        ],
      },
    ];
    expect(collectTagsInDocumentOrder(categories)).toEqual(["b", "a", "c"]);
  });
});

describe("migrateScheduleV6ToV7", () => {
  it("bumps schemaVersion from 6 to 7", () => {
    const result = migrateScheduleV6ToV7({ schemaVersion: 6, title: "t" });
    expect(result).toEqual({ schemaVersion: 7, title: "t" });
  });
});

describe("formatTaskTagsForDiff", () => {
  it("quotes each tag for display", () => {
    expect(formatTaskTagsForDiff(task(["設計, レビュー"]))).toBe(
      '"設計, レビュー"',
    );
    expect(formatTaskTagsForDiff(task(["設計", "レビュー"]))).toBe(
      '"設計", "レビュー"',
    );
    expect(formatTaskTagsForDiff(task())).toBe("（なし）");
  });
});

describe("validateScheduleSemantics tags", () => {
  it("rejects whitespace-only, padded, and duplicate tags", () => {
    expect(validateScheduleSemantics(document(["   "]))).toEqual([
      { path: "/categories/0/groups/0/tasks/0/tags/0", message: "タグは空白にできません" },
    ]);
    expect(validateScheduleSemantics(document(["  a  "]))).toEqual([
      {
        path: "/categories/0/groups/0/tasks/0/tags/0",
        message: "タグの前後に空白は書けません",
      },
    ]);
    expect(validateScheduleSemantics(document(["a", "a"]))).toEqual([
      { path: "/categories/0/groups/0/tasks/0/tags/1", message: "タグが重複しています" },
    ]);
  });

  it("accepts tags that differ only by case", () => {
    expect(validateScheduleSemantics(document(["A", "a"]))).toEqual([]);
  });
});
