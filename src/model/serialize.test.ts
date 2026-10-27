import { describe, expect, it } from "vitest";
import { documentToJsonString, scheduleToJson } from "./serialize";
import { sampleScheduleDocument } from "../sample/schedule";
import type { Category, ScheduleFieldDef } from "./types";
import { SCHEDULE_SCHEMA_VERSION } from "./types";

const fieldDefs: ScheduleFieldDef[] = [
  { key: "memo", name: "メモ", type: "text" },
  { key: "score", name: "点数", type: "number" },
];

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

  it("writes todos after milestoneId and before tags", () => {
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
                progress: 50,
                confidence: "committed",
                predecessors: [],
                milestoneId: null,
                todos: [{ text: "a", done: false }],
                tags: ["b"],
              },
            ],
          },
        ],
      },
    ];
    const task = scheduleToJson("P", categories, [], []).categories[0].groups[0]
      .tasks[0];
    const keys = Object.keys(task);
    expect(keys.indexOf("todos")).toBe(keys.indexOf("milestoneId") + 1);
    expect(keys.indexOf("tags")).toBe(keys.indexOf("todos") + 1);
    expect(task.progress).toBe(0);
  });

  it("writes tags after milestoneId and before note", () => {
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
                tags: ["  a  ", "a", "b"],
                note: "n",
              },
            ],
          },
        ],
      },
    ];
    const task = scheduleToJson("P", categories, [], []).categories[0].groups[0]
      .tasks[0];
    const keys = Object.keys(task);
    expect(keys.indexOf("tags")).toBe(keys.indexOf("milestoneId") + 1);
    expect(keys.indexOf("note")).toBe(keys.indexOf("tags") + 1);
    expect(task.tags).toEqual(["a", "b"]);
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

describe("scheduleToJson fields", () => {
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
              tags: ["x"],
              fieldValues: { score: 1, memo: "a" },
              note: "n",
            },
          ],
        },
      ],
    },
  ];

  it("does not write fields on the schedule document", () => {
    const json = documentToJsonString(
      scheduleToJson("P", categories, [], [], null, null, fieldDefs),
    );
    const parsed = JSON.parse(json) as Record<string, unknown>;
    expect(parsed).not.toHaveProperty("fields");
    const keys = Object.keys(parsed);
    expect(keys.indexOf("categories")).toBe(keys.indexOf("milestones") + 1);
  });

  it("orders task fieldValues after tags and before note in fields key order", () => {
    const json = documentToJsonString(
      scheduleToJson("P", categories, [], [], null, null, fieldDefs),
    );
    const task = (
      JSON.parse(json) as {
        categories: { groups: { tasks: Record<string, unknown>[] }[] }[];
      }
    ).categories[0].groups[0].tasks[0];
    const keys = Object.keys(task);
    expect(keys.indexOf("fieldValues")).toBe(keys.indexOf("tags") + 1);
    expect(keys.indexOf("note")).toBe(keys.indexOf("fieldValues") + 1);
    expect(Object.keys(task.fieldValues as object)).toEqual(["memo", "score"]);
  });

  it("omits fields when definitions are absent", () => {
    const sample = sampleScheduleDocument();
    const json = documentToJsonString(sample);
    const parsed = JSON.parse(json) as Record<string, unknown>;
    expect(parsed).not.toHaveProperty("fields");
    const task = (
      (parsed.categories as { groups: { tasks: Record<string, unknown>[] }[] }[])[0]
        .groups[0].tasks[0]
    );
    expect(task).not.toHaveProperty("fieldValues");
  });
});
