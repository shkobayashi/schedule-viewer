import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DISPLAY_SCALE_LS_KEY,
  DISPLAY_SCALE_OPTIONS,
  parseDisplayScalePreference,
  readDisplayScalePreference,
  resolveUiScale,
  stepDisplayScale,
  uiScaleForViewport,
  writeDisplayScalePreference,
} from "./uiScale";

const memory = new Map<string, string>();

function installLocalStorage() {
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
    removeItem: (key: string) => {
      memory.delete(key);
    },
  });
}

afterEach(() => {
  memory.clear();
  vi.unstubAllGlobals();
});

describe("uiScaleForViewport", () => {
  it("uses 1 at or below the design baseline", () => {
    expect(uiScaleForViewport(1100, 780)).toBe(1);
    expect(uiScaleForViewport(800, 600)).toBe(1);
  });

  it("scales up for larger viewports up to 2", () => {
    expect(uiScaleForViewport(2200, 1560)).toBe(2);
  });
});

describe("parseDisplayScalePreference", () => {
  it("accepts auto and fixed ratios", () => {
    expect(parseDisplayScalePreference(null)).toBe(1);
    expect(parseDisplayScalePreference("")).toBe(1);
    expect(parseDisplayScalePreference("0.5")).toBe(0.5);
    expect(parseDisplayScalePreference("0.75")).toBe(0.75);
    expect(parseDisplayScalePreference("1")).toBe(1);
    expect(parseDisplayScalePreference("auto")).toBe("auto");
    expect(parseDisplayScalePreference("1.25")).toBe(1.25);
    expect(parseDisplayScalePreference("1.5")).toBe(1.5);
    expect(parseDisplayScalePreference("2")).toBe(2);
  });

  it("falls back to auto for invalid stored values", () => {
    expect(parseDisplayScalePreference("oops")).toBe("auto");
    expect(parseDisplayScalePreference("1.3")).toBe("auto");
  });

  it("round-trips every display scale option", () => {
    const values = DISPLAY_SCALE_OPTIONS.map((option) => option.value);
    expect(new Set(values).size).toBe(values.length);
    for (const value of values) {
      expect(parseDisplayScalePreference(String(value))).toBe(value);
    }
  });
});

describe("resolveUiScale", () => {
  it("uses viewport scaling when preference is auto", () => {
    expect(resolveUiScale(2200, 1560, "auto")).toBe(2);
    expect(resolveUiScale(800, 600, "auto")).toBe(1);
  });

  it("uses fixed preference regardless of viewport", () => {
    expect(resolveUiScale(800, 600, 0.75)).toBe(0.75);
    expect(resolveUiScale(800, 600, 1.5)).toBe(1.5);
    expect(resolveUiScale(2200, 1560, 1)).toBe(1);
  });
});

describe("stepDisplayScale", () => {
  it("steps a fixed ratio and stays put at the ends", () => {
    expect(stepDisplayScale(1.5, 1.5, "in")).toBe(2);
    expect(stepDisplayScale(1.5, 1.5, "out")).toBe(1.25);
    expect(stepDisplayScale(2, 2, "in")).toBeNull();
    expect(stepDisplayScale(0.5, 0.5, "out")).toBeNull();
  });

  it("leaves auto for the neighboring fixed step", () => {
    expect(stepDisplayScale("auto", 1.28, "in")).toBe(1.5);
    expect(stepDisplayScale("auto", 1.28, "out")).toBe(1.25);
    expect(stepDisplayScale("auto", 1, "in")).toBe(1.25);
    expect(stepDisplayScale("auto", 1, "out")).toBe(0.75);
    expect(stepDisplayScale("auto", 2, "in")).toBe(2);
    expect(stepDisplayScale("auto", 2, "out")).toBe(1.5);
  });

  it("compares auto scale at two decimal places", () => {
    expect(stepDisplayScale("auto", 1.261, "in")).toBe(1.5);
    expect(stepDisplayScale("auto", 1.261, "out")).toBe(1.25);
    expect(stepDisplayScale("auto", 1.246, "in")).toBe(1.5);
    expect(stepDisplayScale("auto", 1.246, "out")).toBe(1);
  });
});

describe("display scale persistence", () => {
  it("stores fixed ratios and clears key for auto", () => {
    installLocalStorage();
    writeDisplayScalePreference(1.25);
    expect(memory.get(DISPLAY_SCALE_LS_KEY)).toBe("1.25");
    expect(readDisplayScalePreference()).toBe(1.25);
    writeDisplayScalePreference("auto");
    expect(memory.has(DISPLAY_SCALE_LS_KEY)).toBe(false);
    expect(readDisplayScalePreference()).toBe(1);
  });
});
