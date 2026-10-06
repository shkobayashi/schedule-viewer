/** ビューポート内に収めるためのオフセット。 */
export function menuViewportShift(rect: DOMRect, margin = 8): { x: number; y: number } {
  return menuShiftForRect(rect.left, rect.top, rect.width, rect.height, margin);
}

/** 補正前のアンカーとサイズから、ビューポート内に収めるずらしを求める。 */
export function menuShiftForRect(
  left: number,
  top: number,
  width: number,
  height: number,
  margin = 8,
): { x: number; y: number } {
  let dx = 0;
  let dy = 0;
  const right = left + width;
  const bottom = top + height;
  if (right > window.innerWidth - margin) {
    dx = window.innerWidth - margin - right;
  }
  if (bottom > window.innerHeight - margin) {
    dy = window.innerHeight - margin - bottom;
  }
  if (left + dx < margin) dx = margin - left;
  if (top + dy < margin) dy = margin - top;
  return { x: dx, y: dy };
}

export function anchorBelowRect(anchor: HTMLElement, gap = 4): { left: number; top: number } {
  const rect = anchor.getBoundingClientRect();
  return { left: rect.left, top: rect.bottom + gap };
}
