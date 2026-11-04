import { describe, expect, it } from "vitest";
import {
  APPLY_EXPLANATION_PATTERN_AFTER_MISSING,
  APPLY_EXPLANATION_PATTERN_ID_COLLISION,
  APPLY_EXPLANATION_PATTERN_MILESTONE_MISSING,
  EXPLAIN_OVERLAY_PATTERNS_REJECT,
  EXPLANATION_TRIAL_UNANIMOUS_COLOR,
  applyExplanationPatternToDocument,
  parseApplyExplanationPatternRequest,
  buildDisplayVisibleRowsWithExplanationTrials,
  buildExplanationTrialBarLayouts,
  buildExplanationTrialMilestoneLayouts,
  buildExplanationTrialPredecessorArcs,
  buildMcpExplanationPatterns,
  parseExplanationPatterns,
  reorderPointerContentYForDocumentRows,
  trialMarkBarRect,
} from "./explainOverlayPatterns";
import { parseExplainOverlayRequest } from "./explainOverlay";
import { tasksInOutlineParent } from "./outlineTasks";
import { taskBarAnchorInBody, taskBarRectInBody, milestoneDiamondRectInBand } from "./taskBarLayout";
import { serializeScheduleDocument } from "./scheduleFile";
import type { TaskBarAnchor } from "./connections";
import type { Category, Milestone, ScheduleDocument, Task, VisibleRow } from "./types";
import { SCHEDULE_SCHEMA_VERSION } from "./types";
import type { ExplanationPattern } from "./explainOverlayPatterns";

function patternStub(
  partial: Partial<ExplanationPattern> & Pick<ExplanationPattern, "id">,
): ExplanationPattern {
  return {
    name: "P",
    color: "#2563eb",
    tasks: [],
    changes: [],
    milestoneChanges: [],
    ...partial,
  };
}

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
  milestoneGroups: [{ id: "mg1", name: "G" }],
  hiddenMilestoneGroupIds: [] as string[],
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
          milestoneChanges: [],
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
            milestoneChanges: [],
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
            milestoneChanges: [],
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
      patternStub({
        id: "p-a",
        name: "A",
        tasks: [
          {
            id: "trial-1",
            name: "試し",
            start: "2026-01-06",
            end: "2026-01-08",
            afterTaskId: "t1",
          },
        ],
      }),
    ]);
    expect(payload[0]?.tasks[0]?.trial).toBe(true);
  });
});

describe("buildDisplayVisibleRowsWithExplanationTrials", () => {
  it("buildDisplayVisibleRowsWithExplanationTrials_insertsTrialRowAfterAnchorAndShiftsY", () => {
    const rowHeight = 26;
    const documentRows = [
      taskRow("t1", 0),
      taskRow("t2", 26),
    ] as VisibleRow[];
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
        milestoneChanges: [],
      },
    ];
    const display = buildDisplayVisibleRowsWithExplanationTrials(
      documentRows,
      patterns,
      rowHeight,
    );
    expect(display).toHaveLength(3);
    expect(display[0]?.type).toBe("task");
    expect(display[0]?.type === "task" && display[0].task.id).toBe("t1");
    expect(display[1]?.type === "task" && display[1].task.id).toBe("trial-1");
    expect(display[1]?.type === "task" && display[1].explanationTrial?.patternId).toBe(
      "p",
    );
    expect(display[2]?.type === "task" && display[2].task.id).toBe("t2");
    expect(display[0]?.y).toBe(0);
    expect(display[1]?.y).toBe(26);
    expect(display[2]?.y).toBe(52);
  });

  it("reorderPointerContentYForDocumentRows_subtractsTrialRowsAbovePointer", () => {
    const rowHeight = 26;
    const documentRows = [
      taskRow("t1", 0),
      taskRow("t2", 26),
    ] as VisibleRow[];
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
        milestoneChanges: [],
      },
    ];
    const display = buildDisplayVisibleRowsWithExplanationTrials(
      documentRows,
      patterns,
      rowHeight,
    );
    const documentY = reorderPointerContentYForDocumentRows({
      displayContentY: 70,
      displayRows: display,
      rowHeight,
    });
    expect(documentY).toBe(44);
    const t2Row = documentRows[1]!;
    expect(documentY).toBeGreaterThanOrEqual(t2Row.y);
    expect(documentY).toBeLessThan(t2Row.y + rowHeight);
  });
});

