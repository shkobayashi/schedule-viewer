import { describe, expect, it } from "vitest";
import {
  buildCommandPaletteItems,
  filterCommandPaletteItems,
  moveCommandPaletteHighlight,
} from "./commandPalette";

const idle = {
  fileBusy: false,
  isTauriDesktop: false,
  canUndo: true,
  canRedo: false,
  selectedTaskId: "t1",
  linkSourceId: null,
  lineageActive: false,
};

describe("filterCommandPaletteItems", () => {
  it("returns all items for empty query", () => {
    const items = buildCommandPaletteItems(idle);
    expect(filterCommandPaletteItems(items, "").length).toBe(items.length);
  });

  it("matches label substring", () => {
    const items = buildCommandPaletteItems(idle);
    const filtered = filterCommandPaletteItems(items, "差分");
    expect(filtered.map((item) => item.id)).toEqual(["showDiff", "copyDiff"]);
  });
});

describe("moveCommandPaletteHighlight", () => {
  it("wraps at ends", () => {
    expect(moveCommandPaletteHighlight(0, -1, 3)).toBe(2);
    expect(moveCommandPaletteHighlight(2, 1, 3)).toBe(0);
  });
});

describe("buildCommandPaletteItems", () => {
  it("hides open in a new window outside the desktop app", () => {
    expect(
      buildCommandPaletteItems(idle).some((item) => item.id === "openNewWindow"),
    ).toBe(false);
    expect(
      buildCommandPaletteItems({ ...idle, isTauriDesktop: true }).some(
        (item) => item.id === "openNewWindow",
      ),
    ).toBe(true);
  });

  it("disables file commands when busy", () => {
    const items = buildCommandPaletteItems({ ...idle, fileBusy: true });
    expect(items.find((item) => item.id === "open")?.enabled).toBe(false);
    expect(items.find((item) => item.id === "find")?.enabled).toBe(true);
  });
});
