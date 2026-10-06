import { describe, expect, it } from "vitest";
import {
  activeFilterChips,
  activeFilterCount,
  filterChipClearPatch,
  pruneHiddenMilestoneGroupIds,
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

  it("lists each hidden milestone group", () => {
    const chips = activeFilterChips(
      base,
      [],
      null,
      null,
      [{ id: "e1000001-0000-4000-8000-000000000001", name: "承認" }],
      ["e1000001-0000-4000-8000-000000000001"],
    );
    expect(chips.map((chip) => chip.label)).toEqual(["帯の線: 承認を非表示"]);
  });
});

describe("pruneHiddenMilestoneGroupIds", () => {
  it("drops ids whose groups are gone", () => {
    expect(
      pruneHiddenMilestoneGroupIds(
        [
          "e1000001-0000-4000-8000-000000000001",
          "e1000001-0000-4000-8000-000000000099",
        ],
        [{ id: "e1000001-0000-4000-8000-000000000001", name: "G" }],
      ),
    ).toEqual(["e1000001-0000-4000-8000-000000000001"]);
  });
});

describe("activeFilterCount", () => {
  it("does not count lineage for the filter button", () => {
    expect(activeFilterCount({ ...base, search: "a" }, false)).toBe(1);
    expect(activeFilterCount({ ...base, search: "a" }, true)).toBe(2);
    expect(activeFilterCount(base, false, 2)).toBe(1);
  });
});