describe("trial bar geometry", () => {
  const timelineStart = new Date("2026-01-01T00:00:00");

  for (const pxPerDay of [8, 40] as const) {
    for (const rowHeight of [26, 32] as const) {
      it(`buildExplanationTrialBarLayouts_matchesTaskBarRectInBody pxPerDay=${pxPerDay} rowHeight=${rowHeight}`, () => {
        const barHeight = Math.max(12, Math.round(rowHeight * 0.55));
        const scrollY = 0;
        const documentRows = [taskRow("t1", 0)] as VisibleRow[];
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
            milestoneChanges: [],
          },
        ];
        const visibleRows = buildDisplayVisibleRowsWithExplanationTrials(
          documentRows,
          patterns,
          rowHeight,
        );
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
        });
        const trialRow = visibleRows.find(
          (row): row is Extract<VisibleRow, { type: "task" }> =>
            row.type === "task" && row.task.id === "trial-1",
        );
        expect(trialRow).toBeDefined();
        const expected = taskBarRectInBody({
          task: trialRow!.task,
          viewportRowTop: trialRow!.y - scrollY,
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
        milestoneChanges: [],
      },
    ];
    const documentRows = [taskRow("t1", 0)] as VisibleRow[];
    const visibleRows = buildDisplayVisibleRowsWithExplanationTrials(
      documentRows,
      patterns,
      rowHeight,
    );
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
    });
    expect(rect).toEqual(layouts[0]?.rect);
  });

  it("buildExplanationTrialBarLayouts_ignoresLiveAnchorsForDateChange", () => {
    const pxPerDay = 22;
    const rowHeight = 26;
    const barHeight = 14;
    const scrollY = 0;
    const visibleRows = [taskRow("t1", 0, "2026-01-05", "2026-01-10")] as VisibleRow[];
    const scaledDateToX = (d: Date) =>
      Math.round(
        ((d.getTime() - timelineStart.getTime()) / (24 * 60 * 60 * 1000)) *
          pxPerDay,
      );
    const patterns = [
      {
        id: "p",
        name: "P",
        color: "#2563eb",
        tasks: [],
        changes: [
          {
            taskId: "t1",
            start: "2026-01-12",
            end: "2026-01-15",
          },
        ],
        milestoneChanges: [],
      },
    ];
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
    });
    const row = visibleRows[0]!;
    if (row.type !== "task") throw new Error("expected task row");
    const expected = taskBarRectInBody({
      task: {
        ...row.task,
        start: "2026-01-12",
        end: "2026-01-15",
      },
      viewportRowTop: row.y - scrollY,
      rowHeight,
      barHeight,
      pxPerDay,
      dateToX: scaledDateToX,
    });
    expect(layouts[0]?.rect).toEqual(expected);
    expect(layouts[0]?.rect.x).not.toBe(0);
  });

  it("buildExplanationTrialBarLayouts_rendersSameTaskChangePerPattern", () => {
    const pxPerDay = 22;
    const rowHeight = 26;
    const barHeight = 14;
    const visibleRows = [taskRow("t2", 32)] as VisibleRow[];
    const scaledDateToX = (d: Date) =>
      Math.round(
        ((d.getTime() - timelineStart.getTime()) / (24 * 60 * 60 * 1000)) *
          pxPerDay,
      );
    const patterns = [
      {
        id: "p-a",
        name: "A",
        color: "#2563eb",
        tasks: [],
        changes: [{ taskId: "t2", start: "2026-01-07", end: "2026-01-09" }],
        milestoneChanges: [],
      },
      {
        id: "p-b",
        name: "B",
        color: "#dc2626",
        tasks: [],
        changes: [{ taskId: "t2", start: "2026-01-10", end: "2026-01-12" }],
        milestoneChanges: [],
      },
    ];
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
    });
    expect(layouts).toHaveLength(2);
    expect(layouts.map((l) => l.patternId).sort()).toEqual(["p-a", "p-b"]);
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
            milestoneChanges: [],
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

describe("trial plan document isolation", () => {
  it("serializeScheduleDocument_omitsPatternsAndTrialTasks", () => {
    const parsed = parseExplanationPatterns(
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
          changes: [],
        },
      ],
      baseContext,
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const json = serializeScheduleDocument(
      "T",
      categories,
      [],
      milestones,
      undefined,
      undefined,
    );
    const document = JSON.parse(json) as Record<string, unknown>;
    expect(document.patterns).toBeUndefined();
    expect(json).not.toContain("trial-1");
    expect(json).not.toContain('"patterns"');

    const overlay = parseExplainOverlayRequest(
      {
        translucent: true,
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
            changes: [],
            milestoneChanges: [],
          },
        ],
      },
      baseContext,
    );
    expect(overlay.ok).toBe(true);
    if (!overlay.ok || overlay.kind !== "show") return;
    expect(JSON.stringify(document)).not.toContain(
      JSON.stringify(overlay.state.patterns),
    );
  });
});

