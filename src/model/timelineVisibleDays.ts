/** 横スクロール位置から、ループすべき日インデックスの範囲（両端含む）。 */
export function visibleDayIndexRange(
  scrollX: number,
  pxPerDay: number,
  width: number,
  totalDays: number,
  marginPx = 120,
): { start: number; end: number } {
  if (pxPerDay <= 0) {
    return { start: 0, end: totalDays };
  }
  const start = Math.max(0, Math.floor((scrollX - marginPx) / pxPerDay));
  const end = Math.min(
    totalDays,
    Math.ceil((scrollX + width + marginPx) / pxPerDay),
  );
  return { start, end };
}
