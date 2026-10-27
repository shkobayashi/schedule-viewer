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
          assigneeId: null,
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
    fields: fieldDefs,
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

  it("rejects unknown field value keys on outline-only tasks", () => {
    const doc = outlineDoc({ fieldValues: { other: "x" } });
    expect(validateSchedule(doc).ok).toBe(false);
  });

  it("rejects fieldValues when fields are missing", () => {
    const doc = outlineDoc({ fieldValues: { memo: "x" } });
    delete (doc as { fields?: ScheduleFieldDef[] }).fields;
    expect(validateSchedule(doc).ok).toBe(false);
  });
});
