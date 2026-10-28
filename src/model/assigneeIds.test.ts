import { describe, expect, it } from "vitest";
import {
  assigneeIdToJson,
  assigneeIdsEqual,
  assigneeIdsFromJson,
  appendAssigneeId,
  formatAssigneeIdsForDiff,
  normalizeAssigneesInDocument,
  validateAssigneeIdsSemantics,
} from "./assigneeIds";
import { validateSchedule } from "./validateSchedule";
import { documentToJsonString } from "./serialize";
import { SCHEDULE_SCHEMA_VERSION, type ScheduleDocument } from "./types";

const memberId = "a1000001-0000-4000-8000-000000000020";

function scheduleWithAssigneeId(assigneeId: unknown) {
  return {
    schemaVersion: 8,
    title: "P",
    milestoneGroups: [],
    milestones: [],
    categories: [
      {
        id: "a1000001-0000-4000-8000-000000000001",
        name: "C",
        groups: [
          {
            id: "a1000001-0000-4000-8000-000000000002",
            name: "G",
            tasks: [
              {
                id: "a1000001-0000-4000-8000-000000000010",
                name: "T",
                start: "2026-01-01",
                end: "2026-01-01",
                assigneeId,
                status: "not-started",
                progress: 0,
                confidence: "committed",
                predecessors: [],
                milestoneId: null,
              },
            ],
          },
        ],
      },
    ],
  };
}

describe("assigneeIdsFromJson", () => {
  it("maps null, string, and array", () => {
    expect(assigneeIdsFromJson(null)).toEqual([]);
    expect(assigneeIdsFromJson("a")).toEqual(["a"]);
    expect(assigneeIdsFromJson(["a"])).toEqual(["a"]);
    expect(assigneeIdsFromJson(["a", "b"])).toEqual(["a", "b"]);
  });
});

describe("assigneeIdToJson", () => {
  it("serializes empty, one, and many", () => {
    expect(assigneeIdToJson([])).toBe(null);
    expect(assigneeIdToJson(["a"])).toBe("a");
    expect(assigneeIdToJson(["a", "b"])).toEqual(["a", "b"]);
  });
});

describe("assigneeIdsEqual", () => {
  it("compares order", () => {
    expect(assigneeIdsEqual(["a", "b"], ["a", "b"])).toBe(true);
    expect(assigneeIdsEqual(["a", "b"], ["b", "a"])).toBe(false);
  });
});

describe("formatAssigneeIdsForDiff", () => {
  it("writes null and comma-separated ids", () => {
    expect(formatAssigneeIdsForDiff([])).toBe("null");
    expect(formatAssigneeIdsForDiff(["a", "b"])).toBe("a, b");
  });
});

describe("validateAssigneeIdsSemantics", () => {
  it("rejects duplicate ids", () => {
    expect(
      validateAssigneeIdsSemantics(["a", "a"], "/categories/0/groups/0/tasks/0")
        ?.message,
    ).toContain("重複");
  });
});

describe("normalizeAssigneesInDocument", () => {
  it("reads legacy assigneeId string on tasks", () => {
    const raw = {
      schemaVersion: SCHEDULE_SCHEMA_VERSION,
      title: "P",
      milestoneGroups: [],
      milestones: [],
      categories: [
        {
          id: "a1000001-0000-4000-8000-000000000001",
          name: "C",
          groups: [
            {
              id: "a1000001-0000-4000-8000-000000000002",
              name: "G",
              tasks: [
                {
                  id: "a1000001-0000-4000-8000-000000000010",
                  name: "T",
                  start: "2026-01-01",
                  end: "2026-01-01",
                  assigneeId: "a1000001-0000-4000-8000-000000000020",
                  status: "not-started",
                  progress: 0,
                  confidence: "committed",
                  predecessors: [],
                  milestoneId: null,
                },
              ],
            },
          ],
        },
      ],
    } as unknown as ScheduleDocument;
    const doc = normalizeAssigneesInDocument(raw);
    expect(doc.categories[0]!.groups[0]!.tasks[0]!.assigneeIds).toEqual([
      "a1000001-0000-4000-8000-000000000020",
    ]);
  });
});

describe("validateSchedule assigneeId json", () => {
  it("keeps one person as assigneeId string in canonical json", () => {
    const parsed = validateSchedule(scheduleWithAssigneeId(memberId));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.document.categories[0]!.groups[0]!.tasks[0]!.assigneeIds).toEqual([
      memberId,
    ]);
    const json = documentToJsonString(parsed.document);
    expect(json).toContain(`"assigneeId": "${memberId}"`);
    expect(json).not.toMatch(/"assigneeId":\s*\[/);
  });

  it("accepts a one-element assigneeId array", () => {
    const parsed = validateSchedule(scheduleWithAssigneeId([memberId]));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.document.categories[0]!.groups[0]!.tasks[0]!.assigneeIds).toEqual([
      memberId,
    ]);
  });

  it("rejects an empty assigneeId array", () => {
    const parsed = validateSchedule(scheduleWithAssigneeId([]));
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.errors.some((e) => e.message.includes("空"))).toBe(true);
  });

  it("rejects duplicate ids in assigneeId array", () => {
    const parsed = validateSchedule(
      scheduleWithAssigneeId([memberId, memberId]),
    );
    expect(parsed.ok).toBe(false);
  });
});

describe("appendAssigneeId", () => {
  it("appends without duplicates", () => {
    expect(appendAssigneeId(["a"], "b")).toEqual(["a", "b"]);
    expect(appendAssigneeId(["a"], "a")).toEqual(["a"]);
  });
});
