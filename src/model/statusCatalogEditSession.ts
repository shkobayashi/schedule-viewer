import type { StatusItem } from "./statusCatalog";
import { sameStatusItems } from "./statusEdit";

export type StatusCatalogExternalChange =
  | { kind: "removed"; catalogId: string }
  | { kind: "imported"; catalogId: string; fromSelf: boolean };

/** 保存済みの項目と読み直した項目が違うときだけ、覆いを読み直す。 */
export function shouldReloadEditingCatalogItems(
  savedItems: readonly StatusItem[],
  loadedItems: readonly StatusItem[],
): boolean {
  return !sameStatusItems(savedItems, loadedItems);
}

/** 設定の取り込みや外しが、開いている覆いにどう効くかを決める。 */
export function overlayReactionToCatalogChange(
  editingCatalogId: string | null,
  change: StatusCatalogExternalChange,
): "close" | "reload" | "ignore" {
  if (editingCatalogId == null) return "ignore";
  if (change.kind === "removed" && change.catalogId === editingCatalogId) {
    return "close";
  }
  if (change.kind === "imported" && change.catalogId === editingCatalogId) {
    return change.fromSelf ? "ignore" : "reload";
  }
  return "ignore";
}
