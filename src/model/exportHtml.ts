import { invoke, isTauri } from "@tauri-apps/api/core";
import { scheduleHtmlFilename, scheduleSvgFilename } from "./exportFilename";
import { addDays, addUtcMonths, daysBetween, fmtShort, parseDate, utcMonthStart } from "./dates";
import { LAYOUT_HEADER_HEIGHT } from "./layoutSizes";
import { LINK_POINTER_LENGTH, linkPoints, type DependencyLink } from "./dependencies";
import { milestonesExceededBy } from "./milestones";
import {
  coveredSpanWidthPx,
  summaryBarWidthPx,
  type SummarySpan,
} from "./summary";
import {
  barColors,
  isOverdue,
  lightningDate,
  taskBarExclusiveEnd,
  taskBarWidthPx,
} from "./timeline";
import { resolveAssigneeDisplay, assigneeSidebarLabel } from "./assigneeDisplay";
import { hasTaskNote, normalizeTaskNote } from "./taskNote";
import type { Member, MemberId } from "./memberTypes";
import type { Milestone, ScheduleId, Task, VisibleRow } from "./types";
import type { CalendarDocument } from "./calendarTypes";
import { hatchPatternId, hatchPatternMarkup } from "./hatch";
import { nonWorkingDayClipRects } from "./nonWorkingDay";
import { paletteFor, type ResolvedColorScheme } from "./palette";

export type ScheduleExportInput = {
  title: string;
  tierLabel: string;
  lineageName: string | null;
  visibleRows: VisibleRow[];
  milestones: Milestone[];
  milestoneLanes: Map<ScheduleId, number>;
  links: DependencyLink[];
  timelineStart: Date;
  timelineEnd: Date;
  totalDays: number;
  pxPerDay: number;
  tier: "day" | "week" | "month";
  headerHeight: number;
  rowHeight: number;
  barHeight: number;
  milestoneBandHeight: number;
  milestoneLaneHeight: number;
  milestoneDiamondSize: number;
  milestoneFontSize: number;
  labelScale: number;
  today: string;
  memberCatalog: Map<MemberId, Member> | null;
  calendar: CalendarDocument | null;
  /** 初期値以外の絞り込み。空なら絞り込みなし。 */
  filterSummary: string;
  colorScheme: ResolvedColorScheme;
};

export type ScheduleExportFormat = "html" | "svg";

function palettes(input: ScheduleExportInput) {
  return paletteFor(input.colorScheme);
}

export const EXPORT_MAX_WIDTH_PX = 200_000;
export const EXPORT_MAX_HEIGHT_PX = 50_000;
export const EXPORT_MAX_ROWS = 10_000;

export class ScheduleExportTooLargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScheduleExportTooLargeError";
  }
}

function assertExportFits(input: ScheduleExportInput): void {
  if (input.visibleRows.length > EXPORT_MAX_ROWS) {
    throw new ScheduleExportTooLargeError(
      `書き出し対象の行数が上限（${EXPORT_MAX_ROWS} 行）を超えています。絞り込みや折りたたみで行数を減らしてください。`,
    );
  }
  const chartWidth = Math.max(input.pxPerDay, input.totalDays * input.pxPerDay);
  const contentHeight = input.visibleRows.reduce(
    (max, row) => Math.max(max, row.y + input.rowHeight),
    0,
  );
  const svgHeight = input.headerHeight + input.milestoneBandHeight + contentHeight;
  if (chartWidth > EXPORT_MAX_WIDTH_PX || svgHeight > EXPORT_MAX_HEIGHT_PX) {
    throw new ScheduleExportTooLargeError(
      "書き出しサイズが上限を超えています。表示期間を短くするか、ズームを広げてください。",
    );
  }
}
import { CSS_FONT_FAMILY } from "./fontStack";

const FONT = CSS_FONT_FAMILY;

export function scheduleExportFilename(
  title: string,
  format: ScheduleExportFormat = "html",
): string {
  return format === "svg" ? scheduleSvgFilename(title) : scheduleHtmlFilename(title);
}

function tentativeHatchPatterns(input: ScheduleExportInput): string {
  const colors = new Set<string>();
  for (const row of input.visibleRows) {
    if (row.type !== "task" || row.task.confidence !== "tentative") continue;
    colors.add(barColors(row.task, input.today, input.colorScheme).bg);
  }
  if (input.milestones.some((milestone) => milestone.confidence === "tentative")) {
    colors.add(palettes(input).chart.milestoneDiamond);
  }
  return [...colors]
    .map((bg) => hatchPatternMarkup(bg, input.colorScheme))
    .join("\n    ");
}

type ChartGraphic = {
  inner: string;
  chartWidth: number;
  svgHeight: number;
};

