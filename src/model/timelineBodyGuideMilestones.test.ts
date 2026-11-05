import { describe, expect, it } from "vitest";
import { filterTimelineBodyGuideLineMilestones } from "./timelineBodyGuideMilestones";
import type { Milestone, ScheduleId } from "./types";

describe("filterTimelineBodyGuideLineMilestones", () => {
  it("keeps milestones with guide lines and band layout", () => {
    const id = "00000000-0000-4000-8000-000000000001" as ScheduleId;
    const milestones: Milestone[] = [
      { id, date: "2026-04-01", name: "M1", confidence: "committed", groupId: id },
    ];
    const filtered = filterTimelineBodyGuideLineMilestones({
      milestones,
      milestoneGuideLineIds: new Set([id]),
      milestoneCenterYById: new Map([[id, 12]]),
    });
    expect(filtered).toHaveLength(1);
  });
});
