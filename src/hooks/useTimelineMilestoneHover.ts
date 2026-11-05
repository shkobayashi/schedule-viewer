import { useCallback, useEffect, useState } from "react";
import { resolveMilestoneHover } from "../model/milestoneHoverLabel";
import type { MilestoneBandLayout } from "../model/milestones";
import type { ScheduleId } from "../model/types";
import type { MilestoneHoverState } from "../model/milestoneHoverLabel";

export function useTimelineMilestoneHover(input: {
  milestoneBandLayout: MilestoneBandLayout;
  milestoneLaneHeight: number;
  milestoneDiamondSize: number;
  milestoneFontSize: number;
  dateToX: (d: Date) => number;
}): {
  milestoneHover: ReturnType<typeof resolveMilestoneHover>;
  onHoverMilestone: (hover: MilestoneHoverState | null) => void;
} {
  const [milestoneHoverId, setMilestoneHoverId] =
    useState<ScheduleId | null>(null);

  const milestoneHover =
    milestoneHoverId == null
      ? null
      : resolveMilestoneHover(
          milestoneHoverId,
          input.milestoneBandLayout,
          input.milestoneLaneHeight,
          input.milestoneDiamondSize,
          input.milestoneFontSize,
          input.dateToX,
        );

  useEffect(() => {
    if (milestoneHoverId != null && milestoneHover == null) {
      setMilestoneHoverId(null);
    }
  }, [milestoneHover, milestoneHoverId]);

  const onHoverMilestone = useCallback((hover: MilestoneHoverState | null) => {
    setMilestoneHoverId(hover?.id ?? null);
  }, []);

  return { milestoneHover, onHoverMilestone };
}
