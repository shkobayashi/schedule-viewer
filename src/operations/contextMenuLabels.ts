import { OPERATION_FORMAL, lineagePaletteLabel } from "../model/operationLabels";

/** 右クリックメニューの固定ラベル（`docs/operation-entries.md` の「右クリック」列の正本）。 */
export const CONTEXT_MENU_LABEL = {
  hide: "非表示",
  showOnlyMilestoneMark: "このマイルストンだけ表示",
  showOnlyMilestoneGroup: "この行だけ表示",
  edit: OPERATION_FORMAL.editTask,
  delete: OPERATION_FORMAL.deleteTask,
  duplicate: OPERATION_FORMAL.duplicateTask,
  note: OPERATION_FORMAL.note,
  addMilestone: OPERATION_FORMAL.addMilestone,
  rename: "名前を変更",
  addCategoryBelow: "下にカテゴリを追加",
  addGroup: "グループを追加",
  addGroupBelow: "下にグループを追加",
  unlinkConnection: "繋がりを外す",
  unlinkPredecessor: "線を外す",
} as const;

export function milestoneConfidenceLabel(tentative: boolean): string {
  return tentative ? "確定にする" : "未確定にする";
}

export function taskConfidenceLabel(tentative: boolean): string {
  return milestoneConfidenceLabel(tentative);
}

export function taskLineageLabel(lineageActive: boolean): string {
  return lineagePaletteLabel(lineageActive);
}

export function outlineSiblingAddLabel(levelName: string): string {
  return `下に${levelName}を追加`;
}

export function outlineChildAddLabel(childName: string): string {
  return `${childName}を追加`;
}
