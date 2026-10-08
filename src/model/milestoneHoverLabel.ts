import { parseDate } from "./dates";
import { monthHeaderLabelWidth } from "./monthHeader";
import {
  MILESTONE_LABEL_GAP,
  type MilestoneBandLayout,
} from "./milestones";
import type { ScheduleId } from "./types";

const LINE_HEIGHT_FACTOR = 1.25;

export type MilestoneHoverLabelLayout = {
  lines: string[];
  leftPx: number;
  topPx: number;
  widthPx: number;
  heightPx: number;
};

function charWidth(ch: string, fontSize: number): number {
  return ch.charCodeAt(0) > 0xff ? fontSize : fontSize * 0.62;
}

function wrapLine(
  text: string,
  maxWidth: number,
  fontSize: number,
): string[] {
  if (maxWidth <= 0) return [];
  const lines: string[] = [];
  let current = "";
  let currentWidth = 0;
  for (const ch of text) {
    const chW = charWidth(ch, fontSize);
    if (current.length > 0 && currentWidth + chW > maxWidth) {
      lines.push(current);
      current = ch;
      currentWidth = chW;
    } else {
      current += ch;
      currentWidth += chW;
    }
  }
  if (current.length > 0) lines.push(current);
  return lines;
}

function truncateLastLine(
  line: string,
  maxWidth: number,
  fontSize: number,
): string {
  const ellipsis = "…";
  const ellipsisWidth = monthHeaderLabelWidth(ellipsis, fontSize);
  let width = 0;
  let out = "";
  for (const ch of line) {
    const chW = charWidth(ch, fontSize);
    if (width + chW + ellipsisWidth > maxWidth) break;
    out += ch;
    width += chW;
  }
  return out.length > 0 ? `${out}${ellipsis}` : ellipsis;
}

export type ResolvedMilestoneHover = {
  id: ScheduleId;
  fullName: string;
  labelX: number;
  labelTopY: number;
};

/** ホバー中のマイルストンを、現在のスクロール位置で帯上に置く。 */
export function resolveMilestoneHover(
  milestoneHoverId: ScheduleId,
  milestoneBandLayout: MilestoneBandLayout,
  milestoneLaneHeight: number,
  milestoneDiamondSize: number,
  milestoneFontSize: number,
  dateToX: (d: Date) => number,
): ResolvedMilestoneHover | null {
  for (const block of milestoneBandLayout.blocks) {
    const milestone = block.milestones.find(
      (item) => item.id === milestoneHoverId,
    );
    if (!milestone) continue;
    const displayName =
      milestoneBandLayout.displayLabels.get(milestone.id) ?? milestone.name;
    if (displayName === milestone.name) return null;
    const lane = block.lanes.get(milestone.id) ?? 0;
    const y =
      block.offsetY + lane * milestoneLaneHeight + milestoneLaneHeight / 2;
    const x = dateToX(parseDate(milestone.date));
    const radius = milestoneDiamondSize / 2;
    return {
      id: milestone.id,
      fullName: milestone.name,
      labelX: x + radius + MILESTONE_LABEL_GAP,
      labelTopY: y - milestoneFontSize / 2,
    };
  }
  return null;
}

/** 帯の上に重ねる全文ラベルの行と位置。 */
export function layoutMilestoneHoverLabel(input: {
  fullName: string;
  fontSize: number;
  anchorX: number;
  labelTopY: number;
  chartWidth: number;
  maxHeightPx: number;
}): MilestoneHoverLabelLayout {
  const lineHeight = input.fontSize * LINE_HEIGHT_FACTOR;
  const fullWidth = monthHeaderLabelWidth(input.fullName, input.fontSize);
  const blockWidth = Math.min(fullWidth, input.chartWidth);
  let left = input.anchorX;
  if (left + blockWidth > input.chartWidth) {
    left = Math.max(0, input.chartWidth - blockWidth);
  }
  const wrapWidth = Math.max(1, Math.min(blockWidth, input.chartWidth - left));

  let lines = wrapLine(input.fullName, wrapWidth, input.fontSize);
  const maxLines = Math.max(1, Math.floor(input.maxHeightPx / lineHeight));
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = truncateLastLine(
      lines[maxLines - 1]!,
      wrapWidth,
      input.fontSize,
    );
  }

  const heightPx = lines.length * lineHeight;

  return {
    lines,
    leftPx: left,
    topPx: input.labelTopY,
    widthPx: wrapWidth,
    heightPx,
  };
}