describe("buildExplanationTrialPredecessorArcs", () => {
  const timelineStart = new Date("2026-01-01T00:00:00");

  it("buildExplanationTrialPredecessorArcs_drawsWhenBothAnchorsResolve", () => {
    const pxPerDay = 22;
    const rowHeight = 26;
    const barHeight = 14;
    const scrollY = 0;
    const visibleRows = [
      taskRow("t1", 0, "2026-01-05", "2026-01-08"),
      taskRow("t2", 32, "2026-01-09", "2026-01-12"),
    ] as VisibleRow[];
    const scaledDateToX = (d: Date) =>
      Math.round(
        ((d.getTime() - timelineStart.getTime()) / (24 * 60 * 60 * 1000)) *
          pxPerDay,
      );
    const liveAnchors = new Map<string, TaskBarAnchor>();
    for (const row of visibleRows) {
      if (row.type !== "task") continue;
      const anchor = taskBarAnchorInBody({
        task: row.task,
        viewportRowTop: row.y - scrollY,
        rowHeight,
        barHeight,
        pxPerDay,
        dateToX: scaledDateToX,
      });
      liveAnchors.set(row.task.id, anchor);
    }
    const arcs = buildExplanationTrialPredecessorArcs({
      patterns: [
        {
          id: "p",
          name: "P",
          color: "#2563eb",
          tasks: [],
          changes: [
            {
              taskId: "t2",
              predecessors: ["t1"],
            },
          ],
          milestoneChanges: [],
        },
      ],
      visibleRows,
      categories,
      outline: undefined,
      scrollY,
      rowHeight,
      barHeight,
      pxPerDay,
      dateToX: scaledDateToX,
      liveAnchors,
    });
    expect(arcs).toHaveLength(1);
    expect(arcs[0]?.points.length).toBeGreaterThan(4);
  });

  it("buildExplanationTrialPredecessorArcs_skipsWhenAnchorMissing", () => {
    const arcs = buildExplanationTrialPredecessorArcs({
      patterns: [
        {
          id: "p",
          name: "P",
          color: "#2563eb",
          tasks: [],
          changes: [
            {
              taskId: "t2",
              predecessors: ["missing"],
            },
          ],
          milestoneChanges: [],
        },
      ],
      visibleRows: [taskRow("t2", 32)] as VisibleRow[],
      categories,
      outline: undefined,
      scrollY: 0,
      rowHeight: 26,
      barHeight: 14,
      pxPerDay: 22,
      dateToX: () => 0,
      liveAnchors: new Map(),
    });
    expect(arcs).toHaveLength(0);
  });
});

