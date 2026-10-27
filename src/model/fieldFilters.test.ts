import { describe, expect, it } from "vitest";
import {
  fieldFilterChipLabel,
  filterFieldsByQuery,
  parseFieldFiltersRecord,
  pruneFieldFilters,
  relaxFieldFiltersForNewTask,
  taskMatchesFieldFilters,
} from "./fieldFilters";
import { activeFilterChips, activeFilterCount } from "./filterChips";
import { DEFAULT_FILTERS } from "./filterChips";
import { buildActiveFilterConditions } from "./screenContext";
import { taskMatchesFilter } from "./rows";
import type { ScheduleFieldDef, ScheduleFilters, Task } from "./types";

const fields: ScheduleFieldDef[] = [
  { key: "memo", name: "メモ", type: "text" },
  { key: "score", name: "点数", type: "number" },
  { key: "ratio", name: "消化率", type: "number", percent: true },
  { key: "due", name: "確認日", type: "date" },
  {
    key: "lane",
    name: "区分",
    type: "choice",
    choices: ["内製", "外注"],
  },
];

const baseTask: Task = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "T",
  start: "2026-01-01",
  end: "2026-01-02",
  assigneeId: null,
  status: "not-started",
  progress: 0,
  confidence: "committed",
  predecessors: [],
  milestoneId: null,
};

const withValues: Task = {
  ...baseTask,
  fieldValues: {
    memo: "レビュー前",
    score: 8,
    ratio: 20,
    due: "2026-05-15",
    lane: "内製",
  },
};

describe("taskMatchesFieldFilters types", () => {
  it("filters text by substring", () => {
    const state = {
      memo: { empty: "any" as const, text: "レビュー" },
    };
    expect(taskMatchesFieldFilters(withValues, fields, state)).toBe(true);
    expect(
      taskMatchesFieldFilters(
        { ...withValues, fieldValues: { ...withValues.fieldValues!, memo: "完了" } },
        fields,
        state,
      ),
    ).toBe(false);
  });

  it("filters number and percent as stored values", () => {
    const state = {
      score: { empty: "any" as const, min: 3, max: 10 },
      ratio: { empty: "any" as const, min: 15 },
    };
    expect(taskMatchesFieldFilters(withValues, fields, state)).toBe(true);
    expect(
      taskMatchesFieldFilters(
        { ...withValues, fieldValues: { ...withValues.fieldValues!, score: 2 } },
        fields,
        state,
      ),
    ).toBe(false);
  });

  it("filters date range inclusively and rejects inverted range", () => {
    const ok = {
      due: { empty: "any" as const, from: "2026-05-01", to: "2026-05-31" },
    };
    expect(taskMatchesFieldFilters(withValues, fields, ok)).toBe(true);
    const inverted = {
      due: { empty: "any" as const, from: "2026-06-01", to: "2026-05-01" },
    };
    expect(taskMatchesFieldFilters(withValues, fields, inverted)).toBe(false);
  });

  it("filters choice by exact match", () => {
    const state = { lane: { empty: "any" as const, choice: "内製" } };
    expect(taskMatchesFieldFilters(withValues, fields, state)).toBe(true);
    expect(
      taskMatchesFieldFilters(
        { ...withValues, fieldValues: { ...withValues.fieldValues!, lane: "外注" } },
        fields,
        state,
      ),
    ).toBe(false);
  });
});

describe("empty value modes", () => {
  it("keeps tasks without a value when empty is keep and value condition is set", () => {
    const state = { memo: { empty: "keep" as const, text: "レビュー" } };
    expect(taskMatchesFieldFilters(withValues, fields, state)).toBe(true);
    expect(taskMatchesFieldFilters(baseTask, fields, state)).toBe(true);
    expect(
      taskMatchesFieldFilters(
        { ...withValues, fieldValues: { ...withValues.fieldValues!, memo: "別" } },
        fields,
        state,
      ),
    ).toBe(false);
  });

  it("keeps only tasks without a value when only empty keep is set", () => {
    const state = { memo: { empty: "keep" as const } };
    expect(taskMatchesFieldFilters(baseTask, fields, state)).toBe(true);
    expect(taskMatchesFieldFilters(withValues, fields, state)).toBe(false);
  });

  it("keeps only tasks with a value when empty is exclude without value condition", () => {
    const state = { memo: { empty: "exclude" as const } };
    expect(taskMatchesFieldFilters(withValues, fields, state)).toBe(true);
    expect(taskMatchesFieldFilters(baseTask, fields, state)).toBe(false);
  });
});

describe("definitions absent", () => {
  it("does not filter when fields are undefined", () => {
    const state = { memo: { empty: "any" as const, text: "x" } };
    expect(taskMatchesFieldFilters(withValues, undefined, state)).toBe(true);
  });
});

