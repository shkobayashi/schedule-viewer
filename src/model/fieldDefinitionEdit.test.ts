import { describe, expect, it } from "vitest";
import levels2Sample from "../../examples/hierarchy/levels-2.schedule.json";
import { validateSchedule } from "./validateSchedule";
import {
  applyFieldDefinitionEditorCommit,
  cloneFieldDefinitionDrafts,
  draftToFieldDef,
  draftsToFieldDefinitions,
  fieldDefinitionCloseIssues,
  fieldDefinitionCloseSummary,
  fieldDefinitionRequiredSavePreview,
  fieldDraftsFromFields,
  fieldNamesWithDroppedValues,
  moveFieldDefinitionDraft,
  newFieldDefinitionDraft,
  defaultFieldValuesForNewTask,
  countTasksWithFieldValue,
} from "./fieldDefinitionEdit";
import { collectTasksFromDocument } from "./hierarchy";
import type { ScheduleDocument, ScheduleFieldDef, Task } from "./types";
import { SCHEDULE_SCHEMA_VERSION } from "./types";

const fieldDefs: ScheduleFieldDef[] = [
  { key: "memo", name: "メモ", type: "text" },
  { key: "score", name: "点数", type: "number" },
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

function categoriesDoc(task: Task): ScheduleDocument {
  return {
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
            tasks: [task],
          },
        ],
      },
    ],
  };
}

function outlineDoc(taskPatch: (task: Task) => Task): ScheduleDocument {
  const cloned = JSON.parse(JSON.stringify(levels2Sample)) as ScheduleDocument;
  cloned.schemaVersion = SCHEDULE_SCHEMA_VERSION;
  cloned.categories = [];
  const taskId = "e2000001-0000-4000-8000-000000000001";
  const walk = (nodes: ScheduleDocument["outline"]): void => {
    if (nodes == null) return;
    for (const node of nodes) {
      if ("start" in node && "end" in node && node.id === taskId) {
        Object.assign(node, taskPatch(node));
        return;
      }
      if ("children" in node) walk(node.children);
    }
  };
  walk(cloned.outline);
  return cloned;
}

