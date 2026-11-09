import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyBulkTaskEdit } from "../model/bulkTaskEdit";
import {
  tryAddConnection,
  removeConnectionByPair,
} from "../model/connections";
import { tryAddPredecessorLink } from "../model/dependencies";
import {
  APPLY_EXPLANATION_PATTERN_NO_OVERLAY,
  APPLY_EXPLANATION_PATTERN_UNKNOWN,
} from "../model/explainOverlayPatterns";
import { milestoneFilterAfterDelete } from "../model/milestones";
import { insertOutlineSiblingAfter } from "../model/outlineCrud";
import { computeVisibleRows, relaxFiltersForNewTask } from "../model/rows";
import {
  pruneContextFromScheduleDocument,
  pruneScheduleFilterViewState,
  type ScheduleFilterViewState,
} from "../model/scheduleFilterPersistence";
import { parseScheduleText } from "../model/scheduleFile";
import { documentToJsonString } from "../model/serialize";
import {
  addTaskTag,
  appendCategoryAtEnd,
  appendGroupToCategory,
  categoriesAfterDuplicate,
  categoriesAfterTaskEdit,
  insertTask,
  removeTaskTag,
  renameCategory,
  renameGroup,
  type TaskEditPatch,
} from "../model/tasks";
import { loadRegressionMembers, readRegressionText } from "./searchErrorKeysFixtures";
import {
  openHeadlessSchedule,
  type HeadlessSchedule,
  type HeadlessStep,
} from "./headlessScheduleSession";
import type { SearchField } from "../model/scheduleFilterPersistence";
import type { ScheduleDocument, ScheduleFilters, ScheduleId, Task } from "../model/types";

const TASK_A = "e1000001-0000-4000-8000-000000000001";
const TASK_B = "e1000001-0000-4000-8000-000000000002";
const TASK_OVERDUE = "e1000001-0000-4000-8000-000000000004";
const GRP_A = "d1000001-0000-4000-8000-000000000001";
const GRP_EMPTY = "d1000001-0000-4000-8000-000000000002";
const CAT_A = "c1000001-0000-4000-8000-000000000001";
const MILESTONE_承認 = "b1000001-0000-4000-8000-000000000001";
const MEMBER_TANAKA = "tanaka";
const MEMBER_SATO = "sato";

function openSmoke(): HeadlessSchedule {
  return openHeadlessSchedule(readRegressionText("smoke.schedule.json"));
}

async function run(
  session: HeadlessSchedule,
  steps: readonly HeadlessStep[],
): Promise<void> {
  for (const step of steps) {
    const result = await session.run(step);
    expect(result.ok, result.message).toBe(true);
  }
}

function parseDoc(json: string): ScheduleDocument {
  const parsed = parseScheduleText(json);
  if (!parsed.ok) throw new Error(parsed.message);
  return parsed.document;
}

function taskById(document: ScheduleDocument, id: ScheduleId): Task {
  for (const category of document.categories) {
    for (const group of category.groups) {
      const task = group.tasks.find((item) => item.id === id);
      if (task != null) return task;
    }
  }
  throw new Error(`task ${id}`);
}

function taskCount(document: ScheduleDocument): number {
  return document.categories.reduce(
    (sum, category) =>
      sum + category.groups.reduce((inner, group) => inner + group.tasks.length, 0),
    0,
  );
}

