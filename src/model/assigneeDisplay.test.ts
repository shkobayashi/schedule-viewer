import { describe, expect, it } from "vitest";
import {
  assigneeColumnChars,
  assigneeSidebarLabel,
  formatAssigneeListLabel,
  matchesMemberAssigneeFilter,
  matchesUnassignedFilter,
  memberOptionLabel,
  assigneeExcelCellLabel,
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

describe("resolveAssigneeRowDisplay", () => {
  const catalog = memberMapFromList(members);
  const duplicateNames = new Set(["田中"]);

  it("keeps empty as unassigned", () => {
    expect(resolveAssigneeRowDisplay([], catalog, duplicateNames).kind).toBe(
      "unassigned",
    );
  });

  it("resolves a known id to text label", () => {
    expect(resolveAssigneeRowDisplay(["sato"], catalog, duplicateNames)).toEqual({
      kind: "text",
      label: "佐藤",
    });
  });

  it("marks ids missing from the catalog as allUnknown", () => {
    expect(
      resolveAssigneeRowDisplay(["missing"], catalog, duplicateNames).kind,
    ).toBe("allUnknown");
    expect(resolveAssigneeRowDisplay(["sato"], null, duplicateNames).kind).toBe(
      "allUnknown",
    );
    expect(
      assigneeSidebarLabel(
        resolveAssigneeRowDisplay(["missing"], null, duplicateNames),
      ),
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
  const duplicateNames = new Set(["田中"]);

  it("matches bar-right label for empty assignees", () => {
    expect(assigneeExcelCellLabel([], catalog)).toBe("未割当");
    expect(assigneeExcelCellLabel([], null)).toBe("未割当");
    expect(
      assigneeExcelCellLabel([], catalog),
    ).toBe(
      assigneeSidebarLabel(
        resolveAssigneeRowDisplay([], catalog, duplicateNames),
      ),
    );
  });

  it("joins all assignees in order with読点", () => {
    expect(assigneeExcelCellLabel(["sato", "tanaka"], catalog)).toBe(
      "佐藤、田中（tanaka）",
    );
    expect(assigneeExcelCellLabel(["tanaka", "sato"], catalog)).toBe(
      "田中（tanaka）、佐藤",
    );
    expect(
      assigneeExcelCellLabel(["sato", "tanaka"], catalog),
    ).toBe(
      assigneeSidebarLabel(
        resolveAssigneeRowDisplay(["sato", "tanaka"], catalog, duplicateNames),
      ),
    );
  });

  it("appends id only for duplicate display names and marks unknown ids", () => {
    expect(assigneeExcelCellLabel(["sato"], catalog)).toBe("佐藤");
    expect(assigneeExcelCellLabel(["tanaka-2"], catalog)).toBe("田中（tanaka-2）");
    expect(assigneeExcelCellLabel(["missing"], catalog)).toBe(
      "メンバー不明（missing）",
    );
    expect(assigneeExcelCellLabel(["sato", "missing"], catalog)).toBe(
      "佐藤、メンバー不明（missing）",
    );
  });

  it("does not truncate long labels", () => {
    const longName = "あ".repeat(12);
    const longMembers: Member[] = [{ id: "long", name: longName }];
    const longCatalog = memberMapFromList(longMembers);
    expect(assigneeExcelCellLabel(["long"], longCatalog)).toBe(longName);
  });
});

describe("memberOptionLabel", () => {
  it("appends the id only when the display name is duplicated", () => {
    expect(memberOptionLabel(members[0], new Set(["田中"]))).toBe("田中（tanaka）");
    expect(memberOptionLabel(members[2], new Set(["田中"]))).toBe("佐藤");
  });
});
