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

  it("meets text contrast for danger labels on surfaces", () => {
    const dark = paletteFor("dark").css;
    expect(contrastRatio(dark.dangerText, dark.panel)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dark.dangerText, dark.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dark.dangerText, dark.bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("meets text contrast for bar labels", () => {
    const light = paletteFor("light").chart;
    const dark = paletteFor("dark").chart;
    expect(
      contrastRatio(light.barLabelMuted, light.statusNotStarted.bg),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(light.barLabelMuted, light.statusInProgress.bg),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(light.barLabelOnFill, light.statusDone.bg),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(dark.barLabelMuted, dark.statusNotStarted.bg),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(dark.barLabelOnFill, dark.statusDone.bg),
    ).toBeGreaterThanOrEqual(4.5);
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
