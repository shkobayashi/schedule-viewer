/** 日・週・月ヘッダーの左上ラベル用。スクロール位置からアンカー日の index を求める。 */
export function timelineHeaderScrollAnchorDay(
  scrollX: number,
  pxPerDay: number,
  totalDays: number,
): number {
  return Math.max(
    0,
    Math.min(totalDays - 1, Math.floor(scrollX / Math.max(pxPerDay, 0.001))),
  );
}
