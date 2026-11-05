import { isValidElement, type ReactElement } from "react";
import { Line } from "react-konva";
import { describe, expect, it } from "vitest";
import { parseDate } from "../../model/dates";
import { paletteFor } from "../../model/palette";
import { buildTimelineBodyColumnNodes } from "./TimelineBodyGrid";
import { buildTimelineChartHeaderContent } from "./TimelineChartHeaderContent";
import { LAYOUT_HEADER_HEIGHT } from "../../model/layoutSizes";

function countLineNodes(nodes: unknown[]): number {
  return nodes.filter(
    (n) => isValidElement(n) && (n as ReactElement).type === Line,
  ).length;
}

describe("TimelineBodyGrid", () => {
  it("builds month-tier vertical grid lines", () => {
    const timelineStart = parseDate("2026-01-01");
    const timelineEnd = parseDate("2026-04-01");
    const chart = paletteFor("light").chart;
    const dateToX = (d: Date) =>
      (d.getTime() - timelineStart.getTime()) / 86400000;
    const nodes = buildTimelineBodyColumnNodes({
      keyPrefix: "t-",
      width: 800,
      height: 400,
      tier: "month",
      timelineStart,
      timelineEnd,
      totalDays: 90,
      dayStart: 0,
      dayEnd: 89,
      dateToX,
      pxPerDay: 10,
      calendar: null,
      chart,
    });
    expect(countLineNodes(nodes)).toBeGreaterThanOrEqual(3);
    expect(nodes.some((n) => isValidElement(n) && String(n.key).startsWith("t-mg-"))).toBe(
      true,
    );
  });
});

describe("TimelineChartHeaderContent", () => {
  it("includes header border and year-month label keys", () => {
    const timelineStart = parseDate("2026-04-01");
    const timelineEnd = parseDate("2026-05-01");
    const chart = paletteFor("light").chart;
    const dateToX = (d: Date) =>
      ((d.getTime() - timelineStart.getTime()) / 86400000) * 10;
    const headerHeight = LAYOUT_HEADER_HEIGHT;
    const nodes = buildTimelineChartHeaderContent({
      width: 600,
      headerHeight,
      scale: 1,
      tier: "week",
      timelineStart,
      timelineEnd,
      totalDays: 30,
      scrollX: 0,
      pxPerDay: 10,
      dayStart: 0,
      dayEnd: 20,
      dateToX,
      today: "2026-04-10",
      calendar: null,
      chart,
      accentColor: "#00f",
    });
    expect(nodes.some((n) => isValidElement(n) && n.key === "header-border")).toBe(
      true,
    );
    expect(
      nodes.some((n) => isValidElement(n) && n.key === "header-year-month"),
    ).toBe(true);
  });
});
