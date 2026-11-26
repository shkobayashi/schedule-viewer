/** タスク間アークのラベル fontSize（TaskBar 高さから求める）。 */
export function connectionArcLabelFontSize(barHeight: number): number {
  return Math.max(10, Math.round(11 * (barHeight / 20)));
}
