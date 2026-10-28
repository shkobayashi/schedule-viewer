import { isoDate } from "../model/dates";
import { menuShiftForRect } from "./anchoredMenu";

export type MonthCell = { iso: string; day: number };

/** その月のマス。先頭は日曜始まりの空欄。 */
export function monthCells(
  year: number,
  monthIndex: number,
): Array<MonthCell | null> {
  const lead = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const count = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const cells: Array<MonthCell | null> = [];
  for (let i = 0; i < lead; i += 1) cells.push(null);
  for (let day = 1; day <= count; day += 1) {
    cells.push({
      iso: isoDate(new Date(Date.UTC(year, monthIndex, day))),
      day,
    });
  }
  return cells;
}

/** 欄の下に空きが足りないときは、カレンダーを欄の上に置く。 */
export function datePopoverAnchorTop(
  anchorTop: number,
  anchorBottom: number,
  height: number,
  viewportHeight: number,
  gap = 4,
  margin = 8,
): number {
  const spaceBelow = viewportHeight - anchorBottom - margin;
  const spaceAbove = anchorTop - margin;
  if (spaceBelow < height && spaceAbove >= spaceBelow) {
    return anchorTop - gap - height;
  }
  return anchorBottom + gap;
}

export function isDatePopoverTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(".date-popover") != null;
}

/** 補正前の位置を一度だけ画面内へずらす。 */
export function placeDatePopover(
  anchorLeft: number,
  anchorTop: number,
  anchorBottom: number,
  width: number,
  height: number,
  gap = 4,
  margin = 8,
): { left: number; top: number } {
  const top = datePopoverAnchorTop(
    anchorTop,
    anchorBottom,
    height,
    window.innerHeight,
    gap,
    margin,
  );
  const shift = menuShiftForRect(anchorLeft, top, width, height, margin);
  return { left: anchorLeft + shift.x, top: top + shift.y };
}
