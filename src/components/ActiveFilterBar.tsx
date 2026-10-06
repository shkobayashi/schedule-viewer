import {
  activeFilterChips,
  DEFAULT_FILTERS,
  filterChipClearPatch,
  type FilterChipKind,
} from "../model/filterChips";
import type { Milestone, ScheduleFilters } from "../model/types";

type ActiveFilterBarProps = {
  filters: ScheduleFilters;
  milestones: Milestone[];
  assigneeLabel: string | null;
  lineageName: string | null;
  onFiltersChange: (patch: Partial<ScheduleFilters>) => void;
  onClearLineage: () => void;
};

export function ActiveFilterBar({
  filters,
  milestones,
  assigneeLabel,
  lineageName,
  onFiltersChange,
  onClearLineage,
}: ActiveFilterBarProps) {
  const chips = activeFilterChips(
    filters,
    milestones,
    assigneeLabel,
    lineageName,
  );
  if (chips.length === 0) return null;

  const clearChip = (kind: FilterChipKind) => {
    if (kind === "lineage") {
      onClearLineage();
      return;
    }
    onFiltersChange(filterChipClearPatch(kind));
  };

  const clearAllFilters = () => {
    onFiltersChange(DEFAULT_FILTERS);
  };

  const hasFilterChips = chips.some((chip) => chip.kind !== "lineage");

  return (
    <div className="filter-bar">
      {chips.map((chip) => (
        <button
          key={`${chip.kind}-${chip.label}`}
          type="button"
          className="filter-chip"
          onClick={() => clearChip(chip.kind)}
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
