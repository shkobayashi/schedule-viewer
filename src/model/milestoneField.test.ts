import { describe, expect, it } from "vitest";
import {
  buildMilestoneFieldList,
  buildMilestoneFilterList,
  filterMilestonesByQuery,
  formatMilestoneOptionLabel,
  initialMilestoneFieldActiveIndex,
  initialMilestoneFilterActiveIndex,
  milestoneFieldClosedLabel,
  milestoneFilterClosedLabel,
  milestoneFilterValueFromOption,
  MILESTONE_FIELD_CANDIDATE_LIMIT,
  stepMilestoneFieldActiveIndex,
} from "./milestoneField";
import { NO_MILESTONE_FILTER } from "./types";
import type { Milestone } from "./types";

function milestone(
  id: string,
  name: string,
  date: string,
): Milestone {
  return {
    id,
    name,
    date,
    confidence: "committed",
    groupId: "g1",
  };
}

const MS_A = milestone("a", "Alpha", "2026-01-10");
const MS_B = milestone("b", "Beta", "2026-02-20");
const MS_CASE = milestone("c", "Beta", "2026-03-01");

describe("formatMilestoneOptionLabel", () => {
  it("joins name and date", () => {
    expect(formatMilestoneOptionLabel(MS_A)).toBe("Alpha（2026-01-10）");
  });
});

describe("milestoneFieldClosedLabel", () => {
  it("returns none for null and unknown id", () => {
    expect(milestoneFieldClosedLabel(null, [MS_A])).toBe("なし");
    expect(milestoneFieldClosedLabel("missing", [MS_A])).toBe("なし");
  });

  it("returns label for known id", () => {
    expect(milestoneFieldClosedLabel(MS_A.id, [MS_A])).toBe(
      "Alpha（2026-01-10）",
    );
  });
});

describe("filterMilestonesByQuery", () => {
  it("returns all in array order when query is empty or whitespace", () => {
    expect(filterMilestonesByQuery([MS_B, MS_A], "")).toEqual([MS_B, MS_A]);
    expect(filterMilestonesByQuery([MS_B, MS_A], "   ")).toEqual([
      MS_B,
      MS_A,
    ]);
  });

  it("matches name or date with trim, case-sensitive", () => {
    expect(filterMilestonesByQuery([MS_A, MS_B], "  lp  ")).toEqual([MS_A]);
    expect(filterMilestonesByQuery([MS_A, MS_B], "2026-02")).toEqual([MS_B]);
    expect(filterMilestonesByQuery([MS_CASE], "beta")).toEqual([]);
    expect(filterMilestonesByQuery([MS_CASE], "Beta")).toEqual([MS_CASE]);
  });

  it("does not match group id", () => {
    expect(filterMilestonesByQuery([MS_A], "g1")).toEqual([]);
  });
});

describe("buildMilestoneFieldList", () => {
  it("prepends none and keeps array order without date sort", () => {
    const list = buildMilestoneFieldList([MS_B, MS_A], "");
    expect(list.noMatches).toBe(false);
    expect(list.truncated).toBe(false);
    expect(list.options.map((item) =>
      item.kind === "none" ? "none" : item.label,
    )).toEqual(["none", "Beta（2026-02-20）", "Alpha（2026-01-10）"]);
  });

  it("omits none when query is non-empty", () => {
    const list = buildMilestoneFieldList([MS_A, MS_B], "Alpha");
    expect(list.options.every((item) => item.kind !== "none")).toBe(true);
    expect(list.options).toHaveLength(1);
  });

  it("caps milestones at 50 and none does not count", () => {
    const many: Milestone[] = [];
    for (let i = 0; i < 51; i++) {
      many.push(milestone(`id-${i}`, `M${i}`, `2026-01-${String(i + 1).padStart(2, "0")}`));
    }
    const list = buildMilestoneFieldList(many, "");
    expect(list.truncated).toBe(true);
    expect(list.options.filter((item) => item.kind === "milestone")).toHaveLength(
      MILESTONE_FIELD_CANDIDATE_LIMIT,
    );
    expect(list.options[0].kind).toBe("none");
  });

  it("reports no matches", () => {
    const list = buildMilestoneFieldList([MS_A], "zzz");
    expect(list.noMatches).toBe(true);
    expect(list.options).toHaveLength(0);
  });
});

describe("initialMilestoneFieldActiveIndex", () => {
  it("highlights none when unset and query empty", () => {
    const list = buildMilestoneFieldList([MS_A], "");
    expect(initialMilestoneFieldActiveIndex(null, list, "")).toBe(0);
  });

  it("highlights current milestone when in shown list", () => {
    const list = buildMilestoneFieldList([MS_A, MS_B], "");
    expect(initialMilestoneFieldActiveIndex(MS_B.id, list, "")).toBe(2);
  });

  it("returns -1 when current is beyond first 50 with empty query", () => {
    const many: Milestone[] = [];
    for (let i = 0; i < 51; i++) {
      many.push(milestone(`id-${i}`, `M${i}`, "2026-06-01"));
    }
    const list = buildMilestoneFieldList(many, "");
    expect(initialMilestoneFieldActiveIndex("id-50", list, "")).toBe(-1);
  });

  it("returns -1 when current id is not in the milestone list with empty query", () => {
    const list = buildMilestoneFieldList([MS_A], "");
    expect(initialMilestoneFieldActiveIndex("missing", list, "")).toBe(-1);
  });

  it("highlights first match when query set and current not in results", () => {
    const list = buildMilestoneFieldList([MS_A, MS_B], "Beta");
    expect(initialMilestoneFieldActiveIndex(MS_A.id, list, "Beta")).toBe(0);
  });

  it("keeps current row when still in filtered list", () => {
    const list = buildMilestoneFieldList([MS_A, MS_B], "Beta");
    expect(initialMilestoneFieldActiveIndex(MS_B.id, list, "Beta")).toBe(0);
  });
});

