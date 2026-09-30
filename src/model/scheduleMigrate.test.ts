import { describe, expect, it } from "vitest";
import { parseScheduleText } from "./scheduleFile";
import { validateSchedule } from "./validateSchedule";
import { HIERARCHY_ID_NAMESPACE, uuidV5 } from "./uuidV5";
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
    milestones: [] as Record<string, unknown>[],
    categories: [
      {
        id: "c1000001-0000-4000-8000-000000000001",
        name: "c",
        groups: [
          { id: "d1000001-0000-4000-8000-000000000001", name: "g", tasks },
        ],
      },
    ],
  };
}

describe("validateSchedule v4", () => {
  it("accepts assigneeId and confidence", () => {
    const result = validateSchedule(
      document(SCHEDULE_SCHEMA_VERSION, [task("committed")]),
    );
    expect(result.ok).toBe(true);
  });

  it("reads a v3 task without confidence as committed and canonicalizes to v5", () => {
    const raw = JSON.stringify(document(3, [task()]));
    const parsed = parseScheduleText(raw);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.document.schemaVersion).toBe(5);
    expect(parsed.document.categories[0]?.groups[0]?.tasks[0]?.confidence).toBe(
      "committed",
    );
    expect(parsed.canonicalJson).toContain('"schemaVersion": 5');
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

  it("reads a milestone without confidence as committed and keeps one already set", () => {
    const raw = document(5, [task("committed")]);
    raw.milestones = [
      { id: "a1000001-0000-4000-8000-000000000001", name: "m", date: "2026-09-01" },
      {
        id: "a1000001-0000-4000-8000-000000000002",
        name: "n",
        date: "2026-09-02",
        confidence: "tentative",
      },
    ];
    const parsed = parseScheduleText(JSON.stringify(raw));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.document.milestones.map((item) => item.confidence)).toEqual([
      "committed",
      "tentative",
    ]);
    expect(parsed.canonicalJson).toContain('"confidence": "committed"');
    expect(parsed.canonicalJson).toContain('"confidence": "tentative"');
    const again = parseScheduleText(parsed.canonicalJson);
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.canonicalJson).toBe(parsed.canonicalJson);
  });

  it("rejects a milestone confidence that is not tentative or committed", () => {
    const raw = document(5, [task("committed")]);
    raw.milestones = [
      {
        id: "a1000001-0000-4000-8000-000000000001",
        name: "m",
        date: "2026-09-01",
        confidence: "maybe",
      },
    ];
    const result = validateSchedule(raw);
    expect(result.ok).toBe(false);
  });

  it("rejects a v4 task without confidence", () => {
    const result = validateSchedule(document(4, [task()]));
    expect(result.ok).toBe(false);
  });

  it("assigns the same hierarchy ids each time a v4 document is opened", () => {
    const raw = {
      schemaVersion: 4,
      title: "t",
      milestones: [{ id: "a1000001-0000-4000-8000-000000000001", name: "m", date: "2026-09-01" }],
      categories: [
        {
          name: "c",
          groups: [{ name: "g", tasks: [task("committed")] }],
        },
      ],
    };
    const first = parseScheduleText(JSON.stringify(raw));
    const second = parseScheduleText(JSON.stringify(raw));
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.canonicalJson).toBe(second.canonicalJson);
    expect(first.document.categories[0]?.id).toBe(
      uuidV5(HIERARCHY_ID_NAMESPACE, "category\0c"),
    );
    expect(first.document.categories[0]?.groups[0]?.id).toBe(
      uuidV5(HIERARCHY_ID_NAMESPACE, "group\0c\0g"),
    );
    const opened = parseScheduleText(first.canonicalJson);
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    expect(opened.canonicalJson).toBe(first.canonicalJson);
  });

  it("picks another hierarchy id when the name-derived id is already used", () => {
    const taken = uuidV5(HIERARCHY_ID_NAMESPACE, "category\0c");
    const item = task("committed");
    item.id = taken;
    const result = validateSchedule({
      schemaVersion: 4,
      title: "t",
      milestones: [],
      categories: [{ name: "c", groups: [{ name: "g", tasks: [item] }] }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.categories[0]?.id).not.toBe(taken);
    expect(result.document.categories[0]?.id).toBe(
      uuidV5(HIERARCHY_ID_NAMESPACE, "category\0c\u00002"),
    );
  });

  it("rejects a category id that duplicates a milestone id", () => {
    const id = "a1000001-0000-4000-8000-000000000009";
    const result = validateSchedule({
      schemaVersion: 5,
      title: "t",
      milestones: [{ id, name: "m", date: "2026-09-01" }],
      categories: [
        {
          id,
          name: "c",
          groups: [
            {
              id: "d1000001-0000-4000-8000-000000000009",
              name: "g",
              tasks: [task("committed")],
            },
          ],
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((issue) => issue.message.includes("カテゴリ ID"))).toBe(
      true,
    );
  });

  it("rejects a group id that duplicates its category id", () => {
    const id = "c1000001-0000-4000-8000-000000000009";
    const result = validateSchedule({
      schemaVersion: 5,
      title: "t",
      milestones: [],
      categories: [
        {
          id,
          name: "c",
          groups: [{ id, name: "g", tasks: [task("committed")] }],
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(
      result.errors.some(
        (issue) => issue.message === "グループ ID がカテゴリ ID と重複しています",
      ),
    ).toBe(true);
  });

  it("rejects a category id that duplicates a task id", () => {
    const shared = "b1000001-0000-4000-8000-000000000009";
    const first = task("committed");
    first.id = shared;
    const result = validateSchedule({
      schemaVersion: 5,
      title: "t",
      milestones: [],
      categories: [
        {
          id: "c1000001-0000-4000-8000-000000000001",
          name: "c",
          groups: [
            {
              id: "d1000001-0000-4000-8000-000000000001",
              name: "g",
              tasks: [first],
            },
          ],
        },
        {
          id: shared,
          name: "d",
          groups: [
            {
              id: "d1000001-0000-4000-8000-000000000002",
              name: "h",
              tasks: [task("committed")],
            },
          ],
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(
      result.errors.some(
        (issue) => issue.message === "カテゴリ ID がタスク ID と重複しています",
      ),
    ).toBe(true);
  });
});
