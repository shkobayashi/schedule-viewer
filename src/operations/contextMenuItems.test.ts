import { describe, expect, it, vi } from "vitest";
import type {
  Category,
  Milestone,
  OutlineRoot,
  ScheduleLevelDef,
  Task,
  TaskGroup,
} from "../model/types";
import {
  buildContextMenuItems,
  type BuildContextMenuItemsParams,
  type ContextMenuItemHandlers,
} from "./contextMenuItems";
import type { ContextMenuItem, ContextMenuTarget } from "./contextMenuTypes";
import { OPERATION_ID } from "./operationIds";

function task(id: string, confidence: Task["confidence"] = "committed"): Task {
  return {
    id,
    name: id,
    start: "2026-01-01",
    end: "2026-01-03",
    assigneeIds: [],
    status: "notStarted",
    progress: 0,
    confidence,
    predecessors: [],
    milestoneId: null,
  };
}

function group(id: string, tasks: Task[]): TaskGroup {
  return { id, name: id, tasks };
}

function category(id: string, groups: TaskGroup[]): Category {
  return { id, name: id, groups };
}

function milestone(
  id: string,
  groupId: string,
  confidence: Milestone["confidence"] = "committed",
): Milestone {
  return { id, name: id, date: "2026-02-01", confidence, groupId };
}

function handlers(): ContextMenuItemHandlers {
  return {
    setMilestoneMarkVisible: vi.fn(),
    showOnlyMilestoneMark: vi.fn(),
    openMilestoneEdit: vi.fn(),
    setMilestoneConfidence: vi.fn(),
    setDeleteMilestoneId: vi.fn(),
    removeTaskConnection: vi.fn(),
    removePredecessorLink: vi.fn(),
    openAddMilestone: vi.fn(),
    setMilestoneGroupVisible: vi.fn(),
    showOnlyMilestoneGroup: vi.fn(),
    openHierarchyEdit: vi.fn(),
    openAddCategoryAfter: vi.fn(),
    openAddGroupToCategory: vi.fn(),
    openAddGroupAfter: vi.fn(),
    openAddOutlineSiblingAfter: vi.fn(),
    openAddOutlineChild: vi.fn(),
    openDeleteHierarchy: vi.fn(),
    setDeleteOpen: vi.fn(),
    openTaskForEdit: vi.fn(),
    openDuplicateDialog: vi.fn(),
    setTaskConfidence: vi.fn(),
    openTaskNoteDialog: vi.fn(),
    clearLineage: vi.fn(),
    showLineage: vi.fn(),
  };
}

function itemsFor(
  target: ContextMenuTarget,
  overrides: Partial<BuildContextMenuItemsParams> = {},
): { items: ContextMenuItem[]; calls: ContextMenuItemHandlers } {
  const calls = handlers();
  const items = buildContextMenuItems({
    target,
    categories: [],
    outline: null,
    levels: null,
    milestones: [],
    hierarchyAligned: false,
    visibleMilestoneGroupIds: new Set(),
    hiddenMilestoneIdSet: new Set(),
    selectedTaskCount: 1,
    lineageTaskId: null,
    commandKey: false,
    canDeleteOutlineBranch: () => false,
    handlers: calls,
    ...overrides,
  });
  return { items, calls };
}

function itemIds(items: ContextMenuItem[]): string[] {
  return items.filter((item) => item.type === "item").map((item) => item.id);
}

function labelOf(items: ContextMenuItem[], id: string): string {
  const item = items.find((entry) => entry.type === "item" && entry.id === id);
  if (item == null || item.type !== "item") {
    throw new Error(`missing item ${id}`);
  }
  return item.label;
}

function shortcutOf(items: ContextMenuItem[], id: string): string | undefined {
  const item = items.find((entry) => entry.type === "item" && entry.id === id);
  if (item == null || item.type !== "item") {
    throw new Error(`missing item ${id}`);
  }
  return item.shortcut;
}

