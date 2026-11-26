import { describe, expect, it } from "vitest";
import { buildTimelineMilestoneBandExplanationProps } from "./timelineExplanationBandProps";
import type { ResolvedColorScheme } from "./palette";
import type { ScheduleId } from "./types";

const scheme = "light" as ResolvedColorScheme;

describe("buildTimelineMilestoneBandExplanationProps", () => {
  it("clears band explanation props when overlay is inactive", () => {
    expect(
      buildTimelineMilestoneBandExplanationProps({
        active: false,
        milestoneHoles: [
          { x: 0, y: 0, width: 1, height: 1, kind: "change", markIndex: 0 },
        ],
        colorScheme: scheme,
        trialMilestones: [],
        milestoneIdsWithTrialMove: new Set(),
      }),
    ).toEqual({
      explanationVeilHoles: undefined,
      explanationColorScheme: undefined,
      explanationTrialMilestones: undefined,
      milestoneIdsWithTrialMove: undefined,
    });
  });

  it("passes holes and trial milestones when active", () => {
    const id = "00000000-0000-4000-8000-000000000001" as ScheduleId;
    const holes = [
      { x: 1, y: 2, width: 3, height: 4, kind: "change" as const, markIndex: 1 },
    ];
    const trial = [
      {
        patternId: "p",
        milestoneId: id,
        color: "#000",
        rect: { x: 0, y: 0, width: 1, height: 1 },
        originRect: { x: 0, y: 0, width: 1, height: 1 },
        unanimous: true,
      },
    ];
    const moveIds = new Set([id]);
    const props = buildTimelineMilestoneBandExplanationProps({
      active: true,
      milestoneHoles: holes,
      colorScheme: scheme,
      trialMilestones: trial,
      milestoneIdsWithTrialMove: moveIds,
    });
    expect(props.explanationVeilHoles).toEqual(holes);
    expect(props.explanationColorScheme).toBe(scheme);
    expect(props.explanationTrialMilestones).toBe(trial);
    expect(props.milestoneIdsWithTrialMove).toBe(moveIds);
  });
});
