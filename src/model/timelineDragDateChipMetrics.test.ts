import { describe, expect, it } from "vitest";
import { timelineDragDateChipMetrics } from "./timelineDragDateChipMetrics";
import { LAYOUT_HEADER_HEIGHT } from "./layoutSizes";

describe("timelineDragDateChipMetrics", () => {
  it("scales chip typography with header height", () => {
    const atDefault = timelineDragDateChipMetrics(LAYOUT_HEADER_HEIGHT);
    expect(atDefault.dateFontSize).toBe(11);
    expect(atDefault.dateGap).toBe(4);
  });
});
