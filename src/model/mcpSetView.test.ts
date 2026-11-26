import { describe, expect, it } from "vitest";
import {
  mergeMcpSetViewCollapsed,
  parseMcpSetViewPatch,
  scrollYAfterFitToWidth,
  validateMcpSetViewLineageForApply,
} from "./mcpSetView";
import { categoryCollapseKey, groupCollapseKey, hierarchyCollapseKey } from "./rows";
import { SCHEDULE_SCHEMA_VERSION, type ScheduleDocument } from "./types";

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

  it("accepts lineage with taskId and default includesConnections false", () => {
    const taskId = "00000000-0000-4000-8000-000000000001";
    const parsed = parseMcpSetViewPatch({
      lineage: { taskId, includesConnections: false },
    });
    expect(parsed).toEqual({
      ok: true,
      patch: {
        lineage: { taskId, includesConnections: false },
      },
    });
  });

  it("omits includesConnections false when lineage has only taskId", () => {
    const taskId = "00000000-0000-4000-8000-000000000002";
    const parsed = parseMcpSetViewPatch({ lineage: { taskId } });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.patch.lineage).toEqual({
        taskId,
        includesConnections: false,
      });
    }
  });

  it("accepts lineage clear with taskId null", () => {
    const parsed = parseMcpSetViewPatch({ lineage: { taskId: null } });
    expect(parsed).toEqual({
      ok: true,
      patch: { lineage: { taskId: null, includesConnections: false } },
    });
  });

  it("rejects includesConnections true without a starting task", () => {
    const parsed = parseMcpSetViewPatch({
      lineage: { includesConnections: true },
    });
    expect(parsed).toEqual({
      ok: false,
      message: "繋がりも辿るには、系統の起点が要ります。",
    });
  });

  it("rejects includesConnections true when clearing lineage", () => {
    const parsed = parseMcpSetViewPatch({
      lineage: { taskId: null, includesConnections: true },
    });
    expect(parsed).toEqual({
      ok: false,
      message: "繋がりも辿るには、系統の起点が要ります。",
    });
  });

  it("rejects malformed lineage object", () => {
    expect(parseMcpSetViewPatch({ lineage: [] }).ok).toBe(false);
    expect(parseMcpSetViewPatch({ lineage: {} }).ok).toBe(false);
  });

  it("rejects hiddenMilestoneIds when an entry is not a string", () => {
    const parsed = parseMcpSetViewPatch({
      hiddenMilestoneIds: ["m1", 2],
    });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.message).toBe(
        "hiddenMilestoneIds は文字列の配列にしてください。",
      );
    }
  });

  it("accepts hiddenMilestoneIds as an empty array", () => {
    const parsed = parseMcpSetViewPatch({ hiddenMilestoneIds: [] });
    expect(parsed).toEqual({ ok: true, patch: { hiddenMilestoneIds: [] } });
  });
});

describe("validateMcpSetViewLineageForApply", () => {
  const emptyDoc: ScheduleDocument = {
    schemaVersion: SCHEDULE_SCHEMA_VERSION,
    title: "T",
    categories: [],
    milestoneGroups: [],
    milestones: [],
  };

  it("rejects unknown lineage task without mutating apply path", () => {
    const result = validateMcpSetViewLineageForApply(
      {
        lineage: {
          taskId: "00000000-0000-4000-8000-000000000099",
          includesConnections: false,
        },
      },
      emptyDoc,
    );
    expect(result).toEqual({
      ok: false,
      message: "系統の起点のタスクが見つかりません。",
    });
  });

  it("accepts lineage clear without a document task", () => {
    expect(
      validateMcpSetViewLineageForApply(
        { lineage: { taskId: null, includesConnections: false } },
        emptyDoc,
      ),
    ).toEqual({ ok: true });
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
