import { describe, expect, it } from "vitest";
import { parseDate } from "./dates";
import { resolveTimelineOrigin } from "./timeline";

describe("resolveTimelineOrigin", () => {
  const pinned = parseDate("2026-09-08");
  const pxPerDay = 22;

  it("keeps the origin when a later start would scroll past the left edge", () => {
    const next = resolveTimelineOrigin({
      pinnedStart: pinned,
      dataStart: parseDate("2026-09-12"),
      scrollX: 0,
      pxPerDay,
    });
    expect(next.pinnedStart.getTime()).toBe(pinned.getTime());
    expect(next.scrollX).toBe(0);
  });

  it("adopts a later start when the scroll can keep the same day in place", () => {
    const dataStart = parseDate("2026-09-12");
    const next = resolveTimelineOrigin({
      pinnedStart: pinned,
      dataStart,
      scrollX: 4 * pxPerDay,
      pxPerDay,
    });
    expect(next.pinnedStart.getTime()).toBe(dataStart.getTime());
    expect(next.scrollX).toBe(0);
  });

  it("adopts an earlier start and increases scroll", () => {
    const dataStart = parseDate("2026-09-06");
    const next = resolveTimelineOrigin({
      pinnedStart: pinned,
      dataStart,
      scrollX: 10,
      pxPerDay,
    });
    expect(next.pinnedStart.getTime()).toBe(dataStart.getTime());
    expect(next.scrollX).toBe(10 + 2 * pxPerDay);
  });
});
