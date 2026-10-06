import { describe, expect, it } from "vitest";
import { scheduleToJson } from "./serialize";
import type { Category } from "./types";
import { SCHEDULE_SCHEMA_VERSION } from "./types";

describe("scheduleToJson note", () => {
  it("omits empty note", () => {
    const categories: Category[] = [
      {
        id: "c1000001-0000-4000-8000-000000000001",
        name: "C",
        groups: [
          {
            id: "d1000001-0000-4000-8000-000000000001",
            name: "G",
            tasks: [
              {
                id: "00000000-0000-4000-8000-000000000001",
                name: "T",
                start: "2026-01-01",
                end: "2026-01-01",
                assigneeId: null,
                status: "not-started",
                progress: 0,
                confidence: "committed",
                predecessors: [],
                milestoneId: null,
                note: "  ",
              },
            ],
          },
        ],
      },
    ];
    const doc = scheduleToJson("P", categories, [], []);
    const task = doc.categories[0].groups[0].tasks[0];
    expect(task).not.toHaveProperty("note");
    expect(doc.schemaVersion).toBe(SCHEDULE_SCHEMA_VERSION);
  });

  it("includes trimmed note", () => {
    const categories: Category[] = [
      {
        id: "c1000001-0000-4000-8000-000000000001",
        name: "C",
        groups: [
          {
            id: "d1000001-0000-4000-8000-000000000001",
            name: "G",
            tasks: [
              {
                id: "00000000-0000-4000-8000-000000000001",
                name: "T",
                start: "2026-01-01",
                end: "2026-01-01",
                assigneeId: null,
                status: "not-started",
                progress: 0,
                confidence: "committed",
                predecessors: [],
                milestoneId: null,
                note: "  hello  ",
              },
            ],
          },
        ],
      },
    ];
    const doc = scheduleToJson("P", categories, [], []);
    expect(doc.categories[0].groups[0].tasks[0].note).toBe("hello");
  });

  it("writes confidence after progress", () => {
    const categories: Category[] = [
      {
        id: "c1000001-0000-4000-8000-000000000001",
        name: "C",
        groups: [
          {
            id: "d1000001-0000-4000-8000-000000000001",
            name: "G",
            tasks: [
              {
                id: "00000000-0000-4000-8000-000000000001",
                name: "T",
                start: "2026-01-01",
                end: "2026-01-01",
                assigneeId: null,
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
    ];
    const task = scheduleToJson("P", categories, [], []).categories[0].groups[0]
      .tasks[0];
    const keys = Object.keys(task);
    expect(keys.indexOf("confidence")).toBe(keys.indexOf("progress") + 1);
    expect(task.confidence).toBe("tentative");
  });

  it("writes milestone confidence after date", () => {
    const groupId = "e1000001-0000-4000-8000-000000000001";
    const milestone = scheduleToJson(
      "P",
      [
        {
          id: "c1000001-0000-4000-8000-000000000001",
          name: "C",
          groups: [
            {
              id: "d1000001-0000-4000-8000-000000000001",
              name: "G",
              tasks: [],
            },
          ],
        },
      ],
      [{ id: groupId, name: "G" }],
      [
        {
          id: "a1000001-0000-4000-8000-000000000001",
          name: "要件確定",
          date: "2026-04-01",
          confidence: "tentative",
          groupId,
        },
      ],
    ).milestones[0];
    const keys = Object.keys(milestone);
    expect(keys).toEqual(["id", "name", "date", "confidence", "groupId"]);
    expect(milestone.confidence).toBe("tentative");
  });
});
