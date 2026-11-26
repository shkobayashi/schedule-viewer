import { describe, expect, it } from "vitest";
import levels2Sample from "../../examples/hierarchy/levels-2.schedule.json";
import { lineageTaskIdsFromTasks } from "./dependencies";
import {
  collectTasksFromDocument,
  findTaskInDocument,
} from "./hierarchy";
import { outlineAfterDuplicate, tryAddPredecessorLinkInOutline } from "./outlineTasks";
import { buildSelectedTasksPayload } from "./screenContext";
import { pruneTaskSelection, singleTaskSelection } from "./taskSelection";
import type { ScheduleDocument } from "./types";
import { SCHEDULE_SCHEMA_VERSION } from "./types";

function outlineDocument(): ScheduleDocument {
  const cloned = JSON.parse(JSON.stringify(levels2Sample)) as ScheduleDocument;
  cloned.schemaVersion = SCHEDULE_SCHEMA_VERSION;
  cloned.categories = [];
  return cloned;
}

describe("hierarchy document task lookups and writes", () => {
  const doc = outlineDocument();
  const taskA = "e2000001-0000-4000-8000-000000000001";
  const taskB = "e2000001-0000-4000-8000-000000000002";
  const taskC = "e2000001-0000-4000-8000-000000000003";
  const taskD = "e2000001-0000-4000-8000-000000000004";

  it("findTaskInDocument opens outline tasks when categories are empty", () => {
    expect(findTaskInDocument(doc.categories, doc.outline, taskA)?.name).toBe(
      "調査A",
    );
  });

  it("collectTasksFromDocument counts outline tasks", () => {
    expect(collectTasksFromDocument(doc).length).toBe(6);
  });

  it("tryAddPredecessorLinkInOutline stores predecessors on outline", () => {
    const linked = tryAddPredecessorLinkInOutline(
      doc.outline!,
      doc.milestones,
      doc.title,
      taskA,
      taskB,
    );
    expect(linked.ok).toBe(true);
    if (!linked.ok) return;
    const successor = findTaskInDocument(doc.categories, linked.outline, taskB);
    expect(successor?.predecessors).toEqual([taskA]);
  });

  it("rejects predecessor link when task id is missing", () => {
    const result = tryAddPredecessorLinkInOutline(
      doc.outline!,
      doc.milestones,
      doc.title,
      "missing-task-id",
      taskB,
    );
    expect(result.ok).toBe(false);
  });

  it("lineage from middle task keeps its predecessors and successors only", () => {
    let outline = doc.outline!;
    const link1 = tryAddPredecessorLinkInOutline(
      outline,
      doc.milestones,
      doc.title,
      taskA,
      taskB,
    );
    const link2 = tryAddPredecessorLinkInOutline(
      link1.ok ? link1.outline : outline,
      doc.milestones,
      doc.title,
      taskB,
      taskC,
    );
    outline = link2.ok ? link2.outline : outline;
    const tasks = collectTasksFromDocument({ ...doc, outline });
    const ids = lineageTaskIdsFromTasks(tasks, taskB);
    expect(ids).toEqual(new Set([taskA, taskB, taskC]));
    expect(ids?.has(taskD)).toBe(false);
  });

  it("outlineAfterDuplicate inserts sibling under same parent", () => {
    const newId = "e2000001-0000-4000-8000-0000000999";
    const result = outlineAfterDuplicate(
      doc.outline!,
      doc.milestones,
      doc.title,
      taskA,
      newId,
      {
        name: "調査Aコピー",
        start: "2026-10-01",
        end: "2026-10-04",
        assigneeIds: [],
        status: "in-progress",
        progress: 0,
        confidence: "committed",
        predecessors: [],
        successors: [],
        milestoneId: null,
        note: "",
      },
      doc.levels!.length,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(findTaskInDocument(doc.categories, result.outline, newId)?.name).toBe(
      "調査Aコピー",
    );
    const tasks = collectTasksFromDocument({ ...doc, outline: result.outline });
    expect(tasks.length).toBe(7);
  });

  it("pruneTaskSelection keeps outline selection when task remains", () => {
    const pruned = pruneTaskSelection(
      doc.categories,
      doc.outline,
      singleTaskSelection(taskA),
    );
    expect(pruned.ids).toEqual([taskA]);
  });

  it("buildSelectedTasksPayload lists outline tasks", () => {
    const payload = buildSelectedTasksPayload({
      categories: doc.categories,
      outline: doc.outline,
      title: doc.title,
      milestoneGroups: doc.milestoneGroups,
      milestones: doc.milestones,
      selectedTaskIds: [taskB, taskA],
      levels: doc.levels,
    });
    expect(payload.selectedTasks.map((t) => t.id)).toEqual([taskA, taskB]);
  });
});
