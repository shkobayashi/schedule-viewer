import { describe, expect, it } from "vitest";
import {
  buildMcpExplanationOverlay,
  explainOverlayHideSuccessText,
  explainOverlayShowSuccessText,
  explanationOverlayActive,
  explanationSessionActive,
  parseExplainOverlayRequest,
} from "./explainOverlay";
import type { Category, VisibleRow } from "./types";

const emptyContext = {
  categories: [] as Category[],
  outline: undefined,
  collapsed: new Set<string>(),
  visibleRows: [] as VisibleRow[],
};

describe("parseExplainOverlayRequest", () => {
  it("parseExplainOverlay_acceptsTranslucentTrue", () => {
    expect(
      parseExplainOverlayRequest({ translucent: true }, emptyContext),
    ).toEqual({
      ok: true,
      kind: "show",
      state: { translucent: true, marks: [] },
    });
  });

  it("parseExplainOverlay_acceptsTranslucentFalse", () => {
    expect(
      parseExplainOverlayRequest({ translucent: false }, emptyContext),
    ).toEqual({
      ok: true,
      kind: "hide",
    });
  });

  it("parseExplainOverlay_rejectsMissingTranslucent", () => {
    expect(parseExplainOverlayRequest({}, emptyContext)).toEqual({
      ok: false,
      message: "半透明の指定がありません。",
    });
  });

  it("parseExplainOverlay_rejectsNonBooleanTranslucent", () => {
    expect(
      parseExplainOverlayRequest({ translucent: "yes" }, emptyContext),
    ).toEqual({
      ok: false,
      message: "translucent は true か false にしてください。",
    });
  });

  it("parseExplainOverlay_rejectsUnknownKeys", () => {
    expect(
      parseExplainOverlayRequest(
        { translucent: true, taskIds: ["x"] },
        emptyContext,
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
        emptyContext,
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
        emptyContext,
      ),
    ).toEqual({
      ok: true,
      kind: "show",
      state: { translucent: true, marks: [] },
    });
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
        dateToX: () => 0,
        pxPerDay: 1,
        scrollY: 0,
        rowHeight: 0,
        barHeight: 0,
        bodyHeight: 0,
        chartWidth: 0,
        headerHeight: 0,
        milestoneBandHeight: 0,
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
        dateToX: () => 0,
        pxPerDay: 1,
        scrollY: 0,
        rowHeight: 0,
        barHeight: 0,
        bodyHeight: 0,
        chartWidth: 0,
        headerHeight: 0,
        milestoneBandHeight: 0,
        liveAnchors: new Map(),
      }),
    ).toBeUndefined();
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
