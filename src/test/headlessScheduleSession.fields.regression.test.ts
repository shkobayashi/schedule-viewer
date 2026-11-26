import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  parseTaskFieldInput,
  setTaskFieldValueOnCategories,
} from "../model/taskFields";
import { findTaskById } from "../model/rows";
import type { ScheduleFieldDef } from "../model/types";
import { openHeadlessSchedule } from "./headlessScheduleSession";
import { commitDocument } from "./headlessScheduleSessionTestUtil";

const FIELDS_SCHEDULE = `${import.meta.dirname}/../../examples/fields.schedule.json`;
const TASK_WITH_VALUES = "a1000001-0000-4000-8000-000000000003";

const FIELD_DEFS: ScheduleFieldDef[] = [
  { key: "sample_memo", name: "メモ", type: "text" },
  { key: "sample_score", name: "点数", type: "number" },
  { key: "sample_ratio", name: "消化率", type: "number", percent: true },
  { key: "sample_due", name: "確認日", type: "date" },
  { key: "sample_lane", name: "区分", type: "choice", choices: ["内製", "外注"] },
];

describe("headlessScheduleSession fields regression", () => {
  it("parseTaskFieldInput and setTaskFieldValueOnCategories per field defs", async () => {
    const session = openHeadlessSchedule(readFileSync(FIELDS_SCHEDULE, "utf8"));
    const rejected = parseTaskFieldInput(FIELD_DEFS[1]!, "not-a-number");
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) {
      expect(rejected.message).toBe("点数は数値にしてください");
    }

    const parsed = parseTaskFieldInput(FIELD_DEFS[1]!, "42");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const document = session.getDocument();
    const categories = setTaskFieldValueOnCategories(
      document.categories,
      TASK_WITH_VALUES,
      FIELD_DEFS[1]!,
      parsed.value,
    );
    await commitDocument(session, { ...document, categories });
    const task = findTaskById(session.getDocument().categories, TASK_WITH_VALUES);
    expect(task?.fieldValues?.sample_score).toBe(42);
    expect(task?.fieldValues?.sample_memo).toBe("レビュー前");

    const taskWithoutValues = findTaskById(
      session.getDocument().categories,
      "a1000001-0000-4000-8000-000000000004",
    );
    expect(taskWithoutValues?.fieldValues).toBeUndefined();

    const saved = await session.run({ tool: "save" });
    expect(saved.ok).toBe(true);
    expect(saved.savedJson).toContain('"sample_score": 42');
    expect(saved.savedJson).toContain('"schemaVersion": 8');
    expect(saved.savedJson).not.toMatch(/"sample_score": 80/);
    expect(saved.savedJson).toContain('"sample_memo": "レビュー前"');
    const savedDocument = JSON.parse(saved.savedJson) as {
      categories: Array<{
        groups: Array<{
          tasks: Array<{ id: string; fieldValues?: Record<string, unknown> }>;
        }>;
      }>;
    };
    const valueTask = savedDocument.categories
      .flatMap((c) => c.groups.flatMap((g) => g.tasks))
      .find((t) => t.id === TASK_WITH_VALUES);
    expect(valueTask?.fieldValues?.sample_score).toBe(42);
    expect(valueTask?.fieldValues?.sample_memo).toBe("レビュー前");
    const emptyTask = savedDocument.categories
      .flatMap((c) => c.groups.flatMap((g) => g.tasks))
      .find((t) => t.id === "a1000001-0000-4000-8000-000000000004");
    expect(emptyTask?.fieldValues).toBeUndefined();
  });
});
