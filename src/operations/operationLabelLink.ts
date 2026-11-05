import { OPERATION_FORMAL, lineagePaletteLabel } from "../model/operationLabels";
import { OPERATION_ID, type OperationId } from "./operationIds";

type FormalKey = keyof typeof OPERATION_FORMAL;

/** `OPERATION_FORMAL` のキーへつなぐ操作 ID。 */
export const OPERATION_FORMAL_LINK: Partial<Record<OperationId, FormalKey>> = {
  [OPERATION_ID.editTask]: "editTask",
  [OPERATION_ID.deleteTask]: "deleteTask",
  [OPERATION_ID.duplicateTask]: "duplicateTask",
  [OPERATION_ID.note]: "note",
  [OPERATION_ID.addMilestone]: "addMilestone",
  [OPERATION_ID.editMilestone]: "editTask",
  [OPERATION_ID.deleteMilestone]: "deleteTask",
};

/** 右クリック専用の固定ラベル（`docs/operation-entries.md` の「右クリック」列）。 */
export const CONTEXT_MENU_FIXED_LABEL: Partial<Record<OperationId, string>> = {
  [OPERATION_ID.hideMilestoneMark]: "非表示",
  [OPERATION_ID.showOnlyMilestoneMark]: "このマイルストンだけ表示",
  [OPERATION_ID.hideMilestoneGroup]: "非表示",
  [OPERATION_ID.showOnlyMilestoneGroup]: "この行だけ表示",
  [OPERATION_ID.renameHierarchy]: "名前を変更",
  [OPERATION_ID.addCategoryBelow]: "下にカテゴリを追加",
  [OPERATION_ID.addGroupToCategory]: "グループを追加",
  [OPERATION_ID.addGroupBelow]: "下にグループを追加",
  [OPERATION_ID.unlinkPredecessor]: "線を外す",
  [OPERATION_ID.unlinkConnection]: "繋がりを外す",
};

export type ContextMenuLabelContext = {
  tentative?: boolean;
  lineageActive?: boolean;
  levelName?: string;
  childName?: string;
};

export function operationFormalLabel(
  formalKey: FormalKey,
): (typeof OPERATION_FORMAL)[FormalKey] {
  return OPERATION_FORMAL[formalKey];
}

export function contextMenuLabel(
  operationId: OperationId,
  ctx: ContextMenuLabelContext = {},
): string {
  if (
    operationId === OPERATION_ID.toggleTaskConfidence ||
    operationId === OPERATION_ID.toggleMilestoneConfidence
  ) {
    return ctx.tentative ? "確定にする" : "未確定にする";
  }
  if (operationId === OPERATION_ID.toggleLineage) {
    return lineagePaletteLabel(ctx.lineageActive ?? false);
  }
  if (operationId === OPERATION_ID.addOutlineSibling) {
    return `下に${ctx.levelName ?? "階層"}を追加`;
  }
  if (operationId === OPERATION_ID.addOutlineChild) {
    return `${ctx.childName ?? "階層"}を追加`;
  }
  const fixed = CONTEXT_MENU_FIXED_LABEL[operationId];
  if (fixed != null) return fixed;
  const formalKey = OPERATION_FORMAL_LINK[operationId];
  if (formalKey != null) return OPERATION_FORMAL[formalKey];
  throw new Error(`contextMenuLabel: unmapped operationId ${operationId}`);
}
