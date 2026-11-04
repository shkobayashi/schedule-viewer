import { describe, expect, it } from "vitest";
import { parseDate } from "./dates";
import type { Task } from "./types";
import { taskBarRectInBody } from "./taskBarLayout";

const task = (start: string, end: string): Task => ({
  id: "t1",
  name: "t1",
  start,
  end,
  assigneeIds: [],
  status: "not-started",
  progress: 0,
  confidence: "committed",
  predecessors: [],
  milestoneId: null,
  tags: [],
});

describe("taskBarRectInBody", () => {
  const timelineStart = parseDate("2026-01-01");
  const cases: Array<{
    uiScale: number;
    pxPerDay: number;
    rowHeight: number;
    barHeight: number;
  }> = [
    { uiScale: 1, pxPerDay: 8, rowHeight: 26, barHeight: 14 },
    { uiScale: 1, pxPerDay: 40, rowHeight: 26, barHeight: 14 },
    { uiScale: 1.5, pxPerDay: 8, rowHeight: 32, barHeight: 16 },
    { uiScale: 1.5, pxPerDay: 40, rowHeight: 32, barHeight: 16 },
  ];

  for (const { uiScale, pxPerDay, rowHeight, barHeight } of cases) {
    it(`matches TaskBar vertical placement uiScale=${uiScale} pxPerDay=${pxPerDay} rowHeight=${rowHeight}`, () => {
      const scrollX = 0;
      const dateToX = (d: Date) =>
        Math.floor((d.getTime() - timelineStart.getTime()) / 86400000) *
          pxPerDay -
        scrollX;
      const viewportRowTop = 52;
      const rect = taskBarRectInBody({
        task: task("2026-01-05", "2026-01-10"),
        viewportRowTop,
        rowHeight,
        barHeight,
        pxPerDay,
        dateToX,
      });
      expect(rect.y).toBe(viewportRowTop + (rowHeight - barHeight) / 2);
      expect(rect.height).toBe(barHeight);
      expect(rect.x).toBe(dateToX(parseDate("2026-01-05")));
      expect(rect.width).toBeGreaterThan(0);
    });
  }
});
