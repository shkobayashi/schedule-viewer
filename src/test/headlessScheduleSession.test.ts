import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseScheduleText } from "../model/scheduleFile";
import {
  fixtureScheduleJson,
  MCP_OPERATION_UI_BUSY,
  openHeadlessSchedule,
  type HeadlessSchedule,
  type HeadlessStep,
  type HeadlessStepResult,
} from "./headlessScheduleSession";
import type { ScheduleDocument, Task } from "../model/types";

const TASK_A = "e1000001-0000-4000-8000-000000000001";
const TASK_B = "e1000001-0000-4000-8000-000000000002";
const TASK_NEW = "e1000001-0000-4000-8000-000000000003";
const CAT_A = "c1000001-0000-4000-8000-000000000001";
const CAT_EMPTY = "c1000001-0000-4000-8000-000000000002";
const GRP_A = "d1000001-0000-4000-8000-000000000001";
const GRP_EMPTY = "d1000001-0000-4000-8000-000000000002";
const MILESTONE = "b1000001-0000-4000-8000-000000000001";
const MILESTONE_GROUP = "a1000001-0000-4000-8000-0000000000aa";

async function run(
  session: HeadlessSchedule,
  steps: readonly HeadlessStep[],
): Promise<HeadlessStepResult> {
  let last: HeadlessStepResult | null = null;
  for (const step of steps) {
    last = await session.run(step);
    expect(last.ok, last.message).toBe(true);
  }
  if (last == null) throw new Error("no steps");
  return last;
}

function tasksIn(json: string): Task[] {
  const parsed = parseScheduleText(json);
  if (!parsed.ok) throw new Error(parsed.message);
  return parsed.document.categories.flatMap((category) =>
    category.groups.flatMap((group) => group.tasks),
  );
}

function taskNamed(json: string, id: string): Task {
  const found = tasksIn(json).find((task) => task.id === id);
  if (found == null) throw new Error(`missing task ${id}`);
  return found;
}

