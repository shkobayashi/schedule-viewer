import { describe, expect, it } from "vitest";
import { daysBetween, parseDate } from "./dates";
import { monthHeaderLabelWidth } from "./monthHeader";
import {
  layoutMilestoneBand,
  MILESTONE_LABEL_GAP,
} from "./milestones";
import { computeTimelineRange } from "./timeline";
import { extraTimelineDaysForRightEdge } from "./timelineRightPadding";
import type { Category, Milestone, MilestoneGroup } from "./types";

const GRP = "e1000001-0000-4000-8000-000000000001";
const MS = "00000000-0000-4000-8000-0000000000a1";

function milestone(name: string, date: string): Milestone {
  return {
    id: MS,
    name,
    date,
    confidence: "committed",
    groupId: GRP,
  };
}

describe("extraTimelineDaysForRightEdge", () => {
  const categories: Category[] = [
    {
      id: "c1",
      name: "C",
      groups: [
        {
          id: "g1",
          name: "G",
          tasks: [
            {
              id: "t1",
              name: "T",
              start: "2026-04-01",
              end: "2026-04-10",
              assigneeId: null,
              status: "not-started",
              progress: 0,
              confidence: "committed",
              predecessors: [],
              milestoneId: null,
              note: "",
              tags: [],
            },
          ],
        },
      ],
    },
  ];
  const groups: MilestoneGroup[] = [{ id: GRP, name: "帯" }];
  const milestones = [
    milestone(
      "事業部長承認（経営会議付議前の前提確認）",
      "2026-04-10",
    ),
  ];

  it("adds days when a visible milestone name extends past the base right edge", () => {
    const range = computeTimelineRange(categories, milestones, "2026-04-08");
    const extra = extraTimelineDaysForRightEdge({
      timelineStart: range.timelineStart,
      baseTotalDays: range.totalDays,
      pxPerDay: 8,
      tier: "month",
      milestoneGroups: groups,
      milestones,
      visibleGroupIds: new Set([GRP]),
      milestoneFontSize: 11,
      milestoneDiamondSize: 11,
      monthHeaderFontSize: 12,
      mode: "screen",
    });
    expect(extra).toBeGreaterThan(0);
  });

  it("does not extend for milestones in hidden groups", () => {
    const range = computeTimelineRange(categories, milestones, "2026-04-08");
    const visible = extraTimelineDaysForRightEdge({
      timelineStart: range.timelineStart,
      baseTotalDays: range.totalDays,
      pxPerDay: 8,
      tier: "month",
      milestoneGroups: groups,
      milestones,
      visibleGroupIds: new Set([GRP]),
      milestoneFontSize: 11,
      milestoneDiamondSize: 11,
      monthHeaderFontSize: 12,
      mode: "screen",
    });
    const hidden = extraTimelineDaysForRightEdge({
      timelineStart: range.timelineStart,
      baseTotalDays: range.totalDays,
      pxPerDay: 8,
      tier: "month",
      milestoneGroups: groups,
      milestones,
      visibleGroupIds: new Set(),
      milestoneFontSize: 11,
      milestoneDiamondSize: 11,
      monthHeaderFontSize: 12,
      mode: "screen",
    });
    expect(hidden).toBeLessThan(visible);
  });

  it("uses full export names for export mode padding", () => {
    const range = computeTimelineRange(categories, milestones, "2026-04-08");
    const screen = extraTimelineDaysForRightEdge({
      timelineStart: range.timelineStart,
      baseTotalDays: range.totalDays,
      pxPerDay: 22,
      tier: "week",
      milestoneGroups: groups,
      milestones: [
        milestone("あ".repeat(30), "2026-04-10"),
      ],
      visibleGroupIds: new Set([GRP]),
      milestoneFontSize: 11,
      milestoneDiamondSize: 11,
      monthHeaderFontSize: 12,
      mode: "screen",
    });
    const exportMode = extraTimelineDaysForRightEdge({
      timelineStart: range.timelineStart,
      baseTotalDays: range.totalDays,
      pxPerDay: 22,
      tier: "week",
      milestoneGroups: groups,
      milestones: [
        milestone("あ".repeat(30), "2026-04-10"),
      ],
      visibleGroupIds: new Set([GRP]),
      milestoneFontSize: 11,
      milestoneDiamondSize: 11,
      monthHeaderFontSize: 12,
      mode: "export",
    });
    expect(exportMode).toBeGreaterThan(screen);
  });

  it("covers truncated screen labels with bold width padding", () => {
    const longName = "あ".repeat(30);
    const ms = milestone(longName, "2026-04-10");
    const range = computeTimelineRange(categories, [ms], "2026-04-08");
    const pxPerDay = 8;
    const extra = extraTimelineDaysForRightEdge({
      timelineStart: range.timelineStart,
      baseTotalDays: range.totalDays,
      pxPerDay,
      tier: "week",
      milestoneGroups: groups,
      milestones: [ms],
      visibleGroupIds: new Set([GRP]),
      milestoneFontSize: 11,
      milestoneDiamondSize: 11,
      monthHeaderFontSize: 12,
      mode: "screen",
    });
    const band = layoutMilestoneBand(
      groups,
      [ms],
      new Set([GRP]),
      pxPerDay,
      11,
      11,
      26,
      "screen",
    );
    const displayName = band.displayLabels.get(MS)!;
    const day = daysBetween(range.timelineStart, parseDate(ms.date));
    const labelRight =
      day * pxPerDay +
      11 / 2 +
      MILESTONE_LABEL_GAP +
      monthHeaderLabelWidth(displayName, 11);
    const contentRight = (range.totalDays + extra) * pxPerDay;
    expect(labelRight).toBeLessThanOrEqual(contentRight + 0.01);
  });

  it("adds fewer days for narrow half-width names than full-width names", () => {
    const range = computeTimelineRange(
      categories,
      [milestone("A".repeat(20), "2026-04-10")],
      "2026-04-08",
    );
    const input = {
      timelineStart: range.timelineStart,
      baseTotalDays: range.totalDays,
      pxPerDay: 8,
      tier: "week" as const,
      milestoneGroups: groups,
      visibleGroupIds: new Set([GRP]),
      milestoneFontSize: 11,
      milestoneDiamondSize: 11,
      monthHeaderFontSize: 12,
      mode: "screen" as const,
    };
    const half = extraTimelineDaysForRightEdge({
      ...input,
      milestones: [milestone("A".repeat(20), "2026-04-10")],
    });
    const full = extraTimelineDaysForRightEdge({
      ...input,
      milestones: [milestone("あ".repeat(20), "2026-04-10")],
    });
    expect(half).toBeLessThan(full);
  });

  it("does not extend when labels already fit the base range", () => {
    const range = computeTimelineRange(
      categories,
      [milestone("短", "2026-04-01")],
      "2026-04-08",
    );
    const extra = extraTimelineDaysForRightEdge({
      timelineStart: range.timelineStart,
      baseTotalDays: range.totalDays,
      pxPerDay: 22,
      tier: "week",
      milestoneGroups: groups,
      milestones: [milestone("短", "2026-04-01")],
      visibleGroupIds: new Set([GRP]),
      milestoneFontSize: 11,
      milestoneDiamondSize: 11,
      monthHeaderFontSize: 12,
      mode: "screen",
    });
    expect(extra).toBe(0);
  });

  it("extends for month header labels past the base right edge", () => {
    const juneCategories: Category[] = [
      {
        id: "c1",
        name: "C",
        groups: [
          {
            id: "g1",
            name: "G",
            tasks: [
              {
                id: "t1",
                name: "T",
                start: "2026-06-01",
                end: "2026-06-30",
                assigneeId: null,
                status: "not-started",
                progress: 0,
                confidence: "committed",
                predecessors: [],
                milestoneId: null,
                note: "",
                tags: [],
              },
            ],
          },
        ],
      },
    ];
    const range = computeTimelineRange(
      juneCategories,
      [milestone("短", "2026-06-30")],
      "2026-06-15",
    );
    const base = {
      timelineStart: range.timelineStart,
      baseTotalDays: range.totalDays,
      pxPerDay: 5,
      milestoneGroups: groups,
      milestones: [milestone("短", "2026-06-30")],
      visibleGroupIds: new Set([GRP]),
      milestoneFontSize: 11,
      milestoneDiamondSize: 11,
      monthHeaderFontSize: 12,
      mode: "screen" as const,
    };
    const weekExtra = extraTimelineDaysForRightEdge({ ...base, tier: "week" });
    const monthExtra = extraTimelineDaysForRightEdge({ ...base, tier: "month" });
    expect(monthExtra).toBeGreaterThan(weekExtra);
  });
});
