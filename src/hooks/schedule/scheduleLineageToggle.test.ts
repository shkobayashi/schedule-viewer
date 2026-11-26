import { describe, expect, it } from "vitest";
import { nextLineageToggleState } from "./scheduleLineageToggle";

describe("nextLineageToggleState", () => {
  it("turns off connection-inclusive lineage first", () => {
    expect(
      nextLineageToggleState("t1", true, "t1"),
    ).toEqual({ lineageTaskId: null, lineageIncludesConnections: false });
  });

  it("clears lineage when active without connections", () => {
    expect(
      nextLineageToggleState("t1", false, "t1"),
    ).toEqual({ lineageTaskId: null, lineageIncludesConnections: false });
  });

  it("starts lineage from primary selection when inactive", () => {
    expect(
      nextLineageToggleState(null, false, "t2"),
    ).toEqual({ lineageTaskId: "t2", lineageIncludesConnections: false });
  });
});
