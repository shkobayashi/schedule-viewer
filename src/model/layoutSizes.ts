import type { RowDensity } from "./viewPreferences";

/** レイアウトの基準サイズ（`uiScale` 1 のとき）。 */
export const LAYOUT_HEADER_HEIGHT = 48;
export const LAYOUT_ROW_HEIGHT = 32;
export const LAYOUT_ROW_HEIGHT_COMPACT = 26;
export const LAYOUT_BAR_HEIGHT = 20;
export const LAYOUT_BAR_HEIGHT_COMPACT = 16;
export const LAYOUT_MILESTONE_LANE_HEIGHT = 26;

export function rowHeightForDensity(density: RowDensity): number {
  return density === "compact" ? LAYOUT_ROW_HEIGHT_COMPACT : LAYOUT_ROW_HEIGHT;
}

export function barHeightForDensity(density: RowDensity): number {
  return density === "compact" ? LAYOUT_BAR_HEIGHT_COMPACT : LAYOUT_BAR_HEIGHT;
}

export function scaledLayoutSizes(
  uiScale: number,
  density: RowDensity = "comfortable",
) {
  const rowBase = rowHeightForDensity(density);
  const barBase = barHeightForDensity(density);
  return {
    headerHeight: Math.round(LAYOUT_HEADER_HEIGHT * uiScale),
    rowHeight: Math.round(rowBase * uiScale),
    barHeight: Math.round(barBase * uiScale),
    milestoneLaneHeight: Math.round(LAYOUT_MILESTONE_LANE_HEIGHT * uiScale),
  };
}
