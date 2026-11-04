import { describe, expect, it } from "vitest";
import {
  EXPLAIN_OVERLAY_PATTERNS_REJECT,
  buildExplanationTrialBarLayouts,
  buildMcpExplanationPatterns,
  parseExplanationPatterns,
  trialMarkBarRect,
} from "./explainOverlayPatterns";
import { parseExplainOverlayRequest } from "./explainOverlay";
import { taskBarRectInBody } from "./taskBarLayout";
import type { Category, Milestone, VisibleRow } from "./types";

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

const categories: Category[] = [
  {
    id: "c1",
    name: "C",
    groups: [
      {
        id: "g1",
        name: "G",
        tasks: [taskRow("t1", 0).task, taskRow("t2", 32).task],
      },
    ],
  },
];

const milestones: Milestone[] = [
  {
    id: "m1",
    name: "M",
    date: "2026-06-01",
    confidence: "committed",
    groupId: "mg1",
  },
];

const baseContext = {
  categories,
  outline: undefined,
  milestones,
  collapsed: new Set<string>(),
  visibleRows: [taskRow("t1", 0), taskRow("t2", 32)] as VisibleRow[],
};

describe("parseExplanationPatterns", () => {
  it("parseExplanationPatterns_acceptsValidPattern", () => {
    const result = parseExplanationPatterns(
      [
        {
          id: "p-a",
          name: "A",
          color: "#2563eb",
          tasks: [
            {
              id: "trial-1",
              name: "試し",
              start: "2026-01-06",
              end: "2026-01-08",
              afterTaskId: "t1",
            },
          ],
          changes: [
            {
              taskId: "t2",
              start: "2026-01-07",
              end: "2026-01-12",
            },
          ],
        },
      ],
      baseContext,
    );
    expect(result).toEqual({
      ok: true,
      patterns: [
        {
          id: "p-a",
          name: "A",
          color: "#2563eb",
          tasks: [
            {
              id: "trial-1",
              name: "試し",
              start: "2026-01-06",
              end: "2026-01-08",
              afterTaskId: "t1",
            },
          ],
          changes: [
            {
              taskId: "t2",
              start: "2026-01-07",
              end: "2026-01-12",
            },
          ],
        },
      ],
    });
  });

  it("parseExplanationPatterns_rejectsUnknownKey", () => {
    expect(
      parseExplanationPatterns(
        [{ id: "p", name: "P", color: "#abc", extra: true, tasks: [], changes: [] }],
        baseContext,
      ),
    ).toEqual({ ok: false, message: EXPLAIN_OVERLAY_PATTERNS_REJECT });
  });

  it("parseExplanationPatterns_rejectsDocumentTaskId", () => {
    expect(
      parseExplanationPatterns(
        [
          {
            id: "t1",
            name: "bad",
            color: "#2563eb",
            tasks: [],
            changes: [],
          },
        ],
        baseContext,
      ),
    ).toEqual({ ok: false, message: EXPLAIN_OVERLAY_PATTERNS_REJECT });
  });

  it("parseExplanationPatterns_rejectsCrossPatternPredecessor", () => {
    expect(
      parseExplanationPatterns(
        [
          {
            id: "p1",
            name: "one",
            color: "#2563eb",
            tasks: [{ id: "trial-a", name: "A", start: "2026-01-06", end: "2026-01-07", afterTaskId: "t1" }],
            changes: [],
          },
          {
            id: "p2",
            name: "two",
            color: "#dc2626",
            tasks: [],
            changes: [
              {
                taskId: "t2",
                predecessors: ["trial-a"],
              },
            ],
          },
        ],
        baseContext,
      ),
    ).toEqual({ ok: false, message: EXPLAIN_OVERLAY_PATTERNS_REJECT });
  });
});

describe("parseExplainOverlayRequest patterns integration", () => {
  it("parseExplainOverlay_rejectsPatternsWhenHiding", () => {
    expect(
      parseExplainOverlayRequest(
        { translucent: false, patterns: [] },
        baseContext,
      ),
    ).toEqual({
      ok: false,
      message:
        "translucent が false のときは summary、marks、patterns を渡せません。",
    });
  });

  it("parseExplainOverlay_clearsPatternsOnHideKind", () => {
    expect(parseExplainOverlayRequest({ translucent: false }, baseContext)).toEqual({
      ok: true,
      kind: "hide",
    });
  });

  it("parseExplainOverlay_rejectsInvalidPatternWithoutChangingState", () => {
    const before = parseExplainOverlayRequest({ translucent: true }, baseContext);
    expect(before.ok).toBe(true);
    const after = parseExplainOverlayRequest(
      {
        translucent: true,
        patterns: [{ id: "p", name: "", color: "#2563eb", tasks: [], changes: [] }],
      },
      baseContext,
    );
    expect(after).toEqual({
      ok: false,
      message: EXPLAIN_OVERLAY_PATTERNS_REJECT,
    });
  });
});

