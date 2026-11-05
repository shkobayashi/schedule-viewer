import { describe, expect, it } from "vitest";
import { buildTimelineBodyBackgroundContent } from "./TimelineBodyBackground";
import { buildTimelineStickyParentRowContent } from "./TimelineStickyParentRows";
import { TimelineChartBodyStage } from "./TimelineChartBodyStage";
import { useTimelineSpacePanArm } from "../../hooks/useTimelineSpacePanArm";
import { useTimelineMilestoneHover } from "../../hooks/useTimelineMilestoneHover";
import { buildTimelineLightningPolyline } from "../../model/timelineLightningPolyline";
import { timelineDragDateChipMetrics } from "../../model/timelineDragDateChipMetrics";
import { filterTimelineBodyGuideLineMilestones } from "../../model/timelineBodyGuideMilestones";

describe("timeline T5 modules", () => {
  it("exports body stage builders and chart stage", () => {
    expect(typeof buildTimelineBodyBackgroundContent).toBe("function");
    expect(typeof buildTimelineStickyParentRowContent).toBe("function");
    expect(typeof TimelineChartBodyStage).toBe("function");
  });

  it("exports T5 hooks and pure helpers", () => {
    expect(typeof useTimelineSpacePanArm).toBe("function");
    expect(typeof useTimelineMilestoneHover).toBe("function");
    expect(typeof buildTimelineLightningPolyline).toBe("function");
    expect(typeof timelineDragDateChipMetrics).toBe("function");
    expect(typeof filterTimelineBodyGuideLineMilestones).toBe("function");
  });
});
