import { describe, expect, it } from "vitest";
import { validateSchedule } from "./validateSchedule";
import type { OutlineRoot, ScheduleDocument, ScheduleFieldDef } from "./types";
import { SCHEDULE_SCHEMA_VERSION } from "./types";

const fieldDefs: ScheduleFieldDef[] = [
  { key: "memo", name: "メモ", type: "text" },
];

function outlineDoc(taskExtras: Record<string, unknown>): ScheduleDocument {
  const outline: OutlineRoot = [
    {
      id: "a1000001-0000-4000-8000-000000000001",
      name: "H",
      children: [
        {
          id: "a1000001-0000-4000-8000-000000000002",
          name: "T",
          start: "2026-04-01",
          end: "2026-04-03",
          assigneeIds: [],
          status: "not-started",
          progress: 0,
          confidence: "committed",
          predecessors: [],
          milestoneId: null,
          ...taskExtras,
        },
      ],
    },
  ];
  return {
    schemaVersion: SCHEDULE_SCHEMA_VERSION,
    title: "P",
    milestoneGroups: [],
    milestones: [],
    categories: [],
    levels: [{ name: "段", meaning: "見出し" }, { name: "タスク", meaning: "作業" }],
    outline,
  };
}

describe("scheduleSemantics fieldValues on outline", () => {
  it("accepts valid fieldValues on outline-only tasks", () => {
    const doc = outlineDoc({ fieldValues: { memo: "ok" } });
    expect(validateSchedule(doc).ok).toBe(true);
  });

  it("accepts unknown field value keys when the value type is valid", () => {
    const doc = outlineDoc({ fieldValues: { other: "x" } });
    expect(validateSchedule(doc).ok).toBe(true);
  });

  it("rejects unknown field value keys with invalid value types", () => {
    const doc = outlineDoc({
      fieldValues: { other: { nested: true } as unknown as string },
    });
    expect(validateSchedule(doc).ok).toBe(false);
  });

  it("rejects schedule JSON that still has fields", () => {
    const doc = outlineDoc({ fieldValues: { memo: "x" } });
    (doc as ScheduleDocument & { fields: ScheduleFieldDef[] }).fields = fieldDefs;
    expect(validateSchedule(doc).ok).toBe(false);
  });

  it("accepts fieldValues shape without extension definitions in file validation", () => {
    const doc = outlineDoc({ fieldValues: { lane: "外部" } });
    expect(validateSchedule(doc).ok).toBe(true);
  });
});

describe("scheduleSemantics colorId", () => {
  it("rejects blank colorId on outline tasks", () => {
    const doc = outlineDoc({ colorId: "   " });
    const result = validateSchedule(doc);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.path.includes("colorId"))).toBe(true);
  });
});
