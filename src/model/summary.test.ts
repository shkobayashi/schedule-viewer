import { describe, expect, it } from "vitest";
import { parseDate } from "./dates";
import { summarizeSpans, summaryBarWidthPx } from "./summary";

describe("summarizeSpans", () => {
  it("merges spans that start the day after the previous end", () => {
    const result = summarizeSpans([
      { start: "2026-01-01", end: "2026-01-01" },
      { start: "2026-01-02", end: "2026-01-02" },
    ]);
    expect(result).toEqual({
      start: "2026-01-01",
      end: "2026-01-02",
      covered: [{ start: "2026-01-01", end: "2026-01-02" }],
    });
  });

  it("keeps a single day as one span", () => {
    const result = summarizeSpans([
      { start: "2026-01-01", end: "2026-01-01" },
    ]);
    expect(result).toEqual({
      start: "2026-01-01",
      end: "2026-01-01",
      covered: [{ start: "2026-01-01", end: "2026-01-01" }],
    });
  });

  it("merges overlapping spans", () => {
    const result = summarizeSpans([
      { start: "2026-01-01", end: "2026-01-05" },
      { start: "2026-01-03", end: "2026-01-04" },
    ]);
    expect(result?.covered).toEqual([
      { start: "2026-01-01", end: "2026-01-05" },
    ]);
  });

  it("leaves a one-day gap between spans", () => {
    const result = summarizeSpans([
      { start: "2026-01-01", end: "2026-01-01" },
      { start: "2026-01-03", end: "2026-01-03" },
    ]);
    expect(result?.covered).toEqual([
      { start: "2026-01-01", end: "2026-01-01" },
      { start: "2026-01-03", end: "2026-01-03" },
    ]);
  });

  it("draws a single-day summary through the exclusive end", () => {
    const origin = parseDate("2026-01-01").getTime();
    const dateToX = (date: Date) => ((date.getTime() - origin) / 86_400_000) * 10;
    expect(summaryBarWidthPx("2026-01-01", "2026-01-01", dateToX, 6)).toEqual({
      x: 0,
      width: 10,
    });
  });
});
