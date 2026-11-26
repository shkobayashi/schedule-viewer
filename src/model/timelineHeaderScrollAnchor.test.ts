import { describe, expect, it } from "vitest";
import { timelineHeaderScrollAnchorDay } from "./timelineHeaderScrollAnchor";

describe("timelineHeaderScrollAnchorDay", () => {
  it("clamps to day range and floors scroll offset", () => {
    expect(timelineHeaderScrollAnchorDay(0, 10, 30)).toBe(0);
    expect(timelineHeaderScrollAnchorDay(25, 10, 30)).toBe(2);
    expect(timelineHeaderScrollAnchorDay(500, 10, 30)).toBe(29);
  });

  it("avoids division by zero when pxPerDay is zero", () => {
    expect(timelineHeaderScrollAnchorDay(100, 0, 10)).toBe(9);
  });
});
