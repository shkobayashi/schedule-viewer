/**
 * 操作 ID の正本（Issue #490 PR 3 以降）。
 * パレット・☰・右クリックで同じ操作を指すときは同じ文字列に揃える。
 */
export const OPERATION_ID = {
  editTask: "editTask",
  deleteTask: "deleteTask",
  duplicateTask: "duplicateTask",
  note: "note",
  addMilestone: "addMilestone",
  toggleTaskConfidence: "toggleTaskConfidence",
  toggleMilestoneConfidence: "toggleMilestoneConfidence",
  toggleLineage: "toggleLineage",
  hideMilestoneMark: "hideMilestoneMark",
  showOnlyMilestoneMark: "showOnlyMilestoneMark",
  hideMilestoneGroup: "hideMilestoneGroup",
  showOnlyMilestoneGroup: "showOnlyMilestoneGroup",
  editMilestone: "editMilestone",
  deleteMilestone: "deleteMilestone",
  unlinkPredecessor: "unlinkPredecessor",
  unlinkConnection: "unlinkConnection",
  renameHierarchy: "renameHierarchy",
  addCategoryBelow: "addCategoryBelow",
  addGroupToCategory: "addGroupToCategory",
  addGroupBelow: "addGroupBelow",
  addOutlineSibling: "addOutlineSibling",
  addOutlineChild: "addOutlineChild",
  deleteHierarchy: "deleteHierarchy",
} as const;

export type OperationId = (typeof OPERATION_ID)[keyof typeof OPERATION_ID];

/** 右クリックメニューで使う操作 ID。 */
export type ContextMenuOperationId = OperationId;

/** `src/model/commandPalette.ts` の ID と共有する操作（値が一致すること）。 */
export const COMMAND_PALETTE_OPERATION_IDS = [
  OPERATION_ID.editTask,
  OPERATION_ID.deleteTask,
  OPERATION_ID.duplicateTask,
  OPERATION_ID.note,
  OPERATION_ID.addMilestone,
] as const;

export type CommandPaletteLinkedOperationId =
  (typeof COMMAND_PALETTE_OPERATION_IDS)[number];
