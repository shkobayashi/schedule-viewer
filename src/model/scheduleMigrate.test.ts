import { describe, expect, it } from "vitest";
import { validateSchedule } from "./validateSchedule";

describe("migrateScheduleToV2", () => {
  it("converts v1 exclusive end to v2 inclusive end", () => {
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
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.schemaVersion).toBe(2);
    expect(result.document.categories[0].groups[0].tasks[0].end).toBe(
      "2026-09-01",
    );
  });
});
