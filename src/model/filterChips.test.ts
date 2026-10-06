import { describe, expect, it } from "vitest";
import {
  activeFilterChips,
  activeFilterCount,
  filterChipClearPatch,
} from "./filterChips";
import type { ScheduleFilters } from "./types";

const base: ScheduleFilters = {
  assignee: "all",
  status: "all",
  confidence: "all",
  overdue: "all",
  relation: "all",
  milestone: "all",
  search: "",
  noteSearch: "",
};

describe("activeFilterChips", () => {
  it("includes lineage when a name is given", () => {
    const chips = activeFilterChips(
      { ...base, status: "in-progress" },
      [],
      null,
      "要件定義",
    );
    expect(chips.map((c) => c.label)).toEqual([
      "ステータス: 進行中",
      "系統: 要件定義",
    ]);
  });

  it("clears one field with filterChipClearPatch", () => {
    expect(filterChipClearPatch("search")).toEqual({ search: "" });
  });
});

describe("activeFilterCount", () => {
  it("does not count lineage for the filter button", () => {
    expect(activeFilterCount({ ...base, search: "a" }, false)).toBe(1);
    expect(activeFilterCount({ ...base, search: "a" }, true)).toBe(2);
  });
});
