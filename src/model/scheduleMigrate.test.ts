import { describe, expect, it } from "vitest";
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

describe("validateSchedule v3", () => {
  it("accepts assigneeId", () => {
    const raw = {
      schemaVersion: SCHEDULE_SCHEMA_VERSION,
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
                  assigneeId: "m1",
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
    expect(result.ok).toBe(true);
  });
});
