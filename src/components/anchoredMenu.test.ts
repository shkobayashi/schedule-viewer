import { describe, expect, it } from "vitest";
import { menuViewportShift } from "./anchoredMenu";

describe("menuViewportShift", () => {
  it("shifts left when the menu would extend past the right edge", () => {
    const rect = {
      left: 900,
      top: 40,
      right: 1100,
      bottom: 200,
      width: 200,
      height: 160,
    } as DOMRect;
    const shift = menuViewportShift(rect, 8);
    expect(shift.x).toBeLessThan(0);
    expect(rect.right + shift.x).toBeLessThanOrEqual(window.innerWidth - 8);
  });
});
