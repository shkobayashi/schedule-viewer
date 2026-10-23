/** 本文行の既定の高さ（px）。ペイロードの `bodyRowHeightPx` の初期値。 */
export const EXCEL_DEFAULT_BODY_ROW_HEIGHT_PX = 22;

/** 日付列の見出し行の高さ。本文の行高とは別である。 */
export function excelHeaderRowHeightPx(dateColumnWidthPx: number): number {
  return dateColumnWidthPx >= 96 ? 28 : EXCEL_DEFAULT_BODY_ROW_HEIGHT_PX;
}
