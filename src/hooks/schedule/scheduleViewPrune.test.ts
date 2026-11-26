import { describe, expect, it } from "vitest";
import type { DocumentSnapshot } from "../../model/history";
import { emptyTaskSelection, singleTaskSelection } from "../../model/taskSelection";
import { pruneSelectionAndLineageForDocument } from "./scheduleViewPrune";

const snapshot: DocumentSnapshot = {
  title: "t",
  categories: [
    {
      id: "cat-1",
      name: "C",
      groups: [
        {
          id: "grp-1",
          name: "G",
          tasks: [
            {
              id: "task-1",
              name: "T1",
              start: "2026-01-01",
              end: "2026-01-02",
              assigneeIds: [],
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
  milestoneGroups: [],
  milestones: [],
};

describe("pruneSelectionAndLineageForDocument", () => {
  it("prunes selection when task is gone", () => {
    const gone: DocumentSnapshot = {
      ...snapshot,
      categories: [
        {
          ...snapshot.categories[0],
          groups: [{ ...snapshot.categories[0].groups[0], tasks: [] }],
        },
      ],
    };
    const result = pruneSelectionAndLineageForDocument(
      gone,
      singleTaskSelection("task-1"),
      null,
    );
    expect(result.taskSelection.ids).toEqual([]);
    expect(result.lineageTaskId).toBeNull();
    expect(result.clearLineageIncludesConnections).toBe(false);
  });

  it("keeps selection and lineage when task remains", () => {
    const result = pruneSelectionAndLineageForDocument(
      snapshot,
      singleTaskSelection("task-1"),
      "task-1",
    );
    expect(result.taskSelection.ids).toEqual(["task-1"]);
    expect(result.lineageTaskId).toBe("task-1");
    expect(result.clearLineageIncludesConnections).toBe(false);
  });

  it("clears invalid lineage and signals connection flag reset", () => {
    const result = pruneSelectionAndLineageForDocument(
      snapshot,
      emptyTaskSelection(),
      "missing-task",
    );
    expect(result.lineageTaskId).toBeNull();
    expect(result.clearLineageIncludesConnections).toBe(true);
  });
});
