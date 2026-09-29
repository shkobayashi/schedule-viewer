import { describe, expect, it } from "vitest";
import { parseScheduleText } from "./scheduleFile";
import { validateSchedule } from "./validateSchedule";
import { SCHEDULE_SCHEMA_VERSION } from "./types";

describe("migrateScheduleToV2", () => {
  it("rejects v1 after date migration because v2 is no longer supported", () => {
    const raw = {
      schemaVersion: 1,
      title: "t",
      milestones: [],
      categories: [
        {
          name: "c",
          groups: [
            {
              name: "g",
              tasks: [
                {
                  id: "b1000001-0000-4000-8000-000000000001",
                  name: "one day",
                  start: "2026-09-01",
                  end: "2026-09-02",
                  assignee: "",
                  status: "not-started",
                  progress: 0,
                  predecessors: [],
                  milestoneId: null,
                },
              ],
            },
          ],
        },
      ],
    };
    const result = validateSchedule(raw);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]?.message).toContain("schemaVersion 2");
  });

  it("rejects v2 documents", () => {
    const raw = {
      schemaVersion: 2,
      title: "t",
      milestones: [],
      categories: [
        {
          name: "c",
          groups: [
            {
              name: "g",
              tasks: [
                {
                  id: "b1000001-0000-4000-8000-000000000001",
                  name: "task",
                  start: "2026-09-01",
                  end: "2026-09-01",
                  assignee: "田中",
                  status: "not-started",
                  progress: 0,
                  predecessors: [],
                  milestoneId: null,
                },
              ],
            },
          ],
        },
      ],
    };
    const result = validateSchedule(raw);
    expect(result.ok).toBe(false);
  });
});

function task(confidence?: string) {
  const base: Record<string, unknown> = {
    id: "b1000001-0000-4000-8000-000000000001",
    name: "task",
    start: "2026-09-01",
    end: "2026-09-01",
    assigneeId: "m1",
    status: "not-started",
    progress: 0,
    predecessors: [],
    milestoneId: null,
  };
  if (confidence !== undefined) base.confidence = confidence;
  return base;
}

function document(schemaVersion: number, tasks: Record<string, unknown>[]) {
  return {
    schemaVersion,
    title: "t",
    milestones: [],
    categories: [{ name: "c", groups: [{ name: "g", tasks }] }],
  };
}

describe("validateSchedule v4", () => {
  it("accepts assigneeId and confidence", () => {
    const result = validateSchedule(
      document(SCHEDULE_SCHEMA_VERSION, [task("committed")]),
    );
    expect(result.ok).toBe(true);
  });

  it("reads a v3 task without confidence as committed and canonicalizes to v4", () => {
    const raw = JSON.stringify(document(3, [task()]));
    const parsed = parseScheduleText(raw);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.document.schemaVersion).toBe(4);
    expect(parsed.document.categories[0]?.groups[0]?.tasks[0]?.confidence).toBe(
      "committed",
    );
    expect(parsed.canonicalJson).toContain('"schemaVersion": 4');
    expect(parsed.canonicalJson).toContain('"confidence": "committed"');
    const again = parseScheduleText(parsed.canonicalJson);
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.canonicalJson).toBe(parsed.canonicalJson);
  });

  it("keeps confidence already present on a v3 task", () => {
    const kept = task("tentative");
    const filled = task();
    filled.id = "b1000001-0000-4000-8000-000000000002";
    filled.name = "other";
    const result = validateSchedule(document(3, [kept, filled]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const tasks = result.document.categories[0]?.groups[0]?.tasks ?? [];
    expect(tasks[0]?.confidence).toBe("tentative");
    expect(tasks[1]?.confidence).toBe("committed");
  });

  it("rejects a v4 task without confidence", () => {
    const result = validateSchedule(document(4, [task()]));
    expect(result.ok).toBe(false);
  });
});
