import { addDays, addUtcMonths, daysBetween, parseDate, utcMonthStart } from "./dates";
import { formatYearMonth, monthHeaderLabelWidth } from "./monthHeader";
import {
  layoutMilestoneBand,
  MILESTONE_LABEL_GAP,
  type MilestoneLayoutMode,
} from "./milestones";
import type { GridTier } from "./timeline";
import type { Milestone, MilestoneGroup, ScheduleId } from "./types";

const MONTH_LABEL_OFFSET_X = 6;
const MAX_PADDING_ITERATIONS = 24;

export type TimelineRightPaddingInput = {
  timelineStart: Date;
  baseTotalDays: number;
  pxPerDay: number;
  tier: GridTier;
  milestoneGroups: MilestoneGroup[];
  milestones: Milestone[];
  visibleGroupIds: ReadonlySet<ScheduleId>;
  milestoneFontSize: number;
  milestoneDiamondSize: number;
  monthHeaderFontSize: number;
  mode: MilestoneLayoutMode;
};

function milestoneNameWidthPx(name: string, fontSize: number): number {
  return monthHeaderLabelWidth(name, fontSize);
}

function neededContentRightPx(input: TimelineRightPaddingInput): number {
  const pxPerDay = Math.max(input.pxPerDay, 0.5);
  const baseContentWidth = input.baseTotalDays * pxPerDay;
  let neededRight = baseContentWidth;

  const band = layoutMilestoneBand(
    input.milestoneGroups,
    input.milestones,
    input.visibleGroupIds,
    input.pxPerDay,
    input.milestoneFontSize,
    input.milestoneDiamondSize,
    26,
    input.mode,
  );

  for (const block of band.blocks) {
    for (const milestone of block.milestones) {
      const day = daysBetween(input.timelineStart, parseDate(milestone.date));
      const displayName =
        band.displayLabels.get(milestone.id) ?? milestone.name;
      const right =
        day * pxPerDay +
        input.milestoneDiamondSize / 2 +
        MILESTONE_LABEL_GAP +
        milestoneNameWidthPx(displayName, input.milestoneFontSize);
      if (right > neededRight) neededRight = right;
    }
  }

  if (input.tier === "month") {
    const timelineEnd = addDays(input.timelineStart, input.baseTotalDays);
    let d = utcMonthStart(input.timelineStart);
    while (d < timelineEnd) {
      const day = daysBetween(input.timelineStart, d);
      const x = day * pxPerDay + MONTH_LABEL_OFFSET_X;
      const w = monthHeaderLabelWidth(
        formatYearMonth(d),
        input.monthHeaderFontSize,
      );
      const right = x + w;
      if (right > neededRight) neededRight = right;
      d = addUtcMonths(d, 1);
    }
  }

  return neededRight;
}

/** 基準の右余白（7日）より右へ、ラベルが収まるまで足す日数。 */
export function extraTimelineDaysForRightEdge(
  input: TimelineRightPaddingInput,
): number {
  const pxPerDay = Math.max(input.pxPerDay, 0.5);
  let extraDays = 0;

  for (let iter = 0; iter < MAX_PADDING_ITERATIONS; iter += 1) {
    const totalDays = input.baseTotalDays + extraDays;
    const contentWidth = totalDays * pxPerDay;
    const neededRight = neededContentRightPx({
      ...input,
      baseTotalDays: totalDays,
    });
    const deficit = neededRight - contentWidth;
    if (deficit <= 0) break;
    const add = Math.ceil(deficit / pxPerDay);
    if (add <= 0) break;
    extraDays += add;
  }

  return extraDays;
}
