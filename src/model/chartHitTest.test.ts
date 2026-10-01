import { describe, expect, it } from "vitest";
import {
  hitMilestoneDiamond,
  hitTaskAnchor,
  linkPreviewEnd,
  resolveChartHover,
  TASK_HANDLE_WIDTH,
} from "./chartHitTest";
import type { LinkPolyline } from "./dependencies";

const anchors = new Map([
  ["task-a", { x: 10, right: 50, y: 20 }],
  ["task-b", { x: 80, right: 120, y: 60 }],
]);

const linkOnTask: LinkPolyline = {
  fromId: "task-a",
  toId: "task-b",
  points: [10, 20, 50, 20],
};

describe("chartHitTest", () => {
  it("extends the selected bar by the resize handle", () => {
    const pad = TASK_HANDLE_WIDTH / 2;
    const hit = hitTaskAnchor({ x: 10 - pad, y: 20 }, anchors, 20, {
      linkMode: false,
      selectedTaskId: "task-a",
    });
    expect(hit?.taskId).toBe("task-a");
    expect(
      hitTaskAnchor({ x: 10 - pad, y: 20 }, anchors, 20, {
        linkMode: false,
        selectedTaskId: "task-b",
      }),
    ).toBeNull();
  });

  it("does not extend the handle while drawing a link", () => {
    expect(
      hitTaskAnchor({ x: 10 - 1, y: 20 }, anchors, 20, {
        linkMode: true,
        selectedTaskId: "task-a",
      }),
    ).toBeNull();
  });

  it("prefers a task or milestone over a link", () => {
    const onTask = resolveChartHover({
      insideBody: true,
      local: { x: 20, y: 20 },
      overMilestone: false,
      anchors,
      linkPolylines: [linkOnTask],
      barHeight: 20,
      linkMode: false,
      selectedTaskId: null,
      sidebar: false,
    });
    expect(onTask.hover.overTask).toBe(true);
    expect(onTask.hover.link).toBeNull();

    const onMilestone = resolveChartHover({
      insideBody: true,
      local: { x: 20, y: 20 },
      overMilestone: true,
      anchors: new Map(),
      linkPolylines: [linkOnTask],
      barHeight: 20,
      linkMode: false,
      selectedTaskId: null,
      sidebar: false,
    });
    expect(onMilestone.hover.overMilestone).toBe(true);
    expect(onMilestone.hover.link).toBeNull();
  });

  it("misses tasks and links in the sticky band", () => {
    const inBand = resolveChartHover({
      insideBody: true,
      local: { x: 20, y: 20 },
      overMilestone: false,
      anchors,
      linkPolylines: [linkOnTask],
      barHeight: 20,
      linkMode: false,
      selectedTaskId: null,
      sidebar: false,
      clipTop: 40,
    });
    expect(inBand.hover.overTask).toBe(false);
    expect(inBand.hover.link).toBeNull();
    expect(inBand.hover.hoverTaskId).toBeNull();

    const below = resolveChartHover({
      insideBody: true,
      local: { x: 30, y: 40 },
      overMilestone: false,
      anchors: new Map(),
      linkPolylines: [{ ...linkOnTask, points: [10, 40, 50, 40] }],
      barHeight: 20,
      linkMode: false,
      selectedTaskId: null,
      sidebar: false,
      clipTop: 40,
    });
    expect(below.hover.link).toEqual({ fromId: "task-a", toId: "task-b" });
  });

  it("hits a link only when the pointer misses bars and diamonds", () => {
    const hit = resolveChartHover({
      insideBody: true,
      local: { x: 30, y: 20 },
      overMilestone: false,
      anchors: new Map([["task-b", { x: 80, right: 120, y: 60 }]]),
      linkPolylines: [linkOnTask],
      barHeight: 20,
      linkMode: false,
      selectedTaskId: null,
      sidebar: false,
    });
    expect(hit.hover.link).toEqual({ fromId: "task-a", toId: "task-b" });
  });

  it("places the link preview at the sidebar, bar start, or pointer", () => {
    expect(
      linkPreviewEnd({
        linkMode: true,
        local: { x: 40, y: 12 },
        sidebar: true,
        hoverAnchor: { x: 10, y: 12 },
      }),
    ).toEqual({ x: 0, y: 12 });
    expect(
      linkPreviewEnd({
        linkMode: true,
        local: { x: 40, y: 12 },
        sidebar: false,
        hoverAnchor: { x: 10, y: 18 },
      }),
    ).toEqual({ x: 10, y: 18 });
    expect(
      linkPreviewEnd({
        linkMode: true,
        local: { x: 40, y: 12 },
        sidebar: false,
        hoverAnchor: null,
      }),
    ).toEqual({ x: 40, y: 12 });
    expect(
      linkPreviewEnd({
        linkMode: false,
        local: { x: 40, y: 12 },
        sidebar: true,
        hoverAnchor: null,
      }),
    ).toBeNull();
  });

  it("hits a milestone diamond inside the slop and misses outside it", () => {
    const dateToX = () => 30;
    const milestones = [{ id: "m1", date: "2026-04-01", name: "" }];
    const lanes = new Map([["m1", 0]]);
    expect(
      hitMilestoneDiamond(
        { x: 30, y: 8 },
        milestones,
        lanes,
        dateToX,
        12,
        16,
        11,
      ),
    ).toBe(true);
    expect(
      hitMilestoneDiamond(
        { x: 80, y: 8 },
        milestones,
        lanes,
        dateToX,
        12,
        16,
        11,
      ),
    ).toBe(false);
  });

  it("hits the milestone name and the gap, and misses past the name and lane padding", () => {
    const dateToX = () => 100;
    const milestones = [{ id: "m1", date: "2026-04-01", name: "あいう" }];
    const lanes = new Map([["m1", 0]]);
    const diamondSize = 12;
    const laneHeight = 26;
    const fontSize = 11;
    const hitAt = (x: number, y: number) =>
      hitMilestoneDiamond(
        { x, y },
        milestones,
        lanes,
        dateToX,
        diamondSize,
        laneHeight,
        fontSize,
      );
    const cy = laneHeight / 2;
    expect(hitAt(109, cy)).toBe(true);
    expect(hitAt(120, cy)).toBe(true);
    expect(hitAt(145, cy)).toBe(false);
    expect(hitAt(100, 4)).toBe(false);
    expect(hitAt(120, 4)).toBe(false);
    expect(hitAt(120, 22)).toBe(false);
  });

  it("extends the name hit to the text height when that is taller than the circle", () => {
    const dateToX = () => 0;
    const milestones = [{ id: "m1", date: "2026-04-01", name: "あ" }];
    const lanes = new Map([["m1", 0]]);
    const hitAt = (x: number, y: number) =>
      hitMilestoneDiamond({ x, y }, milestones, lanes, dateToX, 8, 40, 20);
    expect(hitAt(10, 12)).toBe(true);
    expect(hitAt(10, 9)).toBe(false);
  });
});
