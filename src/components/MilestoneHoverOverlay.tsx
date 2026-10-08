import { useLayoutEffect, useState } from "react";
import {
  layoutMilestoneHoverLabel,
  type ResolvedMilestoneHover,
} from "../model/milestoneHoverLabel";
import { KONVA_FONT_FAMILY } from "../model/fontStack";
import type { ChartPalette } from "../model/palette";
import type { ScheduleId } from "../model/types";

export type MilestoneHoverState = {
  id: ScheduleId;
};

export type { ResolvedMilestoneHover };

type MilestoneHoverOverlayProps = {
  hover: ResolvedMilestoneHover | null;
  bandTopPx: number;
  chartWidth: number;
  fontSize: number;
  chart: ChartPalette;
  bandBackground: string;
};

export function MilestoneHoverOverlay({
  hover,
  bandTopPx,
  chartWidth,
  fontSize,
  chart,
  bandBackground,
}: MilestoneHoverOverlayProps) {
  const [maxHeightPx, setMaxHeightPx] = useState(fontSize * 1.25);

  useLayoutEffect(() => {
    if (!hover) return;
    const labelTopScreen = bandTopPx + hover.labelTopY;
    setMaxHeightPx(
      Math.max(fontSize * 1.25, window.innerHeight - labelTopScreen - 8),
    );
  }, [bandTopPx, fontSize, hover]);

  if (!hover) return null;

  const layout = layoutMilestoneHoverLabel({
    fullName: hover.fullName,
    fontSize,
    anchorX: hover.labelX,
    labelTopY: hover.labelTopY,
    chartWidth,
    maxHeightPx,
  });

  const lineHeight = fontSize * 1.25;

  return (
    <div
      className="milestone-hover-overlay"
      style={{
        top: bandTopPx + layout.topPx,
        left: layout.leftPx,
        width: layout.widthPx,
        maxHeight: maxHeightPx,
        fontSize,
        lineHeight: `${lineHeight}px`,
        fontFamily: KONVA_FONT_FAMILY,
        color: chart.milestoneDiamond,
        background: bandBackground,
      }}
      aria-hidden
    >
      {layout.lines.map((line, index) => (
        <div key={index} className="milestone-hover-overlay-line">
          {line}
        </div>
      ))}
    </div>
  );
}
