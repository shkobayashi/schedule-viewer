import { describe, expect, it } from "vitest";
import { forEachTask } from "./taskTraversal";
import type { Category, Task } from "./types";

const task: Task = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "One",
  start: "2026-01-01",
  end: "2026-01-02",
  assigneeIds: [],
  status: "in-progress",
  progress: 0,
  confidence: "committed",
  predecessors: [],
  milestoneId: null,
  note: "",
};

describe("taskTraversal", () => {
  it("visits each task in category group order", () => {
    const categories: Category[] = [
      {
        id: "c1",
        name: "Cat",
        groups: [
          {
            id: "g1",
            name: "Grp",
            tasks: [task],
          },
        ],
      },
    ];
    const names: string[] = [];
    forEachTask(categories, (task) => {
      names.push(task.name);
    });
    expect(names).toEqual(["One"]);
  });
});
