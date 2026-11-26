import type { Member } from "./memberTypes";
import { sameMemberItems } from "./memberEdit";

export type MemberCatalogExternalChange =
  | { kind: "removed"; catalogId: string }
  | { kind: "imported"; catalogId: string; fromSelf: boolean };

export function shouldReloadEditingMemberCatalogItems(
  savedItems: readonly Member[],
  loadedItems: readonly Member[],
): boolean {
  return !sameMemberItems(savedItems, loadedItems);
}

export function overlayReactionToMemberCatalogChange(
  editingCatalogId: string | null,
  change: MemberCatalogExternalChange,
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
