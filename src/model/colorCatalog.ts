import type { ResolvedColorScheme } from "./palette";

export const COLORS_SCHEMA_VERSION = 1;

export type RowColor = { bg: string };

export type ColorItem = {
  id: string;
  name: string;
  color: { light: RowColor; dark: RowColor };
  /** この id を選ぶ状態だけ。LLM が id を選ぶ手がかり。 */
  description: string;
};

export type ColorsDocument = {
  schemaVersion: typeof COLORS_SCHEMA_VERSION;
  colors: ColorItem[];
};

export function findColorItem(
  items: readonly ColorItem[],
  id: string,
): ColorItem | undefined {
  return items.find((item) => item.id === id);
}

export function rowFillForColorId(
  items: readonly ColorItem[] | null,
  colorId: string | undefined,
  scheme: ResolvedColorScheme,
): string | null {
  if (items == null || colorId == null || colorId === "") return null;
  const item = findColorItem(items, colorId);
  if (item == null) return null;
  return scheme === "dark" ? item.color.dark.bg : item.color.light.bg;
}

/** Excel のタスク行の地。白いシートに合わせ、常にライトの地色を使う。 */
export function excelRowFillForColorId(
  items: readonly ColorItem[] | null,
  colorId: string | undefined,
): string | null {
  if (items == null || colorId == null || colorId === "") return null;
  const item = findColorItem(items, colorId);
  if (item == null) return null;
  return item.color.light.bg;
}

export function colorCatalogMap(
  items: readonly ColorItem[],
): Map<string, ColorItem> {
  return new Map(items.map((item) => [item.id, item]));
}
