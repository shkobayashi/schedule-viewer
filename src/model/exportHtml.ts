import { invoke, isTauri } from "@tauri-apps/api/core";
import { scheduleHtmlFilename } from "./exportFilename";
import { addDays, addUtcMonths, daysBetween, fmtShort, parseDate, utcMonthStart } from "./dates";
import { LAYOUT_HEADER_HEIGHT } from "./layoutSizes";
import { linkPoints, type DependencyLink } from "./dependencies";
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
import type { Member, MemberId } from "./memberTypes";
import type { Milestone, ScheduleId, Task, VisibleRow } from "./types";

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
};

const SUMMARY_COVERED = "#5C6B82";
const SUMMARY_GAP = "#D5DBE3";

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
const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Kaku Gothic ProN', sans-serif";

export function scheduleExportFilename(title: string): string {
  return scheduleHtmlFilename(title);
}

export function buildScheduleHtml(input: ScheduleExportInput): string {
  assertExportFits(input);
  const chartWidth = Math.max(input.pxPerDay, input.totalDays * input.pxPerDay);
  const contentHeight = input.visibleRows.reduce(
    (max, row) => Math.max(max, row.y + input.rowHeight),
    0,
  );
  const bodyTop = input.headerHeight + input.milestoneBandHeight;
  const svgHeight = bodyTop + contentHeight;
  const dateToX = (d: Date) => daysBetween(input.timelineStart, d) * input.pxPerDay;
  const parts = [
    renderHeader(input, chartWidth, dateToX),
    renderMilestones(input, chartWidth, dateToX),
    renderBody(input, chartWidth, contentHeight, bodyTop, dateToX),
  ];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${n(chartWidth)}" height="${n(svgHeight)}" font-family="${FONT}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <defs>
    <marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
      <path d="M0,0 L7,3.5 L0,7 Z" fill="#8A94A6"/>
    </marker>
    <marker id="arrow-broken" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
      <path d="M0,0 L7,3.5 L0,7 Z" fill="#C4351A"/>
    </marker>
  </defs>
  ${parts.join("\n  ")}
</svg>`;
  const lineage = input.lineageName
    ? `系統「${esc(input.lineageName)}」。`
    : "";
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>${esc(input.title)}</title>
<style>
  body { margin: 0; background: #fff; color: #1f2937; font-family: ${FONT}; }
  .page { padding: 16px 20px 32px; }
  h1 { font-size: 16px; font-weight: 600; margin: 0 0 4px; }
  .meta { color: #697586; font-size: 12px; margin: 0 0 12px; }
  .sheet { display: flex; align-items: flex-start; border: 1px solid #e3e6eb; width: max-content; }
  .labels { flex: 0 0 auto; background: #fff; }
  .label { box-sizing: border-box; display: flex; align-items: center; white-space: nowrap; border-bottom: 1px solid #f0f1f4; }
  .label.header { color: #697586; font-weight: 600; background: #f8f9fb; border-bottom-color: #e3e6eb; padding: 0 ${px(12, input.labelScale)}; font-size: ${px(11, input.labelScale)}; }
  .label.milestones { background: #f4f1ea; color: #111827; font-weight: 700; border-bottom-color: #e3e6eb; padding: 0 ${px(12, input.labelScale)}; font-size: ${px(11, input.labelScale)}; }
  .label.category { background: #f8f9fb; font-weight: 600; padding-left: ${px(6, input.labelScale)}; font-size: ${px(12, input.labelScale)}; }
  .label.group { background: #f3f5f8; font-weight: 600; color: #4b5568; padding-left: ${px(22, input.labelScale)}; font-size: ${px(12, input.labelScale)}; }
  .label.task { padding-left: ${px(44, input.labelScale)}; font-size: ${px(12, input.labelScale)}; }
  .label.task.unassigned { box-shadow: inset 3px 0 0 #d4920a; }
  .twist { width: ${px(16, input.labelScale)}; margin-right: ${px(4, input.labelScale)}; color: #6b7280; font-size: ${px(9, input.labelScale)}; }
  .name.overdue { color: #c4351a; font-weight: 600; }
  .alert { margin-left: 6px; color: #c4351a; background: #fde8e4; border-radius: 999px; padding: 1px 6px; font-size: ${px(10, input.labelScale)}; font-weight: 700; }
  .assignee { margin-left: 16px; color: #697586; font-size: ${px(10, input.labelScale)}; padding-right: 12px; }
  .assignee.unassigned { color: #8a5a00; background: #fff4d6; border-radius: 999px; padding: 1px 7px; font-weight: 700; }
  .assignee.unknown-member { color: #5b3f91; background: #efe8fb; border-radius: 999px; padding: 1px 7px; font-weight: 700; }
  .label.task.unknown-member { box-shadow: inset 3px 0 0 #7b5ea7; }
</style>
</head>
<body>
  <div class="page">
    <h1>${esc(input.title)}</h1>
    <p class="meta">${esc(input.tierLabel)}。絞り込み・折りたたみで見えている行です。${lineage}本日は ${esc(input.today)}。</p>
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

function downloadScheduleHtmlInBrowser(html: string, title: string): void {
  const blob = new Blob([html], {
    type: "text/html;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = scheduleExportFilename(title);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Tauri では保存ダイアログ、ブラウザではダウンロード。キャンセル時は null。 */
export async function exportScheduleHtml(
  input: ScheduleExportInput,
): Promise<string | null> {
  const html = buildScheduleHtml(input);
  const suggestedName = scheduleExportFilename(input.title);
  if (isTauri()) {
    return invoke<string | null>("save_html_file", {
      contents: html,
      suggestedName,
    });
  }
  downloadScheduleHtmlInBrowser(html, input.title);
  return null;
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
  return `<div class="label task${extraClass}" ${height}><span class="name${overdue ? " overdue" : ""}">${esc(row.task.name)}</span>${alert}<span class="assignee${extraClass}">${esc(assignee)}</span></div>`;
}

function renderHeader(
  input: ScheduleExportInput,
  chartWidth: number,
  dateToX: (d: Date) => number,
): string {
  const scale = input.headerHeight / LAYOUT_HEADER_HEIGHT;
  const marks: string[] = [
    line(0, input.headerHeight - 0.5, chartWidth, input.headerHeight - 0.5, "#E3E6EB", 1),
  ];
  if (input.tier === "month") {
    let d = utcMonthStart(input.timelineStart);
    while (d < input.timelineEnd) {
      const x = dateToX(d);
      marks.push(line(x, 0, x, input.headerHeight, "#C7CCD6", 1));
      marks.push(
        text(x + 6, 13 * scale, `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月`, 12 * scale, "#1F2937", true),
      );
      d = addUtcMonths(d, 1);
    }
  } else {
    for (let i = 0; i <= input.totalDays; i += 1) {
      const d = addDays(input.timelineStart, i);
      const x = dateToX(d);
      const isMonday = d.getUTCDay() === 1;
      if (input.tier === "day" || isMonday) {
        marks.push(
          line(x, 26 * scale, x, input.headerHeight, isMonday ? "#9AA5B4" : "#E3E6EB", 1),
        );
        marks.push(
          text(x + 2, 24 * scale, fmtShort(d), 10 * scale, isMonday ? "#1F2937" : "#8A94A6", isMonday),
        );
      }
      if (d.getUTCDate() === 1) {
        marks.push(
          text(x + 2, 6 * scale, `${d.getUTCMonth() + 1}月`, 11 * scale, "#1F2937", true),
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
  const top = input.headerHeight;
  const marks = [
    `<rect x="0" y="${n(top)}" width="${n(chartWidth)}" height="${n(input.milestoneBandHeight)}" fill="#fbf9f4"/>`,
    line(0, top + input.milestoneBandHeight - 0.5, chartWidth, top + input.milestoneBandHeight - 0.5, "#E3E6EB", 1),
  ];
  for (const milestone of input.milestones) {
    const lane = input.milestoneLanes.get(milestone.id) ?? 0;
    const x = dateToX(parseDate(milestone.date));
    const y = top + lane * input.milestoneLaneHeight + input.milestoneLaneHeight / 2;
    const r = input.milestoneDiamondSize / 2;
    marks.push(
      `<polygon points="${n(x)},${n(y - r)} ${n(x + r)},${n(y)} ${n(x)},${n(y + r)} ${n(x - r)},${n(y)}" fill="#111827" stroke="#ffffff" stroke-width="1"/>`,
    );
    marks.push(
      text(x + r + 5, y - input.milestoneFontSize / 2, milestone.name, input.milestoneFontSize, "#111827", true),
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
  const marks: string[] = [];
  for (const row of input.visibleRows) {
    if (row.type === "task") continue;
    const y = bodyTop + row.y;
    const fill = row.type === "category" ? "#F8F9FB" : "#F3F5F8";
    marks.push(
      `<rect x="0" y="${n(y)}" width="${n(chartWidth)}" height="${n(input.rowHeight)}" fill="${fill}"/>`,
    );
  }
  if (input.tier !== "month") {
    for (let i = 0; i <= input.totalDays; i += 1) {
      const d = addDays(input.timelineStart, i);
      const dow = d.getUTCDay();
      const x = dateToX(d);
      let clipX = 0;
      let clipW = 0;
      if (dow === 6) {
        const spanRight = x + input.pxPerDay * 2;
        clipX = Math.max(0, x);
        clipW = Math.min(chartWidth, spanRight) - clipX;
      } else if (dow === 0 && addDays(d, -1) < input.timelineStart) {
        clipX = Math.max(0, x);
        clipW = Math.min(chartWidth, x + input.pxPerDay) - clipX;
      }
      if (clipW > 0) {
        marks.push(
          `<rect x="${n(clipX)}" y="${n(bodyTop)}" width="${n(clipW)}" height="${n(contentHeight)}" fill="#F4F5F8"/>`,
        );
      }
    }
    for (let i = 0; i <= input.totalDays; i += 1) {
      const d = addDays(input.timelineStart, i);
      const x = dateToX(d);
      const isMonday = d.getUTCDay() === 1;
      if (input.tier === "day" || isMonday) {
        marks.push(
          line(x, bodyTop, x, bodyTop + contentHeight, isMonday ? "#D8DCE3" : "#EDEFF3", 1),
        );
      }
    }
  } else {
    let d = utcMonthStart(input.timelineStart);
    while (d < input.timelineEnd) {
      const x = dateToX(d);
      marks.push(line(x, bodyTop, x, bodyTop + contentHeight, "#DDE1E7", 1));
      d = addUtcMonths(d, 1);
    }
  }
  for (const row of input.visibleRows) {
    const y = bodyTop + row.y + input.rowHeight;
    marks.push(line(0, y, chartWidth, y, "#F0F1F4", 1));
  }
  marks.push(renderLinks(input, bodyTop, dateToX));
  for (const row of input.visibleRows) {
    const y = bodyTop + row.y;
    if (row.type === "task") {
      marks.push(renderTaskBar(row.task, y, input, dateToX));
    } else {
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
      const color = link.broken ? "#C4351A" : "#8A94A6";
      const marker = link.broken ? "arrow-broken" : "arrow";
      return [
        `<polyline points="${pairs(linkPoints(from.right, from.y, to.x, to.y))}" fill="none" stroke="${color}" stroke-width="${link.broken ? 1.75 : 1.25}" marker-end="url(#${marker})"/>`,
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
    `<rect x="${n(x)}" y="${n(barY)}" width="${n(width)}" height="${n(height)}" rx="${radius}" fill="${SUMMARY_GAP}"/>`,
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
      `<path d="${roundedRect(spanX, barY, spanW, height, radii)}" fill="${SUMMARY_COVERED}"/>`,
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
  const x = dateToX(parseDate(task.start));
  const w = taskBarWidthPx(task, dateToX, input.pxPerDay);
  const barY = y + (input.rowHeight - input.barHeight) / 2;
  const colors = barColors(task, input.today);
  const assigneeDisplay = resolveAssigneeDisplay(
    task.assigneeId,
    input.memberCatalog,
  );
  const unassigned = assigneeDisplay.kind === "unassigned";
  const unknownMember = assigneeDisplay.kind === "unknown";
  const stroke =
    unassigned && !isOverdue(task, input.today)
      ? "#C48A1A"
      : unknownMember && !isOverdue(task, input.today)
        ? "#7B5EA7"
        : colors.border;
  const cap = Math.max(2, Math.round(input.barHeight * 0.16));
  const parts = [
    `<rect x="${n(x)}" y="${n(barY)}" width="${n(w)}" height="${n(input.barHeight)}" rx="4" fill="${colors.bg}"/>`,
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
      `<rect x="${n(x)}" y="${n(barY - cap)}" width="${n(w)}" height="${n(cap)}" fill="#E0A020"/>`,
    );
  }
  if (unknownMember) {
    parts.push(
      `<rect x="${n(x)}" y="${n(barY - cap)}" width="${n(w)}" height="${n(cap)}" fill="#7B5EA7"/>`,
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
        `<path d="${roundedRect(x + left, barY, width, input.barHeight, radii)}" fill="rgba(196, 53, 26, 0.45)"/>`,
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
  return `<polyline points="${pairs(points)}" fill="none" stroke="#E07B20" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
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
