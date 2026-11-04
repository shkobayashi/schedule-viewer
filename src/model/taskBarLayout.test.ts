import { describe, expect, it } from "vitest";
import { parseDate } from "./dates";
import type { Task } from "./types";
import {
  milestoneDiamondRectInBand,
  milestoneMarkGroupX,
  milestoneMarkLaneCenterY,
  taskBarAnchorInBody,
  taskBarRectInBody,
} from "./taskBarLayout";

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

/** TaskBar / ResizeHandles が taskBarRectInBody に渡すのと同じ引数。 */
function rendererTaskBarLayout(input: {
  task: Task;
  viewportRowTop: number;
  rowHeight: number;
  barHeight: number;
  pxPerDay: number;
  dateToX: (d: Date) => number;
  barLeft?: number;
  barWidth?: number;
}) {
  return taskBarRectInBody(input);
}

/** Timeline の taskAnchors が taskBarAnchorInBody に渡すのと同じ引数。 */
function rendererTaskAnchor(input: {
  task: Task;
  viewportRowTop: number;
  rowHeight: number;
  barHeight: number;
  pxPerDay: number;
  dateToX: (d: Date) => number;
  barLeft?: number;
  barWidth?: number;
}) {
  return taskBarAnchorInBody(input);
}

describe("taskBarLayout matches renderer calls", () => {
  const timelineStart = parseDate("2026-01-01");
  const cases = [
    { uiScale: 1, pxPerDay: 8, rowHeight: 26, barHeight: 14 },
    { uiScale: 1, pxPerDay: 40, rowHeight: 26, barHeight: 14 },
    { uiScale: 1.5, pxPerDay: 8, rowHeight: 32, barHeight: 16 },
    { uiScale: 1.5, pxPerDay: 40, rowHeight: 32, barHeight: 16 },
  ] as const;

  for (const { pxPerDay, rowHeight, barHeight } of cases) {
    it(`task bar rect pxPerDay=${pxPerDay} rowHeight=${rowHeight}`, () => {
      const scrollX = 0;
      const dateToX = (d: Date) =>
        Math.floor((d.getTime() - timelineStart.getTime()) / 86400000) *
          pxPerDay -
        scrollX;
      const viewportRowTop = 52;
      const sample = task("2026-01-05", "2026-01-10");
      const layout = {
        task: sample,
        viewportRowTop,
        rowHeight,
        barHeight,
        pxPerDay,
        dateToX,
      };
      const rect = rendererTaskBarLayout(layout);
      const anchor = rendererTaskAnchor(layout);
      expect(rect.y + barHeight / 2).toBe(anchor.y);
      expect(rect.x).toBe(anchor.x);
      expect(rect.x + rect.width).toBe(anchor.right);
      expect(rect.height).toBe(barHeight);
    });

    it(`milestone mark center pxPerDay=${pxPerDay}`, () => {
      const scrollX = 40;
      const dateToX = (d: Date) =>
        Math.floor((d.getTime() - timelineStart.getTime()) / 86400000) *
          pxPerDay -
        scrollX;
      const dateIso = "2026-01-08";
      const lane = 1;
      const laneHeight = 18;
      const diamondSize = 11;
      const centerY = 24;
      const groupX = milestoneMarkGroupX(dateIso, dateToX);
      const groupY = milestoneMarkLaneCenterY(lane, laneHeight);
      expect(groupY).toBe(lane * laneHeight + laneHeight / 2);
      const diamond = milestoneDiamondRectInBand({
        dateIso,
        dateToX,
        centerY,
        diamondSize,
      });
      expect(diamond.x + diamond.width / 2).toBe(groupX);
      expect(diamond.y + diamond.height / 2).toBe(centerY);
    });
  }
});
