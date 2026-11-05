import { describe, expect, it } from "vitest";
import type { TaskRef } from "./taskRef";

describe("taskRef", () => {
  it("describes a task with category and group", () => {
    const ref: TaskRef = {
      id: "00000000-0000-4000-8000-000000000001",
      name: "タスク",
      category: "カテゴリ",
      group: "グループ",
    };
    expect(ref.name).toBe("タスク");
  });
});
