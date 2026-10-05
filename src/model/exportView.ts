import { addDays, daysBetween, parseDate } from "./dates";
import {
  NO_MILESTONE_FILTER,
  UNASSIGNED_FILTER,
  UNASSIGNED_LABEL,
  type Milestone,
  type ScheduleFilters,
  type VisibleRow,
} from "./types";

/** 絞り込み後の行に合わせて、書き出しに載せるマイルストンを決める。 */
export function milestonesForExport(
  milestoneFilter: string,
  milestones: Milestone[],
  visibleRows: VisibleRow[],
): Milestone[] {
  if (milestoneFilter === NO_MILESTONE_FILTER) return [];
  if (milestoneFilter !== "all") {
    return milestones.filter((milestone) => milestone.id === milestoneFilter);
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
  return milestones.filter((milestone) => {
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

const STATUS_LABEL: Record<Exclude<ScheduleFilters["status"], "all">, string> = {
  "not-done": "完了以外",
  "not-started": "未着手",
  "in-progress": "進行中",
  done: "完了",
};

const CONFIDENCE_LABEL: Record<
  Exclude<ScheduleFilters["confidence"], "all">,
  string
> = {
  tentative: "未確定",
  committed: "確定",
};

/** 初期値以外の絞り込みだけを、書き出しの説明文にする。該当がなければ空文字。 */
export function describeActiveFilters(
  filters: ScheduleFilters,
  milestones: Milestone[],
  assigneeLabel: string | null,
): string {
  const parts: string[] = [];
  if (filters.assignee === UNASSIGNED_FILTER) {
    parts.push(`担当: ${UNASSIGNED_LABEL}`);
  } else if (filters.assignee !== "all") {
    parts.push(`担当: ${assigneeLabel ?? filters.assignee}`);
  }
  if (filters.status !== "all") {
    parts.push(`ステータス: ${STATUS_LABEL[filters.status]}`);
  }
  if (filters.confidence !== "all") {
    parts.push(`確度: ${CONFIDENCE_LABEL[filters.confidence]}`);
  }
  if (filters.overdue === "overdue") {
    parts.push("期限: 期限超過");
  }
  if (filters.relation === "broken") {
    parts.push("前後: 破綻のみ");
  }
  if (filters.milestone === NO_MILESTONE_FILTER) {
    parts.push("マイルストン: なし");
  } else if (filters.milestone !== "all") {
    const milestone = milestones.find((item) => item.id === filters.milestone);
    parts.push(
      milestone
        ? `マイルストン: ${milestone.name}（${milestone.date}）`
        : `マイルストン: ${filters.milestone}`,
    );
  }
  const search = filters.search.trim();
  if (search) parts.push(`タスク名: 「${search}」`);
  const noteSearch = filters.noteSearch.trim();
  if (noteSearch) parts.push(`ノート: 「${noteSearch}」`);
  return parts.join("、");
}
