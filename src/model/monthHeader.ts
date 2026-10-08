/** 月ラベル同士の隙間の基準（表示倍率を掛ける前）。 */
export const MONTH_HEADER_LABEL_GAP_BASE_PX = 4;

export type MonthHeaderLabelCandidate = {
  /** 描画側の React / SVG キー用。 */
  key: string;
  x: number;
  text: string;
  fontSize: number;
};

export type MonthHeaderObstruction = {
  left: number;
  text: string;
  fontSize: number;
};

export function formatYearMonth(d: Date): string {
  return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月`;
}

/** 太字月ラベル向けの余裕（fontSize に掛ける）。表示サイズ 50%〜200% で実測した下限。 */
const MONTH_HEADER_LABEL_WIDTH_PADDING = 0.5;

/**
 * 月ヘッダー文字の幅。描画より狭く見積もらない。
 * 半角の字幅は dragDateChipSize と同じ。余裕は太字の月ラベル用。
 */
export function monthHeaderLabelWidth(text: string, fontSize: number): number {
  let width = 0;
  for (const ch of text) {
    width += ch.charCodeAt(0) > 0xff ? fontSize : fontSize * 0.62;
  }
  width += fontSize * MONTH_HEADER_LABEL_WIDTH_PADDING;
  return width;
}

function obstructionRightEdge(
  obstructions: MonthHeaderObstruction[],
): number {
  let right = -Infinity;
  for (const o of obstructions) {
    right = Math.max(right, o.left + monthHeaderLabelWidth(o.text, o.fontSize));
  }
  return right;
}

/** 左から順に、手前のラベルと隙間を空けて収まる月ラベルだけ返す。 */
export function visibleMonthHeaderLabels(
  candidates: MonthHeaderLabelCandidate[],
  obstructions: MonthHeaderObstruction[],
  gapPx: number,
): MonthHeaderLabelCandidate[] {
  let occupiedRight = obstructionRightEdge(obstructions);
  const visible: MonthHeaderLabelCandidate[] = [];
  for (const candidate of candidates) {
    if (candidate.x < occupiedRight + gapPx) continue;
    visible.push(candidate);
    occupiedRight =
      candidate.x + monthHeaderLabelWidth(candidate.text, candidate.fontSize);
  }
  return visible;
}