describe("headlessScheduleSession regression", () => {
  it("restores 調査 note and 設計 predecessor after delete undo and redo", async () => {
    const session = openSmoke();
    const opened = await session.run({ tool: "reload" });
    const savedBaseline = opened.savedJson;

    const deleted = session.deleteTask(TASK_A);
    expect(deleted.ok).toBe(true);
    const afterDelete = parseDoc((await session.run({ tool: "save" })).screenJson);
    expect(taskById(afterDelete, TASK_B).predecessors).toEqual([]);
    expect(taskCount(afterDelete)).toBe(2);

    const undone = await session.run({ tool: "history", action: "undo" });
    const restored = parseDoc(undone.screenJson);
    expect(taskById(restored, TASK_A).note).toBe("回帰確認用のノート");
    expect(taskById(restored, TASK_A).assigneeIds).toEqual([]);
    expect(taskById(restored, TASK_B).predecessors).toEqual([TASK_A]);
    expect(undone.screenJson).toBe(savedBaseline);
    expect(undone.dirty).toBe(true);

    const redone = await session.run({ tool: "history", action: "redo" });
    expect(taskCount(parseDoc(redone.screenJson))).toBe(2);
    const undoneAgain = await session.run({ tool: "history", action: "undo" });
    expect(taskById(parseDoc(undoneAgain.screenJson), TASK_B).predecessors).toEqual([
      TASK_A,
    ]);
  });

  it("restores empty group 後半 after removeGroup and one undo", async () => {
    const session = openSmoke();
    const before = (await session.run({ tool: "reload" })).savedJson;
    await run(session, [{ tool: "removeGroup", groupId: GRP_EMPTY }]);
    const removed = parseDoc((await session.run({ tool: "save" })).screenJson);
    expect(
      removed.categories
        .find((item) => item.id === CAT_A)
        ?.groups.some((group) => group.id === GRP_EMPTY),
    ).toBe(false);
    const undone = await session.run({ tool: "history", action: "undo" });
    const restored = parseDoc(undone.screenJson);
    const group = restored.categories
      .find((item) => item.id === CAT_A)
      ?.groups.find((item) => item.id === GRP_EMPTY);
    expect(group?.name).toBe("後半");
    expect(group?.tasks).toEqual([]);
    expect(undone.screenJson).toBe(before);
    expect(undone.dirty).toBe(true);
  });

  it("undoes assignee add clear and reorder on 調査", async () => {
    const session = openSmoke();
    await run(session, [
      {
        tool: "edit_plan",
        ops: [
          {
            type: "setAssigneeIds",
            taskId: TASK_A,
            assigneeIds: [MEMBER_TANAKA],
          },
        ],
      },
    ]);
    await run(session, [
      {
        tool: "edit_plan",
        ops: [
          {
            type: "setAssigneeIds",
            taskId: TASK_A,
            assigneeIds: [MEMBER_TANAKA, MEMBER_SATO],
          },
        ],
      },
    ]);
    await run(session, [
      {
        tool: "edit_plan",
        ops: [
          {
            type: "setAssigneeIds",
            taskId: TASK_A,
            assigneeIds: [MEMBER_SATO, MEMBER_TANAKA],
          },
        ],
      },
    ]);
    await run(session, [
      {
        tool: "edit_plan",
        ops: [{ type: "setAssigneeIds", taskId: TASK_A, assigneeIds: [] }],
      },
    ]);
    const cleared = taskById(parseDoc((await session.run({ tool: "save" })).screenJson), TASK_A);
    expect(cleared.assigneeIds).toEqual([]);
    let lastJson = "";
    for (let i = 0; i < 4; i += 1) {
      const undone = await session.run({ tool: "history", action: "undo" });
      expect(undone.ok).toBe(true);
      lastJson = undone.screenJson;
    }
    expect(taskById(parseDoc(lastJson), TASK_A).assigneeIds).toEqual([]);
  });

  it("replaces both assignee lists and one undo restores 調査 and 設計", async () => {
    const session = openSmoke();
    const document = session.getDocument();
    const bulk = applyBulkTaskEdit(
      document.categories,
      document.milestones,
      document.title,
      [TASK_A, TASK_B],
      { assigneeIds: [MEMBER_SATO] },
    );
    expect(bulk.ok).toBe(true);
    if (!bulk.ok) return;
    session.commitProduction({ ...document, categories: bulk.categories });
    expect(taskById(session.getDocument(), TASK_A).assigneeIds).toEqual([MEMBER_SATO]);
    expect(taskById(session.getDocument(), TASK_B).assigneeIds).toEqual([MEMBER_SATO]);
    await session.run({ tool: "history", action: "undo" });
    expect(taskById(session.getDocument(), TASK_A).assigneeIds).toEqual([]);
    expect(taskById(session.getDocument(), TASK_B).assigneeIds).toEqual([]);
  });

  it("rejects insert when end is before start", async () => {
    const session = openSmoke();
    const beforeCount = taskCount(session.getDocument());
    const rejected = await session.run({
      tool: "insertValidatedTask",
      input: {
        name: "不正",
        start: "2026-04-05",
        end: "2026-04-01",
        category: "計画",
        group: "前半",
      },
      taskId: "e1000001-0000-4000-8000-000000000099",
    });
    expect(rejected.ok).toBe(false);
    expect(rejected.message).toBe("終了日は開始日以降にしてください");
    expect(taskCount(session.getDocument())).toBe(beforeCount);
  });

  it("toggles 設計 confidence without moving dates and one undo restores it", async () => {
    const session = openSmoke();
    const before = taskById(session.getDocument(), TASK_B);
    const patch: TaskEditPatch = {
      name: before.name,
      start: before.start,
      end: before.end,
      assigneeIds: [...before.assigneeIds],
      status: before.status,
      progress: before.progress,
      confidence: "committed",
      predecessors: [...before.predecessors],
      successors: [],
      milestoneId: before.milestoneId,
      note: before.note ?? "",
    };
    const edited = categoriesAfterTaskEdit(
      session.getDocument().categories,
      session.getDocument().milestones,
      session.getDocument().title,
      TASK_B,
      patch,
    );
    expect(edited.ok).toBe(true);
    if (!edited.ok) return;
    session.commitProduction({ ...session.getDocument(), categories: edited.categories });
    const after = taskById(session.getDocument(), TASK_B);
    expect(after.confidence).toBe("committed");
    expect(after.start).toBe("2026-04-04");
    expect(after.end).toBe("2026-04-08");
    await session.run({ tool: "history", action: "undo" });
    const restored = taskById(session.getDocument(), TASK_B);
    expect(restored.confidence).toBe("tentative");
    expect(restored.start).toBe("2026-04-04");
    expect(restored.end).toBe("2026-04-08");
  });

  it("adds and removes a tag with undo redo and leaves the file dirty until save", async () => {
    const session = openSmoke();
    const baseline = (await session.run({ tool: "reload" })).savedJson;
    let doc = session.getDocument();
    doc = {
      ...doc,
      categories: addTaskTag(doc.categories, TASK_A, "回帰").categories,
    };
    session.commitProduction(doc);
    expect(taskById(session.getDocument(), TASK_A).tags).toEqual(["回帰"]);
    expect(documentToJsonString(session.getDocument())).not.toBe(baseline);
    doc = {
      ...session.getDocument(),
      categories: removeTaskTag(session.getDocument().categories, TASK_A, "回帰"),
    };
    session.commitProduction(doc);
    const undone = await session.run({ tool: "history", action: "undo" });
    expect(taskById(parseDoc(undone.screenJson), TASK_A).tags).toEqual(["回帰"]);
    const redone = await session.run({ tool: "history", action: "redo" });
    expect(taskById(parseDoc(redone.screenJson), TASK_A).tags ?? []).toEqual([]);
    expect(redone.dirty).toBe(false);
    expect(redone.screenJson).toBe(baseline);
    expect(redone.savedJson).toBe(baseline);
  });

  it("rejects edit_plan while the detail panel is editing", async () => {
    const session = openSmoke();
    const before = (await session.run({ tool: "reload" })).savedJson;
    await session.run({ tool: "setDetailPanelEditing", detailPanelEditing: true });
    const blocked = await session.run({
      tool: "edit_plan",
      ops: [
        {
          type: "setTaskDates",
          taskId: TASK_A,
          start: "2026-04-02",
          end: "2026-04-04",
        },
      ],
    });
    expect(blocked.ok).toBe(false);
    expect(blocked.screenJson).toBe(before);
    await session.run({ tool: "setDetailPanelEditing", detailPanelEditing: false });
  });

  it("clears milestone filter when 承認 is missing from reopened document", () => {
    const smoke = parseDoc(readRegressionText("smoke.schedule.json"));
    const view: ScheduleFilterViewState = {
      filters: {
        assignee: "all",
        status: "all",
        confidence: "all",
        overdue: "all",
        relation: "all",
        milestone: MILESTONE_承認,
        tags: [],
        search: "",
        noteSearch: "",
        fieldFilters: {},
      },
      searchField: "name" as SearchField,
      hiddenMilestoneGroupIds: [],
      hiddenMilestoneIds: [],
      collapsedCategoryIds: [],
      collapsedGroupIds: [],
    };
    const deletedDoc = {
      ...smoke,
      milestones: smoke.milestones.filter((item) => item.id !== MILESTONE_承認),
    };
    const ctx = pruneContextFromScheduleDocument(deletedDoc, new Set(), []);
    const pruned = pruneScheduleFilterViewState(
      {
        filters: view.filters,
        searchField: view.searchField,
        hiddenMilestoneGroupIds: view.hiddenMilestoneGroupIds,
        hiddenMilestoneIds: view.hiddenMilestoneIds,
        collapsedCategoryIds: view.collapsedCategoryIds,
        collapsedGroupIds: view.collapsedGroupIds,
      },
      ctx,
      { pruneAssignee: true, pruneFieldFilters: true },
    );
    expect(pruned.filters.milestone).toBe("all");
  });

  it("resets milestone filter to all when 承認 is deleted and undo does not restore the filter", async () => {
    const session = openSmoke();
    let milestoneFilter = MILESTONE_承認;
    await run(session, [{ tool: "deleteMilestone", milestoneId: MILESTONE_承認 }]);
    milestoneFilter = milestoneFilterAfterDelete(milestoneFilter, MILESTONE_承認);
    expect(milestoneFilter).toBe("all");
    await session.run({ tool: "history", action: "undo" });
    expect(milestoneFilter).toBe("all");
    expect(
      session.getDocument().milestones.some((item) => item.id === MILESTONE_承認),
    ).toBe(true);
  });

  it("undo restores 計画 name and keeps category id", async () => {
    const session = openSmoke();
    const beforeId = session.getDocument().categories.find((item) => item.name === "計画")?.id;
    const renamed = renameCategory(session.getDocument().categories, beforeId!, "改めた計画");
    expect(renamed.error).toBeNull();
    session.commitProduction({ ...session.getDocument(), categories: renamed.categories! });
    await session.run({ tool: "history", action: "undo" });
    const category = session.getDocument().categories.find((item) => item.id === beforeId);
    expect(category?.name).toBe("計画");
  });

  it("undo removes a category added under 計画 and its default グループ", async () => {
    const session = openSmoke();
    const newCat = "c1000001-0000-4000-8000-000000000099";
    const newGrp = "d1000001-0000-4000-8000-000000000099";
    await run(session, [
      {
        tool: "addCategory",
        afterCategoryId: CAT_A,
        name: "新しい分類",
        categoryId: newCat,
        groupId: newGrp,
      },
    ]);
    const added = session.getDocument();
    const defaultGroup = added.categories
      .find((item) => item.id === newCat)
      ?.groups.find((item) => item.id === newGrp);
    expect(defaultGroup?.name).toBe("グループ");
    await session.run({ tool: "history", action: "undo" });
    expect(session.getDocument().categories.some((item) => item.id === newCat)).toBe(false);
    await session.run({ tool: "save" });
    expect(session.getDocument().levels).toBeUndefined();
    expect(session.getDocument().outline).toBeUndefined();
  });

  it("saves outline heading 回帰の見出し and undo removes it", async () => {
    const session = openHeadlessSchedule(
      readFileSync(
        `${import.meta.dirname}/../../examples/hierarchy/levels-2.schedule.json`,
        "utf8",
      ),
    );
    const document = session.getDocument();
    const levels = document.levels ?? [];
    const outline = document.outline ?? [];
    const top = outline[0]?.id;
    if (top == null) throw new Error("missing outline");
    let n = 0;
    const allocateId = () => `new-${++n}`;
    const result = insertOutlineSiblingAfter(
      outline,
      top,
      levels.length,
      levels,
      "回帰の見出し",
      "branch-new",
      allocateId,
    );
    expect(result.error).toBeNull();
    session.commitProduction({ ...document, outline: result.outline });
    expect(session.getDocument().outline?.some((item) => item.name === "回帰の見出し")).toBe(
      true,
    );
    await session.run({ tool: "history", action: "undo" });
    expect(session.getDocument().outline?.some((item) => item.name === "回帰の見出し")).toBe(
      false,
    );
  });

  it("adds unassigned tentative task and relaxes the done filter", async () => {
    const session = openSmoke();
    const members = loadRegressionMembers();
    const memberMap = new Map(members.map((item) => [item.id, item]));
    const statuses = [] as const;
    const filtersDone: ScheduleFilters = {
      assignee: "all",
      status: "done",
      confidence: "all",
      overdue: "all",
      relation: "all",
      milestone: "all",
      tags: [],
      search: "",
      noteSearch: "",
      fieldFilters: {},
    };
    const task: Task = {
      id: "e1000001-0000-4000-8000-000000000099",
      name: "追加分",
      start: "2026-04-01",
      end: "2026-04-01",
      assigneeIds: [],
      status: "not-started",
      progress: 0,
      confidence: "tentative",
      predecessors: [],
      milestoneId: null,
    };
    session.commitProduction({
      ...session.getDocument(),
      categories: insertTask(session.getDocument().categories, task, {
        category: "計画",
        group: "前半",
      }),
    });
    const relaxed = relaxFiltersForNewTask(
      filtersDone,
      task,
      "2026-04-01",
      memberMap,
      undefined,
      statuses,
      [],
    );
    expect(relaxed.status).toBe("all");
    expect(taskById(session.getDocument(), task.id).assigneeIds).toEqual([]);
    expect(taskById(session.getDocument(), task.id).confidence).toBe("tentative");
  });

  it("adds one predecessor and undo leaves link mode data unchanged", async () => {
    const session = openSmoke();
    const link = tryAddPredecessorLink(
      session.getDocument().categories,
      TASK_B,
      TASK_OVERDUE,
    );
    expect(link.ok).toBe(true);
    if (!link.ok) return;
    session.commitProduction({ ...session.getDocument(), categories: link.categories });
    expect(taskById(session.getDocument(), TASK_OVERDUE).predecessors).toContain(TASK_B);
    await session.run({ tool: "history", action: "undo" });
    expect(taskById(session.getDocument(), TASK_OVERDUE).predecessors).toEqual([]);
  });

  it("adopts one explanation pattern through MCP dispatch", async () => {
    const session = openSmoke();
    const pattern = {
      id: "trial-1",
      name: "試し",
      color: "#3366cc",
      tasks: [
        {
          id: "trial-task-1",
          name: "試し作業",
          start: "2026-04-05",
          end: "2026-04-06",
          afterTaskId: TASK_A,
        },
      ],
      changes: [],
    };
    await run(session, [
      {
        tool: "explain_overlay",
        envelope: { translucent: true, patterns: [pattern] },
      },
    ]);
    await run(session, [{ tool: "apply_explanation_pattern", patternId: "trial-1" }]);
    expect(
      session
        .getDocument()
        .categories.flatMap((c) => c.groups.flatMap((g) => g.tasks))
        .some((t) => t.id === "trial-task-1"),
    ).toBe(true);
    await session.run({ tool: "history", action: "undo" });
    expect(
      session
        .getDocument()
        .categories.flatMap((c) => c.groups.flatMap((g) => g.tasks))
        .some((t) => t.id === "trial-task-1"),
    ).toBe(false);
  });

  it("rejects apply_explanation_pattern without overlay or with unknown id", async () => {
    const session = openSmoke();
    await session.run({ tool: "reload" });
    const missingId = await session.run({
      tool: "apply_explanation_pattern",
      patternId: "",
    });
    expect(missingId.ok).toBe(false);
    expect(missingId.message).toContain("patternId");
    const noOverlay = await session.run({
      tool: "apply_explanation_pattern",
      patternId: "missing",
    });
    expect(noOverlay.ok).toBe(false);
    expect(noOverlay.message).toBe(APPLY_EXPLANATION_PATTERN_NO_OVERLAY);
    await run(session, [
      {
        tool: "explain_overlay",
        envelope: {
          translucent: true,
          patterns: [
            {
              id: "listed-only",
              name: "一覧のみ",
              color: "#3366cc",
              tasks: [],
              changes: [],
            },
          ],
        },
      },
    ]);
    const unknown = await session.run({
      tool: "apply_explanation_pattern",
      patternId: "nope",
    });
    expect(unknown.ok).toBe(false);
    expect(unknown.message).toBe(APPLY_EXPLANATION_PATTERN_UNKNOWN);
  });

  it("keeps group id when renaming 前半 and undo restores the name", async () => {
    const session = openSmoke();
    const groupId = GRP_A;
    const renamed = renameGroup(session.getDocument().categories, groupId, "改めた前半");
    expect(renamed.error).toBeNull();
    session.commitProduction({ ...session.getDocument(), categories: renamed.categories! });
    await session.run({ tool: "history", action: "undo" });
    const group = session
      .getDocument()
      .categories.find((item) => item.id === CAT_A)
      ?.groups.find((item) => item.id === groupId);
    expect(group?.name).toBe("前半");
    expect(group?.id).toBe(groupId);
  });

  it("appends category and default group at document end then undo removes both", async () => {
    const session = openSmoke();
    const catId = "c1000001-0000-4000-8000-000000000088";
    const grpId = "d1000001-0000-4000-8000-000000000088";
    const appended = appendCategoryAtEnd(session.getDocument().categories, "末尾分類", catId, grpId);
    expect(appended.error).toBeNull();
    session.commitProduction({ ...session.getDocument(), categories: appended.categories! });
    expect(
      session
        .getDocument()
        .categories.find((item) => item.id === catId)
        ?.groups.find((item) => item.id === grpId)?.name,
    ).toBe("グループ");
    await session.run({ tool: "history", action: "undo" });
    expect(session.getDocument().categories.some((item) => item.id === catId)).toBe(false);
  });

  it("appends a group under the chosen category and one undo removes it", async () => {
    const session = openSmoke();
    const grpId = "d1000001-0000-4000-8000-000000000077";
    const appended = appendGroupToCategory(
      session.getDocument().categories,
      CAT_A,
      "追加グループ",
      grpId,
    );
    expect(appended.error).toBeNull();
    session.commitProduction({ ...session.getDocument(), categories: appended.categories! });
    const groups = session.getDocument().categories.find((item) => item.id === CAT_A)?.groups;
    expect(groups?.some((item) => item.id === grpId)).toBe(true);
    await session.run({ tool: "history", action: "undo" });
    expect(
      session
        .getDocument()
        .categories.find((item) => item.id === CAT_A)
        ?.groups.some((item) => item.id === grpId),
    ).toBe(false);
  });

  it("duplicates 調査 with edit_plan patch fields and one undo removes the copy", async () => {
    const session = openSmoke();
    await session.run({ tool: "reload" });
    const source = taskById(session.getDocument(), TASK_A);
    const newId = "e1000001-0000-4000-8000-000000000088";
    const patch: TaskEditPatch = {
      name: `${source.name}（複製）`,
      start: source.start,
      end: source.end,
      assigneeIds: [...source.assigneeIds],
      status: source.status,
      progress: source.progress,
      confidence: source.confidence,
      predecessors: [],
      successors: [],
      milestoneId: source.milestoneId,
      note: source.note ?? "",
    };
    const dup = categoriesAfterDuplicate(
      session.getDocument().categories,
      session.getDocument().milestones,
      session.getDocument().title,
      TASK_A,
      newId,
      patch,
    );
    expect(dup.ok).toBe(true);
    if (!dup.ok) return;
    session.commitProduction({ ...session.getDocument(), categories: dup.categories });
    expect(taskCount(session.getDocument())).toBe(4);
    await session.run({ tool: "history", action: "undo" });
    expect(taskCount(session.getDocument())).toBe(3);
  });

  it("adds one connection pair and removeConnectionByPair drops it", () => {
    const added = tryAddConnection(undefined, TASK_A, TASK_B, "回帰");
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    const removed = removeConnectionByPair(added.connections, TASK_A, TASK_B);
    expect(removed).toBeUndefined();
  });

  it("shows only broken predecessor endpoints when relation is broken", () => {
    const pred: Task = {
      id: "00000000-0000-4000-8000-000000000101",
      name: "先行",
      start: "2026-01-05",
      end: "2026-01-10",
      assigneeIds: [],
      status: "not-started",
      progress: 0,
      confidence: "committed",
      predecessors: [],
      milestoneId: null,
    };
    const succ: Task = {
      id: "00000000-0000-4000-8000-000000000102",
      name: "後続",
      start: "2026-01-01",
      end: "2026-01-03",
      assigneeIds: [],
      status: "not-started",
      progress: 0,
      confidence: "committed",
      predecessors: [pred.id],
      milestoneId: null,
    };
    const categories = [
      {
        id: CAT_A,
        name: "計画",
        groups: [
          {
            id: GRP_A,
            name: "前半",
            tasks: [pred, succ],
          },
        ],
      },
    ];
    const filters: ScheduleFilters = {
      assignee: "all",
      status: "all",
      confidence: "all",
      overdue: "all",
      relation: "broken",
      milestone: "all",
      tags: [],
      search: "",
      noteSearch: "",
      fieldFilters: {},
    };
    const rows = computeVisibleRows(
      categories,
      filters,
      new Set(),
      "2026-01-15",
      null,
      undefined,
      null,
      undefined,
      {
        levels: null,
        outline: undefined,
        useLegacyCategoryRows: true,
        levelCount: 0,
      },
    );
    const visibleTaskIds = rows
      .filter((row) => row.type === "task")
      .map((row) => row.task.id);
    expect(visibleTaskIds.sort()).toEqual([pred.id, succ.id].sort());
  });

  it("round-trips assigneeIds through parse and save for unassigned tasks", async () => {
    const session = openSmoke();
    expect(taskById(session.getDocument(), TASK_A).assigneeIds).toEqual([]);
    const saved = await session.run({ tool: "save" });
    expect(taskById(parseDoc(saved.screenJson), TASK_A).assigneeIds).toEqual([]);
  });

  it("changes title only when trimmed text changes and undo restores 回帰確認", async () => {
    const session = openSmoke();
    await run(session, [{ tool: "setTitle", raw: "   " }]);
    expect(session.getDocument().title).toBe("回帰確認");
    await run(session, [{ tool: "setTitle", raw: "回帰確認" }]);
    await run(session, [{ tool: "setTitle", raw: "  改めた回帰  " }]);
    expect(session.getDocument().title).toBe("改めた回帰");
    await session.run({ tool: "history", action: "undo" });
    expect(session.getDocument().title).toBe("回帰確認");
  });
});
