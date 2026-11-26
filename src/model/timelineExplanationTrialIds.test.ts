import { describe, expect, it } from "vitest";
import { milestoneIdsWithTrialMoveFromLayouts } from "./timelineExplanationTrialIds";
import type { ScheduleId } from "./types";

describe("milestoneIdsWithTrialMoveFromLayouts", () => {
  it("collects unique milestone ids from trial layouts", () => {
    const idA = "00000000-0000-4000-8000-000000000001" as ScheduleId;
    const idB = "00000000-0000-4000-8000-000000000002" as ScheduleId;
    const ids = milestoneIdsWithTrialMoveFromLayouts([
      {
        patternId: "p1",
        milestoneId: idA,
        color: "#000",
        rect: { x: 0, y: 0, width: 1, height: 1 },
        originRect: { x: 0, y: 0, width: 1, height: 1 },
        unanimous: true,
      },
      {
        patternId: "p2",
        milestoneId: idA,
        color: "#000",
        rect: { x: 0, y: 0, width: 1, height: 1 },
        originRect: { x: 0, y: 0, width: 1, height: 1 },
        unanimous: false,
      },
      {
        patternId: "p3",
        milestoneId: idB,
        color: "#000",
        rect: { x: 0, y: 0, width: 1, height: 1 },
        originRect: { x: 0, y: 0, width: 1, height: 1 },
        unanimous: true,
      },
    ]);
    expect(ids.size).toBe(2);
    expect(ids.has(idA)).toBe(true);
    expect(ids.has(idB)).toBe(true);
  });
});
