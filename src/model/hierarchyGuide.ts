import type { VisibleRow } from "./types";

/** 1px 線、中心間 5px（すきま 4px）。最大 4 本でレール幅 20px。 */
export const HIERARCHY_GUIDE_LINE_STEP_PX = 5;
export const HIERARCHY_GUIDE_RAIL_WIDTH_PX = 20;
export const HIERARCHY_GUIDE_ICON_SLOT_PX = 24;
export const HIERARCHY_GUIDE_ICON_GAP_PX = 4;
export const HIERARCHY_GUIDE_MAX_DEPTH = 4;

export type HierarchyGuideSpec = {
  depth: number;
  /** 行の上端から下端まで引く縦線の段（0 始まり、自分より浅い親） */
  fullVerticals: number[];
  /** 行の上端から中央まで引く縦線の段（枝の終わり） */
  halfVerticals: number[];
  /** 見えている子があるとき、自分の段の縦線を中央から下端まで */
  stemAt: number | null;
  /** 親がある行で、いちばん内側の縦線から印へ */
  elbow: boolean;
};

/** 握りの左余白と幅（px）。行の下罫線でレールの左端と揃える。 */
export const SIDEBAR_ROW_GRIP_WIDTH_PX = 20;

function verticalContinuesPastRow(
  depths: readonly number[],
  rowIndex: number,
  lineIndex: number,
): boolean {
  const nextDepth = depths[rowIndex + 1];
  if (nextDepth == null) return false;
  return nextDepth > lineIndex;
}

function ancestorVerticalsForRow(
  depths: readonly number[],
  rowIndex: number,
  depth: number,
): { fullVerticals: number[]; halfVerticals: number[] } {
  const fullVerticals: number[] = [];
  const halfVerticals: number[] = [];
  for (let lineIndex = 0; lineIndex < depth; lineIndex += 1) {
    if (verticalContinuesPastRow(depths, rowIndex, lineIndex)) {
      fullVerticals.push(lineIndex);
    } else {
      halfVerticals.push(lineIndex);
    }
  }
  return { fullVerticals, halfVerticals };
}

export function computeVisibleRowGuideDepths(
  rows: readonly VisibleRow[],
): number[] {
  const depths: number[] = [];
  const stack: { collapsed: boolean }[] = [];

  for (const row of rows) {
    if (row.type === "category") {
      depths.push(0);
      stack.length = 0;
      stack.push({ collapsed: row.collapsed });
      continue;
    }
    if (row.type === "group") {
      depths.push(1);
      if (stack.length === 0) {
        stack.push({ collapsed: false });
      }
      stack.length = 1;
      stack.push({ collapsed: row.collapsed });
      continue;
    }
    if (row.type === "hierarchy") {
      depths.push(row.depth);
      stack.length = row.depth;
      stack.push({ collapsed: row.collapsed });
      continue;
    }
    depths.push(stack.length);
  }

  return depths;
}

function rowHasVisibleChild(
  rows: readonly VisibleRow[],
  depths: readonly number[],
  index: number,
): boolean {
  const row = rows[index];
  if (row == null) return false;
  if (row.type === "task") return false;
  if (row.collapsed) return false;
  const depth = depths[index];
  if (depth == null) return false;
  const nextDepth = depths[index + 1];
  return index + 1 < rows.length && nextDepth != null && nextDepth > depth;
}

export function hierarchyGuideSpecAt(
  rows: readonly VisibleRow[],
  index: number,
): HierarchyGuideSpec {
  const depths = computeVisibleRowGuideDepths(rows);
  const depth = depths[index] ?? 0;
  const hasChild = rowHasVisibleChild(rows, depths, index);
  const { fullVerticals, halfVerticals } = ancestorVerticalsForRow(
    depths,
    index,
    depth,
  );
  return {
    depth,
    fullVerticals,
    halfVerticals,
    stemAt: hasChild ? depth : null,
    elbow: depth > 0,
  };
}

