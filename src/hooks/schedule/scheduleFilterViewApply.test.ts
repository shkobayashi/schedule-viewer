import { describe, expect, it } from "vitest";
import {
  categoryCollapseKey,
  groupCollapseKey,
} from "../../model/rows";
import { mergeFilterViewCollapsedSet } from "./scheduleFilterViewApply";

describe("mergeFilterViewCollapsedSet", () => {
  it("applies persisted category and group collapse keys", () => {
    const merged = mergeFilterViewCollapsedSet(new Set(), ["cat-a"], ["grp-b"]);
    expect(merged.has(categoryCollapseKey("cat-a"))).toBe(true);
    expect(merged.has(groupCollapseKey("grp-b"))).toBe(true);
  });

  it("keeps hierarchy collapse keys from previous set", () => {
    const prev = new Set<string>(["hierarchy:branch-1", categoryCollapseKey("old")]);
    const merged = mergeFilterViewCollapsedSet(prev, [], []);
    expect(merged.has("hierarchy:branch-1")).toBe(true);
    expect(merged.has(categoryCollapseKey("old"))).toBe(false);
  });
});
