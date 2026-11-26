import type { ColorItem } from "./colorCatalog";
import { rowFillForColorId } from "./colorCatalog";
import type { ResolvedColorScheme } from "./palette";
import { paletteFor } from "./palette";
import type { VisibleRow } from "./types";

/** 左一覧とチャートの行の地。タスクで色が無いときは見出し種別の既定色。 */
export function taskRowBackgroundFill(
  row: Extract<VisibleRow, { type: "task" }>,
  colors: readonly ColorItem[] | null,
  scheme: ResolvedColorScheme,
): string | null {
  return rowFillForColorId(colors, row.task.colorId, scheme);
}

export function hierarchyRowBackgroundFill(
  row: Extract<VisibleRow, { type: "category" | "group" | "hierarchy" }>,
  scheme: ResolvedColorScheme,
): string | null {
  const { chart, css } = paletteFor(scheme);
  if (row.type === "category") return chart.categoryRow;
  if (row.type === "group") return chart.groupRow;
  if (row.rowKind === "top" || row.alsoTaskParent) return chart.categoryRow;
  if (row.rowKind === "taskParent") return chart.groupRow;
  return css.bg;
}

export function visibleRowBackgroundFill(
  row: VisibleRow,
  colors: readonly ColorItem[] | null,
  scheme: ResolvedColorScheme,
): string | null {
  if (row.type === "task") {
    const custom = taskRowBackgroundFill(row, colors, scheme);
    if (custom != null) return custom;
    return null;
  }
  if (row.type === "category" || row.type === "group" || row.type === "hierarchy") {
    return hierarchyRowBackgroundFill(row, scheme);
  }
  return null;
}