function select(items: ContextMenuItem[], id: string): void {
  const item = items.find((entry) => entry.type === "item" && entry.id === id);
  if (item == null || item.type !== "item") {
    throw new Error(`missing item ${id}`);
  }
  item.onSelect();
}

const oneTask = task("task-1");
const oneCategory = category("cat-1", [group("group-1", [oneTask])]);

describe("buildContextMenuItems", () => {
  it("lists edit, duplicate, note shortcut, and delete for one task", () => {
    const { items, calls } = itemsFor(
      { kind: "task", taskId: "task-1" },
      { categories: [oneCategory], commandKey: false },
    );
    expect(itemIds(items)).toEqual([
      OPERATION_ID.editTask,
      OPERATION_ID.duplicateTask,
      OPERATION_ID.toggleTaskConfidence,
      OPERATION_ID.note,
      OPERATION_ID.toggleLineage,
      OPERATION_ID.deleteTask,
    ]);
    expect(labelOf(items, OPERATION_ID.note)).toBe("ノート");
    expect(shortcutOf(items, OPERATION_ID.note)).toBe("Ctrl+N");
    expect(labelOf(items, OPERATION_ID.duplicateTask)).toBe("複製");
    expect(labelOf(items, OPERATION_ID.toggleTaskConfidence)).toBe("未確定にする");
    expect(labelOf(items, OPERATION_ID.toggleLineage)).toBe("系統を表示");
    select(items, OPERATION_ID.note);
    expect(calls.openTaskNoteDialog).toHaveBeenCalledWith("task-1");
    expect(calls.openDuplicateDialog).not.toHaveBeenCalled();
  });

  it("switches confidence and lineage labels for a tentative task on mac", () => {
    const tentative = task("task-1", "tentative");
    const { items, calls } = itemsFor(
      { kind: "task", taskId: "task-1" },
      {
        categories: [category("cat-1", [group("group-1", [tentative])])],
        commandKey: true,
        lineageTaskId: "task-1",
      },
    );
    expect(labelOf(items, OPERATION_ID.toggleTaskConfidence)).toBe("確定にする");
    expect(shortcutOf(items, OPERATION_ID.note)).toBe("⌘N");
    expect(labelOf(items, OPERATION_ID.toggleLineage)).toBe("系統を解除");
    select(items, OPERATION_ID.toggleTaskConfidence);
    expect(calls.setTaskConfidence).toHaveBeenCalledWith("task-1", "committed");
    select(items, OPERATION_ID.toggleLineage);
    expect(calls.clearLineage).toHaveBeenCalledOnce();
    expect(calls.showLineage).not.toHaveBeenCalled();
  });

  it("lists only delete when several tasks are selected", () => {
    const { items, calls } = itemsFor(
      { kind: "task", taskId: "task-1" },
      { categories: [oneCategory], selectedTaskCount: 2 },
    );
    expect(itemIds(items)).toEqual([OPERATION_ID.deleteTask]);
    expect(labelOf(items, OPERATION_ID.deleteTask)).toBe("削除");
    expect(shortcutOf(items, OPERATION_ID.deleteTask)).toBe("Delete");
    select(items, OPERATION_ID.deleteTask);
    expect(calls.setDeleteOpen).toHaveBeenCalledWith(true);
    expect(calls.openDuplicateDialog).not.toHaveBeenCalled();
  });

  it("lists only add-milestone on an empty chart", () => {
    const { items, calls } = itemsFor({
      kind: "addMilestone",
      date: "2026-04-02",
      groupId: null,
    });
    expect(itemIds(items)).toEqual([OPERATION_ID.addMilestone]);
    expect(labelOf(items, OPERATION_ID.addMilestone)).toBe("マイルストンを追加");
    expect(itemIds(items)).not.toContain(OPERATION_ID.deleteTask);
    select(items, OPERATION_ID.addMilestone);
    expect(calls.openAddMilestone).toHaveBeenCalledWith("2026-04-02", null);
  });

  it("offers show-only when another milestone mark is visible", () => {
    const marks = [
      milestone("ms-1", "band-1"),
      milestone("ms-2", "band-1", "tentative"),
    ];
    const { items, calls } = itemsFor(
      { kind: "milestone", milestoneId: "ms-2" },
      {
        milestones: marks,
        visibleMilestoneGroupIds: new Set(["band-1"]),
      },
    );
    expect(itemIds(items)).toContain(OPERATION_ID.showOnlyMilestoneMark);
    expect(labelOf(items, OPERATION_ID.showOnlyMilestoneMark)).toBe(
      "このマイルストンだけ表示",
    );
    expect(labelOf(items, OPERATION_ID.editMilestone)).toBe("編集");
    expect(labelOf(items, OPERATION_ID.deleteMilestone)).toBe("削除");
    expect(labelOf(items, OPERATION_ID.toggleMilestoneConfidence)).toBe(
      "確定にする",
    );
    select(items, OPERATION_ID.deleteMilestone);
    expect(calls.setDeleteMilestoneId).toHaveBeenCalledWith("ms-2");
    expect(calls.setDeleteOpen).not.toHaveBeenCalled();
  });

  it("hides show-only when the milestone is the only visible mark", () => {
    const { items } = itemsFor(
      { kind: "milestone", milestoneId: "ms-1" },
      {
        milestones: [milestone("ms-1", "band-1")],
        visibleMilestoneGroupIds: new Set(["band-1"]),
      },
    );
    expect(itemIds(items)).not.toContain(OPERATION_ID.showOnlyMilestoneMark);
    expect(itemIds(items)).toEqual([
      OPERATION_ID.hideMilestoneMark,
      OPERATION_ID.editMilestone,
      OPERATION_ID.toggleMilestoneConfidence,
      OPERATION_ID.deleteMilestone,
    ]);
    expect(labelOf(items, OPERATION_ID.hideMilestoneMark)).toBe("非表示");
  });

  it("lists only unlink for a connection", () => {
    const { items, calls } = itemsFor({
      kind: "link",
      fromId: "task-1",
      toId: "task-2",
      linkKind: "connection",
    });
    expect(itemIds(items)).toEqual([OPERATION_ID.unlinkConnection]);
    expect(labelOf(items, OPERATION_ID.unlinkConnection)).toBe("繋がりを外す");
    select(items, OPERATION_ID.unlinkConnection);
    expect(calls.removeTaskConnection).toHaveBeenCalledWith("task-1", "task-2");
    expect(calls.removePredecessorLink).not.toHaveBeenCalled();
  });

  it("lists only unlink for a predecessor", () => {
    const { items, calls } = itemsFor({
      kind: "link",
      fromId: "task-1",
      toId: "task-2",
      linkKind: "predecessor",
    });
    expect(itemIds(items)).toEqual([OPERATION_ID.unlinkPredecessor]);
    expect(labelOf(items, OPERATION_ID.unlinkPredecessor)).toBe("線を外す");
    select(items, OPERATION_ID.unlinkPredecessor);
    expect(calls.removePredecessorLink).toHaveBeenCalledWith("task-1", "task-2");
    expect(calls.removeTaskConnection).not.toHaveBeenCalled();
  });

  it("lists category adds and hides delete while the category has tasks", () => {
    const other = category("cat-2", [group("group-2", [])]);
    const { items, calls } = itemsFor(
      { kind: "category", id: "cat-1" },
      { categories: [oneCategory, other] },
    );
    expect(itemIds(items)).toEqual([
      OPERATION_ID.renameHierarchy,
      OPERATION_ID.addCategoryBelow,
      OPERATION_ID.addGroupToCategory,
    ]);
    expect(labelOf(items, OPERATION_ID.addCategoryBelow)).toBe(
      "下にカテゴリを追加",
    );
    expect(labelOf(items, OPERATION_ID.addGroupToCategory)).toBe("グループを追加");
    expect(itemIds(items)).not.toContain(OPERATION_ID.deleteHierarchy);
    select(items, OPERATION_ID.addGroupToCategory);
    expect(calls.openAddGroupToCategory).toHaveBeenCalledWith("cat-1");
    expect(calls.openAddGroupAfter).not.toHaveBeenCalled();
  });

  it("lists group add and hides delete while it is the only group", () => {
    const { items, calls } = itemsFor(
      { kind: "group", id: "group-1" },
      { categories: [oneCategory] },
    );
    expect(itemIds(items)).toEqual([
      OPERATION_ID.renameHierarchy,
      OPERATION_ID.addGroupBelow,
    ]);
    expect(labelOf(items, OPERATION_ID.renameHierarchy)).toBe("名前を変更");
    expect(labelOf(items, OPERATION_ID.addGroupBelow)).toBe("下にグループを追加");
    expect(itemIds(items)).not.toContain(OPERATION_ID.deleteHierarchy);
    select(items, OPERATION_ID.addGroupBelow);
    expect(calls.openAddGroupAfter).toHaveBeenCalledWith("group-1");
  });

  it("lists milestone-group show-only only when another band has a mark", () => {
    const marks = [milestone("ms-1", "band-1"), milestone("ms-2", "band-2")];
    const shown = itemsFor(
      { kind: "milestoneGroup", groupId: "band-1" },
      {
        milestones: marks,
        visibleMilestoneGroupIds: new Set(["band-1", "band-2"]),
      },
    );
    expect(itemIds(shown.items)).toEqual([
      OPERATION_ID.hideMilestoneGroup,
      OPERATION_ID.showOnlyMilestoneGroup,
    ]);
    expect(labelOf(shown.items, OPERATION_ID.showOnlyMilestoneGroup)).toBe(
      "この行だけ表示",
    );
    select(shown.items, OPERATION_ID.showOnlyMilestoneGroup);
    expect(shown.calls.showOnlyMilestoneGroup).toHaveBeenCalledWith("band-1");

    const alone = itemsFor(
      { kind: "milestoneGroup", groupId: "band-1" },
      {
        milestones: marks,
        visibleMilestoneGroupIds: new Set(["band-1"]),
      },
    );
    expect(itemIds(alone.items)).toEqual([OPERATION_ID.hideMilestoneGroup]);
    expect(labelOf(alone.items, OPERATION_ID.hideMilestoneGroup)).toBe("非表示");
  });

  it("lists outline adds without delete, and returns nothing when the outline is not aligned", () => {
    const levels: ScheduleLevelDef[] = [
      { name: "事業", meaning: "上" },
      { name: "工程", meaning: "中" },
      { name: "タスク", meaning: "下" },
    ];
    const outline: OutlineRoot = [
      { id: "branch-1", name: "設計", children: [] },
    ];
    const missing = itemsFor(
      { kind: "hierarchy", id: "branch-1" },
      { hierarchyAligned: false, levels, outline },
    );
    expect(missing.items).toEqual([]);

    const { items, calls } = itemsFor(
      { kind: "hierarchy", id: "branch-1" },
      {
        hierarchyAligned: true,
        levels,
        outline,
        canDeleteOutlineBranch: () => false,
      },
    );
    expect(itemIds(items)).toEqual([
      OPERATION_ID.renameHierarchy,
      OPERATION_ID.addOutlineSibling,
      OPERATION_ID.addOutlineChild,
    ]);
    expect(labelOf(items, OPERATION_ID.addOutlineSibling)).toBe("下に事業を追加");
    expect(labelOf(items, OPERATION_ID.addOutlineChild)).toBe("工程を追加");
    expect(itemIds(items)).not.toContain(OPERATION_ID.deleteHierarchy);
    select(items, OPERATION_ID.addOutlineChild);
    expect(calls.openAddOutlineChild).toHaveBeenCalledWith("branch-1");
    expect(calls.openAddOutlineSiblingAfter).not.toHaveBeenCalled();
  });
});
