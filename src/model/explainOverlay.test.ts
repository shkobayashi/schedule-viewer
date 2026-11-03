import { describe, expect, it } from "vitest";
import {
  buildMcpExplanationOverlay,
  explainOverlayHideSuccessText,
  explainOverlayShowSuccessText,
  explanationOverlayActive,
  explanationSessionActive,
  parseExplainOverlayRequest,
} from "./explainOverlay";

describe("parseExplainOverlayRequest", () => {
  it("parseExplainOverlay_acceptsTranslucentTrue", () => {
    expect(parseExplainOverlayRequest({ translucent: true })).toEqual({
      ok: true,
      kind: "show",
    });
  });

  it("parseExplainOverlay_acceptsTranslucentFalse", () => {
    expect(parseExplainOverlayRequest({ translucent: false })).toEqual({
      ok: true,
      kind: "hide",
    });
  });

  it("parseExplainOverlay_rejectsMissingTranslucent", () => {
    expect(parseExplainOverlayRequest({})).toEqual({
      ok: false,
      message: "半透明の指定がありません。",
    });
  });

  it("parseExplainOverlay_rejectsNonBooleanTranslucent", () => {
    expect(parseExplainOverlayRequest({ translucent: "yes" })).toEqual({
      ok: false,
      message: "translucent は true か false にしてください。",
    });
  });

  it("parseExplainOverlay_rejectsUnknownKeys", () => {
    expect(parseExplainOverlayRequest({ translucent: true, taskIds: ["x"] })).toEqual({
      ok: false,
      message: "半透明に使えない項目があります。",
    });
  });

  it("parseExplainOverlay_allowsDiscardInProgress", () => {
    expect(
      parseExplainOverlayRequest({ translucent: true, discardInProgress: true }),
    ).toEqual({ ok: true, kind: "show" });
  });
});

describe("explanationOverlayActive", () => {
  it("explanationSessionActive_isTrueForOverlayOnly", () => {
    expect(explanationOverlayActive(null)).toBe(false);
    expect(explanationOverlayActive({ translucent: false })).toBe(false);
    expect(explanationOverlayActive({ translucent: true })).toBe(true);
    expect(explanationSessionActive(false, { translucent: true })).toBe(true);
    expect(explanationSessionActive(false, null)).toBe(false);
  });
});

describe("buildMcpExplanationOverlay", () => {
  it("includes explanationOverlay when translucent", () => {
    expect(buildMcpExplanationOverlay({ translucent: true })).toEqual({
      translucent: true,
    });
  });

  it("omits explanationOverlay when translucent is off", () => {
    expect(buildMcpExplanationOverlay(null)).toBeUndefined();
    expect(buildMcpExplanationOverlay({ translucent: false })).toBeUndefined();
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
