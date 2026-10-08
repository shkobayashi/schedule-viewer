import {
  NO_MILESTONE_FILTER,
  UNASSIGNED_FILTER,
  UNASSIGNED_LABEL,
  type Milestone,
  type MilestoneGroup,
  type ScheduleFilters,
  type ScheduleId,
} from "./types";

export type FilterChipKind =
  | "assignee"
  | "status"
  | "confidence"
  | "overdue"
  | "relation"
  | "milestone"
  | "tag"
  | "search"
  | "noteSearch"
  | "lineage"
  | "milestoneGroup";

export type FilterChip = {
  kind: FilterChipKind;
  label: string;
  milestoneGroupId?: ScheduleId;
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
  tag: "",
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
    case "tag":
      return { tag: "" };
    case "search":
      return { search: "" };
    case "noteSearch":
      return { noteSearch: "" };
    case "milestoneGroup":
      return {};
    default:
      return {};
  }
}

export function activeFilterChips(
  filters: ScheduleFilters,
  milestones: Milestone[],
  assigneeLabel: string | null,
  lineageName: string | null,
  milestoneGroups: MilestoneGroup[] = [],
  hiddenMilestoneGroupIds: readonly ScheduleId[] = [],
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
  if (filters.tag !== "") {
    chips.push({ kind: "tag", label: `タグ: ${filters.tag}` });
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
  const hidden = new Set(hiddenMilestoneGroupIds);
  for (const group of milestoneGroups) {
    if (!hidden.has(group.id)) continue;
    chips.push({
      kind: "milestoneGroup",
      label: `帯の線: ${group.name}を非表示`,
      milestoneGroupId: group.id,
    });
  }
  return chips;
}

/** 文書から消えたマイルストングループの非表示選択を外す。 */
export function pruneHiddenMilestoneGroupIds(
  hiddenIds: readonly ScheduleId[],
  milestoneGroups: readonly MilestoneGroup[],
): ScheduleId[] {
  const ids = new Set(milestoneGroups.map((group) => group.id));
  return hiddenIds.filter((id) => ids.has(id));
}

/** 「この行だけ表示」で隠すマイルストングループの ID。空のグループも含める。 */
export function hiddenMilestoneGroupIdsForShowOnly(
  keepGroupId: ScheduleId,
  milestoneGroups: readonly MilestoneGroup[],
): ScheduleId[] {
  return milestoneGroups
    .filter((group) => group.id !== keepGroupId)
    .map((group) => group.id);
}

/** 帯に出ている別のマイルストングループ行があるか。空のグループと非表示は数えない。 */
export function hasOtherVisibleMilestoneBandGroup(
  visibleGroupIds: ReadonlySet<ScheduleId>,
  milestones: readonly Milestone[],
  currentGroupId: ScheduleId,
): boolean {
  for (const groupId of visibleGroupIds) {
    if (groupId === currentGroupId) continue;
    if (milestones.some((milestone) => milestone.groupId === groupId)) {
      return true;
    }
  }
  return false;
}

export function activeFilterCount(
  filters: ScheduleFilters,
  lineageActive: boolean,
  hiddenMilestoneGroupCount = 0,
): number {
  let count = 0;
  if (filters.assignee !== "all") count += 1;
  if (filters.status !== "all") count += 1;
  if (filters.confidence !== "all") count += 1;
  if (filters.overdue !== "all") count += 1;
  if (filters.relation !== "all") count += 1;
  if (filters.milestone !== "all") count += 1;
  if (filters.tag !== "") count += 1;
  if (filters.search.trim()) count += 1;
  if (filters.noteSearch.trim()) count += 1;
  if (lineageActive) count += 1;
  if (hiddenMilestoneGroupCount > 0) count += 1;
  return count;
}
