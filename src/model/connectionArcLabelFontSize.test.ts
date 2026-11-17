import { describe, expect, it } from "vitest";
import { connectionArcLabelFontSize } from "./connectionArcLabelFontSize";

describe("connectionArcLabelFontSize", () => {
  it("scales with bar height and keeps a readable minimum", () => {
    expect(connectionArcLabelFontSize(20)).toBe(11);
    expect(connectionArcLabelFontSize(8)).toBe(10);
  });
});
