import { describe, expect, it } from "vitest";
import { validateSchedule } from "./validateSchedule";
import validateSchema from "./generated/scheduleValidator.js";
import { documentToJsonString } from "./serialize";
import { sampleScheduleDocument } from "../sample/schedule";
import {
  applyTaskFieldValue,
  normalizeScheduleFieldsForValidation,
  parseTaskFieldInput,
  setTaskFieldValueOnCategories,
} from "./taskFields";
import type { ScheduleDocument, ScheduleFieldDef, Task } from "./types";
import { SCHEDULE_SCHEMA_VERSION } from "./types";
import { categoriesAfterDuplicate, insertTask } from "./tasks";

const fieldDefs: ScheduleFieldDef[] = [
  { key: "memo", name: "メモ", type: "text" },
  { key: "score", name: "点数", type: "number" },
  { key: "ratio", name: "消化率", type: "number", percent: true },
  { key: "due", name: "確認日", type: "date" },
  {
    key: "lane",
    name: "区分",
    type: "choice",
    choices: ["内製", "外注"],
  },
];

function baseTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "a1000001-0000-4000-8000-000000000010",
    name: "T",
    start: "2026-04-01",
    end: "2026-04-03",
    assigneeId: null,
    status: "not-started",
    progress: 0,
    confidence: "committed",
    predecessors: [],
    milestoneId: null,
    ...overrides,
  };
}

function docWithFields(task: Task, extra?: Partial<ScheduleDocument>): ScheduleDocument {
  return {
    schemaVersion: SCHEDULE_SCHEMA_VERSION,
    title: "P",
    milestoneGroups: [],
    milestones: [],
    fields: fieldDefs,
    categories: [
      {
        id: "a1000001-0000-4000-8000-000000000001",
        name: "C",
        groups: [
          {
            id: "a1000001-0000-4000-8000-000000000002",
            name: "G",
            tasks: [task],
          },
        ],
      },
    ],
    ...extra,
  };
}

