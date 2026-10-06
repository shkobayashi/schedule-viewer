import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";
import { paletteFor } from "./palette";

describe("palette contrast", () => {
  it("meets text contrast on primary and danger buttons", () => {
    const light = paletteFor("light").css;
    const dark = paletteFor("dark").css;
    expect(contrastRatio(light.onAccent, light.accent)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(light.dangerOn, light.danger)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dark.onAccentDark, dark.accent)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dark.dangerOn, dark.danger)).toBeGreaterThanOrEqual(4.5);
  });

  it("meets non-text contrast for light not-started bars", () => {
    const chart = paletteFor("light").chart;
    expect(contrastRatio(chart.statusNotStarted.border, chart.exportBg)).toBeGreaterThanOrEqual(
      3,
    );
    expect(
      contrastRatio(chart.statusNotStarted.border, chart.nonWorking),
    ).toBeGreaterThanOrEqual(3);
  });
});
