import { daysBetween, parseDate } from "./dates";
import type { Milestone, ScheduleId } from "./types";

const ORIGIN = parseDate("2020-01-01");

/** 対応マイルストンがあり、完了予定日がその日付より後のときだけ超過。 */
export function milestonesExceededBy(
  task: { end: string; milestoneId: ScheduleId | null },
  milestones: Milestone[],
): Milestone[] {
  if (task.milestoneId == null) return [];
  const milestone = milestones.find((item) => item.id === task.milestoneId);
  if (!milestone || task.end <= milestone.date) return [];
  return [milestone];
}

export function milestoneLabelWidth(name: string, fontSize: number): number {
  let width = 0;
  for (const ch of name) {
    width += ch.charCodeAt(0) > 0xff ? fontSize : fontSize * 0.62;
  }
  return width;
}

/** 日付とラベル幅から、重ならない段を割り当てる。横スクロールでは段が変わらない。 */
export function layoutMilestones(
  milestones: Milestone[],
  pxPerDay: number,
  fontSize: number,
  diamondSize: number,
): Map<ScheduleId, number> {
  const sorted = [...milestones].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
  );
  const laneEnds: number[] = [];
  const lanes = new Map<ScheduleId, number>();
  const dayWidth = Math.max(pxPerDay, 0.5);
  for (const milestone of sorted) {
    const day = daysBetween(ORIGIN, parseDate(milestone.date));
    const span =
      (diamondSize + 6 + milestoneLabelWidth(milestone.name, fontSize) + 10) /
      dayWidth;
    const right = day + span;
    let lane = laneEnds.findIndex((end) => day >= end);
    if (lane < 0) {
      lane = laneEnds.length;
      laneEnds.push(right);
    } else {
      laneEnds[lane] = right;
    }
    lanes.set(milestone.id, lane);
  }
  return lanes;
}
