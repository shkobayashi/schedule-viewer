import { afterEach, describe, expect, it, vi } from "vitest";
import { menuShiftForRect, menuViewportShift } from "./anchoredMenu";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("menuViewportShift", () => {
  it("shifts left when the menu would extend past the right edge", () => {
    vi.stubGlobal("window", { innerWidth: 1024, innerHeight: 768 });
    const rect = {
      left: 900,
      top: 40,
      right: 1100,
      bottom: 200,
      width: 200,
      height: 160,
    } as DOMRect;
    const shift = menuViewportShift(rect, 8);
    expect(rect.right + shift.x).toBeLessThanOrEqual(window.innerWidth - 8);
    if (rect.right > window.innerWidth - 8) {
      expect(shift.x).toBeLessThan(0);
    }
  });
});

describe("menuShiftForRect", () => {
  it("matches menuViewportShift for the same box", () => {
    vi.stubGlobal("window", { innerWidth: 1024, innerHeight: 768 });
    const rect = {
      left: 900,
      top: 40,
      right: 1100,
      bottom: 200,
      width: 200,
      height: 160,
    } as DOMRect;
    expect(menuShiftForRect(900, 40, 200, 160, 8)).toEqual(
      menuViewportShift(rect, 8),
    );
  });

  it("does not change when the box already fits", () => {
    vi.stubGlobal("window", { innerWidth: 1024, innerHeight: 768 });
    expect(menuShiftForRect(40, 40, 200, 160, 8)).toEqual({ x: 0, y: 0 });
  });
});
