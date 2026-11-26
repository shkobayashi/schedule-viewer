import type { VisibleRow } from "./types";

export function isExplanationTrialVisibleRow(
  row: VisibleRow,
): row is Extract<VisibleRow, { type: "task" }> & {
  explanationTrial: { patternId: string; color: string };
} {
  return row.type === "task" && row.explanationTrial != null;
}

/** 画面用の行並び上のポインタ Y を、文書行の y 帯と比べる座標へ戻す。 */
export function reorderPointerContentYForDocumentRows(input: {
  displayContentY: number;
  displayRows: readonly VisibleRow[];
  rowHeight: number;
}): number {
  let trialHeightAbove = 0;
  for (const row of input.displayRows) {
    if (isExplanationTrialVisibleRow(row) && row.y < input.displayContentY) {
      trialHeightAbove += input.rowHeight;
    }
  }
  return input.displayContentY - trialHeightAbove;
}
