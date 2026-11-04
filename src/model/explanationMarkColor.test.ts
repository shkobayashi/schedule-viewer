import { describe, expect, it } from "vitest";
import {
  explanationMarkHaloStroke,
  explanationMarkRelativeLuminance,
  parseExplanationMarkColor,
} from "./explanationMarkColor";

describe("parseExplanationMarkColor", () => {
  it("parseExplanationMarkColor_normalizesRgbAndRrggbb", () => {
    expect(parseExplanationMarkColor("#abc")).toBe("#aabbcc");
    expect(parseExplanationMarkColor("#ABC")).toBe("#aabbcc");
    expect(parseExplanationMarkColor("#2563eb")).toBe("#2563eb");
    expect(parseExplanationMarkColor("  #f00  ")).toBe("#ff0000");
  });

  it("parseExplanationMarkColor_rejectsNonHex", () => {
    expect(parseExplanationMarkColor("blue")).toBe(null);
    expect(parseExplanationMarkColor("#rgba")).toBe(null);
    expect(parseExplanationMarkColor("rgb(1,2,3)")).toBe(null);
    expect(parseExplanationMarkColor("#gggggg")).toBe(null);
    expect(parseExplanationMarkColor("")).toBe(null);
    expect(parseExplanationMarkColor(1)).toBe(null);
  });
});

describe("explanationMarkHaloStroke", () => {
  it("explanationMarkHaloStroke_picksContrastingHalo", () => {
    expect(explanationMarkHaloStroke("#2563eb")).toBe("#ffffff");
    expect(explanationMarkHaloStroke("#facc15")).toBe("#000000");
    expect(
      explanationMarkRelativeLuminance("#2563eb") <
        explanationMarkRelativeLuminance("#facc15"),
    ).toBe(true);
  });
});
