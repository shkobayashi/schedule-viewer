export type ExplanationOverlayState = {
  translucent: boolean;
};

const ALLOWED_KEYS = new Set(["translucent", "discardInProgress"]);

export function explanationOverlayActive(
  state: ExplanationOverlayState | null,
): state is ExplanationOverlayState {
  return state?.translucent === true;
}

export function explanationSessionActive(
  explanationViewActive: boolean,
  overlay: ExplanationOverlayState | null,
): boolean {
  return explanationViewActive || explanationOverlayActive(overlay);
}

function unknownKeys(envelope: Record<string, unknown>): string[] {
  return Object.keys(envelope).filter((key) => !ALLOWED_KEYS.has(key));
}

export type ParseExplainOverlayResult =
  | { ok: true; kind: "show" }
  | { ok: true; kind: "hide" }
  | { ok: false; message: string };

export function parseExplainOverlayRequest(
  envelope: Record<string, unknown>,
): ParseExplainOverlayResult {
  const extra = unknownKeys(envelope).filter((k) => k !== "discardInProgress");
  if (extra.length > 0) {
    return { ok: false, message: "半透明に使えない項目があります。" };
  }

  if (envelope.translucent === undefined) {
    return { ok: false, message: "半透明の指定がありません。" };
  }

  if (envelope.translucent === true) {
    return { ok: true, kind: "show" };
  }
  if (envelope.translucent === false) {
    return { ok: true, kind: "hide" };
  }
  return { ok: false, message: "translucent は true か false にしてください。" };
}

export function explainOverlayShowSuccessText(): string {
  return "半透明を重ねました。";
}

export function explainOverlayHideSuccessText(wasActive: boolean): string {
  return wasActive ? "半透明を消しました。" : "半透明は出ていません。";
}

export function buildMcpExplanationOverlay(
  overlay: ExplanationOverlayState | null,
): { translucent: true } | undefined {
  if (!explanationOverlayActive(overlay)) return undefined;
  return { translucent: true };
}