describe("taskFields", () => {
  it("accepts document without fields and keeps sample shape on save", () => {
    const sample = sampleScheduleDocument();
    const result = validateSchedule(sample);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const json = documentToJsonString(result.document);
    const parsed = JSON.parse(json) as Record<string, unknown>;
    expect(parsed.schemaVersion).toBe(8);
    expect(parsed.fields).toBeUndefined();
    const firstTask = (
      (parsed.categories as { groups: { tasks: Record<string, unknown>[] }[] }[])[0]
        .groups[0].tasks[0]
    );
    expect(firstTask.fieldValues).toBeUndefined();
  });

  it("accepts five field types and empty fieldValues on a task", () => {
    const empty = docWithFields(baseTask());
    expect(validateSchedule(empty).ok).toBe(true);
    const filled = docWithFields(
      baseTask({
        fieldValues: {
          memo: "a",
          score: 1,
          ratio: 40,
          due: "2026-05-01",
          lane: "内製",
        },
      }),
    );
    expect(validateSchedule(filled).ok).toBe(true);
  });

  it("rejects required false percent false and choices on number via schema", () => {
    const requiredFalse = {
      ...docWithFields(baseTask()),
      fields: [{ key: "memo", name: "メモ", type: "text", required: false }],
    };
    expect(validateSchedule(requiredFalse).ok).toBe(false);

    const percentFalse = {
      ...docWithFields(baseTask()),
      fields: [
        { key: "ratio", name: "消化率", type: "number", percent: false },
      ],
    };
    expect(validateSchedule(percentFalse).ok).toBe(false);

    const percentOnText = docWithFields(baseTask(), {
      fields: [{ key: "memo", name: "メモ", type: "text", percent: true }],
    });
    expect(validateSchedule(percentOnText).ok).toBe(false);

    const choicesOnNumber = docWithFields(baseTask(), {
      fields: [
        {
          key: "score",
          name: "点数",
          type: "number",
          choices: ["1"],
        },
      ],
    });
    expect(validateSchedule(choicesOnNumber).ok).toBe(false);
  });

  it("rejects datetime blank text and newline in field values", () => {
    const datetime = docWithFields(
      baseTask({ fieldValues: { due: "2026-05-01T12:00:00" } }),
    );
    expect(validateSchedule(datetime).ok).toBe(false);

    const blankText = docWithFields(
      baseTask({ fieldValues: { memo: "   " } }),
    );
    expect(validateSchedule(blankText).ok).toBe(false);

    const newline = docWithFields(
      baseTask({ fieldValues: { memo: "a\nb" } }),
    );
    expect(validateSchedule(newline).ok).toBe(false);
  });

  it("rejects empty meaning on schema without stripping", () => {
    const raw = {
      schemaVersion: SCHEDULE_SCHEMA_VERSION,
      title: "P",
      milestoneGroups: [],
      milestones: [],
      fields: [{ key: "memo", name: "メモ", type: "text", meaning: "" }],
      categories: [
        {
          id: "a1000001-0000-4000-8000-000000000001",
          name: "C",
          groups: [
            {
              id: "a1000001-0000-4000-8000-000000000002",
              name: "G",
              tasks: [baseTask()],
            },
          ],
        },
      ],
    };
    expect(validateSchema(raw)).toBe(false);
  });

  it("does not apply field default to tasks on load", () => {
    const doc = docWithFields(baseTask(), {
      fields: [{ key: "memo", name: "メモ", type: "text", default: "既定" }],
    });
    const result = validateSchedule(doc);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const task = result.document.categories[0].groups[0].tasks[0];
    expect(task.fieldValues).toBeUndefined();
  });

  it("keeps field values when definition name changes", () => {
    const doc = docWithFields(
      baseTask({ fieldValues: { memo: "keep" } }),
      {
        fields: [{ key: "memo", name: "メモ（改名後）", type: "text" }],
      },
    );
    const result = validateSchedule(doc);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.categories[0].groups[0].tasks[0].fieldValues).toEqual({
      memo: "keep",
    });
  });

  it("new inserted task has no fieldValues", () => {
    const categories = docWithFields(
      baseTask({ fieldValues: { memo: "a" } }),
    ).categories;
    const newId = "a1000001-0000-4000-8000-000000000099";
    const next = insertTask(categories, baseTask({ id: newId }), {
      category: "C",
      group: "G",
    });
    const added = next[0].groups[0].tasks.find((t) => t.id === newId);
    expect(added?.fieldValues).toBeUndefined();
  });

  it("strips empty fieldValues on outline when categories array is present", () => {
    const raw = {
      schemaVersion: SCHEDULE_SCHEMA_VERSION,
      title: "P",
      milestoneGroups: [],
      milestones: [],
      fields: fieldDefs,
      categories: [],
      levels: [
        { name: "段", meaning: "見出し" },
        { name: "タスク", meaning: "作業" },
      ],
      outline: [
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
              fieldValues: {},
            },
          ],
        },
      ],
    };
    const normalized = normalizeScheduleFieldsForValidation(
      raw as Record<string, unknown>,
    );
    const outline = normalized.outline as { children: Record<string, unknown>[] }[];
    const task = outline[0].children[0];
    expect(task.fieldValues).toBeUndefined();
  });

  it("rejects unknown properties empty fields duplicate keys and invalid values", () => {
    const unknownRoot = { ...docWithFields(baseTask()), extra: true };
    expect(validateSchedule(unknownRoot).ok).toBe(false);

    const emptyFields = {
      ...docWithFields(baseTask()),
      fields: [],
    };
    expect(validateSchedule(emptyFields).ok).toBe(false);

    const dupKey = {
      ...docWithFields(baseTask()),
      fields: [
        { key: "a", name: "A", type: "text" },
        { key: "a", name: "B", type: "text" },
      ],
    };
    expect(validateSchedule(dupKey).ok).toBe(false);

    const unknownValueKey = docWithFields(
      baseTask({ fieldValues: { unknown: "x" } }),
    );
    expect(validateSchedule(unknownValueKey).ok).toBe(false);

    const badChoice = docWithFields(
      baseTask({ fieldValues: { lane: "外部" } }),
    );
    expect(validateSchedule(badChoice).ok).toBe(false);

    const badNumber = docWithFields(
      baseTask({ fieldValues: { score: "x" as unknown as number } }),
    );
    expect(validateSchedule(badNumber).ok).toBe(false);
  });

  it("allows required true with missing values and rejects invalid default", () => {
    const required = docWithFields(baseTask(), {
      fields: [{ key: "memo", name: "メモ", type: "text", required: true }],
    });
    expect(validateSchedule(required).ok).toBe(true);

    const badDefault = {
      ...docWithFields(baseTask()),
      fields: [{ key: "score", name: "点数", type: "number", default: "x" }],
    };
    expect(validateSchedule(badDefault).ok).toBe(false);
  });

  it("strips empty meaning before schema validation", () => {
    const raw = {
      ...docWithFields(baseTask()),
      fields: [{ key: "memo", name: "メモ", type: "text", meaning: "  " }],
    };
    const normalized = normalizeScheduleFieldsForValidation(
      raw as Record<string, unknown>,
    );
    expect(validateSchedule(normalized).ok).toBe(true);
  });

  it("updates one key and removes fieldValues when last value cleared", () => {
    const task = baseTask({
      fieldValues: { memo: "a", score: 1 },
    });
    const next = applyTaskFieldValue(task, fieldDefs[1], 2);
    expect(next.fieldValues).toEqual({ memo: "a", score: 2 });
    const cleared = applyTaskFieldValue(next, fieldDefs[0], undefined);
    expect(cleared.fieldValues).toEqual({ score: 2 });
    const last = applyTaskFieldValue(cleared, fieldDefs[1], undefined);
    expect(last.fieldValues).toBeUndefined();
  });

  it("parseTaskFieldInput rejects non-numeric number input", () => {
    const result = parseTaskFieldInput(fieldDefs[1], "abc");
    expect(result.ok).toBe(false);
  });

  it("duplicate copies fieldValues", () => {
    const categories = [
      {
        id: "a1000001-0000-4000-8000-000000000001",
        name: "C",
        groups: [
          {
            id: "a1000001-0000-4000-8000-000000000002",
            name: "G",
            tasks: [
              baseTask({
                id: "a1000001-0000-4000-8000-000000000003",
                fieldValues: { memo: "copy" },
              }),
            ],
          },
        ],
      },
    ];
    const result = categoriesAfterDuplicate(
      categories,
      [],
      "P",
      "a1000001-0000-4000-8000-000000000003",
      "a1000001-0000-4000-8000-000000000099",
      {
        name: "copy",
        start: "2026-04-01",
        end: "2026-04-03",
        assigneeId: null,
        status: "not-started",
        progress: 0,
        confidence: "committed",
        predecessors: [],
        successors: [],
        milestoneId: null,
        note: "",
      },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const copied = result.categories[0].groups[0].tasks.find(
      (t: { id: string }) => t.id === "a1000001-0000-4000-8000-000000000099",
    );
    expect(copied?.fieldValues).toEqual({ memo: "copy" });
  });

  it("setTaskFieldValueOnCategories changes only target key", () => {
    const categories = docWithFields(
      baseTask({ fieldValues: { memo: "a", score: 1 } }),
    ).categories;
    const next = setTaskFieldValueOnCategories(
      categories,
      baseTask().id,
      fieldDefs[1],
      5,
    );
    const task = next[0].groups[0].tasks[0];
    expect(task.fieldValues).toEqual({ memo: "a", score: 5 });
  });
});
