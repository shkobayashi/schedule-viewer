import { describe, expect, it } from "vitest";
import { summaryBarCapPx, summaryBarHeightPx } from "./summaryBarLayout";

describe("summaryBarLayout", () => {
  it("keeps a minimum height and scales with bar height", () => {
    expect(summaryBarHeightPx(16)).toBe(6);
    expect(summaryBarHeightPx(4)).toBe(3);
    expect(summaryBarCapPx(summaryBarHeightPx(16))).toBe(5);
  });
});
