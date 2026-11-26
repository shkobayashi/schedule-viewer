import { describe, expect, it } from "vitest";
import { parseDate } from "./dates";
import type { VisibleRow } from "./types";
import {
  buildExplanationOverlayGeometry,
  buildTaskBarAnchorsForOverlay,
  estimateBalloonDimensions,
  explanationBalloonScreenRect,
  explanationMarkVisibleInViewport,
  explanationSidebarMarkKinds,
  milestoneExplanationBalloonOverlayHeight,
  milestoneExplanationBalloonScreenRect,
  planExplanationOverlayScroll,
} from "./explainOverlayLayout";
import { taskBarRectInBody } from "./taskBarLayout";
import { collectTaskBarLabelObstacles } from "./connections";
import type { ExplanationMark } from "./explainOverlay";
import { layoutMilestoneBand } from "./milestones";

const timelineStart = parseDate("2026-01-01");
const pxPerDay = 20;
const scrollX = 100;

const dateToX = (d: Date) =>
  Math.floor((d.getTime() - timelineStart.getTime()) / 86400000) * pxPerDay -
  scrollX;

const taskRow = (
  id: string,
  y: number,
  start = "2026-01-05",
  end = "2026-01-10",
): Extract<VisibleRow, { type: "task" }> => ({
  type: "task",
  y,
  task: {
    id,
    name: id,
    start,
    end,
    assigneeIds: [],
    status: "not-started",
    progress: 0,
    confidence: "committed",
    predecessors: [],
    milestoneId: null,
    tags: [],
  },
});