describe("fieldDefinitionEdit", () => {
  it("assigns field-N keys on add and keeps key when name changes", () => {
    const first = newFieldDefinitionDraft([]);
    expect(first.key).toBe("field-1");
    const second = newFieldDefinitionDraft([first]);
    expect(second.key).toBe("field-2");
    const renamed = { ...first, name: "ラベル" };
    expect(draftToFieldDef(renamed).key).toBe("field-1");
  });

  it("drops removed key values from categories and outline", () => {
    const task = baseTask({
      fieldValues: { memo: "a", score: 1, lane: "内製" },
    });
    const doc = categoriesDoc(task);
    const opening = fieldDraftsFromFields(fieldDefs);
    const closing = opening.filter((d) => d.key !== "memo");
    const next = applyFieldDefinitionEditorCommit(doc, opening, closing);
    const saved = collectTasksFromDocument(next)[0];
    expect(saved?.fieldValues?.memo).toBeUndefined();
    expect(saved?.fieldValues?.score).toBe(1);

    const outline = outlineDoc((t) => ({
      ...t,
      fieldValues: { memo: "x", lane: "外注" },
    }));
    const nextOutline = applyFieldDefinitionEditorCommit(
      outline,
      opening,
      closing,
    );
    const outlineTask = collectTasksFromDocument(nextOutline)[0];
    expect(outlineTask?.fieldValues?.memo).toBeUndefined();
    expect(outlineTask?.fieldValues?.lane).toBe("外注");
  });

  it("renames choice values and swaps A and B", () => {
    const task = baseTask({ fieldValues: { lane: "内製" } });
    const doc = categoriesDoc(task);
    const opening = fieldDraftsFromFields(fieldDefs);
    const closing = cloneFieldDefinitionDrafts(opening);
    const lane = closing.find((d) => d.key === "lane")!;
    lane.choiceRows[0] = { ...lane.choiceRows[0], value: "社内" };
    let next = applyFieldDefinitionEditorCommit(doc, opening, closing);
    expect(collectTasksFromDocument(next)[0]?.fieldValues?.lane).toBe("社内");

    const taskB = baseTask({ fieldValues: { lane: "外注" } });
    const docB = categoriesDoc(taskB);
    const swapClosing = cloneFieldDefinitionDrafts(opening);
    const laneSwap = swapClosing.find((d) => d.key === "lane")!;
    laneSwap.choiceRows = [
      { rowId: laneSwap.choiceRows[0].rowId, value: "外注" },
      { rowId: laneSwap.choiceRows[1].rowId, value: "内製" },
    ];
    next = applyFieldDefinitionEditorCommit(docB, opening, swapClosing);
    expect(collectTasksFromDocument(next)[0]?.fieldValues?.lane).toBe("内製");
  });

  it("drops values when choice row is removed", () => {
    const task = baseTask({ fieldValues: { lane: "外注" } });
    const doc = categoriesDoc(task);
    const opening = fieldDraftsFromFields(fieldDefs);
    const closing = cloneFieldDefinitionDrafts(opening);
    const lane = closing.find((d) => d.key === "lane")!;
    lane.choiceRows = [lane.choiceRows[0]];
    const next = applyFieldDefinitionEditorCommit(doc, opening, closing);
    expect(collectTasksFromDocument(next)[0]?.fieldValues?.lane).toBeUndefined();
  });

  it("drops values that fail validation after type change", () => {
    const task = baseTask({ fieldValues: { memo: "hello" } });
    const doc = categoriesDoc(task);
    const opening = fieldDraftsFromFields(fieldDefs);
    const closing = cloneFieldDefinitionDrafts(opening);
    const memo = closing.find((d) => d.key === "memo")!;
    memo.type = "number";
    memo.defaultText = "";
    const next = applyFieldDefinitionEditorCommit(doc, opening, closing);
    expect(collectTasksFromDocument(next)[0]?.fieldValues?.memo).toBeUndefined();

    const taskBad = baseTask({ fieldValues: { score: 10 } });
    const closingDate = cloneFieldDefinitionDrafts(opening);
    const scoreDate = closingDate.find((d) => d.key === "score")!;
    scoreDate.type = "date";
    scoreDate.defaultText = "";
    const nextBad = applyFieldDefinitionEditorCommit(
      categoriesDoc(taskBad),
      opening,
      closingDate,
    );
    expect(
      collectTasksFromDocument(nextBad)[0]?.fieldValues?.score,
    ).toBeUndefined();
  });

  it("does not apply defaults to existing tasks", () => {
    const defs: ScheduleFieldDef[] = [
      { key: "memo", name: "メモ", type: "text", default: "既定" },
    ];
    const values = defaultFieldValuesForNewTask(defs);
    expect(values).toEqual({ memo: "既定" });
    const task = baseTask();
    const doc = categoriesDoc(task);
    const opening = fieldDraftsFromFields(defs);
    const closing = cloneFieldDefinitionDrafts(opening);
    const next = applyFieldDefinitionEditorCommit(doc, opening, closing);
    expect(collectTasksFromDocument(next)[0]?.fieldValues).toBeUndefined();
  });

  it("allows required with empty task values", () => {
    const defs: ScheduleFieldDef[] = [
      { key: "memo", name: "メモ", type: "text", required: true },
    ];
    const doc = categoriesDoc(baseTask());
    const opening = fieldDraftsFromFields(defs);
    const closing = cloneFieldDefinitionDrafts(opening);
    const next = applyFieldDefinitionEditorCommit(doc, opening, closing);
    expect(validateSchedule(next).ok).toBe(true);
  });

  it("warns when closing would leave required values empty", () => {
    const defs: ScheduleFieldDef[] = [
      { key: "memo", name: "メモ", type: "text" },
    ];
    const doc = categoriesDoc(baseTask());
    const opening = fieldDraftsFromFields(defs);
    const closing = cloneFieldDefinitionDrafts(opening);
    closing[0] = { ...closing[0], required: true };
    expect(
      fieldDefinitionRequiredSavePreview(doc, opening, closing),
    ).toBe("必須の「メモ」が空のタスクがあるので、保存できません。");
  });

  it("omits empty meaning instruction and required false", () => {
    const draft = newFieldDefinitionDraft([]);
    draft.name = "A";
    const def = draftToFieldDef(draft);
    expect(def.meaning).toBeUndefined();
    expect(def.instruction).toBeUndefined();
    expect(def.required).toBeUndefined();
  });

  it("leaves document shape unchanged when closing empty list", () => {
    const doc = categoriesDoc(baseTask());
    const next = applyFieldDefinitionEditorCommit(doc, [], []);
    expect(collectTasksFromDocument(next)[0]?.fieldValues).toBeUndefined();
  });

  it("reports close issues with planned messages", () => {
    const emptyName = newFieldDefinitionDraft([]);
    expect(
      fieldDefinitionCloseSummary(fieldDefinitionCloseIssues([emptyName])),
    ).toBe("名前が空の項目があります。");

    const choice = newFieldDefinitionDraft([]);
    choice.name = "区分";
    choice.type = "choice";
    choice.choiceRows = [];
    expect(
      fieldDefinitionCloseIssues([choice])[0]?.message,
    ).toBe("「区分」の候補がありません。");

    const dup = newFieldDefinitionDraft([]);
    dup.name = "区分";
    dup.type = "choice";
    dup.choiceRows = [
      { rowId: "a", value: "同じ" },
      { rowId: "b", value: "同じ" },
    ];
    expect(fieldDefinitionCloseIssues([dup])[0]?.message).toBe(
      "「区分」の候補が重複しています。",
    );
  });

  it("counts tasks with field values", () => {
    const doc = categoriesDoc(
      baseTask({ fieldValues: { memo: "a" } }),
    );
    expect(countTasksWithFieldValue(doc, "memo")).toBe(1);
    expect(countTasksWithFieldValue(doc, "score")).toBe(0);
  });

  it("reorders drafts", () => {
    const opening = fieldDraftsFromFields(fieldDefs);
    const moved = moveFieldDefinitionDraft(opening, 0, 1);
    expect(moved[1]?.key).toBe("memo");
    expect(draftsToFieldDefinitions(moved)?.[1]?.key).toBe("memo");
  });

  it("lists field names when values would drop on close", () => {
    const task = baseTask({ fieldValues: { score: 5 } });
    const doc = categoriesDoc(task);
    const opening = fieldDraftsFromFields(fieldDefs);
    const closing = cloneFieldDefinitionDrafts(opening);
    const score = closing.find((d) => d.key === "score")!;
    score.type = "date";
    const names = fieldNamesWithDroppedValues(doc, opening, closing);
    expect(names).toContain("点数");
  });
});
