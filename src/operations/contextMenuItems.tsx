import { Copy, GitBranch, Pencil, StickyNote, Trash2 } from "lucide-react";
import {
  hasOtherVisibleMilestoneBandGroup,
  hasOtherVisibleMilestoneMark,
} from "../model/filterChips";
import {
  findOutlineBranchLevelIndex,
  taskParentLevelIndex,
} from "../model/outlineCrud";
import {
  confidenceToggleShortcutHint,
  deleteShortcutHint,
  duplicateTaskShortcutHint,
  editShortcutHint,
  lineageToggleShortcutHint,
  noteShortcutHint,
} from "../model/shortcuts";
import {
  canDeleteCategory,
  canDeleteGroup,
} from "../model/tasks";
import { findTaskInDocument } from "../model/hierarchy";
import type {
  Category,
  Milestone,
  OutlineRoot,
  ScheduleId,
  ScheduleLevelDef,
  Task,
} from "../model/types";
import {
  contextMenuLabel,
} from "./operationLabelLink";
import { OPERATION_ID } from "./operationIds";
import type { ContextMenuItem, ContextMenuTarget } from "./contextMenuTypes";

export type ContextMenuItemHandlers = {
  setMilestoneMarkVisible: (milestoneId: ScheduleId, visible: boolean) => void;
  showOnlyMilestoneMark: (milestoneId: ScheduleId) => void;
  openMilestoneEdit: (milestoneId: ScheduleId) => void;
  setMilestoneConfidence: (
    milestoneId: ScheduleId,
    confidence: Milestone["confidence"],
  ) => void;
  setDeleteMilestoneId: (milestoneId: ScheduleId) => void;
  removeTaskConnection: (fromId: ScheduleId, toId: ScheduleId) => void;
  removePredecessorLink: (fromId: ScheduleId, toId: ScheduleId) => void;
  openAddMilestone: (date: string, groupId: ScheduleId | null) => void;
  setMilestoneGroupVisible: (groupId: ScheduleId, visible: boolean) => void;
  showOnlyMilestoneGroup: (groupId: ScheduleId) => void;
  openHierarchyEdit: (
    kind: "category" | "group" | "outline",
    id: ScheduleId,
  ) => void;
  openAddCategoryAfter: (id: ScheduleId) => void;
  openAddGroupToCategory: (id: ScheduleId) => void;
  openAddGroupAfter: (id: ScheduleId) => void;
  openAddOutlineSiblingAfter: (id: ScheduleId) => void;
  openAddOutlineChild: (id: ScheduleId) => void;
  openDeleteHierarchy: (
    kind: "category" | "group" | "outline",
    id: ScheduleId,
  ) => void;
  setDeleteOpen: (open: boolean) => void;
  openTaskForEdit: (task: Task) => void;
  openDuplicateDialog: (taskId: ScheduleId) => void;
  setTaskConfidence: (
    taskId: ScheduleId,
    confidence: Task["confidence"],
  ) => void;
  openTaskNoteDialog: (taskId: ScheduleId) => void;
  clearLineage: () => void;
  showLineage: (taskId: ScheduleId) => void;
};

export type BuildContextMenuItemsParams = {
  target: ContextMenuTarget;
  categories: readonly Category[];
  outline: OutlineRoot | null | undefined;
  levels: readonly ScheduleLevelDef[] | null | undefined;
  milestones: readonly Milestone[];
  hierarchyAligned: boolean;
  visibleMilestoneGroupIds: ReadonlySet<ScheduleId>;
  hiddenMilestoneIdSet: ReadonlySet<ScheduleId>;
  selectedTaskCount: number;
  lineageTaskId: ScheduleId | null | undefined;
  commandKey: boolean;
  canDeleteOutlineBranch: (id: ScheduleId) => boolean;
  handlers: ContextMenuItemHandlers;
};

