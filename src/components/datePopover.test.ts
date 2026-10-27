import { afterEach, describe, expect, it, vi } from "vitest";
import {
  datePopoverAnchorTop,
  monthCells,
  placeDatePopover,
} from "./datePopover";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("monthCells", () => {
  it("starts Thursday for October 2026 and lists every day", () => {
    const cells = monthCells(2026, 9);
    expect(cells.slice(0, 4)).toEqual([null, null, null, null]);
    expect(cells[4]).toEqual({ iso: "2026-10-01", day: 1 });
    expect(cells[cells.length - 1]).toEqual({ iso: "2026-10-31", day: 31 });
    expect(cells.filter((cell) => cell != null)).toHaveLength(31);
  });
});

describe("datePopoverAnchorTop", () => {
  it("opens below when there is room", () => {
    expect(datePopoverAnchorTop(40, 72, 280, 800)).toBe(76);
  });

  it("opens above when the field is near the bottom", () => {
    expect(datePopoverAnchorTop(740, 772, 280, 800)).toBe(456);
  });
});

describe("placeDatePopover", () => {
  it("keeps the calendar inside the window when the field is near the bottom", () => {
    vi.stubGlobal("window", { innerWidth: 1200, innerHeight: 800 });
    const placed = placeDatePopover(900, 740, 772, 252, 280);
    expect(placed.top).toBeGreaterThanOrEqual(8);
    expect(placed.top + 280).toBeLessThanOrEqual(800 - 8);
    expect(placed.left).toBeGreaterThanOrEqual(8);
    expect(placed.left + 252).toBeLessThanOrEqual(1200 - 8);
    expect(placed.top + 280).toBeLessThanOrEqual(740);
  });

  it("pulls a too-tall calendar back into the window", () => {
    vi.stubGlobal("window", { innerWidth: 800, innerHeight: 320 });
    const placed = placeDatePopover(40, 150, 182, 252, 280);
    expect(placed.top).toBeGreaterThanOrEqual(8);
    expect(placed.top + 280).toBeLessThanOrEqual(320 - 8);
  });
});