describe("fieldFilterChipLabel", () => {
  it("formats labels for each type", () => {
    expect(
      fieldFilterChipLabel(fields[0], { empty: "any", text: "レビュー" }),
    ).toBe("メモ: 「レビュー」を含む");
    expect(
      fieldFilterChipLabel(fields[1], { empty: "any", min: 3, max: 10 }),
    ).toBe("点数: 3 以上 10 以下");
    expect(
      fieldFilterChipLabel(fields[2], { empty: "any", min: 20 }),
    ).toBe("消化率: 20% 以上");
    expect(
      fieldFilterChipLabel(fields[3], { empty: "any", from: "2026-05-01" }),
    ).toBe("確認日: 2026-05-01 から");
    expect(
      fieldFilterChipLabel(fields[4], { empty: "any", choice: "内製" }),
    ).toBe("区分: 内製");
    expect(
      fieldFilterChipLabel(fields[0], { empty: "keep", text: "a" }),
    ).toBe("メモ: 「a」を含む、値が無いものも残す");
    expect(fieldFilterChipLabel(fields[0], { empty: "keep" })).toBe(
      "メモ: 値が無いものを残す",
    );
    expect(fieldFilterChipLabel(fields[0], { empty: "exclude" })).toBe(
      "メモ: 値が無いものを除く",
    );
  });
});

describe("activeFilterCount and chips", () => {
  const filters: ScheduleFilters = {
    ...DEFAULT_FILTERS,
    fieldFilters: {
      memo: { empty: "any", text: "a" },
      score: { empty: "any", min: 1 },
    },
  };

  it("counts each active field filter", () => {
    expect(activeFilterCount(filters, false, 0, fields)).toBe(2);
  });

  it("lists field filter chips in definition order", () => {
    const chips = activeFilterChips(
      filters,
      [],
      null,
      null,
      [],
      [],
      [],
      undefined,
      fields,
    );
    expect(chips.filter((c) => c.kind === "fieldFilter").map((c) => c.label)).toEqual([
      "メモ: 「a」を含む",
      "点数: 1 以上",
    ]);
  });
});

describe("filterFieldsByQuery", () => {
  it("matches names like tag search", () => {
    expect(filterFieldsByQuery(fields, "")).toEqual(fields);
    expect(filterFieldsByQuery(fields, "  消  ")).toEqual([
      fields[2],
    ]);
    expect(filterFieldsByQuery(fields, "メモ")).toEqual([fields[0]]);
    expect(filterFieldsByQuery(fields, "memo")).toEqual([]);
  });
});

describe("pruneFieldFilters", () => {
  it("drops unknown keys and invalid choices", () => {
    const pruned = pruneFieldFilters(fields, {
      memo: { empty: "any", text: "x" },
      gone: { empty: "any", text: "y" },
      lane: { empty: "any", choice: "存在しない" },
    });
    expect(Object.keys(pruned)).toEqual(["memo"]);
  });

  it("returns the same object when already pruned", () => {
    const memo = { empty: "any" as const, text: "x" };
    const input = { memo };
    const pruned = pruneFieldFilters(fields, input);
    expect(pruned).toBe(input);
    expect(pruned.memo).toBe(memo);
  });
});

describe("relaxFieldFiltersForNewTask", () => {
  it("clears only conditions that hide the new task", () => {
    const fieldFilters = {
      memo: { empty: "any" as const, text: "レビュー" },
      score: { empty: "any" as const, min: 100 },
    };
    const relaxed = relaxFieldFiltersForNewTask(fieldFilters, fields, withValues);
    expect(relaxed.memo).toEqual({ empty: "any", text: "レビュー" });
    expect(relaxed.score).toEqual({ empty: "any" });
  });
});

describe("parseFieldFiltersRecord", () => {
  it("ignores invalid entries per key", () => {
    const parsed = parseFieldFiltersRecord(fields, {
      memo: { empty: "any", text: "ok" },
      score: { empty: "bad" },
    });
    expect(parsed).toEqual({ memo: { empty: "any", text: "ok" } });
  });
});

describe("taskMatchesFilter with outline-only categories", () => {
  it("applies field filters the same way", () => {
    const filters: ScheduleFilters = {
      ...DEFAULT_FILTERS,
      fieldFilters: { memo: { empty: "any", text: "レビュー" } },
    };
    expect(
      taskMatchesFilter(withValues, filters, "2026-01-01", null, undefined, null, undefined, fields),
    ).toBe(true);
    expect(
      taskMatchesFilter(baseTask, filters, "2026-01-01", null, undefined, null, undefined, fields),
    ).toBe(false);
  });
});

describe("buildActiveFilterConditions field filters", () => {
  it("lists active field filters after milestone band hidden", () => {
    const conditions = buildActiveFilterConditions({
      filters: {
        ...DEFAULT_FILTERS,
        fieldFilters: { memo: { empty: "any", text: "x" } },
      },
      hiddenMilestoneGroupIds: ["g1"],
      milestoneGroups: [{ id: "g1", name: "承認" }],
      milestones: [],
      lineageTaskId: null,
      categories: [],
      memberCatalog: null,
      fields,
    });
    expect(conditions.map((c) => c.type)).toEqual([
      "milestoneBandHidden",
      "fieldFilter",
    ]);
    expect(conditions[1]).toMatchObject({
      type: "fieldFilter",
      key: "memo",
      label: "メモ: 「x」を含む",
    });
  });
});
