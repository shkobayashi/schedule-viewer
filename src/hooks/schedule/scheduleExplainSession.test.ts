import { describe, expect, it } from "vitest";
import { shouldClearExplanationOnHumanViewChange } from "./scheduleExplainSession";

describe("shouldClearExplanationOnHumanViewChange", () => {
  it("clears when explanation view is active", () => {
    expect(
      shouldClearExplanationOnHumanViewChange(
        {
          taskIds: new Set(["a"]),
          collapseOverride: null,
          milestoneGroupIds: null,
          milestoneIds: null,
        },
        null,
      ),
    ).toBe(true);
  });

  it("clears when translucent overlay is active", () => {
    expect(
      shouldClearExplanationOnHumanViewChange(null, {
        translucent: true,
        summary: "",
        marks: [],
        patterns: [],
      }),
    ).toBe(true);
  });

  it("does not clear when overlay is inactive", () => {
    expect(shouldClearExplanationOnHumanViewChange(null, null)).toBe(false);
  });
});
