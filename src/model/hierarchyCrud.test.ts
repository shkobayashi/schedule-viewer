import { describe, expect, it } from "vitest";
import { formatScheduleDiff } from "./scheduleDiff";
import {
  appendGroupToCategory,
  canDeleteCategory,
  canDeleteGroup,
  insertCategoryAfter,
  moveGroupToCategory,
  moveTaskToGroup,
  removeCategory,
  removeGroup,
} from "./tasks";
import type { Category, ScheduleDocument, Task } from "./types";

const CAT_A = "c1000001-0000-4000-8000-000000000001";
const CAT_B = "c1000001-0000-4000-8000-000000000002";
const GRP_A = "d1000001-0000-4000-8000-000000000001";
const GRP_B = "d1000001-0000-4000-8000-000000000002";
const GRP_C = "d1000001-0000-4000-8000-000000000003";
const TASK_A = "e1000001-0000-4000-8000-000000000001";

function task(id: string): Task {
  return {
    id,
    name: "作業",
    start: "2026-04-01",
    end: "2026-04-02",
    assigneeId: null,
    status: "not-started",
    progress: 0,
    confidence: "committed",
    predecessors: [],
    milestoneId: null,
  };
}

function baseCategories(): Category[] {
  return [
    {
      id: CAT_A,
      name: "設計",
      groups: [
        { id: GRP_A, name: "上流", tasks: [task(TASK_A)] },
        { id: GRP_B, name: "詳細", tasks: [] },
      ],
    },
    {
      id: CAT_B,
      name: "開発",
      groups: [{ id: GRP_C, name: "実装", tasks: [] }],
    },
  ];
}

describe("hierarchy add and delete", () => {
  it("inserts a category with an empty default group", () => {
    const result = insertCategoryAfter(
      baseCategories(),
      CAT_A,
      "  検証  ",
      "new-cat",
      "new-grp",
    );
    expect(result.error).toBeNull();
    expect(result.changed).toBe(true);
    expect(result.categories.map((item) => item.name)).toEqual([
      "設計",
      "検証",
      "開発",
    ]);
    expect(result.categories[1].groups[0]).toEqual({
      id: "new-grp",
      name: "グループ",
      tasks: [],
    });
  });

  it("rejects a blank category name", () => {
    const cats = baseCategories();
    const result = insertCategoryAfter(cats, CAT_A, "   ", "new-cat", "new-grp");
    expect(result.error).toBe("名前を入力してください");
    expect(result.changed).toBe(false);
    expect(result.categories).toBe(cats);
  });

  it("rejects duplicate category names on add", () => {
    const result = insertCategoryAfter(
      baseCategories(),
      CAT_A,
      "開発",
      "new-cat",
      "new-grp",
    );
    expect(result.error).toBe("カテゴリ名が重複しています");
    expect(result.changed).toBe(false);
  });

  it("deletes only when allowed", () => {
    const cats = baseCategories();
    expect(canDeleteGroup(cats, GRP_B)).toBe(true);
    expect(canDeleteGroup(cats, GRP_A)).toBe(false);
    expect(canDeleteCategory(cats, CAT_B)).toBe(true);
    expect(canDeleteCategory(cats, CAT_A)).toBe(false);
    const afterGroup = removeGroup(cats, GRP_B);
    expect(afterGroup[0].groups.map((group) => group.id)).toEqual([GRP_A]);
    const afterCategory = removeCategory(cats, CAT_B);
    expect(afterCategory.map((category) => category.id)).toEqual([CAT_A]);
  });
});

describe("hierarchy move", () => {
  it("moves a task to another group by id", () => {
    const next = moveTaskToGroup(baseCategories(), TASK_A, GRP_C, 0);
    expect(next[0].groups[0].tasks).toEqual([]);
    expect(next[1].groups[0].tasks[0].id).toBe(TASK_A);
  });

  it("moves a group to another category when names do not clash", () => {
    const next = moveGroupToCategory(baseCategories(), GRP_B, CAT_B, 0);
    expect(next[0].groups.map((group) => group.id)).toEqual([GRP_A]);
    expect(next[1].groups.map((group) => group.id)).toEqual([GRP_B, GRP_C]);
  });

  it("returns the same array when the target category has the same group name", () => {
    const cats = baseCategories();
    cats[1].groups[0] = { ...cats[1].groups[0], name: "詳細" };
    expect(moveGroupToCategory(cats, GRP_B, CAT_B, 0)).toBe(cats);
  });

  it("shows a cross-category group move as a location change in diff", () => {
    const file: ScheduleDocument = {
      schemaVersion: 6,
      title: "t",
      milestoneGroups: [],
      milestones: [],
      categories: baseCategories(),
    };
    const screen: ScheduleDocument = {
      ...file,
      categories: moveGroupToCategory(file.categories, GRP_B, CAT_B, 0),
    };
    const text = formatScheduleDiff(screen, file, "plan.json");
    expect(text).toContain("場所:");
    expect(text).not.toContain("削除 グループ");
    expect(text).not.toContain("追加 グループ");
  });

  it("refuses to empty the source category of groups", () => {
    const cats: Category[] = [
      {
        id: CAT_A,
        name: "設計",
        groups: [{ id: GRP_A, name: "唯一", tasks: [] }],
      },
      {
        id: CAT_B,
        name: "開発",
        groups: [{ id: GRP_C, name: "実装", tasks: [] }],
      },
    ];
    expect(moveGroupToCategory(cats, GRP_A, CAT_B, 0)).toBe(cats);
  });

  it("shows cross-group task move as location change in diff", () => {
    const file: ScheduleDocument = {
      schemaVersion: 6,
      title: "t",
      milestoneGroups: [],
      milestones: [],
      categories: baseCategories(),
    };
    const screen: ScheduleDocument = {
      ...file,
      categories: moveTaskToGroup(file.categories, TASK_A, GRP_C, 0),
    };
    const text = formatScheduleDiff(screen, file, "plan.json");
    expect(text).toContain("場所:");
    expect(text).not.toContain(`削除 タスク`);
  });
});

describe("appendGroupToCategory", () => {
  it("rejects a duplicate group name", () => {
    const result = appendGroupToCategory(baseCategories(), CAT_A, "上流", "new-grp");
    expect(result.error).toBe("同じカテゴリ内でグループ名が重複しています");
    expect(result.changed).toBe(false);
  });

  it("appends at category end", () => {
    const result = appendGroupToCategory(
      baseCategories(),
      CAT_A,
      "新規",
      "new-grp",
    );
    expect(result.changed).toBe(true);
    expect(result.categories[0].groups.map((group) => group.name)).toEqual([
      "上流",
      "詳細",
      "新規",
    ]);
  });
});
