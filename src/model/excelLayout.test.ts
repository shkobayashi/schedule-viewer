import { describe, expect, it } from "vitest";
import { excelHeaderRowHeightPx } from "./excelLayout";

describe("excelLayout", () => {
  it("uses 28px header when date columns are 96px or wider", () => {
    expect(excelHeaderRowHeightPx(96)).toBe(28);
    expect(excelHeaderRowHeightPx(120)).toBe(28);
  });

  it("uses 22px header when date columns are narrower than 96px", () => {
    expect(excelHeaderRowHeightPx(48)).toBe(22);
    expect(excelHeaderRowHeightPx(95)).toBe(22);
  });
});