export function buildContextMenuItems(
  params: BuildContextMenuItemsParams,
): ContextMenuItem[] {
  const {
    target,
    categories,
    outline,
    levels,
    milestones,
    hierarchyAligned,
    visibleMilestoneGroupIds,
    hiddenMilestoneIdSet,
    selectedTaskCount,
    lineageTaskId,
    commandKey,
    canDeleteOutlineBranch,
    handlers,
  } = params;

  if (target.kind === "milestone") {
    const milestoneId = target.milestoneId;
    const milestone = milestones.find((item) => item.id === milestoneId);
    return [
      {
        type: "item",
        id: OPERATION_ID.hideMilestoneMark,
        label: contextMenuLabel(OPERATION_ID.hideMilestoneMark),
        onSelect: () => handlers.setMilestoneMarkVisible(milestoneId, false),
      },
      ...(hasOtherVisibleMilestoneMark(
        visibleMilestoneGroupIds,
        milestones,
        hiddenMilestoneIdSet,
        milestoneId,
      )
        ? [
            {
              type: "item" as const,
              id: OPERATION_ID.showOnlyMilestoneMark,
              label: contextMenuLabel(OPERATION_ID.showOnlyMilestoneMark),
              onSelect: () => handlers.showOnlyMilestoneMark(milestoneId),
            },
          ]
        : []),
      {
        type: "item",
        id: OPERATION_ID.editMilestone,
        label: contextMenuLabel(OPERATION_ID.editMilestone),
        icon: <Pencil size={14} strokeWidth={2} />,
        onSelect: () => handlers.openMilestoneEdit(milestoneId),
      },
      ...(milestone
        ? [
            {
              type: "item" as const,
              id: OPERATION_ID.toggleMilestoneConfidence,
              label: contextMenuLabel(OPERATION_ID.toggleMilestoneConfidence, {
                tentative: milestone.confidence === "tentative",
              }),
              onSelect: () => {
                handlers.setMilestoneConfidence(
                  milestoneId,
                  milestone.confidence === "tentative"
                    ? "committed"
                    : "tentative",
                );
              },
            },
          ]
        : []),
      { type: "separator", id: "milestone-sep" },
      {
        type: "item",
        id: OPERATION_ID.deleteMilestone,
        label: contextMenuLabel(OPERATION_ID.deleteMilestone),
        danger: true,
        icon: <Trash2 size={14} strokeWidth={2} />,
        onSelect: () => handlers.setDeleteMilestoneId(milestoneId),
      },
    ];
  }
  if (target.kind === "link") {
    const { fromId, toId, linkKind } = target;
    const unlinkOperationId =
      linkKind === "connection"
        ? OPERATION_ID.unlinkConnection
        : OPERATION_ID.unlinkPredecessor;
    return [
      {
        type: "item",
        id: unlinkOperationId,
        label: contextMenuLabel(unlinkOperationId),
        onSelect: () =>
          linkKind === "connection"
            ? handlers.removeTaskConnection(fromId, toId)
            : handlers.removePredecessorLink(fromId, toId),
      },
    ];
  }
  if (target.kind === "addMilestone") {
    const { date, groupId } = target;
    return [
      {
        type: "item",
        id: OPERATION_ID.addMilestone,
        label: contextMenuLabel(OPERATION_ID.addMilestone),
        onSelect: () => handlers.openAddMilestone(date, groupId),
      },
    ];
  }
  if (target.kind === "milestoneGroup") {
    const groupId = target.groupId;
    const items: ContextMenuItem[] = [
      {
        type: "item",
        id: OPERATION_ID.hideMilestoneGroup,
        label: contextMenuLabel(OPERATION_ID.hideMilestoneGroup),
        onSelect: () => handlers.setMilestoneGroupVisible(groupId, false),
      },
    ];
    if (
      hasOtherVisibleMilestoneBandGroup(
        visibleMilestoneGroupIds,
        milestones,
        groupId,
      )
    ) {
      items.push({
        type: "item",
        id: OPERATION_ID.showOnlyMilestoneGroup,
        label: contextMenuLabel(OPERATION_ID.showOnlyMilestoneGroup),
        onSelect: () => handlers.showOnlyMilestoneGroup(groupId),
      });
    }
    return items;
  }
  if (target.kind === "category") {
    const { id } = target;
    const items: ContextMenuItem[] = [
      {
        type: "item",
        id: OPERATION_ID.renameHierarchy,
        label: contextMenuLabel(OPERATION_ID.renameHierarchy),
        onSelect: () => handlers.openHierarchyEdit("category", id),
      },
      {
        type: "item",
        id: OPERATION_ID.addCategoryBelow,
        label: contextMenuLabel(OPERATION_ID.addCategoryBelow),
        onSelect: () => handlers.openAddCategoryAfter(id),
      },
      {
        type: "item",
        id: OPERATION_ID.addGroupToCategory,
        label: contextMenuLabel(OPERATION_ID.addGroupToCategory),
        onSelect: () => handlers.openAddGroupToCategory(id),
      },
    ];
    if (canDeleteCategory([...categories], id)) {
      items.push(
        { type: "separator", id: "category-sep" },
        {
          type: "item",
          id: OPERATION_ID.deleteHierarchy,
          label: contextMenuLabel(OPERATION_ID.deleteHierarchy),
          danger: true,
          icon: <Trash2 size={14} strokeWidth={2} />,
          onSelect: () => handlers.openDeleteHierarchy("category", id),
        },
      );
    }
    return items;
  }
  if (target.kind === "group") {
    const { id } = target;
    const items: ContextMenuItem[] = [
      {
        type: "item",
        id: OPERATION_ID.renameHierarchy,
        label: contextMenuLabel(OPERATION_ID.renameHierarchy),
        onSelect: () => handlers.openHierarchyEdit("group", id),
      },
      {
        type: "item",
        id: OPERATION_ID.addGroupBelow,
        label: contextMenuLabel(OPERATION_ID.addGroupBelow),
        onSelect: () => handlers.openAddGroupAfter(id),
      },
    ];
    if (canDeleteGroup([...categories], id)) {
      items.push(
        { type: "separator", id: "group-sep" },
        {
          type: "item",
          id: OPERATION_ID.deleteHierarchy,
          label: contextMenuLabel(OPERATION_ID.deleteHierarchy),
          danger: true,
          icon: <Trash2 size={14} strokeWidth={2} />,
          onSelect: () => handlers.openDeleteHierarchy("group", id),
        },
      );
    }
    return items;
  }
  if (target.kind === "hierarchy") {
    if (!hierarchyAligned || levels == null || outline == null) {
      return [];
    }
    const { id } = target;
    const levelIndex = findOutlineBranchLevelIndex(outline, id);
    if (levelIndex == null) return [];
    const levelName = levels[levelIndex]?.name ?? "階層";
    const items: ContextMenuItem[] = [
      {
        type: "item",
        id: OPERATION_ID.renameHierarchy,
        label: contextMenuLabel(OPERATION_ID.renameHierarchy),
        onSelect: () => handlers.openHierarchyEdit("outline", id),
      },
      {
        type: "item",
        id: OPERATION_ID.addOutlineSibling,
        label: contextMenuLabel(OPERATION_ID.addOutlineSibling, { levelName }),
        onSelect: () => handlers.openAddOutlineSiblingAfter(id),
      },
    ];
    if (levelIndex < taskParentLevelIndex(levels.length)) {
      const childName = levels[levelIndex + 1]?.name ?? "階層";
      items.push({
        type: "item",
        id: OPERATION_ID.addOutlineChild,
        label: contextMenuLabel(OPERATION_ID.addOutlineChild, { childName }),
        onSelect: () => handlers.openAddOutlineChild(id),
      });
    }
    if (canDeleteOutlineBranch(id)) {
      items.push(
        { type: "separator", id: "hierarchy-sep" },
        {
          type: "item",
          id: OPERATION_ID.deleteHierarchy,
          label: contextMenuLabel(OPERATION_ID.deleteHierarchy),
          danger: true,
          icon: <Trash2 size={14} strokeWidth={2} />,
          onSelect: () => handlers.openDeleteHierarchy("outline", id),
        },
      );
    }
    return items;
  }
  const taskId = target.taskId;
  const task = findTaskInDocument(
    [...categories],
    outline ?? undefined,
    taskId,
  );
  if (selectedTaskCount > 1) {
    return [
      {
        type: "item",
        id: OPERATION_ID.deleteTask,
        label: contextMenuLabel(OPERATION_ID.deleteTask),
        danger: true,
        icon: <Trash2 size={14} strokeWidth={2} />,
        shortcut: deleteShortcutHint(),
        onSelect: () => handlers.setDeleteOpen(true),
      },
    ];
  }
  const lineageActive = lineageTaskId === taskId;
  return [
    {
      type: "item",
      id: OPERATION_ID.editTask,
      label: contextMenuLabel(OPERATION_ID.editTask),
      icon: <Pencil size={14} strokeWidth={2} />,
      shortcut: editShortcutHint(),
      onSelect: () => {
        if (task) handlers.openTaskForEdit(task);
      },
    },
    {
      type: "item",
      id: OPERATION_ID.duplicateTask,
      label: contextMenuLabel(OPERATION_ID.duplicateTask),
      icon: <Copy size={14} strokeWidth={2} />,
      shortcut: duplicateTaskShortcutHint(),
      onSelect: () => handlers.openDuplicateDialog(taskId),
    },
    { type: "separator", id: "task-sep-1" },
    ...(task
      ? [
          {
            type: "item" as const,
            id: OPERATION_ID.toggleTaskConfidence,
            label: contextMenuLabel(OPERATION_ID.toggleTaskConfidence, {
              tentative: task.confidence === "tentative",
            }),
            shortcut: confidenceToggleShortcutHint(commandKey),
            onSelect: () => {
              handlers.setTaskConfidence(
                taskId,
                task.confidence === "tentative" ? "committed" : "tentative",
              );
            },
          },
        ]
      : []),
    {
      type: "item",
      id: OPERATION_ID.note,
      label: contextMenuLabel(OPERATION_ID.note),
      icon: <StickyNote size={14} strokeWidth={2} />,
      shortcut: noteShortcutHint(commandKey),
      onSelect: () => handlers.openTaskNoteDialog(taskId),
    },
    { type: "separator", id: "task-sep-2" },
    {
      type: "item",
      id: OPERATION_ID.toggleLineage,
      label: contextMenuLabel(OPERATION_ID.toggleLineage, { lineageActive }),
      icon: <GitBranch size={14} strokeWidth={2} />,
      shortcut: lineageToggleShortcutHint(commandKey),
      onSelect: () => {
        if (lineageActive) handlers.clearLineage();
        else handlers.showLineage(taskId);
      },
    },
    { type: "separator", id: "task-sep-3" },
    {
      type: "item",
      id: OPERATION_ID.deleteTask,
      label: contextMenuLabel(OPERATION_ID.deleteTask),
      danger: true,
      icon: <Trash2 size={14} strokeWidth={2} />,
      shortcut: deleteShortcutHint(),
      onSelect: () => handlers.setDeleteOpen(true),
    },
  ];
}
