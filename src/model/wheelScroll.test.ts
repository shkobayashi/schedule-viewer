import { describe, expect, it } from "vitest";
import { isShiftAxisSwap, resolveWheelScroll } from "./wheelScroll";

const body = (overrides: Partial<Parameters<typeof resolveWheelScroll>[0]> = {}) =>
  resolveWheelScroll({
    deltaX: 0,
    deltaY: 0,
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
    zone: "body",
    ...overrides,
  });

const header = (overrides: Partial<Parameters<typeof resolveWheelScroll>[0]> = {}) =>
  resolveWheelScroll({
    deltaX: 0,
    deltaY: 0,
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
    zone: "header",
    ...overrides,
  });

describe("isShiftAxisSwap", () => {
  it("is false without shift", () => {
    expect(isShiftAxisSwap(false, 10, 0)).toBe(false);
  });

  it("detects horizontal-only after axis swap", () => {
    expect(isShiftAxisSwap(true, 12, 0)).toBe(true);
  });

  it("detects duplicate deltas", () => {
    expect(isShiftAxisSwap(true, 8, 8)).toBe(true);
  });

  it("is false when vertical and horizontal differ", () => {
    expect(isShiftAxisSwap(true, 5, 10)).toBe(false);
  });
});

describe("resolveWheelScroll body", () => {
  it("scrolls vertically from deltaY alone", () => {
    expect(body({ deltaY: 16 })).toEqual({
      type: "scroll",
      deltaScrollX: 0,
      deltaScrollY: 16,
    });
  });

  it("scrolls horizontally from deltaX alone", () => {
    expect(body({ deltaX: -20 })).toEqual({
      type: "scroll",
      deltaScrollX: -20,
      deltaScrollY: 0,
    });
  });

  it("scrolls both axes on diagonal gesture", () => {
    expect(body({ deltaX: 10, deltaY: 15 })).toEqual({
      type: "scroll",
      deltaScrollX: 10,
      deltaScrollY: 15,
    });
  });

  it("maps shift+vertical wheel to horizontal scroll", () => {
    expect(body({ deltaY: 30, shiftKey: true })).toEqual({
      type: "scroll",
      deltaScrollX: 30,
      deltaScrollY: 0,
    });
  });

  it("uses swapped horizontal delta once when only deltaX is set", () => {
    expect(body({ deltaX: 25, shiftKey: true })).toEqual({
      type: "scroll",
      deltaScrollX: 25,
      deltaScrollY: 0,
    });
  });

  it("does not double-count equal deltas under shift", () => {
    expect(body({ deltaX: 12, deltaY: 12, shiftKey: true })).toEqual({
      type: "scroll",
      deltaScrollX: 12,
      deltaScrollY: 0,
    });
  });

  it("ignores deltaX under shift when deltas differ", () => {
    expect(body({ deltaX: 5, deltaY: 40, shiftKey: true })).toEqual({
      type: "scroll",
      deltaScrollX: 40,
      deltaScrollY: 0,
    });
  });
});

describe("resolveWheelScroll header", () => {
  it("maps vertical wheel to horizontal scroll", () => {
    expect(header({ deltaY: 18 })).toEqual({
      type: "scroll",
      deltaScrollX: 18,
      deltaScrollY: 0,
    });
  });

  it("maps horizontal delta to horizontal scroll", () => {
    expect(header({ deltaX: -14 })).toEqual({
      type: "scroll",
      deltaScrollX: -14,
      deltaScrollY: 0,
    });
  });

  it("adds both axes when they differ", () => {
    expect(header({ deltaX: 6, deltaY: 9 })).toEqual({
      type: "scroll",
      deltaScrollX: 15,
      deltaScrollY: 0,
    });
  });

  it("counts shift swap once", () => {
    expect(header({ deltaX: 7, deltaY: 7, shiftKey: true })).toEqual({
      type: "scroll",
      deltaScrollX: 7,
      deltaScrollY: 0,
    });
  });

  it("adds both axes under shift when they differ", () => {
    expect(header({ deltaX: 5, deltaY: 40, shiftKey: true })).toEqual({
      type: "scroll",
      deltaScrollX: 45,
      deltaScrollY: 0,
    });
  });
});

describe("resolveWheelScroll zoom", () => {
  it("zooms in from negative deltaY with ctrl", () => {
    expect(body({ deltaY: -1, ctrlKey: true })).toEqual({
      type: "zoom",
      factor: 1.15,
    });
  });

  it("zooms out from positive deltaY with meta", () => {
    expect(body({ deltaY: 2, metaKey: true })).toEqual({
      type: "zoom",
      factor: 1 / 1.15,
    });
  });

  it("ignores deltaX for zoom and scroll", () => {
    expect(body({ deltaX: 50, deltaY: -1, ctrlKey: true })).toEqual({
      type: "zoom",
      factor: 1.15,
    });
  });
});