describe("buildExplanationOverlayGeometry", () => {
  it("cuts task bar in body stage and sidebar mark kind without y", () => {
    const rows = [taskRow("t1", 40)];
    const liveAnchors = buildTaskBarAnchorsForOverlay({
      visibleRows: rows,
      scrollY: 0,
      rowHeight: 24,
      barHeight: 14,
      dateToX,
      pxPerDay,
    });
    const geo = buildExplanationOverlayGeometry({
      marks: [{ taskId: "t1", kind: "change", label: "move" }],
      visibleRows: rows,
      dateToX,
      pxPerDay,
      scrollY: 0,
      rowHeight: 24,
      barHeight: 14,
      bodyHeight: 200,
      headerHeight: 30,
      timelineWidth: 400,
      liveAnchors,
      milestones: [],
      milestoneCenterYById: new Map(),
      milestoneDiamondSize: 11,
    });
    expect(geo.bodyHoles.length).toBe(1);
    expect(geo.bodyHoles[0]?.y).toBe(40 + (24 - 14) / 2);
    expect(geo.sidebarMarkKinds.get("t1")).toBe("change");
    expect(
      explanationSidebarMarkKinds([
        { taskId: "t1", kind: "change", label: "move" },
      ]).get("t1"),
    ).toBe("change");
    expect(geo.bodyBalloons[0]?.placement).toBeDefined();
    expect(geo.bodyBalloons[0]?.maxWidth).toBe(160);
  });

  it("buildExplanationOverlayGeometry_keepsHoleRectWithCustomColor", () => {
    const rows = [taskRow("t1", 40)];
    const liveAnchors = buildTaskBarAnchorsForOverlay({
      visibleRows: rows,
      scrollY: 0,
      rowHeight: 24,
      barHeight: 14,
      dateToX,
      pxPerDay,
    });
    const shared = {
      visibleRows: rows,
      dateToX,
      pxPerDay,
      scrollY: 0,
      rowHeight: 24,
      barHeight: 14,
      bodyHeight: 200,
      headerHeight: 30,
      timelineWidth: 400,
      liveAnchors,
      milestones: [],
      milestoneCenterYById: new Map(),
      milestoneDiamondSize: 11,
    };
    const plain = buildExplanationOverlayGeometry({
      ...shared,
      marks: [{ taskId: "t1", kind: "change", label: "move" }],
    });
    const colored = buildExplanationOverlayGeometry({
      ...shared,
      marks: [
        {
          taskId: "t1",
          kind: "change",
          label: "move",
          color: "#2563eb",
        },
      ],
    });
    expect(colored.bodyHoles[0]).toMatchObject({
      x: plain.bodyHoles[0]?.x,
      y: plain.bodyHoles[0]?.y,
      width: plain.bodyHoles[0]?.width,
      height: plain.bodyHoles[0]?.height,
    });
    expect(colored.bodyHoles[0]?.color).toBe("#2563eb");
    expect(colored.bodyBalloons[0]?.color).toBe("#2563eb");
    expect(plain.bodyHoles[0]?.color).toBeUndefined();
  });

  describe("colored body holes match taskBarRectInBody", () => {
    const cases = [
      { pxPerDay: 8, rowHeight: 26, barHeight: 14, scrollX: 40 },
      { pxPerDay: 40, rowHeight: 26, barHeight: 14, scrollX: 100 },
      { pxPerDay: 8, rowHeight: 32, barHeight: 16, scrollX: 40 },
      { pxPerDay: 40, rowHeight: 32, barHeight: 16, scrollX: 100 },
    ] as const;

    for (const { pxPerDay, rowHeight, barHeight, scrollX: sx } of cases) {
      it(`buildExplanationOverlayGeometry_coloredHoleMatchesRenderer pxPerDay=${pxPerDay} rowHeight=${rowHeight}`, () => {
        const dateToXLocal = (d: Date) =>
          Math.floor((d.getTime() - timelineStart.getTime()) / 86400000) *
            pxPerDay -
          sx;
        const rows = [taskRow("t1", 40)];
        const scrollY = 0;
        const liveAnchors = buildTaskBarAnchorsForOverlay({
          visibleRows: rows,
          scrollY,
          rowHeight,
          barHeight,
          dateToX: dateToXLocal,
          pxPerDay,
        });
        const geo = buildExplanationOverlayGeometry({
          marks: [
            {
              taskId: "t1",
              kind: "ask",
              label: "?",
              color: "#dc2626",
            },
          ],
          visibleRows: rows,
          dateToX: dateToXLocal,
          pxPerDay,
          scrollY,
          rowHeight,
          barHeight,
          bodyHeight: 200,
          headerHeight: 30,
          timelineWidth: 400,
          liveAnchors,
          milestones: [],
          milestoneCenterYById: new Map(),
          milestoneDiamondSize: 11,
        });
        const row = rows[0]!;
        const expected = taskBarRectInBody({
          task: row.task,
          viewportRowTop: row.y - scrollY,
          rowHeight,
          barHeight,
          pxPerDay,
          dateToX: dateToXLocal,
          anchor: liveAnchors.get("t1"),
        });
        const hole = geo.bodyHoles[0]!;
        expect({
          x: hole.x,
          y: hole.y,
          width: hole.width,
          height: hole.height,
        }).toEqual(expected);
        expect(hole.color).toBe("#dc2626");
        expect(hole.kind).toBe("ask");
      });
    }
  });

  it("buildExplanationOverlayGeometry_clipsTaskBarToDate", () => {
    const rows = [taskRow("t1", 40)];
    const liveAnchors = buildTaskBarAnchorsForOverlay({
      visibleRows: rows,
      scrollY: 0,
      rowHeight: 24,
      barHeight: 14,
      dateToX,
      pxPerDay,
    });
    const geo = buildExplanationOverlayGeometry({
      marks: [
        {
          taskId: "t1",
          date: "2026-01-06",
          kind: "change",
          label: "day",
        },
      ],
      visibleRows: rows,
      dateToX,
      pxPerDay,
      scrollY: 0,
      rowHeight: 24,
      barHeight: 14,
      bodyHeight: 200,
      headerHeight: 30,
      timelineWidth: 400,
      liveAnchors,
      milestones: [],
      milestoneCenterYById: new Map(),
      milestoneDiamondSize: 11,
    });
    const hole = geo.bodyHoles[0]!;
    expect(hole.width).toBeLessThanOrEqual(pxPerDay + 1);
  });

  it("layoutExplanationBalloon_headerStaysWithinHeaderTop", () => {
    const dateToXContent = (d: Date) =>
      Math.floor((d.getTime() - timelineStart.getTime()) / 86400000) * pxPerDay;
    const headerHeight = 30;
    const geo = buildExplanationOverlayGeometry({
      marks: [{ date: "2026-01-05", kind: "ask", label: "長い日付ヘッダーの説明ラベル" }],
      visibleRows: [],
      dateToX: dateToXContent,
      pxPerDay,
      scrollY: 0,
      rowHeight: 24,
      barHeight: 14,
      bodyHeight: 400,
      headerHeight,
      timelineWidth: 400,
      liveAnchors: new Map(),
      milestones: [],
      milestoneCenterYById: new Map(),
      milestoneDiamondSize: 11,
    });
    const balloon = geo.headerBalloons[0]!;
    const dimensions = estimateBalloonDimensions(
      balloon.label,
      balloon.maxWidth,
      1,
      headerHeight - 2,
    );
    const rect = explanationBalloonScreenRect(
      balloon.left,
      balloon.top,
      balloon.placement,
      dimensions,
    );
    expect(rect.top).toBeGreaterThanOrEqual(0);
    expect(rect.bottom).toBeLessThanOrEqual(headerHeight);
  });

  it("buildExplanationOverlayGeometry_placesMilestoneMarkBalloonInBand", () => {
    const dateToXContent = (d: Date) =>
      Math.floor((d.getTime() - timelineStart.getTime()) / 86400000) * pxPerDay;
    const bandLayout = layoutMilestoneBand(
      [{ id: "mg1", name: "G" }],
      [
        {
          id: "ms1",
          name: "M",
          date: "2026-01-05",
          confidence: "committed",
          groupId: "mg1",
        },
      ],
      new Set(["mg1"]),
      pxPerDay,
      11,
      11,
      24,
      "screen",
    );
    const geo = buildExplanationOverlayGeometry({
      marks: [{ milestoneId: "ms1", kind: "ask", label: "星" }],
      visibleRows: [],
      dateToX: dateToXContent,
      pxPerDay,
      scrollY: 0,
      rowHeight: 24,
      barHeight: 14,
      bodyHeight: 400,
      headerHeight: 30,
      timelineWidth: 400,
      liveAnchors: new Map(),
      milestones: [
        {
          id: "ms1",
          name: "M",
          date: "2026-01-05",
          confidence: "committed",
          groupId: "mg1",
        },
      ],
      milestoneCenterYById: bandLayout.centerYById,
      milestoneBandLayout: bandLayout,
      milestoneDiamondSize: 11,
    });
    expect(geo.milestoneBalloons).toHaveLength(1);
    expect(geo.bodyBalloons).toHaveLength(0);
  });

  it("milestoneMarkBalloon_staysInVisibleOverlayAndPointsFromBelow", () => {
    const dateToXContent = (d: Date) =>
      Math.floor((d.getTime() - timelineStart.getTime()) / 86400000) * pxPerDay;
    const bandLayout = layoutMilestoneBand(
      [{ id: "mg1", name: "G" }],
      [
        {
          id: "ms1",
          name: "PoC完了",
          date: "2026-01-05",
          confidence: "committed",
          groupId: "mg1",
        },
      ],
      new Set(["mg1"]),
      pxPerDay,
      11,
      11,
      24,
      "screen",
    );
    const bandHeight = bandLayout.totalHeight;
    const overlayHeight = milestoneExplanationBalloonOverlayHeight(
      bandHeight,
      1,
    );
    const geo = buildExplanationOverlayGeometry({
      marks: [
        {
          milestoneId: "ms1",
          kind: "ask",
          label: "PoC完了（評価指標クリア・次フェーズ判定）",
        },
      ],
      visibleRows: [],
      dateToX: dateToXContent,
      pxPerDay,
      scrollY: 0,
      rowHeight: 24,
      barHeight: 14,
      bodyHeight: 400,
      headerHeight: 30,
      timelineWidth: 400,
      liveAnchors: new Map(),
      milestones: [
        {
          id: "ms1",
          name: "PoC完了",
          date: "2026-01-05",
          confidence: "committed",
          groupId: "mg1",
        },
      ],
      milestoneCenterYById: bandLayout.centerYById,
      milestoneBandLayout: bandLayout,
      milestoneDiamondSize: 11,
    });
    const balloon = geo.milestoneBalloons[0]!;
    expect(balloon.placement).toBe("below");
    const rect = milestoneExplanationBalloonScreenRect(balloon, 1);
    expect(rect.top).toBeGreaterThanOrEqual(0);
    expect(rect.bottom).toBeLessThanOrEqual(overlayHeight);
    const anchorY = bandLayout.centerYById.get("ms1")!;
    expect(balloon.top).toBeGreaterThanOrEqual(anchorY);
  });

  it("milestoneMarkBalloon_visibleInMultiRowBand", () => {
    const dateToXContent = (d: Date) =>
      Math.floor((d.getTime() - timelineStart.getTime()) / 86400000) * pxPerDay;
    const bandLayout = layoutMilestoneBand(
      [{ id: "mg1", name: "G" }],
      [
        {
          id: "ms1",
          name: "A",
          date: "2026-01-05",
          confidence: "committed",
          groupId: "mg1",
        },
        {
          id: "ms2",
          name: "B",
          date: "2026-01-06",
          confidence: "committed",
          groupId: "mg1",
        },
      ],
      new Set(["mg1"]),
      pxPerDay,
      11,
      11,
      24,
      "screen",
    );
    const overlayHeight = milestoneExplanationBalloonOverlayHeight(
      bandLayout.totalHeight,
      1,
    );
    const geo = buildExplanationOverlayGeometry({
      marks: [{ milestoneId: "ms1", kind: "change", label: "上段の星" }],
      visibleRows: [],
      dateToX: dateToXContent,
      pxPerDay,
      scrollY: 0,
      rowHeight: 24,
      barHeight: 14,
      bodyHeight: 400,
      headerHeight: 30,
      timelineWidth: 400,
      liveAnchors: new Map(),
      milestones: [
        {
          id: "ms1",
          name: "A",
          date: "2026-01-05",
          confidence: "committed",
          groupId: "mg1",
        },
        {
          id: "ms2",
          name: "B",
          date: "2026-01-06",
          confidence: "committed",
          groupId: "mg1",
        },
      ],
      milestoneCenterYById: bandLayout.centerYById,
      milestoneBandLayout: bandLayout,
      milestoneDiamondSize: 11,
    });
    const balloon = geo.milestoneBalloons[0]!;
    const rect = milestoneExplanationBalloonScreenRect(balloon, 1);
    expect(rect.top).toBeGreaterThanOrEqual(0);
    expect(rect.bottom).toBeLessThanOrEqual(overlayHeight);
  });

  it("layoutExplanationBalloon_prefersAboveWhenClear", () => {
    const rows = [taskRow("t1", 120)];
    const liveAnchors = buildTaskBarAnchorsForOverlay({
      visibleRows: rows,
      scrollY: 0,
      rowHeight: 24,
      barHeight: 14,
      dateToX: (d) =>
        Math.floor((d.getTime() - timelineStart.getTime()) / 86400000) *
        pxPerDay,
      pxPerDay,
    });
    const geo = buildExplanationOverlayGeometry({
      marks: [{ taskId: "t1", kind: "change", label: "ok" }],
      visibleRows: rows,
      dateToX: (d) =>
        Math.floor((d.getTime() - timelineStart.getTime()) / 86400000) *
        pxPerDay,
      pxPerDay,
      scrollY: 0,
      rowHeight: 24,
      barHeight: 14,
      bodyHeight: 400,
      headerHeight: 30,
      timelineWidth: 400,
      liveAnchors,
      milestones: [],
      milestoneCenterYById: new Map(),
      milestoneDiamondSize: 11,
      tier: "day",
      memberCatalog: null,
    });
    expect(geo.bodyBalloons[0]?.placement).toBe("above");
  });

  it("layoutExplanationBalloon_avoidsUpperBarLabel", () => {
    const upper = taskRow("upper", 16, "2026-01-05", "2026-01-05");
    upper.task.name = "要件定義書作成 佐藤";
    const lower = taskRow("lower", 40, "2026-01-05", "2026-01-05");
    const rows = [upper, lower];
    const dateToXContent = (d: Date) =>
      Math.floor((d.getTime() - timelineStart.getTime()) / 86400000) * pxPerDay;
    const liveAnchors = buildTaskBarAnchorsForOverlay({
      visibleRows: rows,
      scrollY: 0,
      rowHeight: 24,
      barHeight: 14,
      dateToX: dateToXContent,
      pxPerDay,
    });
    const geo = buildExplanationOverlayGeometry({
      marks: [{ taskId: "lower", kind: "change", label: "選択中" }],
      visibleRows: rows,
      dateToX: dateToXContent,
      pxPerDay,
      scrollY: 0,
      rowHeight: 24,
      barHeight: 14,
      bodyHeight: 200,
      headerHeight: 30,
      timelineWidth: 400,
      liveAnchors,
      milestones: [],
      milestoneCenterYById: new Map(),
      milestoneDiamondSize: 11,
      tier: "day",
      memberCatalog: null,
    });
    const balloon = geo.bodyBalloons[0]!;
    const hole = geo.bodyHoles[0]!;
    const anchorX = hole.x + hole.width / 2;
    const anchorY = hole.y;
    const dimensions = estimateBalloonDimensions(balloon.label, balloon.maxWidth);
    const balloonRect = explanationBalloonScreenRect(
      balloon.left,
      balloon.top,
      balloon.placement,
      dimensions,
    );
    const aboveRect = explanationBalloonScreenRect(
      anchorX,
      anchorY,
      "above",
      dimensions,
    );
    const upperLabels = collectTaskBarLabelObstacles(
      rows,
      0,
      24,
      14,
      200,
      dateToXContent,
      pxPerDay,
      "day",
      null,
      new Set(),
      liveAnchors,
    );
    expect(upperLabels.length).toBeGreaterThan(0);
    expect(
      upperLabels.some((label) =>
        !(
          aboveRect.bottom <= label.top ||
          aboveRect.top >= label.bottom ||
          aboveRect.right <= label.left ||
          aboveRect.left >= label.right
        ),
      ),
    ).toBe(true);
    expect(
      upperLabels.some((label) =>
        !(
          balloonRect.bottom <= label.top ||
          balloonRect.top >= label.bottom ||
          balloonRect.right <= label.left ||
          balloonRect.left >= label.right
        ),
      ),
    ).toBe(false);
  });
});

