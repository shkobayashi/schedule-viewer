import { paletteFor, type ResolvedColorScheme } from "./palette";

const EXCEL_LINK_ELBOW_PX = 12;

export function excelConnectorStraight(sameRow: boolean): boolean {
  return sameRow;
}

export function excelConnectorStrokeRgb(
  broken: boolean,
  colorScheme: ResolvedColorScheme,
): string {
  const { chart } = paletteFor(colorScheme);
  const hex = broken ? chart.linkBroken : chart.linkOk;
  return hex.replace("#", "");
}

/** bentConnector3 の adj1（幅に対する千分率、0〜100000）。列幅は使わない。 */
export function excelConnectorBentAdj1(
  fromRightPx: number,
  toLeftPx: number,
): number {
  const left = Math.min(fromRightPx, toLeftPx);
  const right = Math.max(fromRightPx, toLeftPx);
  const width = Math.max(1, right - left);
  let elbowX: number;
  if (toLeftPx - fromRightPx >= EXCEL_LINK_ELBOW_PX) {
    elbowX = Math.min(fromRightPx + EXCEL_LINK_ELBOW_PX, toLeftPx);
  } else {
    elbowX = left + width / 2;
  }
  return Math.round(((elbowX - left) / width) * 100_000);
}

export type ExcelConnectorDescriptor = {
  strokeRgb: string;
  broken: boolean;
  straight: boolean;
  bentAdj1: number;
};

export function excelConnectorDescriptor(
  broken: boolean,
  sameRow: boolean,
  fromRightPx: number,
  toLeftPx: number,
  colorScheme: ResolvedColorScheme,
): ExcelConnectorDescriptor {
  const straight = excelConnectorStraight(sameRow);
  return {
    strokeRgb: excelConnectorStrokeRgb(broken, colorScheme),
    broken,
    straight,
    bentAdj1: straight
      ? 50_000
      : excelConnectorBentAdj1(fromRightPx, toLeftPx),
  };
}
