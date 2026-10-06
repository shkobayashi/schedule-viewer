import { addDays, daysBetween, parseDate } from "./dates";
import { activeFilterChips } from "./filterChips";
import {
  NO_MILESTONE_FILTER,
  type Milestone,
  type MilestoneGroup,
  type ScheduleFilters,
  type ScheduleId,
  type VisibleRow,
} from "./types";

/** 絞り込み後の行に合わせて、書き出しに載せるマイルストンを決める。 */
export function milestonesForExport(
  milestoneFilter: string,
  _milestoneGroups: MilestoneGroup[],
  visibleGroupIds: ReadonlySet<ScheduleId>,
  milestones: Milestone[],
  visibleRows: VisibleRow[],
): Milestone[] {
  const visible = milestones.filter((milestone) =>
    visibleGroupIds.has(milestone.groupId),
  );
  if (milestoneFilter === NO_MILESTONE_FILTER) return [];
  if (milestoneFilter !== "all") {
    return visible.filter((milestone) => milestone.id === milestoneFilter);
  }
  const referenced = new Set<string>();
  let min: string | null = null;
  let max: string | null = null;
  const consider = (iso: string) => {
    if (min == null || iso < min) min = iso;
    if (max == null || iso > max) max = iso;
  };
  for (const row of visibleRows) {
    if (row.type === "task") {
      consider(row.task.start);
      consider(row.task.end);
      if (row.task.milestoneId != null) referenced.add(row.task.milestoneId);
    } else if (row.summary != null) {
      consider(row.summary.start);
      consider(row.summary.end);
    }
  }
  return visible.filter((milestone) => {
    if (referenced.has(milestone.id)) return true;
    if (min == null || max == null) return false;
    return milestone.date >= min && milestone.date <= max;
  });
}

/** 見えている行と、書き出し対象のマイルストンから期間を決める。画面全体の期間は使わない。 */
export function exportTimelineRange(
  visibleRows: VisibleRow[],
  milestones: Milestone[],
  today: string,
): {
  timelineStart: Date;
  timelineEnd: Date;
  totalDays: number;
} {
  let minDate: Date | null = null;
  let maxDate: Date | null = null;
  const consider = (date: Date) => {
    if (!minDate || date < minDate) minDate = date;
    if (!maxDate || date > maxDate) maxDate = date;
  };
  for (const row of visibleRows) {
    if (row.type === "task") {
      consider(parseDate(row.task.start));
      consider(parseDate(row.task.end));
    } else if (row.summary != null) {
      consider(parseDate(row.summary.start));
      consider(parseDate(row.summary.end));
    }
  }
  for (const milestone of milestones) {
    consider(parseDate(milestone.date));
  }
  if (!minDate || !maxDate) {
    const todayDate = parseDate(today);
    minDate = todayDate;
    maxDate = todayDate;
  }
  const timelineStart = addDays(minDate, -6);
  const timelineEnd = addDays(maxDate, 7);
  return {
    timelineStart,
    timelineEnd,
    totalDays: daysBetween(timelineStart, timelineEnd),
  };
}

/** 初期値以外の絞り込みだけを、書き出しの説明文にする。該当がなければ空文字。 */
export function describeActiveFilters(
  filters: ScheduleFilters,
  milestones: Milestone[],
  assigneeLabel: string | null,
  milestoneGroups: MilestoneGroup[] = [],
  hiddenMilestoneGroupIds: readonly ScheduleId[] = [],
): string {
  return activeFilterChips(
    filters,
    milestones,
    assigneeLabel,
    null,
    milestoneGroups,
    hiddenMilestoneGroupIds,
  )
    .filter((chip) => chip.kind !== "lineage")
    .map((chip) => chip.label)
    .join("、");
}