describe("buildMcpExplanationPatterns", () => {
  it("buildMcpExplanationPatterns_marksTrialTasks", () => {
    const payload = buildMcpExplanationPatterns([
      {
        id: "p-a",
        name: "A",
        color: "#2563eb",
        tasks: [
          {
            id: "trial-1",
            name: "試し",
            start: "2026-01-06",
            end: "2026-01-08",
            afterTaskId: "t1",
          },
        ],
        changes: [],
      },
    ]);
    expect(payload[0]?.tasks[0]?.trial).toBe(true);
  });
});

describe("trial bar geometry", () => {
  const timelineStart = new Date("2026-01-01T00:00:00");
  const dateToX = (d: Date) =>
    Math.round(
      ((d.getTime() - timelineStart.getTime()) / (24 * 60 * 60 * 1000)) * 22,
    );

  for (const pxPerDay of [8, 40] as const) {
    for (const rowHeight of [26, 32] as const) {
      it(`buildExplanationTrialBarLayouts_matchesTaskBarRectInBody pxPerDay=${pxPerDay} rowHeight=${rowHeight}`, () => {
        const barHeight = Math.max(12, Math.round(rowHeight * 0.55));
        const scrollY = 0;
        const visibleRows = [taskRow("t1", 0)] as VisibleRow[];
        const patterns = [
          {
            id: "p",
            name: "P",
            color: "#2563eb",
            tasks: [
              {
                id: "trial-1",
                name: "試し",
                start: "2026-01-06",
                end: "2026-01-08",
                afterTaskId: "t1",
              },
            ],
            changes: [],
          },
        ];
        const scaledDateToX = (d: Date) =>
          Math.round(
            ((d.getTime() - timelineStart.getTime()) / (24 * 60 * 60 * 1000)) *
              pxPerDay,
          );
        const layouts = buildExplanationTrialBarLayouts({
          patterns,
          visibleRows,
          categories,
          outline: undefined,
          scrollY,
          rowHeight,
          barHeight,
          pxPerDay,
          dateToX: scaledDateToX,
          liveAnchors: new Map(),
        });
        const row = visibleRows[0]!;
        const expected = taskBarRectInBody({
          task: {
            ...row.task,
            id: "trial-1",
            name: "試し",
            start: "2026-01-06",
            end: "2026-01-08",
          },
          viewportRowTop: row.y - scrollY,
          rowHeight,
          barHeight,
          pxPerDay,
          dateToX: scaledDateToX,
        });
        expect(layouts[0]?.rect).toEqual(expected);
      });
    }
  }

  it("trialMarkBarRect_matchesTaskBarRectInBody", () => {
    const pxPerDay = 22;
    const rowHeight = 26;
    const barHeight = 14;
    const patterns = [
      {
        id: "p",
        name: "P",
        color: "#2563eb",
        tasks: [
          {
            id: "trial-1",
            name: "試し",
            start: "2026-01-06",
            end: "2026-01-08",
            afterTaskId: "t1",
          },
        ],
        changes: [],
      },
    ];
    const visibleRows = [taskRow("t1", 0)] as VisibleRow[];
    const scaledDateToX = (d: Date) =>
      Math.round(
        ((d.getTime() - timelineStart.getTime()) / (24 * 60 * 60 * 1000)) *
          pxPerDay,
      );
    const rect = trialMarkBarRect({
      taskId: "trial-1",
      date: undefined,
      patterns,
      visibleRows,
      categories,
      outline: undefined,
      scrollY: 0,
      rowHeight,
      barHeight,
      pxPerDay,
      dateToX: scaledDateToX,
      liveAnchors: new Map(),
    });
    const layouts = buildExplanationTrialBarLayouts({
      patterns,
      visibleRows,
      categories,
      outline: undefined,
      scrollY: 0,
      rowHeight,
      barHeight,
      pxPerDay,
      dateToX: scaledDateToX,
      liveAnchors: new Map(),
    });
    expect(rect).toEqual(layouts[0]?.rect);
  });
});

describe("explain overlay hide clears patterns", () => {
  it("parseExplainOverlay_hideRemovesPatternsFromNextShow", () => {
    const show = parseExplainOverlayRequest(
      {
        translucent: true,
        patterns: [
          {
            id: "p",
            name: "P",
            color: "#2563eb",
            tasks: [
              {
                id: "trial-1",
                name: "試し",
                start: "2026-01-06",
                end: "2026-01-08",
                afterTaskId: "t1",
              },
            ],
            changes: [],
          },
        ],
      },
      baseContext,
    );
    expect(show.ok && show.kind === "show" && show.state.patterns.length).toBe(1);
    const hide = parseExplainOverlayRequest({ translucent: false }, baseContext);
    expect(hide).toEqual({ ok: true, kind: "hide" });
    const plain = parseExplainOverlayRequest({ translucent: true }, baseContext);
    expect(plain.ok && plain.kind === "show" && plain.state.patterns).toEqual([]);
  });
});