describe("applyExplanationPatternToDocument", () => {
  const baseDocument = (): ScheduleDocument => ({
    schemaVersion: SCHEDULE_SCHEMA_VERSION,
    title: "T",
    categories,
    milestoneGroups: [],
    milestones,
    outline: undefined,
    connections: undefined,
  });

  const samplePattern = {
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
    milestoneChanges: [],
  };

  it("applyExplanationPatternToDocument_insertsTrialAfterAnchorAndAppliesChanges", () => {
    const result = applyExplanationPatternToDocument(
      baseDocument(),
      samplePattern,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const trial = result.document.categories[0]?.groups[0]?.tasks.find(
      (t) => t.id === "trial-1",
    );
    expect(trial?.name).toBe("試し");
    const t1Index = result.document.categories[0]?.groups[0]?.tasks.findIndex(
      (t) => t.id === "t1",
    );
    const trialIndex = result.document.categories[0]?.groups[0]?.tasks.findIndex(
      (t) => t.id === "trial-1",
    );
    expect(t1Index).toBeGreaterThanOrEqual(0);
    expect(trialIndex).toBe(t1Index + 1);
    const t2 = result.document.categories[0]?.groups[0]?.tasks.find(
      (t) => t.id === "t2",
    );
    expect(t2?.start).toBe("2026-01-07");
    expect(t2?.end).toBe("2026-01-12");
  });

  it("applyExplanationPatternToDocument_appliesTaskAndMilestoneChangesTogether", () => {
    const doc: ScheduleDocument = {
      ...baseDocument(),
      milestoneGroups: [{ id: "mg1", name: "G" }],
      milestones: [
        {
          id: "ms1",
          name: "M",
          date: "2026-01-10",
          confidence: "committed",
          groupId: "mg1",
        },
      ],
    };
    const result = applyExplanationPatternToDocument(doc, {
      ...samplePattern,
      tasks: [],
      changes: [
        { taskId: "t2", start: "2026-01-07", end: "2026-01-12" },
      ],
      milestoneChanges: [{ milestoneId: "ms1", date: "2026-01-15" }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.milestones[0]?.date).toBe("2026-01-15");
    expect(
      result.document.categories[0]?.groups[0]?.tasks.find((t) => t.id === "t2")
        ?.start,
    ).toBe("2026-01-07");
  });

  it("applyExplanationPatternToDocument_rejectsUnknownMilestoneId", () => {
    const result = applyExplanationPatternToDocument(baseDocument(), {
      ...samplePattern,
      tasks: [],
      changes: [],
      milestoneChanges: [{ milestoneId: "missing", date: "2026-01-15" }],
    });
    expect(result).toEqual({
      ok: false,
      message: APPLY_EXPLANATION_PATTERN_MILESTONE_MISSING,
    });
  });

  it("buildExplanationTrialMilestoneLayouts_matchesMilestoneDiamondRectInBand", () => {
    const centerYById = new Map([["ms1", 12]]);
    const dateToX = (d: Date) =>
      Math.floor((d.getTime() - Date.parse("2026-01-01")) / 86400000) * 8;
    const layouts = buildExplanationTrialMilestoneLayouts({
      patterns: [
        {
          id: "p1",
          name: "A",
          color: "#2563eb",
          tasks: [],
          changes: [],
          milestoneChanges: [{ milestoneId: "ms1", date: "2026-01-05" }],
        },
      ],
      milestones: [
        {
          id: "ms1",
          name: "M",
          date: "2026-01-10",
          confidence: "committed",
          groupId: "mg1",
        },
      ],
      milestoneCenterYById: centerYById,
      diamondSize: 11,
      dateToX,
    });
    expect(layouts).toHaveLength(1);
    const expected = milestoneDiamondRectInBand({
      dateIso: "2026-01-05",
      dateToX,
      centerY: 12,
      diamondSize: 11,
    });
    expect(layouts[0]!.rect).toEqual(expected);
    expect(layouts[0]!.originRect).toEqual(
      milestoneDiamondRectInBand({
        dateIso: "2026-01-10",
        dateToX,
        centerY: 12,
        diamondSize: 11,
      }),
    );
  });

  it("buildExplanationTrialMilestoneLayouts_mergesUnanimousChangeAcrossPatterns", () => {
    const centerYById = new Map([["ms1", 12]]);
    const dateToX = (d: Date) =>
      Math.floor((d.getTime() - Date.parse("2026-01-01")) / 86400000) * 8;
    const layouts = buildExplanationTrialMilestoneLayouts({
      patterns: [
        {
          id: "p-a",
          name: "A",
          color: "#2563eb",
          tasks: [],
          changes: [],
          milestoneChanges: [{ milestoneId: "ms1", date: "2026-02-01" }],
        },
        {
          id: "p-b",
          name: "B",
          color: "#dc2626",
          tasks: [],
          changes: [],
          milestoneChanges: [{ milestoneId: "ms1", date: "2026-02-01" }],
        },
      ],
      milestones: [
        {
          id: "ms1",
          name: "M",
          date: "2026-01-10",
          confidence: "committed",
          groupId: "mg1",
        },
      ],
      milestoneCenterYById: centerYById,
      diamondSize: 11,
      dateToX,
    });
    expect(layouts).toHaveLength(1);
    expect(layouts[0]!.color).toBe(EXPLANATION_TRIAL_UNANIMOUS_COLOR);
    expect(layouts[0]!.unanimous).toBe(true);
  });

  it("buildExplanationTrialBarLayouts_mergesUnanimousTaskChangeAcrossPatterns", () => {
    const timelineStart = new Date("2026-01-01T00:00:00");
    const pxPerDay = 22;
    const rowHeight = 26;
    const barHeight = 14;
    const visibleRows = [taskRow("t2", 32)] as VisibleRow[];
    const scaledDateToX = (d: Date) =>
      Math.round(
        ((d.getTime() - timelineStart.getTime()) / (24 * 60 * 60 * 1000)) *
          pxPerDay,
      );
    const layouts = buildExplanationTrialBarLayouts({
      patterns: [
        {
          id: "p-a",
          name: "A",
          color: "#2563eb",
          tasks: [],
          changes: [{ taskId: "t2", start: "2026-01-07", end: "2026-01-09" }],
          milestoneChanges: [],
        },
        {
          id: "p-b",
          name: "B",
          color: "#dc2626",
          tasks: [],
          changes: [{ taskId: "t2", start: "2026-01-07", end: "2026-01-09" }],
          milestoneChanges: [],
        },
      ],
      visibleRows,
      categories,
      outline: undefined,
      scrollY: 0,
      rowHeight,
      barHeight,
      pxPerDay,
      dateToX: scaledDateToX,
    });
    expect(layouts).toHaveLength(1);
    expect(layouts[0]!.color).toBe(EXPLANATION_TRIAL_UNANIMOUS_COLOR);
  });

  it("applyExplanationPatternToDocument_rejectsTrialIdCollision", () => {
    const result = applyExplanationPatternToDocument(baseDocument(), {
      ...samplePattern,
      tasks: [
        {
          id: "t2",
          name: "dup",
          start: "2026-01-06",
          end: "2026-01-08",
          afterTaskId: "t1",
        },
      ],
      changes: [],
    });
    expect(result).toEqual({
      ok: false,
      message: APPLY_EXPLANATION_PATTERN_ID_COLLISION,
    });
  });

  it("applyExplanationPatternToDocument_rejectsMissingAfterTaskId", () => {
    const result = applyExplanationPatternToDocument(baseDocument(), {
      ...samplePattern,
      tasks: [
        {
          id: "trial-1",
          name: "試し",
          start: "2026-01-06",
          end: "2026-01-08",
          afterTaskId: "missing",
        },
      ],
      changes: [],
    });
    expect(result).toEqual({
      ok: false,
      message: APPLY_EXPLANATION_PATTERN_AFTER_MISSING,
    });
  });

  it("applyExplanationPatternToDocument_insertsTrialAfterAnchorInOutline", () => {
    const teamB = "65283a8a-3e6d-4fa4-8751-c1d4e1e4c89c";
    const tanaka = "b1000001-0000-4000-8000-000000000001";
    const review = "b1000001-0000-4000-8000-000000000003";
    const heading = "c2000001-0000-4000-8000-000000000001";
    const outlineTask = (id: string, name: string): Task => ({
      id,
      name,
      start: "2026-01-05",
      end: "2026-01-10",
      assigneeIds: [],
      status: "not-started",
      progress: 0,
      confidence: "committed",
      predecessors: [],
      milestoneId: null,
      tags: [],
    });
    const doc: ScheduleDocument = {
      schemaVersion: 8,
      title: "outline",
      categories: [],
      milestoneGroups: [],
      milestones: [],
      levels: [
        { name: "カテゴリ", meaning: "上" },
        { name: "チーム", meaning: "中" },
        { name: "タスク", meaning: "作業" },
      ],
      outline: [
        {
          id: heading,
          name: "要件定義",
          children: [
            {
              id: teamB,
              name: "チームB",
              children: [
                outlineTask(tanaka, "ヒアリング"),
                outlineTask(review, "レビュー"),
              ],
            },
          ],
        },
      ],
    };
    const result = applyExplanationPatternToDocument(doc, {
      id: "p-a",
      name: "A",
      color: "#2563eb",
      tasks: [
        {
          id: "trial-1",
          name: "試し",
          start: "2026-01-06",
          end: "2026-01-08",
          afterTaskId: tanaka,
        },
      ],
      changes: [
        {
          taskId: review,
          start: "2026-01-07",
          end: "2026-01-12",
        },
      ],
      milestoneChanges: [],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const siblings = tasksInOutlineParent(
      result.document.outline ?? [],
      teamB,
      3,
    );
    const tanakaIndex = siblings.findIndex((t) => t.id === tanaka);
    const trialIndex = siblings.findIndex((t) => t.id === "trial-1");
    expect(tanakaIndex).toBeGreaterThanOrEqual(0);
    expect(trialIndex).toBe(tanakaIndex + 1);
    const updatedReview = siblings.find((t) => t.id === review);
    expect(updatedReview?.start).toBe("2026-01-07");
    expect(updatedReview?.end).toBe("2026-01-12");
  });
});

describe("parseApplyExplanationPatternRequest", () => {
  it("parseApplyExplanationPatternRequest_requiresPatternId", () => {
    expect(parseApplyExplanationPatternRequest({})).toEqual({
      ok: false,
      message: "patternId が要ります。",
    });
    expect(parseApplyExplanationPatternRequest({ patternId: "p-a" })).toEqual({
      ok: true,
      patternId: "p-a",
    });
  });
});
