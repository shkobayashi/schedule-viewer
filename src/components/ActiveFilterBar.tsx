import {
  activeFilterChips,
  DEFAULT_FILTERS,
  filterChipClearPatch,
  type FilterChipKind,
} from "../model/filterChips";
import type {
  Milestone,
  MilestoneGroup,
  ScheduleFilters,
  ScheduleId,
} from "../model/types";

type ActiveFilterBarProps = {
  filters: ScheduleFilters;
  milestones: Milestone[];
  milestoneGroups: MilestoneGroup[];
  hiddenMilestoneGroupIds: ScheduleId[];
  assigneeLabel: string | null;
  lineageName: string | null;
  onFiltersChange: (patch: Partial<ScheduleFilters>) => void;
  onClearLineage: () => void;
  onMilestoneGroupVisible: (groupId: ScheduleId, visible: boolean) => void;
  onShowAllMilestoneGroups: () => void;
};

export function ActiveFilterBar({
  filters,
  milestones,
  milestoneGroups,
  hiddenMilestoneGroupIds,
  assigneeLabel,
  lineageName,
  onFiltersChange,
  onClearLineage,
  onMilestoneGroupVisible,
  onShowAllMilestoneGroups,
}: ActiveFilterBarProps) {
  const chips = activeFilterChips(
    filters,
    milestones,
    assigneeLabel,
    lineageName,
    milestoneGroups,
    hiddenMilestoneGroupIds,
  );
  if (chips.length === 0) return null;

  const clearChip = (kind: FilterChipKind, milestoneGroupId?: ScheduleId) => {
    if (kind === "lineage") {
      onClearLineage();
      return;
    }
    if (kind === "milestoneGroup" && milestoneGroupId != null) {
      onMilestoneGroupVisible(milestoneGroupId, true);
      return;
    }
    onFiltersChange(filterChipClearPatch(kind));
  };

  const clearAllFilters = () => {
    onFiltersChange(DEFAULT_FILTERS);
    onShowAllMilestoneGroups();
  };

  const hasFilterChips = chips.some((chip) => chip.kind !== "lineage");

  return (
    <div className="filter-bar">
      {chips.map((chip) => (
        <button
          key={`${chip.kind}-${chip.label}`}
          type="button"
          className="filter-chip"
          onClick={() => clearChip(chip.kind, chip.milestoneGroupId)}
          title="この条件を外す"
        >
          <span>{chip.label}</span>
          <span className="filter-chip-x" aria-hidden="true">×</span>
        </button>
      ))}
      {hasFilterChips ? (
        <button type="button" className="filter-clear-all" onClick={clearAllFilters}>
          すべて解除
        </button>
      ) : null}
    </div>
  );
}
