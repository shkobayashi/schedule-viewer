import { describe, expect, it } from "vitest";
import {
  MONTH_HEADER_LABEL_GAP_BASE_PX,
  formatYearMonth,
  monthHeaderLabelWidth,
  visibleMonthHeaderLabels,
} from "./monthHeader";

describe("monthHeader", () => {
  it("formats year and month in Japanese", () => {
    expect(formatYearMonth(new Date(Date.UTC(2026, 5, 1)))).toBe("2026年6月");
  });

  it("shows distant month labels", () => {
    const gap = MONTH_HEADER_LABEL_GAP_BASE_PX;
    const visible = visibleMonthHeaderLabels(
      [
        { key: "a", x: 200, text: "2026年6月", fontSize: 12 },
        { key: "b", x: 400, text: "2026年7月", fontSize: 12 },
      ],
      [],
      gap,
    );
    expect(visible.map((item) => item.key)).toEqual(["a", "b"]);
  });

  it("hides a month label that overlaps a fixed label", () => {
    const fontSize = 12;
    const fixedText = "2026年6月";
    const gap = MONTH_HEADER_LABEL_GAP_BASE_PX;
    const fixedWidth = monthHeaderLabelWidth(fixedText, 11);
    const visible = visibleMonthHeaderLabels(
      [
        {
          key: "jul",
          x: 4 + fixedWidth,
          text: "2026年7月",
          fontSize,
        },
      ],
      [{ left: 4, text: fixedText, fontSize: 11 }],
      gap,
    );
    expect(visible).toEqual([]);
  });

  it("shows a month label that clears the fixed label with gap", () => {
    const fontSize = 12;
    const fixedText = "2026年6月";
    const gap = MONTH_HEADER_LABEL_GAP_BASE_PX;
    const fixedRight = 4 + monthHeaderLabelWidth(fixedText, 11);
    const visible = visibleMonthHeaderLabels(
      [
        {
          key: "jul",
          x: fixedRight + gap,
          text: "2026年7月",
          fontSize,
        },
      ],
      [{ left: 4, text: fixedText, fontSize: 11 }],
      gap,
    );
    expect(visible.map((item) => item.key)).toEqual(["jul"]);
  });

  it("does not treat a skipped month as obstruction for the next month", () => {
    const gap = MONTH_HEADER_LABEL_GAP_BASE_PX;
    const junX = 120;
    const junWidth = monthHeaderLabelWidth("2026年6月", 12);
    const visible = visibleMonthHeaderLabels(
      [
        { key: "jun", x: junX, text: "2026年6月", fontSize: 12 },
        {
          key: "jul",
          x: junX + junWidth - 2,
          text: "2026年7月",
          fontSize: 12,
        },
        {
          key: "aug",
          x: junX + junWidth + gap + 40,
          text: "2026年8月",
          fontSize: 12,
        },
      ],
      [],
      gap,
    );
    expect(visible.map((item) => item.key)).toEqual(["jun", "aug"]);
  });

  it("scales the gap with display size", () => {
    const fontSize = 12;
    const scale = 1.5;
    const gap = MONTH_HEADER_LABEL_GAP_BASE_PX * scale;
    const fixedRight = 4 + monthHeaderLabelWidth("2026年6月", 11 * scale);
    const tooClose = visibleMonthHeaderLabels(
      [{ key: "jul", x: fixedRight + gap - 1, text: "2026年7月", fontSize }],
      [{ left: 4, text: "2026年6月", fontSize: 11 * scale }],
      gap,
    );
    const fits = visibleMonthHeaderLabels(
      [{ key: "jul", x: fixedRight + gap, text: "2026年7月", fontSize }],
      [{ left: 4, text: "2026年6月", fontSize: 11 * scale }],
      gap,
    );
    expect(tooClose).toEqual([]);
    expect(fits.map((item) => item.key)).toEqual(["jul"]);
  });

  it("estimates width from each label font size", () => {
    const text = "2026年12月";
    const small = monthHeaderLabelWidth(text, 10);
    const large = monthHeaderLabelWidth(text, 20);
    expect(large).toBeGreaterThan(small);
  });

  it("hides the next label when the previous label uses a larger font size", () => {
    const gap = MONTH_HEADER_LABEL_GAP_BASE_PX;
    const x = 100;
    const text = "2026年7月";
    const smallFont = 12;
    const largeFont = 18;
    const julX = x + monthHeaderLabelWidth("2026年6月", smallFont) + gap;
    const withSmall = visibleMonthHeaderLabels(
      [
        { key: "jun", x, text: "2026年6月", fontSize: smallFont },
        { key: "jul", x: julX, text, fontSize: smallFont },
      ],
      [],
      gap,
    );
    const withLarge = visibleMonthHeaderLabels(
      [
        { key: "jun", x, text: "2026年6月", fontSize: largeFont },
        { key: "jul", x: julX, text, fontSize: smallFont },
      ],
      [],
      gap,
    );
    expect(withSmall.map((item) => item.key)).toEqual(["jun", "jul"]);
    expect(withLarge.map((item) => item.key)).toEqual(["jun"]);
  });
});
