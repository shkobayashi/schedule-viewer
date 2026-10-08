import { describe, expect, it } from "vitest";
import {
  activeFilterChips,
  activeFilterCount,
  filterChipClearPatch,
  hasOtherVisibleMilestoneBandGroup,
  hiddenMilestoneGroupIdsForShowOnly,
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
  tags: [],
  search: "",
  noteSearch: "",
};

describe("activeFilterChips tag", () => {
  it("shows a tag chip per selected tag in document order", () => {
    const chips = activeFilterChips(
      { ...base, tags: ["共有", "説明"] },
      [],
      null,
      null,
      [],
      [],
      ["説明", "共有", "その他"],
    );
    expect(chips.map((chip) => chip.label)).toEqual([
      "タグ: 説明",
      "タグ: 共有",
    ]);
    expect(chips[0]).toMatchObject({ kind: "tag", tagName: "説明" });
  });
});

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
    expect(filterChipClearPatch("tag")).toEqual({ tags: [] });
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

  it("counts tag filter once regardless of how many tags are selected", () => {
    expect(activeFilterCount({ ...base, tags: ["a"] }, false)).toBe(1);
    expect(activeFilterCount({ ...base, tags: ["a", "b"] }, false)).toBe(1);
  });
});

describe("hiddenMilestoneGroupIdsForShowOnly", () => {
  const groups = [
    { id: "e1000001-0000-4000-8000-000000000001", name: "A" },
    { id: "e1000001-0000-4000-8000-000000000002", name: "B" },
    { id: "e1000001-0000-4000-8000-000000000003", name: "C" },
  ];

  it("hides every group except the kept one", () => {
    expect(
      hiddenMilestoneGroupIdsForShowOnly(
        "e1000001-0000-4000-8000-000000000002",
        groups,
      ),
    ).toEqual([
      "e1000001-0000-4000-8000-000000000001",
      "e1000001-0000-4000-8000-000000000003",
    ]);
  });
});

describe("hasOtherVisibleMilestoneBandGroup", () => {
  const visible = new Set([
    "e1000001-0000-4000-8000-000000000001",
    "e1000001-0000-4000-8000-000000000002",
  ]);

  it("is false when no other visible group has milestones", () => {
    expect(
      hasOtherVisibleMilestoneBandGroup(
        visible,
        [{ id: "m1", name: "M", date: "2026-01-01", confidence: "committed", groupId: "e1000001-0000-4000-8000-000000000001" }],
        "e1000001-0000-4000-8000-000000000001",
      ),
    ).toBe(false);
  });

  it("is true when another visible group has milestones", () => {
    expect(
      hasOtherVisibleMilestoneBandGroup(
        visible,
        [
          { id: "m1", name: "M", date: "2026-01-01", confidence: "committed", groupId: "e1000001-0000-4000-8000-000000000001" },
          { id: "m2", name: "N", date: "2026-01-02", confidence: "committed", groupId: "e1000001-0000-4000-8000-000000000002" },
        ],
        "e1000001-0000-4000-8000-000000000001",
      ),
    ).toBe(true);
  });
});
