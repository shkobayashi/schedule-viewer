export type ExcelExportShape = {
  row: number;
  anchorCol: number;
  xOffsetPx: number;
  yOffsetPx: number;
  widthPx: number;
  heightPx: number;
  fillRgb: string;
  pattern: "solid" | "tentative";
  patternForeRgb: string | null;
  fillTransparency?: number;
  text?: string;
  textRgb?: string;
};
