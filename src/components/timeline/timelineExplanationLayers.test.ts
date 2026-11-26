import { describe, expect, it } from "vitest";
import {
  TimelineBodyExplanationBalloons,
  TimelineStageExplanationLayers,
} from "./TimelineBodyExplanationLayers";
import { TimelineMilestoneExplanationBalloons } from "./TimelineMilestoneExplanationBalloons";

describe("timeline explanation layer modules", () => {
  it("exports explanation Konva and balloon wrappers", () => {
    expect(typeof TimelineStageExplanationLayers).toBe("function");
    expect(typeof TimelineBodyExplanationBalloons).toBe("function");
    expect(typeof TimelineMilestoneExplanationBalloons).toBe("function");
  });
});
