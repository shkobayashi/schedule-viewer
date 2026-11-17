import type { ScheduleId } from "./types";

/** 線を引くモードで、同じバーへの二重クリックを線追加とみなさない窓。 */
export const TIMELINE_LINK_DOUBLE_CLICK_MS = 500;

export type TimelineLinkPointerFire = {
  taskId: ScheduleId;
  at: number;
};

/** 線を引くモードの pointerup が、リンク先クリックとして扱えるか。 */
export function shouldFireTimelineLinkPointerClick(input: {
  taskId: ScheduleId;
  eventClickDetail: number;
  lastFire: TimelineLinkPointerFire | null;
  now: number;
  doubleClickWindowMs?: number;
}): boolean {
  if (input.eventClickDetail > 1) return false;
  const windowMs = input.doubleClickWindowMs ?? TIMELINE_LINK_DOUBLE_CLICK_MS;
  const last = input.lastFire;
  if (
    last?.taskId === input.taskId &&
    input.now - last.at < windowMs
  ) {
    return false;
  }
  return true;
}