describe("planExplanationOverlayScroll", () => {
  it("reveals first task mark when off screen vertically", () => {
    const rows = [taskRow("t1", 400)];
    const liveAnchors = buildTaskBarAnchorsForOverlay({
      visibleRows: rows,
      scrollY: 0,
      rowHeight: 24,
      barHeight: 14,
      dateToX,
      pxPerDay,
    });
    const marks: ExplanationMark[] = [
      { taskId: "t1", kind: "ask", label: "?" },
    ];
    const plan = planExplanationOverlayScroll({
      marks,
      visibleRows: rows,
      dateToX,
      pxPerDay,
      scrollX: 0,
      scrollY: 0,
      rowHeight: 24,
      barHeight: 14,
      bodyHeight: 120,
      chartWidth: 400,
      timelineStart,
      totalDays: 60,
      liveAnchors,
    });
    expect(plan).not.toBeNull();
    expect(plan!.scrollY).toBeGreaterThan(0);
  });

  it("planExplanationOverlayScroll_dateOnlyAdjustsHorizontal", () => {
    const marks: ExplanationMark[] = [
      { date: "2026-01-20", kind: "ask", label: "?" },
    ];
    const plan = planExplanationOverlayScroll({
      marks,
      visibleRows: [],
      dateToX,
      pxPerDay,
      scrollX: 0,
      scrollY: 50,
      rowHeight: 24,
      barHeight: 14,
      bodyHeight: 120,
      chartWidth: 400,
      timelineStart,
      totalDays: 60,
      liveAnchors: new Map(),
    });
    expect(plan).not.toBeNull();
    expect(plan!.scrollX).toBeGreaterThan(0);
    expect(plan!.scrollY).toBe(50);
  });

  it("planExplanationOverlayScroll_firstMarkUsesTaskDate", () => {
    const rows = [taskRow("t1", 0, "2026-01-05", "2026-01-20")];
    const liveAnchors = buildTaskBarAnchorsForOverlay({
      visibleRows: rows,
      scrollY: 0,
      rowHeight: 24,
      barHeight: 14,
      dateToX: (d) =>
        Math.floor((d.getTime() - timelineStart.getTime()) / 86400000) *
          pxPerDay,
      pxPerDay,
    });
    const marks: ExplanationMark[] = [
      {
        taskId: "t1",
        date: "2026-01-15",
        kind: "change",
        label: "x",
      },
    ];
    const plan = planExplanationOverlayScroll({
      marks,
      visibleRows: rows,
      dateToX: (d) =>
        Math.floor((d.getTime() - timelineStart.getTime()) / 86400000) *
          pxPerDay,
      pxPerDay,
      scrollX: 0,
      scrollY: 0,
      rowHeight: 24,
      barHeight: 14,
      bodyHeight: 120,
      chartWidth: 80,
      timelineStart,
      totalDays: 60,
      liveAnchors,
    });
    expect(plan).not.toBeNull();
    const day15Scroll =
      Math.floor(
        (parseDate("2026-01-15").getTime() - timelineStart.getTime()) /
          86400000,
      ) * pxPerDay;
    expect(plan!.scrollX).toBeGreaterThanOrEqual(day15Scroll - 40);
  });
});

