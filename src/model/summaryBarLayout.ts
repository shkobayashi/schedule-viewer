/** 親行バーの高さ（px）。チャートの barHeight から求める。 */
export function summaryBarHeightPx(barHeight: number): number {
  return Math.max(3, Math.round(barHeight * 0.35));
}

/** 親行バー両端の三角キャップの高さ（px）。 */
export function summaryBarCapPx(summaryBarHeight: number): number {
  return Math.max(3, Math.round(summaryBarHeight * 0.9));
}
