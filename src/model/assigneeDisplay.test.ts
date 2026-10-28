import { describe, expect, it } from "vitest";
import {
  assigneeColumnChars,
  assigneeSidebarLabel,
  formatAssigneeListLabel,
  matchesMemberAssigneeFilter,
  matchesUnassignedFilter,
  memberOptionLabel,
  assigneeExcelCellLabel,
  resolveAssigneeDisplay,
  resolveAssigneeRowDisplay,
} from "./assigneeDisplay";
import { memberMapFromList } from "./assigneeDisplay";
import type { Member } from "./memberTypes";

const members: Member[] = [
  { id: "tanaka", name: "田中" },
  { id: "tanaka-2", name: "田中" },
  { id: "sato", name: "佐藤" },
];

describe("assigneeColumnChars", () => {
  it("uses at least three characters and caps at eight", () => {
    expect(assigneeColumnChars([])).toBe(3);
    expect(assigneeColumnChars(["田中", "未割当"])).toBe(3);
    expect(assigneeColumnChars(["メンバー不明（missing）"])).toBe(8);
  });
});

describe("resolveAssigneeDisplay", () => {
  const catalog = memberMapFromList(members);
  const duplicateNames = new Set(["田中"]);

  it("keeps empty as unassigned", () => {
    expect(resolveAssigneeDisplay([], catalog).kind).toBe("unassigned");
  });

  it("resolves a known id to text label", () => {
    expect(resolveAssigneeDisplay(["sato"], catalog, duplicateNames)).toEqual({
      kind: "text",
      label: "佐藤",
    });
  });

  it("marks ids missing from the catalog as allUnknown", () => {
    expect(resolveAssigneeDisplay(["missing"], catalog).kind).toBe("allUnknown");
    expect(resolveAssigneeDisplay(["sato"], null).kind).toBe("allUnknown");
    expect(
      assigneeSidebarLabel(resolveAssigneeDisplay(["missing"], null)),
    ).toBe("メンバー不明（missing）");
  });

  it("joins multiple assignees with読点", () => {
    const label = formatAssigneeListLabel(
      ["sato", "tanaka"],
      catalog,
      duplicateNames,
    );
    expect(label).toBe("佐藤、田中（tanaka）");
  });

  it("uses allUnknown badge only when every id is unknown", () => {
    expect(
      resolveAssigneeRowDisplay(["missing"], catalog, duplicateNames).kind,
    ).toBe("allUnknown");
    expect(
      resolveAssigneeRowDisplay(["missing", "sato"], catalog, duplicateNames)
        .kind,
    ).toBe("text");
  });
});

describe("matchesUnassignedFilter", () => {
  const catalog = memberMapFromList(members);

  it("keeps empty and unknown-only, and drops resolved members", () => {
    expect(matchesUnassignedFilter([], catalog)).toBe(true);
    expect(matchesUnassignedFilter(["missing"], catalog)).toBe(true);
    expect(matchesUnassignedFilter(["missing", "ghost"], catalog)).toBe(true);
    expect(matchesUnassignedFilter(["sato"], catalog)).toBe(false);
    expect(matchesUnassignedFilter(["sato", "missing"], catalog)).toBe(false);
  });
});

describe("matchesMemberAssigneeFilter", () => {
  it("matches when id is in the list", () => {
    expect(matchesMemberAssigneeFilter(["a", "b"], "b")).toBe(true);
    expect(matchesMemberAssigneeFilter(["a"], "b")).toBe(false);
  });
});

describe("assigneeExcelCellLabel", () => {
  const catalog = memberMapFromList(members);

  it("uses 割り当てなし for empty and member name without duplicate id suffix", () => {
    expect(assigneeExcelCellLabel([], catalog)).toBe("割り当てなし");
    expect(assigneeExcelCellLabel(["sato"], catalog)).toBe("佐藤");
    expect(assigneeExcelCellLabel(["tanaka"], catalog)).toBe("田中");
    expect(assigneeExcelCellLabel(["tanaka-2"], catalog)).toBe("田中");
    expect(assigneeExcelCellLabel(["missing"], catalog)).toBe(
      "メンバー不明（missing）",
    );
  });

  it("uses only the first id label when multiple assignees", () => {
    expect(assigneeExcelCellLabel(["sato", "tanaka"], catalog)).toBe("佐藤");
  });
});

describe("memberOptionLabel", () => {
  it("appends the id only when the display name is duplicated", () => {
    expect(memberOptionLabel(members[0], new Set(["田中"]))).toBe("田中（tanaka）");
    expect(memberOptionLabel(members[2], new Set(["田中"]))).toBe("佐藤");
  });
});
