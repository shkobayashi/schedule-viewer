import { describe, expect, it } from "vitest";
import {
  assigneeColumnChars,
  assigneeSidebarLabel,
  matchesUnassignedFilter,
  memberOptionLabel,
  resolveAssigneeDisplay,
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

  it("keeps null as unassigned", () => {
    expect(resolveAssigneeDisplay(null, catalog).kind).toBe("unassigned");
  });

  it("resolves a known id to the display name", () => {
    expect(resolveAssigneeDisplay("sato", catalog)).toEqual({
      kind: "resolved",
      id: "sato",
      label: "佐藤",
    });
  });

  it("marks an id missing from the catalog, including when none is selected", () => {
    expect(resolveAssigneeDisplay("missing", catalog).kind).toBe("unknown");
    expect(resolveAssigneeDisplay("sato", null).kind).toBe("unknown");
    expect(assigneeSidebarLabel(resolveAssigneeDisplay("missing", null))).toBe(
      "メンバー不明（missing）",
    );
  });
});

describe("matchesUnassignedFilter", () => {
  const catalog = memberMapFromList(members);

  it("keeps null and unknown ids, and drops resolved members", () => {
    expect(matchesUnassignedFilter(null, catalog)).toBe(true);
    expect(matchesUnassignedFilter("missing", catalog)).toBe(true);
    expect(matchesUnassignedFilter("sato", catalog)).toBe(false);
  });
});

describe("memberOptionLabel", () => {
  it("appends the id only when the display name is duplicated", () => {
    expect(memberOptionLabel(members[0], new Set(["田中"]))).toBe("田中（tanaka）");
    expect(memberOptionLabel(members[2], new Set(["田中"]))).toBe("佐藤");
  });
});
