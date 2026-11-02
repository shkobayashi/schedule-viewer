import { describe, expect, it } from "vitest";
import {
  mergeMcpSetViewCollapsed,
  parseMcpSetViewPatch,
  scrollYAfterFitToWidth,
} from "./mcpSetView";
import { categoryCollapseKey, groupCollapseKey, hierarchyCollapseKey } from "./rows";

describe("parseMcpSetViewPatch", () => {
  it("accepts fitToWidth alone", () => {
    expect(parseMcpSetViewPatch({ fitToWidth: true })).toEqual({
      ok: true,
      patch: { fitToWidth: true },
    });
  });

  it("rejects empty patch", () => {
    expect(parseMcpSetViewPatch({}).ok).toBe(false);
  });

  it("parses row density", () => {
    const parsed = parseMcpSetViewPatch({ rowDensity: "compact" });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.patch.rowDensity).toBe("compact");
    }
  });
});

describe("scrollYAfterFitToWidth", () => {
  it("keeps vertical scroll unchanged", () => {
    expect(scrollYAfterFitToWidth(120)).toBe(120);
    expect(scrollYAfterFitToWidth(0)).toBe(0);
  });
});

describe("mergeMcpSetViewCollapsed", () => {
  const cat = "c1000001-0000-4000-8000-000000000001";
  const grp = "d1000001-0000-4000-8000-000000000001";
  const heading = "h1000001-0000-4000-8000-000000000001";

  it("leaves collapse unchanged when patch has no collapsed fields", () => {
    const current = new Set([
      categoryCollapseKey(cat),
      hierarchyCollapseKey(heading),
    ]);
    const next = mergeMcpSetViewCollapsed(current, { fitToWidth: true });
    expect(next).toEqual(current);
  });

  it("updates only category collapse when collapsedCategoryIds is set", () => {
    const current = new Set([
      categoryCollapseKey("old-cat"),
      groupCollapseKey(grp),
      hierarchyCollapseKey(heading),
    ]);
    const next = mergeMcpSetViewCollapsed(current, {
      collapsedCategoryIds: [cat],
    });
    expect(next.has(categoryCollapseKey("old-cat"))).toBe(false);
    expect(next.has(categoryCollapseKey(cat))).toBe(true);
    expect(next.has(groupCollapseKey(grp))).toBe(true);
    expect(next.has(hierarchyCollapseKey(heading))).toBe(true);
  });

  it("updates outline heading collapse without clearing categories", () => {
    const current = new Set([categoryCollapseKey(cat)]);
    const next = mergeMcpSetViewCollapsed(current, {
      collapsedOutlineHeadingIds: [heading],
    });
    expect(next.has(categoryCollapseKey(cat))).toBe(true);
    expect(next.has(hierarchyCollapseKey(heading))).toBe(true);
  });
});