function buildChartGraphic(input: ScheduleExportInput): ChartGraphic {
  assertExportFits(input);
  const chartWidth = Math.max(input.pxPerDay, input.totalDays * input.pxPerDay);
  const contentHeight = input.visibleRows.reduce(
    (max, row) => Math.max(max, row.y + input.rowHeight),
    0,
  );
  const bodyTop = input.headerHeight + input.milestoneBandHeight;
  const svgHeight = bodyTop + contentHeight;
  const dateToX = (d: Date) => daysBetween(input.timelineStart, d) * input.pxPerDay;
  const { chart } = palettes(input);
  const parts = [
    `<rect width="${n(chartWidth)}" height="${n(svgHeight)}" fill="${chart.exportBg}"/>`,
    `<defs>
    <marker id="arrow" markerWidth="${LINK_POINTER_LENGTH}" markerHeight="${LINK_POINTER_LENGTH}" refX="${LINK_POINTER_LENGTH - 1}" refY="${LINK_POINTER_LENGTH / 2}" orient="auto">
      <path d="M0,0 L${LINK_POINTER_LENGTH},${LINK_POINTER_LENGTH / 2} L0,${LINK_POINTER_LENGTH} Z" fill="${chart.dependencyMarkerOk}"/>
    </marker>
    <marker id="arrow-broken" markerWidth="${LINK_POINTER_LENGTH}" markerHeight="${LINK_POINTER_LENGTH}" refX="${LINK_POINTER_LENGTH - 1}" refY="${LINK_POINTER_LENGTH / 2}" orient="auto">
      <path d="M0,0 L${LINK_POINTER_LENGTH},${LINK_POINTER_LENGTH / 2} L0,${LINK_POINTER_LENGTH} Z" fill="${chart.dependencyMarkerBroken}"/>
    </marker>
    ${tentativeHatchPatterns(input)}
  </defs>`,
    renderHeader(input, chartWidth, dateToX),
    renderMilestones(input, chartWidth, dateToX),
    renderBody(input, chartWidth, contentHeight, bodyTop, dateToX),
  ];
  return { inner: parts.join("\n  "), chartWidth, svgHeight };
}

function scopeSentence(input: ScheduleExportInput): string {
  const lineage = input.lineageName ? `系統「${input.lineageName}」。` : "";
  const filtered = input.filterSummary
    ? `絞り込み（${input.filterSummary}）と折りたたみで見えている行です。`
    : "絞り込み・折りたたみで見えている行です。";
  return `${input.tierLabel}。${filtered}${lineage}本日は ${input.today}。`;
}

export function buildScheduleHtml(input: ScheduleExportInput): string {
  const chart = buildChartGraphic(input);
  const { css: c, chart: chartPalette } = palettes(input);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${n(chart.chartWidth)}" height="${n(chart.svgHeight)}" font-family="${FONT}">
  ${chart.inner}
</svg>`;
  const meta = esc(scopeSentence(input));
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>${esc(input.title)}</title>
<style>
  body { margin: 0; background: ${c.bg}; color: ${c.text}; font-family: ${FONT}; }
  .page { padding: 16px 20px 32px; }
  h1 { font-size: 16px; font-weight: 600; margin: 0 0 4px; }
  .meta { color: ${c.textSecondary}; font-size: 12px; margin: 0 0 12px; }
  .sheet { display: flex; align-items: flex-start; border: 1px solid ${c.border}; width: max-content; }
  .labels { flex: 0 0 auto; background: ${c.bg}; }
  .label { box-sizing: border-box; display: flex; align-items: center; white-space: nowrap; border-bottom: 1px solid ${c.rowBorder}; }
  .label.header { color: ${c.textSecondary}; font-weight: 600; background: ${c.panel}; border-bottom-color: ${c.border}; padding: 0 ${px(12, input.labelScale)}; font-size: ${px(11, input.labelScale)}; }
  .label.milestones { background: ${c.milestoneSidebar}; color: ${c.milestoneSidebarText}; font-weight: 700; border-bottom-color: ${c.border}; padding: 0 ${px(12, input.labelScale)}; font-size: ${px(11, input.labelScale)}; }
  .label.category { background: ${c.panel}; font-weight: 600; padding-left: ${px(6, input.labelScale)}; font-size: ${px(12, input.labelScale)}; }
  .label.group { background: ${c.groupBg}; font-weight: 600; color: ${c.groupText}; padding-left: ${px(22, input.labelScale)}; font-size: ${px(12, input.labelScale)}; }
  .label.task { padding-left: ${px(26, input.labelScale)}; font-size: ${px(12, input.labelScale)}; }
  .note-icon { flex: 0 0 auto; display: inline-flex; margin-right: ${px(4, input.labelScale)}; line-height: 0; }
  .note-icon svg { display: block; }
  .label.task.unassigned { box-shadow: inset 3px 0 0 ${c.unassignedAccent}; }
  .twist { width: ${px(16, input.labelScale)}; margin-right: ${px(4, input.labelScale)}; color: ${c.twist}; font-size: ${px(9, input.labelScale)}; }
  .name.overdue { color: ${c.overdue}; font-weight: 600; }
  .alert { margin-left: 6px; color: ${c.overdue}; background: ${c.overdueBg}; border-radius: 999px; padding: 1px 6px; font-size: ${px(10, input.labelScale)}; font-weight: 700; }
  .tentative { margin-left: 6px; color: ${c.text}; background: ${c.accentSoft}; border-radius: 999px; padding: 1px 6px; font-size: ${px(10, input.labelScale)}; font-weight: 700; }
  .assignee { margin-left: 16px; color: ${c.textSecondary}; font-size: ${px(10, input.labelScale)}; padding-right: 12px; }
  .assignee.unassigned { color: ${c.unassignedText}; background: ${c.unassignedBg}; border-radius: 999px; padding: 1px 7px; font-weight: 700; }
  .assignee.unknown-member { color: ${c.unknownText}; background: ${c.unknownBg}; border-radius: 999px; padding: 1px 7px; font-weight: 700; }
  .label.task.unknown-member { box-shadow: inset 3px 0 0 ${chartPalette.unknownStroke}; }
</style>
</head>
<body>
  <div class="page">
    <h1>${esc(input.title)}</h1>
    <p class="meta">${meta}</p>
    <div class="sheet">
      <div class="labels">
        ${renderLabels(input)}
      </div>
      ${svg}
    </div>
  </div>
</body>
</html>
`;
}

