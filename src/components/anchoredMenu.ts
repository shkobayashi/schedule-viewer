/** ビューポート内に収めるためのオフセット。 */
export function menuViewportShift(rect: DOMRect, margin = 8): { x: number; y: number } {
  let dx = 0;
  let dy = 0;
  if (rect.right > window.innerWidth - margin) {
    dx = window.innerWidth - margin - rect.right;
  }
  if (rect.bottom > window.innerHeight - margin) {
    dy = window.innerHeight - margin - rect.bottom;
  }
  if (rect.left + dx < margin) dx = margin - rect.left;
  if (rect.top + dy < margin) dy = margin - rect.top;
  return { x: dx, y: dy };
}

export function anchorBelowRect(anchor: HTMLElement, gap = 4): { left: number; top: number } {
  const rect = anchor.getBoundingClientRect();
  return { left: rect.left, top: rect.bottom + gap };
}