describe("explanationMarkVisibleInViewport", () => {
  it("is false when task row is scrolled out", () => {
    const rows = [taskRow("t1", 400)];
    const liveAnchors = buildTaskBarAnchorsForOverlay({
      visibleRows: rows,
      scrollY: 0,
      rowHeight: 24,
      barHeight: 14,
      dateToX,
      pxPerDay,
    });
    expect(
      explanationMarkVisibleInViewport({
        mark: { taskId: "t1", kind: "change", label: "x" },
        visibleRows: rows,
        pxPerDay,
        scrollX: 0,
        scrollY: 0,
        rowHeight: 24,
        bodyHeight: 120,
        chartWidth: 400,
        timelineStart,
        liveAnchors,
      }),
    ).toBe(false);
  });

  it("explanationMarkVisibleInViewport_trueWhenScrolledIntoView", () => {
    const rows = [taskRow("t1", 400)];
    const liveAnchors = buildTaskBarAnchorsForOverlay({
      visibleRows: rows,
      scrollY: 350,
      rowHeight: 24,
      barHeight: 14,
      dateToX,
      pxPerDay,
    });
    expect(
      explanationMarkVisibleInViewport({
        mark: { taskId: "t1", kind: "change", label: "x" },
        visibleRows: rows,
        pxPerDay,
        scrollX,
        scrollY: 350,
        rowHeight: 24,
        bodyHeight: 120,
        chartWidth: 400,
        timelineStart,
        liveAnchors,
      }),
    ).toBe(true);
  });
});
