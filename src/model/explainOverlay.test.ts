import { describe, expect, it } from "vitest";
import {
  buildMcpExplanationOverlay,
  explainOverlayHideSuccessText,
  explainOverlayShowSuccessText,
  explanationOverlayActive,
  explanationSessionActive,
  parseExplainOverlayRequest,
} from "./explainOverlay";
import { parseDate } from "./dates";
import type { Category, Milestone, VisibleRow } from "./types";

const taskRow = (
  id: string,
  y: number,
): Extract<VisibleRow, { type: "task" }> => ({
  type: "task",
  y,
  task: {
    id,
    name: id,
    start: "2026-01-05",
    end: "2026-01-10",
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
        tasks: [taskRow("t1", 0).task],
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
  visibleRows: [taskRow("t1", 0)] as VisibleRow[],
};

describe("parseExplainOverlayRequest", () => {
  it("parseExplainOverlay_acceptsTranslucentTrue", () => {
    expect(
      parseExplainOverlayRequest({ translucent: true }, baseContext),
    ).toEqual({
      ok: true,
      kind: "show",
      state: { translucent: true, marks: [] },
    });
  });

  it("parseExplainOverlay_acceptsTranslucentFalse", () => {
    expect(
      parseExplainOverlayRequest({ translucent: false }, baseContext),
    ).toEqual({
      ok: true,
      kind: "hide",
    });
  });

  it("parseExplainOverlay_rejectsMissingTranslucent", () => {
    expect(parseExplainOverlayRequest({}, baseContext)).toEqual({
      ok: false,
      message: "半透明の指定がありません。",
    });
  });

  it("parseExplainOverlay_rejectsNonBooleanTranslucent", () => {
    expect(
      parseExplainOverlayRequest({ translucent: "yes" }, baseContext),
    ).toEqual({
      ok: false,
      message: "translucent は true か false にしてください。",
    });
  });

  it("parseExplainOverlay_rejectsUnknownKeys", () => {
    expect(
      parseExplainOverlayRequest(
        { translucent: true, taskIds: ["x"] },
        baseContext,
      ),
    ).toEqual({
      ok: false,
      message: "半透明に使えない項目があります。",
    });
  });

  it("parseExplainOverlay_rejectsSummaryWhenHiding", () => {
    expect(
      parseExplainOverlayRequest(
        { translucent: false, summary: "x" },
        baseContext,
      ),
    ).toEqual({
      ok: false,
      message: "translucent が false のときは summary と marks を渡せません。",
    });
  });

  it("parseExplainOverlay_allowsDiscardInProgress", () => {
    expect(
      parseExplainOverlayRequest(
        { translucent: true, discardInProgress: true },
        baseContext,
      ),
    ).toEqual({
      ok: true,
      kind: "show",
      state: { translucent: true, marks: [] },
    });
  });

  it("parseExplainOverlay_rejectsUnknownTaskId", () => {
    expect(
      parseExplainOverlayRequest(
        {
          translucent: true,
          marks: [{ taskId: "missing", kind: "change", label: "x" }],
        },
        baseContext,
      ),
    ).toEqual({
      ok: false,
      message: "説明に指定したタスクが見つかりません。",
    });
  });

  it("parseExplainOverlay_rejectsHiddenTask", () => {
    expect(
      parseExplainOverlayRequest(
        {
          translucent: true,
          marks: [{ taskId: "t1", kind: "change", label: "x" }],
        },
        { ...baseContext, visibleRows: [] },
      ),
    ).toEqual({
      ok: false,
      message: "説明で示すタスクが、絞り込みか折りたたみで隠れています。",
    });
  });

  it("parseExplainOverlay_rejectsDateOutsideTask", () => {
    expect(
      parseExplainOverlayRequest(
        {
          translucent: true,
          marks: [
            {
              taskId: "t1",
              date: "2026-02-01",
              kind: "change",
              label: "x",
            },
          ],
        },
        baseContext,
      ),
    ).toEqual({
      ok: false,
      message: "説明で示す日付が、そのタスクの期間の外です。",
    });
  });

  it("parseExplainOverlay_rejectsDateOutsideTimeline", () => {
    expect(
      parseExplainOverlayRequest(
        {
          translucent: true,
          marks: [{ date: "2030-01-01", kind: "ask", label: "?" }],
        },
        baseContext,
      ),
    ).toEqual({
      ok: false,
      message: "説明で示す日付が、計画の期間の外です。",
    });
  });

  it("parseExplainOverlay_acceptsMilestoneDateInRange", () => {
    expect(
      parseExplainOverlayRequest(
        {
          translucent: true,
          marks: [{ date: "2026-06-01", kind: "ask", label: "?" }],
        },
        baseContext,
      ).ok,
    ).toBe(true);
  });
});

describe("explanationOverlayActive", () => {
  it("explanationSessionActive_isTrueForOverlayOnly", () => {
    expect(explanationOverlayActive(null)).toBe(false);
    expect(
      explanationOverlayActive({ translucent: true, marks: [] }),
    ).toBe(true);
    expect(
      explanationSessionActive(false, { translucent: true, marks: [] }),
    ).toBe(true);
    expect(explanationSessionActive(false, null)).toBe(false);
  });
});

describe("buildMcpExplanationOverlay", () => {
  it("includes explanationOverlay when translucent", () => {
    expect(
      buildMcpExplanationOverlay({
        overlay: { translucent: true, marks: [] },
        visibleRows: [],
        pxPerDay: 1,
        scrollX: 0,
        scrollY: 0,
        rowHeight: 0,
        bodyHeight: 0,
        chartWidth: 0,
        timelineStart: parseDate("2026-01-01"),
        liveAnchors: new Map(),
      }),
    ).toEqual({
      translucent: true,
      marks: [],
    });
  });

  it("omits explanationOverlay when translucent is off", () => {
    expect(
      buildMcpExplanationOverlay({
        overlay: null,
        visibleRows: [],
        pxPerDay: 1,
        scrollX: 0,
        scrollY: 0,
        rowHeight: 0,
        bodyHeight: 0,
        chartWidth: 0,
        timelineStart: parseDate("2026-01-01"),
        liveAnchors: new Map(),
      }),
    ).toBeUndefined();
  });

  it("buildMcpExplanationOverlay_visibleAfterScroll", () => {
    const rows = [taskRow("t1", 40)];
    const payload = buildMcpExplanationOverlay({
      overlay: {
        translucent: true,
        marks: [{ taskId: "t1", kind: "change", label: "x" }],
      },
      visibleRows: rows,
      pxPerDay: 20,
      scrollX: 100,
      scrollY: 30,
      rowHeight: 24,
      bodyHeight: 200,
      chartWidth: 400,
      timelineStart: parseDate("2026-01-01"),
      liveAnchors: new Map([
        [
          "t1",
          {
            x: 80 - 100,
            right: 180 - 100,
            y: 52,
          },
        ],
      ]),
    });
    expect(payload?.marks[0]?.visible).toBe(true);
  });
});

describe("success text", () => {
  it("explainOverlayShowSuccessText", () => {
    expect(explainOverlayShowSuccessText()).toBe("半透明を重ねました。");
  });

  it("explainOverlayHideSuccessText", () => {
    expect(explainOverlayHideSuccessText(true)).toBe("半透明を消しました。");
    expect(explainOverlayHideSuccessText(false)).toBe("半透明は出ていません。");
  });
});