export function buildScheduleSvg(input: ScheduleExportInput): string {
  const chartGraphic = buildChartGraphic(input);
  const { css: c, chart } = palettes(input);
  const labelWidth = svgLabelWidth(input);
  const pad = 16;
  const titleSize = 16;
  const metaSize = 12;
  const titleY = pad;
  const meta = scopeSentence(input);
  const metaWidth = Math.max(chartGraphic.chartWidth + labelWidth, 320);
  const metaLines = wrapText(meta, metaWidth, metaSize);
  const metaY = titleY + titleSize + 6;
  const sheetY = metaY + metaLines.length * (metaSize + 4) + 8;
  const width = pad * 2 + labelWidth + chartGraphic.chartWidth;
  const height = sheetY + chartGraphic.svgHeight + pad;
  const metaTexts = metaLines
    .map(
      (line, index) =>
        text(pad, metaY + index * (metaSize + 4), line, metaSize, c.textSecondary, false),
    )
    .join("\n  ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${n(width)}" height="${n(height)}" font-family="${FONT}">
  <rect width="100%" height="100%" fill="${chart.exportBg}"/>
  ${text(pad, titleY, input.title, titleSize, chart.textPrimary, true)}
  ${metaTexts}
  <g transform="translate(${pad},${n(sheetY)})">
    ${renderSvgLabels(input, labelWidth, chartGraphic.svgHeight)}
    <g transform="translate(${n(labelWidth)},0)">
      ${chartGraphic.inner}
    </g>
  </g>
</svg>
`;
}

function downloadExportInBrowser(
  contents: string,
  title: string,
  format: ScheduleExportFormat,
): void {
  const blob = new Blob([contents], {
    type: format === "svg" ? "image/svg+xml;charset=utf-8" : "text/html;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = scheduleExportFilename(title, format);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Tauri では保存ダイアログ、ブラウザではダウンロード。キャンセル時は null。 */
export async function exportSchedule(
  input: ScheduleExportInput,
  format: ScheduleExportFormat,
): Promise<string | null> {
  const contents = format === "svg" ? buildScheduleSvg(input) : buildScheduleHtml(input);
  const suggestedName = scheduleExportFilename(input.title, format);
  if (isTauri()) {
    return invoke<string | null>("save_html_file", {
      contents,
      suggestedName,
      extension: format,
    });
  }
  downloadExportInBrowser(contents, input.title, format);
  return null;
}

function estimateTextWidth(value: string, fontSize: number): number {
  let width = 0;
  for (const ch of value) {
    width += ch.charCodeAt(0) > 0xff ? fontSize : fontSize * 0.62;
  }
  return width;
}

/** 行バッジの矩形幅。描画側の padding と揃える。 */
function labelBadgeWidth(label: string, scale: number): number {
  return estimateTextWidth(label, 10 * scale) + 12;
}

function wrapText(value: string, maxWidth: number, fontSize: number): string[] {
  if (!value) return [""];
  const lines: string[] = [];
  let line = "";
  for (const ch of value) {
    const next = line + ch;
    if (line && estimateTextWidth(next, fontSize) > maxWidth) {
      lines.push(line);
      line = ch;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function svgLabelWidth(input: ScheduleExportInput): number {
  const scale = input.labelScale;
  let width = estimateTextWidth("WBS / タスク", 11 * scale) + 24 * scale;
  if (input.milestoneBandHeight > 0) {
    width = Math.max(width, estimateTextWidth("マイルストン", 11 * scale) + 24 * scale);
  }
  for (const row of input.visibleRows) {
    if (row.type === "category" || row.type === "group") {
      const indent = row.type === "category" ? 6 : 22;
      width = Math.max(
        width,
        indent * scale + 20 * scale + estimateTextWidth(row.label, 12 * scale) + 12 * scale,
      );
      continue;
    }
    const assigneeDisplay = resolveAssigneeDisplay(
      row.task.assigneeId,
      input.memberCatalog,
    );
    const assignee = assigneeSidebarLabel(assigneeDisplay);
    const assigneeWidth =
      assigneeDisplay.kind === "unassigned" || assigneeDisplay.kind === "unknown"
        ? estimateTextWidth(assignee, 10 * scale) + 14
        : estimateTextWidth(assignee, 10 * scale);
    let badges = 0;
    if (row.task.confidence === "tentative") {
      badges += labelBadgeWidth("未確定", scale) + 6;
    }
    if (milestonesExceededBy(row.task, input.milestones).length > 0) {
      badges += labelBadgeWidth("超過", scale) + 6;
    }
    width = Math.max(
      width,
      26 * scale +
        18 * scale +
        estimateTextWidth(row.task.name, 12 * scale) +
        badges +
        16 +
        assigneeWidth +
        12 * scale,
    );
  }
  return Math.max(120, Math.ceil(width));
}

function renderSvgLabels(
  input: ScheduleExportInput,
  labelWidth: number,
  sheetHeight: number,
): string {
  const { css: c, chart } = palettes(input);
  const marks = [
    `<rect x="0" y="0" width="${n(labelWidth)}" height="${n(sheetHeight)}" fill="${c.bg}"/>`,
    `<line x1="${n(labelWidth - 0.5)}" y1="0" x2="${n(labelWidth - 0.5)}" y2="${n(sheetHeight)}" stroke="${chart.headerBorder}" stroke-width="1"/>`,
  ];
  marks.push(renderSvgLabelBand(input, labelWidth, 0, input.headerHeight, "header", "WBS / タスク"));
  if (input.milestoneBandHeight > 0) {
    marks.push(
      renderSvgLabelBand(
        input,
        labelWidth,
        input.headerHeight,
        input.milestoneBandHeight,
        "milestones",
        "マイルストン",
      ),
    );
  }
  const bodyTop = input.headerHeight + input.milestoneBandHeight;
  for (const row of input.visibleRows) {
    marks.push(renderSvgLabelRow(row, input, labelWidth, bodyTop + row.y));
  }
  return marks.join("\n    ");
}

function renderSvgLabelBand(
  input: ScheduleExportInput,
  labelWidth: number,
  y: number,
  height: number,
  kind: "header" | "milestones",
  label: string,
): string {
  const { css: c, chart } = palettes(input);
  const fill = kind === "header" ? c.panel : c.milestoneSidebar;
  const color = kind === "header" ? c.textSecondary : c.milestoneSidebarText;
  const size = 11 * input.labelScale;
  return [
    `<rect x="0" y="${n(y)}" width="${n(labelWidth)}" height="${n(height)}" fill="${fill}"/>`,
    text(12 * input.labelScale, y + (height - size) / 2, label, size, color, true),
    `<line x1="0" y1="${n(y + height - 0.5)}" x2="${n(labelWidth)}" y2="${n(y + height - 0.5)}" stroke="${chart.headerBorder}" stroke-width="1"/>`,
  ].join("\n    ");
}

function renderSvgLabelRow(
  row: VisibleRow,
  input: ScheduleExportInput,
  labelWidth: number,
  y: number,
): string {
  const { css: c, chart } = palettes(input);
  const height = input.rowHeight;
  const mid = y + height / 2;
  if (row.type === "category" || row.type === "group") {
    const fill = row.type === "category" ? chart.categoryRow : chart.groupRow;
    const color = row.type === "category" ? chart.textPrimary : c.groupText;
    const indent = (row.type === "category" ? 6 : 22) * input.labelScale;
    const size = 12 * input.labelScale;
    const mark = row.collapsed ? "▶" : "▼";
    return [
      `<rect x="0" y="${n(y)}" width="${n(labelWidth)}" height="${n(height)}" fill="${fill}"/>`,
      text(indent, mid - size / 2, mark, 9 * input.labelScale, c.twist, false),
      text(indent + 20 * input.labelScale, mid - size / 2, row.label, size, color, true),
      `<line x1="0" y1="${n(y + height)}" x2="${n(labelWidth)}" y2="${n(y + height)}" stroke="${chart.rowBorder}" stroke-width="1"/>`,
    ].join("\n    ");
  }
  const assigneeDisplay = resolveAssigneeDisplay(row.task.assigneeId, input.memberCatalog);
  const unassigned = assigneeDisplay.kind === "unassigned";
  const unknownMember = assigneeDisplay.kind === "unknown";
  const overdue = isOverdue(row.task, input.today);
  const exceeded = milestonesExceededBy(row.task, input.milestones);
  const nameSize = 12 * input.labelScale;
  let x = 26 * input.labelScale;
  const parts = [
    `<rect x="0" y="${n(y)}" width="${n(labelWidth)}" height="${n(height)}" fill="${c.bg}"/>`,
  ];
  if (unassigned) {
    parts.push(
      `<line x1="1.5" y1="${n(y)}" x2="1.5" y2="${n(y + height)}" stroke="${c.unassignedAccent}" stroke-width="3"/>`,
    );
  } else if (unknownMember) {
    parts.push(
      `<line x1="1.5" y1="${n(y)}" x2="1.5" y2="${n(y + height)}" stroke="${chart.unknownStroke}" stroke-width="3"/>`,
    );
  }
  const note = normalizeTaskNote(row.task.note);
  const iconSize = 14 * input.labelScale;
  const iconColor = hasTaskNote(row.task) ? c.accent : c.noteEmpty;
  const title = note ? `<title>${esc(note)}</title>` : "";
  parts.push(
    `<g transform="translate(${n(x)},${n(mid - iconSize / 2)}) scale(${n(iconSize / 16)})">${title}<path fill="${iconColor}" d="M3 1.5h7l3.5 3.5V13.5A1.5 1.5 0 0 1 12 15H3A1.5 1.5 0 0 1 1.5 13.5v-11A1.5 1.5 0 0 1 3 1.5zm6.5 0V5H13L9.5 1.5zM4 7.25h8v1H4v-1zm0 2.5h8v1H4v-1zm0 2.5h5v1H4v-1z"/></g>`,
  );
  x += iconSize + 4 * input.labelScale;
  parts.push(
    text(
      x,
      mid - nameSize / 2,
      row.task.name,
      nameSize,
      overdue ? c.overdue : chart.textPrimary,
      overdue,
    ),
  );
  x += estimateTextWidth(row.task.name, nameSize) + 6;
  if (row.task.confidence === "tentative") {
    const badge = "未確定";
    const badgeSize = 10 * input.labelScale;
    const badgeW = labelBadgeWidth(badge, input.labelScale);
    parts.push(
      `<rect x="${n(x)}" y="${n(mid - 8)}" width="${n(badgeW)}" height="16" rx="8" fill="${c.accentSoft}"/>`,
      text(x + 6, mid - badgeSize / 2, badge, badgeSize, c.text, true),
    );
    x += badgeW + 6;
  }
  if (exceeded.length > 0) {
    const badge = "超過";
    const badgeSize = 10 * input.labelScale;
    const badgeW = labelBadgeWidth(badge, input.labelScale);
    parts.push(
      `<rect x="${n(x)}" y="${n(mid - 8)}" width="${n(badgeW)}" height="16" rx="8" fill="${c.overdueBg}"/>`,
      text(x + 6, mid - badgeSize / 2, badge, badgeSize, c.overdue, true),
    );
    x += badgeW + 6;
  }
  const assignee = assigneeSidebarLabel(assigneeDisplay);
  const assigneeSize = 10 * input.labelScale;
  x += 10;
  if (unassigned || unknownMember) {
    const badgeW = estimateTextWidth(assignee, assigneeSize) + 14;
    const fill = unassigned ? c.unassignedBg : c.unknownBg;
    const color = unassigned ? c.unassignedText : c.unknownText;
    parts.push(
      `<rect x="${n(x)}" y="${n(mid - 8)}" width="${n(badgeW)}" height="16" rx="8" fill="${fill}"/>`,
      text(x + 7, mid - assigneeSize / 2, assignee, assigneeSize, color, true),
    );
  } else {
    parts.push(text(x, mid - assigneeSize / 2, assignee, assigneeSize, c.textSecondary, false));
  }
  parts.push(
    `<line x1="0" y1="${n(y + height)}" x2="${n(labelWidth)}" y2="${n(y + height)}" stroke="${chart.rowBorder}" stroke-width="1"/>`,
  );
  return parts.join("\n    ");
}

function renderLabels(input: ScheduleExportInput): string {
  const rows = [
    `<div class="label header" style="height:${input.headerHeight}px">WBS / タスク</div>`,
  ];
  if (input.milestoneBandHeight > 0) {
    rows.push(
      `<div class="label milestones" style="height:${input.milestoneBandHeight}px">マイルストン</div>`,
    );
  }
  for (const row of input.visibleRows) {
    rows.push(renderLabelRow(row, input));
  }
  return rows.join("\n        ");
}

function renderLabelRow(row: VisibleRow, input: ScheduleExportInput): string {
  const height = `style="height:${input.rowHeight}px"`;
  if (row.type === "category" || row.type === "group") {
    const mark = row.collapsed ? "▶" : "▼";
    return `<div class="label ${row.type}" ${height}><span class="twist">${mark}</span>${esc(row.label)}</div>`;
  }
  const assigneeDisplay = resolveAssigneeDisplay(
    row.task.assigneeId,
    input.memberCatalog,
  );
  const unassigned = assigneeDisplay.kind === "unassigned";
  const unknownMember = assigneeDisplay.kind === "unknown";
  const overdue = isOverdue(row.task, input.today);
  const exceeded = milestonesExceededBy(row.task, input.milestones);
  const tentative =
    row.task.confidence === "tentative"
      ? `<span class="tentative">未確定</span>`
      : "";
  const alert =
    exceeded.length > 0
      ? `<span class="alert">超過</span>`
      : "";
  const assignee = assigneeSidebarLabel(assigneeDisplay);
  const extraClass = unassigned
    ? " unassigned"
    : unknownMember
      ? " unknown-member"
      : "";
  const noteIcon = renderExportNoteIcon(row.task, input.labelScale, input.colorScheme);
  return `<div class="label task${extraClass}" ${height}>${noteIcon}<span class="name${overdue ? " overdue" : ""}">${esc(row.task.name)}</span>${tentative}${alert}<span class="assignee${extraClass}">${esc(assignee)}</span></div>`;
}

function renderExportNoteIcon(
  task: Task,
  labelScale: number,
  colorScheme: ResolvedColorScheme,
): string {
  const filled = hasTaskNote(task);
  const { css: c } = paletteFor(colorScheme);
  const color = filled ? c.accent : c.noteEmpty;
  const size = px(14, labelScale);
  const note = normalizeTaskNote(task.note);
  const titleAttr = note
    ? ` title="${esc(note).replace(/\r\n|\r|\n/g, "&#10;")}"`
    : "";
  return `<span class="note-icon"${titleAttr}><svg viewBox="0 0 16 16" width="${size}" height="${size}" aria-hidden="true"><path fill="${color}" d="M3 1.5h7l3.5 3.5V13.5A1.5 1.5 0 0 1 12 15H3A1.5 1.5 0 0 1 1.5 13.5v-11A1.5 1.5 0 0 1 3 1.5zm6.5 0V5H13L9.5 1.5zM4 7.25h8v1H4v-1zm0 2.5h8v1H4v-1zm0 2.5h5v1H4v-1z"/></svg></span>`;
}

function renderHeader(
  input: ScheduleExportInput,
  chartWidth: number,
  dateToX: (d: Date) => number,
): string {
  const { chart } = palettes(input);
  const scale = input.headerHeight / LAYOUT_HEADER_HEIGHT;
  const marks: string[] = [
    line(0, input.headerHeight - 0.5, chartWidth, input.headerHeight - 0.5, chart.headerBorder, 1),
  ];
  if (input.tier === "month") {
    let d = utcMonthStart(input.timelineStart);
    while (d < input.timelineEnd) {
      const x = dateToX(d);
      marks.push(line(x, 0, x, input.headerHeight, chart.monthGrid, 1));
      marks.push(
        text(x + 6, 13 * scale, `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月`, 12 * scale, chart.textPrimary, true),
      );
      d = addUtcMonths(d, 1);
    }
  } else {
    const headerBands = nonWorkingDayClipRects(
      input.timelineStart,
      0,
      input.totalDays,
      dateToX,
      input.pxPerDay,
      chartWidth,
      input.calendar,
      input.totalDays,
    );
    for (const band of headerBands) {
      marks.push(
        `<rect x="${n(band.x)}" y="0" width="${n(band.width)}" height="${n(input.headerHeight)}" fill="${chart.nonWorking}"/>`,
      );
    }
    for (let i = 0; i <= input.totalDays; i += 1) {
      const d = addDays(input.timelineStart, i);
      const x = dateToX(d);
      const isMonday = d.getUTCDay() === 1;
      if (input.tier === "day" || isMonday) {
        marks.push(
          line(x, 26 * scale, x, input.headerHeight, isMonday ? chart.gridMonday : chart.gridWeekday, 1),
        );
        marks.push(
          text(x + 2, 24 * scale, fmtShort(d), 10 * scale, isMonday ? chart.textPrimary : chart.textSecondary, isMonday),
        );
      }
      if (d.getUTCDate() === 1) {
        marks.push(
          text(x + 2, 6 * scale, `${d.getUTCMonth() + 1}月`, 11 * scale, chart.textPrimary, true),
        );
      }
    }
  }
  return marks.join("\n  ");
}

function renderMilestones(
  input: ScheduleExportInput,
  chartWidth: number,
  dateToX: (d: Date) => number,
): string {
  if (input.milestoneBandHeight <= 0) return "";
  const { css: c, chart } = palettes(input);
  const top = input.headerHeight;
  const marks = [
    `<rect x="0" y="${n(top)}" width="${n(chartWidth)}" height="${n(input.milestoneBandHeight)}" fill="${c.milestoneBand}"/>`,
    line(0, top + input.milestoneBandHeight - 0.5, chartWidth, top + input.milestoneBandHeight - 0.5, chart.milestoneBandBorder, 1),
  ];
  for (const milestone of input.milestones) {
    const lane = input.milestoneLanes.get(milestone.id) ?? 0;
    const x = dateToX(parseDate(milestone.date));
    const y = top + lane * input.milestoneLaneHeight + input.milestoneLaneHeight / 2;
    const r = input.milestoneDiamondSize / 2;
    const fill =
      milestone.confidence === "tentative"
        ? `url(#${hatchPatternId(chart.milestoneDiamond)})`
        : chart.milestoneDiamond;
    marks.push(
      `<polygon points="${n(x)},${n(y - r)} ${n(x + r)},${n(y)} ${n(x)},${n(y + r)} ${n(x - r)},${n(y)}" fill="${fill}" stroke="${chart.milestoneDiamondStroke}" stroke-width="1"/>`,
    );
    marks.push(
      text(x + r + 5, y - input.milestoneFontSize / 2, milestone.name, input.milestoneFontSize, chart.milestoneDiamond, true),
    );
  }
  return marks.join("\n  ");
}

function renderBody(
  input: ScheduleExportInput,
  chartWidth: number,
  contentHeight: number,
  bodyTop: number,
  dateToX: (d: Date) => number,
): string {
  const { chart } = palettes(input);
  const marks: string[] = [];
  for (const row of input.visibleRows) {
    if (row.type === "task") continue;
    const y = bodyTop + row.y;
    const fill = row.type === "category" ? chart.categoryRow : chart.groupRow;
    marks.push(
      `<rect x="0" y="${n(y)}" width="${n(chartWidth)}" height="${n(input.rowHeight)}" fill="${fill}"/>`,
    );
  }
  if (input.tier !== "month") {
    const bands = nonWorkingDayClipRects(
      input.timelineStart,
      0,
      input.totalDays,
      dateToX,
      input.pxPerDay,
      chartWidth,
      input.calendar,
      input.totalDays,
    );
    for (const band of bands) {
      marks.push(
        `<rect x="${n(band.x)}" y="${n(bodyTop)}" width="${n(band.width)}" height="${n(contentHeight)}" fill="${chart.nonWorking}"/>`,
      );
    }
    for (let i = 0; i <= input.totalDays; i += 1) {
      const d = addDays(input.timelineStart, i);
      const x = dateToX(d);
      const isMonday = d.getUTCDay() === 1;
      if (input.tier === "day" || isMonday) {
        marks.push(
          line(x, bodyTop, x, bodyTop + contentHeight, isMonday ? chart.gridBodyMonday : chart.gridBodyWeekday, 1),
        );
      }
    }
  } else {
    let d = utcMonthStart(input.timelineStart);
    while (d < input.timelineEnd) {
      const x = dateToX(d);
      marks.push(line(x, bodyTop, x, bodyTop + contentHeight, chart.gridMonth, 1));
      d = addUtcMonths(d, 1);
    }
  }
  for (const row of input.visibleRows) {
    const y = bodyTop + row.y + input.rowHeight;
    marks.push(line(0, y, chartWidth, y, chart.rowBorder, 1));
  }
  marks.push(renderLinks(input, bodyTop, dateToX));
  for (const row of input.visibleRows) {
    const y = bodyTop + row.y;
    if (row.type === "task") {
      marks.push(renderTaskBar(row.task, y, input, dateToX));
    } else if (row.summary != null) {
      marks.push(renderSummary(row.summary, y, input, dateToX));
    }
  }
  marks.push(renderLightning(input, bodyTop, contentHeight, dateToX));
  return marks.join("\n  ");
}

function renderLinks(
  input: ScheduleExportInput,
  bodyTop: number,
  dateToX: (d: Date) => number,
): string {
  const { chart } = palettes(input);
  const byId = new Map<
    ScheduleId,
    { x: number; right: number; y: number }
  >();
  for (const row of input.visibleRows) {
    if (row.type !== "task") continue;
    const x = dateToX(parseDate(row.task.start));
    const right = dateToX(taskBarExclusiveEnd(row.task));
    byId.set(row.task.id, {
      x,
      right: Math.max(x + 6, right),
      y: bodyTop + row.y + input.rowHeight / 2,
    });
  }
  return input.links
    .flatMap((link) => {
      const from = byId.get(link.fromId);
      const to = byId.get(link.toId);
      if (!from || !to) return [];
      const color = link.broken ? chart.linkBroken : chart.linkOk;
      const marker = link.broken ? "arrow-broken" : "arrow";
      return [
        `<polyline points="${pairs(linkPoints(from.right, from.y, to.x, to.y, input.barHeight))}" fill="none" stroke="${color}" stroke-width="${link.broken ? 1.75 : 1.25}" marker-end="url(#${marker})"/>`,
      ];
    })
    .join("\n  ");
}

function renderSummary(
  summary: SummarySpan,
  y: number,
  input: ScheduleExportInput,
  dateToX: (d: Date) => number,
): string {
  const { chart } = palettes(input);
  const { x, width } = summaryBarWidthPx(
    summary.start,
    summary.end,
    dateToX,
    6,
  );
  const height = Math.max(4, Math.round(input.barHeight / 2));
  const barY = y + (input.rowHeight - height) / 2;
  const radius = Math.min(3, Math.round(height / 2));
  const parts = [
    `<rect x="${n(x)}" y="${n(barY)}" width="${n(width)}" height="${n(height)}" rx="${radius}" fill="${chart.summaryGap}"/>`,
  ];
  for (const span of summary.covered) {
    const spanX = dateToX(parseDate(span.start));
    const spanW = coveredSpanWidthPx(span.start, span.end, dateToX, 2);
    const atStart = span.start === summary.start;
    const atEnd = span.end === summary.end;
    const radii: [number, number, number, number] =
      atStart && atEnd
        ? [radius, radius, radius, radius]
        : atStart
          ? [radius, 0, 0, radius]
          : atEnd
            ? [0, radius, radius, 0]
            : [0, 0, 0, 0];
    parts.push(
      `<path d="${roundedRect(spanX, barY, spanW, height, radii)}" fill="${chart.summaryCovered}"/>`,
    );
  }
  return parts.join("\n  ");
}

function renderTaskBar(
  task: Task,
  y: number,
  input: ScheduleExportInput,
  dateToX: (d: Date) => number,
): string {
  const { chart } = palettes(input);
  const x = dateToX(parseDate(task.start));
  const w = taskBarWidthPx(task, dateToX, input.pxPerDay);
  const barY = y + (input.rowHeight - input.barHeight) / 2;
  const colors = barColors(task, input.today, input.colorScheme);
  const assigneeDisplay = resolveAssigneeDisplay(
    task.assigneeId,
    input.memberCatalog,
  );
  const unassigned = assigneeDisplay.kind === "unassigned";
  const unknownMember = assigneeDisplay.kind === "unknown";
  const stroke =
    unassigned && !isOverdue(task, input.today)
      ? chart.unassignedStroke
      : unknownMember && !isOverdue(task, input.today)
        ? chart.unknownStroke
        : colors.border;
  const cap = Math.max(2, Math.round(input.barHeight * 0.16));
  const fill =
    task.confidence === "tentative"
      ? `url(#${hatchPatternId(colors.bg)})`
      : colors.bg;
  const parts = [
    `<rect x="${n(x)}" y="${n(barY)}" width="${n(w)}" height="${n(input.barHeight)}" rx="4" fill="${fill}"/>`,
  ];
  if (task.status === "in-progress" && colors.fill && task.progress > 0) {
    parts.push(
      `<rect x="${n(x)}" y="${n(barY)}" width="${n(w * (task.progress / 100))}" height="${n(input.barHeight)}" rx="4" fill="${colors.fill}"/>`,
    );
  }
  parts.push(
    `<rect x="${n(x)}" y="${n(barY)}" width="${n(w)}" height="${n(input.barHeight)}" rx="4" fill="none" stroke="${stroke}" stroke-width="${unassigned || unknownMember ? 1.75 : 1}"${unassigned ? ' stroke-dasharray="5 3"' : unknownMember ? ' stroke-dasharray="2 2"' : ""}/>`,
  );
  if (unassigned) {
    parts.push(
      `<rect x="${n(x)}" y="${n(barY - cap)}" width="${n(w)}" height="${n(cap)}" fill="${chart.unassignedCap}"/>`,
    );
  }
  if (unknownMember) {
    parts.push(
      `<rect x="${n(x)}" y="${n(barY - cap)}" width="${n(w)}" height="${n(cap)}" fill="${chart.unknownCap}"/>`,
    );
  }
  const exceeded = milestonesExceededBy(task, input.milestones);
  if (exceeded[0]) {
    const overrunAt = dateToX(parseDate(exceeded[0].date)) - x;
    if (overrunAt < w) {
      const left = Math.max(0, overrunAt);
      const width = Math.max(2, w - left);
      const radii: [number, number, number, number] =
        overrunAt <= 0 ? [4, 4, 4, 4] : [0, 4, 4, 0];
      parts.push(
        `<path d="${roundedRect(x + left, barY, width, input.barHeight, radii)}" fill="${chart.overrunOverlay}"/>`,
      );
    }
  }
  return parts.join("\n  ");
}

function renderLightning(
  input: ScheduleExportInput,
  bodyTop: number,
  contentHeight: number,
  dateToX: (d: Date) => number,
): string {
  if (contentHeight <= 0) return "";
  const { chart } = palettes(input);
  const todayX = dateToX(parseDate(input.today));
  const points = [todayX, bodyTop];
  for (const row of input.visibleRows) {
    const y = bodyTop + row.y + input.rowHeight / 2;
    const x =
      row.type === "task"
        ? dateToX(parseDate(lightningDate(row.task, input.today)))
        : todayX;
    points.push(x, y);
  }
  points.push(todayX, bodyTop + contentHeight);
  return `<polyline points="${pairs(points)}" fill="none" stroke="${chart.lightning}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
}

function roundedRect(
  x: number,
  y: number,
  w: number,
  h: number,
  [tl, tr, br, bl]: [number, number, number, number],
): string {
  const limit = Math.min(w, h) / 2;
  const a = Math.min(tl, limit);
  const b = Math.min(tr, limit);
  const c = Math.min(br, limit);
  const d = Math.min(bl, limit);
  return [
    `M${n(x + a)},${n(y)}`,
    `H${n(x + w - b)}`,
    `A${n(b)},${n(b)} 0 0 1 ${n(x + w)},${n(y + b)}`,
    `V${n(y + h - c)}`,
    `A${n(c)},${n(c)} 0 0 1 ${n(x + w - c)},${n(y + h)}`,
    `H${n(x + d)}`,
    `A${n(d)},${n(d)} 0 0 1 ${n(x)},${n(y + h - d)}`,
    `V${n(y + a)}`,
    `A${n(a)},${n(a)} 0 0 1 ${n(x + a)},${n(y)}`,
    "Z",
  ].join(" ");
}

function line(x1: number, y1: number, x2: number, y2: number, stroke: string, width: number): string {
  return `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${stroke}" stroke-width="${width}"/>`;
}

function text(
  x: number,
  y: number,
  value: string,
  size: number,
  fill: string,
  bold: boolean,
): string {
  return `<text x="${n(x)}" y="${n(y)}" font-size="${n(size)}" font-weight="${bold ? 700 : 400}" fill="${fill}" dominant-baseline="hanging">${esc(value)}</text>`;
}

function pairs(points: number[]): string {
  const out: string[] = [];
  for (let i = 0; i < points.length; i += 2) {
    out.push(`${n(points[i])},${n(points[i + 1])}`);
  }
  return out.join(" ");
}

function n(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function px(value: number, scale: number): string {
  return `${Math.round(value * scale)}px`;
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
