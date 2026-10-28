import type { ColorItem } from "./colorCatalog";
import { sameColorItems } from "./colorEdit";

export type ColorCatalogExternalChange =
  | { kind: "removed"; catalogId: string }
  | { kind: "imported"; catalogId: string; fromSelf: boolean };

export function shouldReloadEditingColorCatalogItems(
  savedItems: readonly ColorItem[],
  loadedItems: readonly ColorItem[],
): boolean {
  return !sameColorItems(savedItems, loadedItems);
}

export function overlayReactionToColorCatalogChange(
  editingCatalogId: string | null,
  change: ColorCatalogExternalChange,
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