describe("milestoneFilterClosedLabel", () => {
  it("returns all, none, or milestone label", () => {
    expect(milestoneFilterClosedLabel("all", [MS_A])).toBe("すべて");
    expect(milestoneFilterClosedLabel(NO_MILESTONE_FILTER, [MS_A])).toBe(
      "なし",
    );
    expect(milestoneFilterClosedLabel(MS_A.id, [MS_A])).toBe(
      "Alpha（2026-01-10）",
    );
    expect(milestoneFilterClosedLabel("missing", [MS_A])).toBe("すべて");
  });
});

describe("buildMilestoneFilterList", () => {
  it("prepends all and none when query is empty", () => {
    const list = buildMilestoneFilterList([MS_B, MS_A], "");
    expect(list.noMatches).toBe(false);
    expect(list.truncated).toBe(false);
    expect(
      list.options.map((item) =>
        item.kind === "all"
          ? "all"
          : item.kind === "none"
            ? "none"
            : item.label,
      ),
    ).toEqual([
      "all",
      "none",
      "Beta（2026-02-20）",
      "Alpha（2026-01-10）",
    ]);
  });

  it("omits all and none when query is non-empty", () => {
    const list = buildMilestoneFilterList([MS_A, MS_B], "Alpha");
    expect(list.options.every((item) => item.kind === "milestone")).toBe(true);
    expect(list.options).toHaveLength(1);
  });

  it("caps milestones at 50 and all or none do not count", () => {
    const many: Milestone[] = [];
    for (let i = 0; i < 51; i++) {
      many.push(
        milestone(`id-${i}`, `M${i}`, `2026-01-${String(i + 1).padStart(2, "0")}`),
      );
    }
    const list = buildMilestoneFilterList(many, "");
    expect(list.truncated).toBe(true);
    expect(
      list.options.filter((item) => item.kind === "milestone"),
    ).toHaveLength(MILESTONE_FIELD_CANDIDATE_LIMIT);
    expect(list.options[0].kind).toBe("all");
    expect(list.options[1].kind).toBe("none");
  });

  it("reports no matches", () => {
    const list = buildMilestoneFilterList([MS_A], "zzz");
    expect(list.noMatches).toBe(true);
    expect(list.options).toHaveLength(0);
  });
});

describe("milestoneFilterValueFromOption", () => {
  it("maps options to filter values", () => {
    expect(milestoneFilterValueFromOption({ kind: "all" })).toBe("all");
    expect(milestoneFilterValueFromOption({ kind: "none" })).toBe(
      NO_MILESTONE_FILTER,
    );
    expect(
      milestoneFilterValueFromOption({
        kind: "milestone",
        id: MS_A.id,
        label: "x",
      }),
    ).toBe(MS_A.id);
  });
});

describe("initialMilestoneFilterActiveIndex", () => {
  it("highlights all or none when query empty", () => {
    const list = buildMilestoneFilterList([MS_A], "");
    expect(initialMilestoneFilterActiveIndex("all", list, "")).toBe(0);
    expect(
      initialMilestoneFilterActiveIndex(NO_MILESTONE_FILTER, list, ""),
    ).toBe(1);
  });

  it("highlights current milestone when in shown list", () => {
    const list = buildMilestoneFilterList([MS_A, MS_B], "");
    expect(initialMilestoneFilterActiveIndex(MS_B.id, list, "")).toBe(3);
  });

  it("highlights first match when query set and filter is all", () => {
    const list = buildMilestoneFilterList([MS_A, MS_B], "Beta");
    expect(initialMilestoneFilterActiveIndex("all", list, "Beta")).toBe(0);
  });
});

describe("stepMilestoneFieldActiveIndex", () => {
  const len = 3;

  it("does not move when length is 0", () => {
    expect(stepMilestoneFieldActiveIndex(-1, 0, "down")).toBe(-1);
  });

  it("from -1 goes to first or last", () => {
    expect(stepMilestoneFieldActiveIndex(-1, len, "down")).toBe(0);
    expect(stepMilestoneFieldActiveIndex(-1, len, "up")).toBe(2);
  });

  it("steps within bounds", () => {
    expect(stepMilestoneFieldActiveIndex(1, len, "down")).toBe(2);
    expect(stepMilestoneFieldActiveIndex(1, len, "up")).toBe(0);
  });
});