describe("headlessScheduleSession", () => {
  it("shifts two tasks, keeps the file until save, then clears the diff", async () => {
    const session = openHeadlessSchedule(fixtureScheduleJson());
    const shifted = await run(session, [
      {
        tool: "edit_plan",
        ops: [
          {
            type: "setTaskDates",
            taskId: TASK_A,
            start: "2026-04-03",
            end: "2026-04-05",
          },
          {
            type: "setTaskDates",
            taskId: TASK_B,
            start: "2026-04-04",
            end: "2026-04-06",
          },
        ],
      },
    ]);
    expect(shifted.dirty).toBe(true);
    expect(shifted.diffText).toContain("調査");
    expect(shifted.diffText).toContain("設計");
    expect(taskNamed(shifted.savedJson, TASK_A).start).toBe("2026-04-01");
    const saved = await run(session, [{ tool: "save" }]);
    expect(saved.dirty).toBe(false);
    expect(saved.diffText).toContain("差はありません");
    expect(taskNamed(saved.savedJson, TASK_A).start).toBe("2026-04-03");
    expect(taskNamed(saved.savedJson, TASK_B).end).toBe("2026-04-06");
  });

  it("undo and redo restore the exact saved schedule", async () => {
    const session = openHeadlessSchedule(fixtureScheduleJson());
    const saved = await run(session, [
      {
        tool: "edit_plan",
        ops: [
          {
            type: "setTaskDates",
            taskId: TASK_A,
            start: "2026-04-03",
            end: "2026-04-05",
          },
        ],
      },
      { tool: "save" },
    ]);
    const edited = await run(session, [
      {
        tool: "edit_plan",
        ops: [
          {
            type: "setAssigneeIds",
            taskId: TASK_A,
            assigneeIds: ["f1000001-0000-4000-8000-000000000001"],
          },
        ],
      },
    ]);
    expect(edited.dirty).toBe(true);
    const undone = await run(session, [{ tool: "history", action: "undo" }]);
    expect(undone.screenJson).toBe(saved.savedJson);
    expect(undone.dirty).toBe(false);
    const redone = await run(session, [{ tool: "history", action: "redo" }]);
    expect(redone.screenJson).toBe(edited.screenJson);
    expect(taskNamed(redone.screenJson, TASK_A).assigneeIds).toEqual([
      "f1000001-0000-4000-8000-000000000001",
    ]);
  });

  it("adds a task, moves it to the empty group, and saves", async () => {
    const session = openHeadlessSchedule(fixtureScheduleJson());
    const saved = await run(session, [
      {
        tool: "addTask",
        afterTaskId: TASK_A,
        task: {
          id: TASK_NEW,
          name: "追加した作業",
          start: "2026-04-08",
          end: "2026-04-09",
          assigneeIds: [],
          status: "not-started",
          progress: 0,
          confidence: "committed",
          predecessors: [],
          milestoneId: null,
        },
      },
      {
        tool: "edit_plan",
        ops: [
          {
            type: "moveTask",
            taskId: TASK_NEW,
            targetGroupId: GRP_EMPTY,
            insertIndex: 0,
          },
        ],
      },
      { tool: "save" },
    ]);
    const document = JSON.parse(saved.savedJson) as ScheduleDocument;
    const group = document.categories
      .flatMap((category) => category.groups)
      .find((item) => item.id === GRP_EMPTY);
    expect(group?.tasks.map((task) => task.id)).toEqual([TASK_NEW]);
  });

  it("adds and deletes a milestone, then undo restores it", async () => {
    const session = openHeadlessSchedule(fixtureScheduleJson());
    const added = await run(session, [
      {
        tool: "addMilestone",
        milestone: {
          id: MILESTONE,
          name: "承認",
          date: "2026-05-01",
          confidence: "tentative",
          groupId: MILESTONE_GROUP,
        },
      },
      { tool: "save" },
    ]);
    expect(JSON.parse(added.savedJson).milestones).toEqual([
      expect.objectContaining({ id: MILESTONE, name: "承認" }),
    ]);
    const removed = await run(session, [
      { tool: "deleteMilestone", milestoneId: MILESTONE },
    ]);
    expect(JSON.parse(removed.screenJson).milestones).toEqual([]);
    expect(JSON.parse(removed.savedJson).milestones).toHaveLength(1);
    const restored = await run(session, [
      { tool: "history", action: "undo" },
      { tool: "save" },
    ]);
    expect(JSON.parse(restored.savedJson).milestones).toEqual([
      expect.objectContaining({ id: MILESTONE }),
    ]);
    expect(restored.dirty).toBe(false);
  });

  it("deletes an empty category and an empty group, then undo restores both", async () => {
    const session = openHeadlessSchedule(fixtureScheduleJson());
    const deletedCategory = await run(session, [
      { tool: "edit_plan", ops: [{ type: "deleteCategory", categoryId: CAT_EMPTY }] },
    ]);
    const afterCategory = JSON.parse(deletedCategory.screenJson) as ScheduleDocument;
    expect(afterCategory.categories.map((category) => category.id)).toEqual([CAT_A]);
    const restoredCategory = await run(session, [
      { tool: "history", action: "undo" },
    ]);
    expect(restoredCategory.screenJson).toBe(restoredCategory.savedJson);
    expect(
      (JSON.parse(restoredCategory.screenJson) as ScheduleDocument).categories.map(
        (category) => category.id,
      ),
    ).toContain(CAT_EMPTY);

    const deletedGroup = await run(session, [
      { tool: "edit_plan", ops: [{ type: "deleteGroup", groupId: GRP_EMPTY }] },
    ]);
    const groups = (JSON.parse(deletedGroup.screenJson) as ScheduleDocument).categories
      .find((category) => category.id === CAT_A)
      ?.groups.map((group) => group.id);
    expect(groups).toEqual([GRP_A]);
    const restoredGroup = await run(session, [
      { tool: "history", action: "undo" },
      { tool: "save" },
    ]);
    expect(
      (JSON.parse(restoredGroup.savedJson) as ScheduleDocument).categories
        .find((category) => category.id === CAT_A)
        ?.groups.map((group) => group.id),
    ).toEqual([GRP_A, GRP_EMPTY]);
  });

  it("rejects a backwards period, a busy drag, and a filled category without writing", async () => {
    const session = openHeadlessSchedule(fixtureScheduleJson());
    const opened = await session.run({ tool: "reload" });
    const before = opened.savedJson;
    const backwards = await session.run({
      tool: "edit_plan",
      ops: [
        {
          type: "setTaskDates",
          taskId: TASK_A,
          start: "2026-04-10",
          end: "2026-04-01",
        },
      ],
    });
    expect(backwards.ok).toBe(false);
    expect(backwards.message).toContain("終了日は開始日以降");
    expect(backwards.savedJson).toBe(before);
    expect(backwards.screenJson).toBe(before);

    await session.run({ tool: "setDragging", chartBarDragging: true });
    const busy = await session.run({
      tool: "edit_plan",
      ops: [
        {
          type: "setTaskDates",
          taskId: TASK_A,
          start: "2026-04-03",
          end: "2026-04-05",
        },
      ],
    });
    expect(busy.ok).toBe(false);
    expect(busy.message).toBe(MCP_OPERATION_UI_BUSY);
    expect(busy.savedJson).toBe(before);
    expect(busy.screenJson).toBe(before);
    await session.run({ tool: "setDragging", chartBarDragging: false });

    const filled = await session.run({
      tool: "edit_plan",
      ops: [{ type: "deleteCategory", categoryId: CAT_A }],
    });
    expect(filled.ok).toBe(false);
    expect(filled.message).toContain("空でないカテゴリ");
    expect(filled.savedJson).toBe(before);
    expect(readFileSync(session.path, "utf8")).toBe(before);
  });

  it("stays the same after save, reload, and save again", async () => {
    const session = openHeadlessSchedule(fixtureScheduleJson());
    const saved = await run(session, [
      {
        tool: "addCategory",
        afterCategoryId: CAT_A,
        name: "追加入り",
        categoryId: "c1000001-0000-4000-8000-000000000003",
        groupId: "d1000001-0000-4000-8000-000000000004",
      },
      {
        tool: "addGroup",
        afterGroupId: GRP_A,
        name: "途中",
        groupId: "d1000001-0000-4000-8000-000000000005",
      },
      { tool: "save" },
    ]);
    const first = readFileSync(session.path, "utf8");
    expect(first).toBe(saved.savedJson);
    const reloaded = await run(session, [{ tool: "reload" }, { tool: "save" }]);
    expect(readFileSync(session.path, "utf8")).toBe(first);
    expect(reloaded.savedJson).toBe(first);
    expect(reloaded.screenJson).toBe(first);
  });

  it("keeps both explanation filter and overlay after two date changes", async () => {
    const session = openHeadlessSchedule(fixtureScheduleJson());
    const shown = await run(session, [
      {
        tool: "edit_plan",
        ops: [
          {
            type: "setTaskDates",
            taskId: TASK_A,
            start: "2026-04-03",
            end: "2026-04-05",
          },
          {
            type: "setTaskDates",
            taskId: TASK_B,
            start: "2026-04-04",
            end: "2026-04-06",
          },
        ],
      },
      { tool: "explain_view", envelope: { taskIds: [TASK_A, TASK_B] } },
      {
        tool: "explain_overlay",
        envelope: { translucent: true, summary: "2件ずらしました" },
      },
    ]);
    expect(shown.dirty).toBe(true);
    expect(shown.explainView?.taskIds).toEqual(new Set([TASK_A, TASK_B]));
    expect(shown.explainOverlay?.translucent).toBe(true);
    expect(shown.explainOverlay?.summary).toBe("2件ずらしました");
    expect(taskNamed(shown.savedJson, TASK_A).start).toBe("2026-04-01");
  });
});