export function hierarchyGuideSpecsForRows(
  rows: readonly VisibleRow[],
): HierarchyGuideSpec[] {
  const depths = computeVisibleRowGuideDepths(rows);
  return guideSpecsFromDepths(rows, depths);
}

function guideSpecsFromDepths(
  rows: readonly VisibleRow[],
  depths: readonly number[],
): HierarchyGuideSpec[] {
  return rows.map((_, index) => {
    const depth = depths[index] ?? 0;
    const hasChild = rowHasVisibleChild(rows, depths, index);
    const { fullVerticals, halfVerticals } = ancestorVerticalsForRow(
      depths,
      index,
      depth,
    );
    return {
      depth,
      fullVerticals,
      halfVerticals,
      stemAt: hasChild ? depth : null,
      elbow: depth > 0,
    };
  });
}

/** 並べ替えドラッグの塊は、塊内だけを深さ 0 から描く。 */
export function hierarchyGuideSpecsForDragBlock(
  blockRows: readonly VisibleRow[],
): HierarchyGuideSpec[] {
  if (blockRows.length === 0) return [];
  const raw = computeVisibleRowGuideDepths(blockRows);
  const base = raw[0] ?? 0;
  const depths = raw.map((d) => d - base);
  return guideSpecsFromDepths(blockRows, depths);
}

/** 左ラベルで名前が始まる x（レール＋印のすき間まで）。 */
export function hierarchyGuideNameStartPx(scale: number): number {
  return (
    (HIERARCHY_GUIDE_RAIL_WIDTH_PX +
      2 +
      HIERARCHY_GUIDE_ICON_SLOT_PX +
      HIERARCHY_GUIDE_ICON_GAP_PX) *
    scale
  );
}

/** 書き出しの左ラベルで、行罫線を縦線の右から始める x。 */
export function exportLabelRowBorderStartPx(scale: number): number {
  return HIERARCHY_GUIDE_RAIL_WIDTH_PX * scale;
}

function svgN(value: number): string {
  return Number.isFinite(value) ? String(Math.round(value * 100) / 100) : "0";
}

export function renderHierarchyGuideSvg(
  spec: HierarchyGuideSpec,
  scale: number,
  y: number,
  height: number,
  color: string,
): string {
  const step = HIERARCHY_GUIDE_LINE_STEP_PX * scale;
  const lineW = Math.max(1, scale);
  const mid = y + height / 2;
  const elbowEnd = (HIERARCHY_GUIDE_RAIL_WIDTH_PX + 2) * scale;
  const parts: string[] = [];

  const lineIndices = new Set([...spec.fullVerticals, ...spec.halfVerticals]);
  for (const index of spec.fullVerticals) {
    const x = index * step + lineW / 2;
    parts.push(
      `<line x1="${svgN(x)}" y1="${svgN(y)}" x2="${svgN(x)}" y2="${svgN(y + height)}" stroke="${color}" stroke-width="${svgN(lineW)}"/>`,
    );
  }
  for (const index of spec.halfVerticals) {
    const x = index * step + lineW / 2;
    parts.push(
      `<line x1="${svgN(x)}" y1="${svgN(y)}" x2="${svgN(x)}" y2="${svgN(mid)}" stroke="${color}" stroke-width="${svgN(lineW)}"/>`,
    );
  }
  if (spec.stemAt != null && !lineIndices.has(spec.stemAt)) {
    const x = spec.stemAt * step + lineW / 2;
    parts.push(
      `<line x1="${svgN(x)}" y1="${svgN(mid)}" x2="${svgN(x)}" y2="${svgN(y + height)}" stroke="${color}" stroke-width="${svgN(lineW)}"/>`,
    );
  }
  if (spec.elbow) {
    const from = Math.max(0, spec.depth - 1) * step + lineW / 2;
    parts.push(
      `<line x1="${svgN(from)}" y1="${svgN(mid)}" x2="${svgN(elbowEnd)}" y2="${svgN(mid)}" stroke="${color}" stroke-width="${svgN(lineW)}"/>`,
    );
  }
  return parts.join("\n    ");
}
