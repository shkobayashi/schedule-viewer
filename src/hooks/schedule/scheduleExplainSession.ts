import type { ExplanationOverlayState } from "../../model/explainOverlay";
import type { ExplanationViewState } from "../../model/explainView";

export function shouldClearExplanationOnHumanViewChange(
  explanationView: ExplanationViewState | null,
  explanationOverlay: ExplanationOverlayState | null,
): boolean {
  return (
    explanationView != null || explanationOverlay?.translucent === true
  );
}
