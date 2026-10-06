import {
  NO_MILESTONE_FILTER,
  UNASSIGNED_FILTER,
  UNASSIGNED_LABEL,
  type Milestone,
  type ScheduleFilters,
} from "./types";

export type FilterChipKind =
  | "assignee"
  | "status"
  | "confidence"
  | "overdue"
  | "relation"
  | "milestone"
  | "search"
  | "noteSearch"
  | "lineage";

export type FilterChip = {
  kind: FilterChipKind;
  label: string;
};

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

export const DEFAULT_FILTERS: ScheduleFilters = {
  assignee: "all",
  status: "all",
  confidence: "all",
  overdue: "all",
  relation: "all",
  milestone: "all",
  search: "",
  noteSearch: "",
};

export function filterChipClearPatch(
  kind: FilterChipKind,
): Partial<ScheduleFilters> {
  switch (kind) {
    case "assignee":
      return { assignee: "all" };
    case "status":
      return { status: "all" };
    case "confidence":
      return { confidence: "all" };
    case "overdue":
      return { overdue: "all" };
    case "relation":
      return { relation: "all" };
    case "milestone":
      return { milestone: "all" };
    case "search":
      return { search: "" };
    case "noteSearch":
      return { noteSearch: "" };
    default:
      return {};
  }
}

export function activeFilterChips(
  filters: ScheduleFilters,
  milestones: Milestone[],
  assigneeLabel: string | null,
  lineageName: string | null,
): FilterChip[] {
  const chips: FilterChip[] = [];
  if (filters.assignee === UNASSIGNED_FILTER) {
    chips.push({ kind: "assignee", label: `担当: ${UNASSIGNED_LABEL}` });
  } else if (filters.assignee !== "all") {
    chips.push({
      kind: "assignee",
      label: `担当: ${assigneeLabel ?? filters.assignee}`,
    });
  }
  if (filters.status !== "all") {
    chips.push({
      kind: "status",
      label: `ステータス: ${STATUS_LABEL[filters.status]}`,
    });
  }
  if (filters.confidence !== "all") {
    chips.push({
      kind: "confidence",
      label: `確度: ${CONFIDENCE_LABEL[filters.confidence]}`,
    });
  }
  if (filters.overdue === "overdue") {
    chips.push({ kind: "overdue", label: "期限: 期限超過" });
  }
  if (filters.relation === "broken") {
    chips.push({ kind: "relation", label: "前後: 破綻のみ" });
  }
  if (filters.milestone === NO_MILESTONE_FILTER) {
    chips.push({ kind: "milestone", label: "マイルストン: なし" });
  } else if (filters.milestone !== "all") {
    const milestone = milestones.find((item) => item.id === filters.milestone);
    chips.push({
      kind: "milestone",
      label: milestone
        ? `マイルストン: ${milestone.name}（${milestone.date}）`
        : `マイルストン: ${filters.milestone}`,
    });
  }
  const search = filters.search.trim();
  if (search) chips.push({ kind: "search", label: `タスク名: 「${search}」` });
  const noteSearch = filters.noteSearch.trim();
  if (noteSearch) {
    chips.push({ kind: "noteSearch", label: `ノート: 「${noteSearch}」` });
  }
  if (lineageName) {
    chips.push({ kind: "lineage", label: `系統: ${lineageName}` });
  }
  return chips;
}

export function activeFilterCount(
  filters: ScheduleFilters,
  lineageActive: boolean,
): number {
  let count = 0;
  if (filters.assignee !== "all") count += 1;
  if (filters.status !== "all") count += 1;
  if (filters.confidence !== "all") count += 1;
  if (filters.overdue !== "all") count += 1;
  if (filters.relation !== "all") count += 1;
  if (filters.milestone !== "all") count += 1;
  if (filters.search.trim()) count += 1;
  if (filters.noteSearch.trim()) count += 1;
  if (lineageActive) count += 1;
  return count;
}
