import { LAYOUT_HEADER_HEIGHT } from "./layoutSizes";

/** 棒ドラッグ日付チップの typography（ヘッダー高さから求める）。 */
export function timelineDragDateChipMetrics(headerHeight: number): {
  dateFontSize: number;
  datePadX: number;
  datePadY: number;
  dateGap: number;
} {
  const scale = headerHeight / LAYOUT_HEADER_HEIGHT;
  return {
    dateFontSize: Math.max(8, Math.round(11 * scale)),
    datePadX: Math.max(3, Math.round(4 * scale)),
    datePadY: Math.max(1, Math.round(2 * scale)),
    dateGap: Math.max(4, Math.round(4 * scale)),
  };
}
