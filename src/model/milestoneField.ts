import { NO_MILESTONE_FILTER } from "./types";
import type { Milestone, ScheduleId } from "./types";

export const MILESTONE_FIELD_CANDIDATE_LIMIT = 50;

export function formatMilestoneOptionLabel(milestone: Milestone): string {
  return `${milestone.name}（${milestone.date}）`;
}

/** 閉じた欄に出す文字。一覧に無い id も「なし」。 */
export function milestoneFieldClosedLabel(
  milestoneId: ScheduleId | null,
  milestones: readonly Milestone[],
): string {
  if (milestoneId == null) return "なし";
  const milestone = milestones.find((item) => item.id === milestoneId);
  if (!milestone) return "なし";
  return formatMilestoneOptionLabel(milestone);
}

export function filterMilestonesByQuery(
  milestones: readonly Milestone[],
  query: string,
): Milestone[] {
  const needle = query.trim();
  if (needle.length === 0) return [...milestones];
  return milestones.filter(
    (milestone) =>
      milestone.name.includes(needle) || milestone.date.includes(needle),
  );
}

export type MilestoneFieldOption =
  | { kind: "none" }
  | { kind: "milestone"; id: ScheduleId; label: string };

export type MilestoneFieldListState = {
  options: MilestoneFieldOption[];
  truncated: boolean;
  noMatches: boolean;
};

export function buildMilestoneFieldList(
  milestones: readonly Milestone[],
  query: string,
): MilestoneFieldListState {
  const trimmed = query.trim();
  const filtered = filterMilestonesByQuery(milestones, query);
  if (trimmed.length > 0 && filtered.length === 0) {
    return { options: [], truncated: false, noMatches: true };
  }
  const options: MilestoneFieldOption[] = [];
  if (trimmed.length === 0) {
    options.push({ kind: "none" });
  }
  const shown = filtered.slice(0, MILESTONE_FIELD_CANDIDATE_LIMIT);
  for (const milestone of shown) {
    options.push({
      kind: "milestone",
      id: milestone.id,
      label: formatMilestoneOptionLabel(milestone),
    });
  }
  return {
    options,
    truncated: filtered.length > MILESTONE_FIELD_CANDIDATE_LIMIT,
    noMatches: false,
  };
}

export function milestoneIdFromFieldOption(
  option: MilestoneFieldOption,
): ScheduleId | null {
  return option.kind === "none" ? null : option.id;
}

/** 一覧を開いた直後、または query が変わった直後の強調行。候補が無いときは -1。 */
export function initialMilestoneFieldActiveIndex(
  milestoneId: ScheduleId | null,
  list: MilestoneFieldListState,
  query: string,
): number {
  if (list.noMatches || list.options.length === 0) return -1;
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    if (milestoneId == null) {
      const noneIndex = list.options.findIndex((item) => item.kind === "none");
      return noneIndex >= 0 ? noneIndex : 0;
    }
    const currentIndex = list.options.findIndex(
      (item) => item.kind === "milestone" && item.id === milestoneId,
    );
    return currentIndex >= 0 ? currentIndex : -1;
  }
  if (milestoneId != null) {
    const currentIndex = list.options.findIndex(
      (item) => item.kind === "milestone" && item.id === milestoneId,
    );
    if (currentIndex >= 0) return currentIndex;
  }
  return 0;
}

export function stepMilestoneFieldActiveIndex(
  current: number,
  optionsLength: number,
  direction: "up" | "down",
): number {
  if (optionsLength === 0) return -1;
  if (current < 0) {
    return direction === "down" ? 0 : optionsLength - 1;
  }
  if (direction === "down") {
    return Math.min(current + 1, optionsLength - 1);
  }
  return Math.max(current - 1, 0);
}

export type MilestoneFilterOption =
  | { kind: "all" }
  | { kind: "none" }
  | { kind: "milestone"; id: ScheduleId; label: string };

export type MilestoneFilterListState = {
  options: MilestoneFilterOption[];
  truncated: boolean;
  noMatches: boolean;
};

/** 絞り込み欄を閉じたときの表示。「すべて」「なし」、または名前（日付）。 */
export function milestoneFilterClosedLabel(
  filterValue: string,
  milestones: readonly Milestone[],
): string {
  if (filterValue === "all") return "すべて";
  if (filterValue === NO_MILESTONE_FILTER) return "なし";
  const milestone = milestones.find((item) => item.id === filterValue);
  if (!milestone) return "すべて";
  return formatMilestoneOptionLabel(milestone);
}

export function buildMilestoneFilterList(
  milestones: readonly Milestone[],
  query: string,
): MilestoneFilterListState {
  const trimmed = query.trim();
  const filtered = filterMilestonesByQuery(milestones, query);
  if (trimmed.length > 0 && filtered.length === 0) {
    return { options: [], truncated: false, noMatches: true };
  }
  const options: MilestoneFilterOption[] = [];
  if (trimmed.length === 0) {
    options.push({ kind: "all" });
    options.push({ kind: "none" });
  }
  const shown = filtered.slice(0, MILESTONE_FIELD_CANDIDATE_LIMIT);
  for (const milestone of shown) {
    options.push({
      kind: "milestone",
      id: milestone.id,
      label: formatMilestoneOptionLabel(milestone),
    });
  }
  return {
    options,
    truncated: filtered.length > MILESTONE_FIELD_CANDIDATE_LIMIT,
    noMatches: false,
  };
}

export function milestoneFilterValueFromOption(
  option: MilestoneFilterOption,
): string {
  if (option.kind === "all") return "all";
  if (option.kind === "none") return NO_MILESTONE_FILTER;
  return option.id;
}

export function initialMilestoneFilterActiveIndex(
  filterValue: string,
  list: MilestoneFilterListState,
  query: string,
): number {
  if (list.noMatches || list.options.length === 0) return -1;
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    if (filterValue === "all") {
      const allIndex = list.options.findIndex((item) => item.kind === "all");
      return allIndex >= 0 ? allIndex : 0;
    }
    if (filterValue === NO_MILESTONE_FILTER) {
      const noneIndex = list.options.findIndex((item) => item.kind === "none");
      return noneIndex >= 0 ? noneIndex : 0;
    }
    const currentIndex = list.options.findIndex(
      (item) => item.kind === "milestone" && item.id === filterValue,
    );
    return currentIndex >= 0 ? currentIndex : -1;
  }
  if (filterValue !== "all" && filterValue !== NO_MILESTONE_FILTER) {
    const currentIndex = list.options.findIndex(
      (item) => item.kind === "milestone" && item.id === filterValue,
    );
    if (currentIndex >= 0) return currentIndex;
  }
  return 0;
}
