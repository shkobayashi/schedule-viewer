import { describe, expect, it } from "vitest";
import { layoutMilestoneHoverLabel } from "./milestoneHoverLabel";

describe("layoutMilestoneHoverLabel", () => {
  it("wraps within the chart width and shifts left when needed", () => {
    const layout = layoutMilestoneHoverLabel({
      fullName: "あいうえおかきくけこさしすせそたちつてと",
      fontSize: 11,
      anchorX: 180,
      labelTopY: 14.5,
      chartWidth: 200,
      maxHeightPx: 200,
    });
    expect(layout.leftPx).toBeLessThan(180);
    expect(layout.leftPx + layout.widthPx).toBeLessThanOrEqual(200);
    expect(layout.lines.length).toBeGreaterThan(1);
  });

  it("aligns the block top with the label top", () => {
    const layout = layoutMilestoneHoverLabel({
      fullName: "短い",
      fontSize: 11,
      anchorX: 10,
      labelTopY: 30,
      chartWidth: 200,
      maxHeightPx: 200,
    });
    expect(layout.topPx).toBe(30);
  });

  it("truncates with an ellipsis when the text exceeds max height", () => {
    const layout = layoutMilestoneHoverLabel({
      fullName: "あ".repeat(80),
      fontSize: 11,
      anchorX: 0,
      labelTopY: 14.5,
      chartWidth: 120,
      maxHeightPx: 30,
    });
    expect(layout.lines.length).toBeGreaterThan(0);
    expect(layout.lines[layout.lines.length - 1]).toMatch(/…$/);
  });
});
