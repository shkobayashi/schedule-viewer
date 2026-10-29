import { describe, expect, it } from "vitest";
import {
  buildScheduleHtml,
  buildScheduleSvg,
  exportChartRowFill,
  type ScheduleExportInput,
} from "./exportHtml";
import { paletteFor } from "./palette";
import type { VisibleRow } from "./types";
import { layoutMilestoneBand, milestoneMarkGuideGeometry } from "./milestones";
import { hatchPatternId, hatchStripeColor } from "./hatch";
import {
  MONTH_HEADER_LABEL_GAP_BASE_PX,
  monthHeaderLabelWidth,
} from "./monthHeader";
import { LAYOUT_HEADER_HEIGHT } from "./layoutSizes";
import { daysBetween, parseDate } from "./dates";
import type { Task } from "./types";

const task: Task = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "見えるタスク",
  start: "2026-04-01",
  end: "2026-04-03",
  assigneeIds: [],
  status: "in-progress",
  progress: 40,
  confidence: "committed",
  predecessors: [],
  milestoneId: null,
  note: "補足",
};

function input(): ScheduleExportInput {
  const timelineStart = new Date(Date.UTC(2026, 2, 26));
  const timelineEnd = new Date(Date.UTC(2026, 3, 10));
  return {
    title: "検証",
    tierLabel: "日表示",
    lineageName: null,
    visibleRows: [{ type: "task", task, y: 0 }],
    milestones: [],
    milestoneBandLayout: layoutMilestoneBand(
      [],
      [],
      new Set(),
      22,
      11,
      11,
      26,
      "export",
    ),
    links: [],
    timelineStart,
    timelineEnd,
    totalDays: 15,
    pxPerDay: 22,
    tier: "week",
    headerHeight: 40,
    rowHeight: 32,
    barHeight: 20,
    milestoneBandHeight: 0,
    milestoneLaneHeight: 26,
    milestoneDiamondSize: 11,
    milestoneFontSize: 11,
    labelScale: 1,
    today: "2026-04-02",
    memberCatalog: null,
    calendar: null,
    filterSummary: "ステータス: 進行中",
    colorScheme: "light",
    showLightningLine: true,
    milestoneGuideLineIds: new Set(),
  };
}

function labelColumnWidth(svg: string): number {
  const match = /transform="translate\(([0-9.]+),0\)"/.exec(svg);
  if (!match) throw new Error("chart translate missing");
  return Number(match[1]);
}

function widestLabelRect(svg: string): number {
  const chartAt = svg.search(/transform="translate\([0-9.]+,0\)"/);
  const labels = svg.slice(0, chartAt);
  let right = 0;
  for (const match of labels.matchAll(
    /<rect x="([0-9.]+)"[^>]* width="([0-9.]+)"/g,
  )) {
    right = Math.max(right, Number(match[1]) + Number(match[2]));
  }
  return right;
}

describe("schedule export documents", () => {
  it("puts the active filter into HTML and SVG", () => {
    const html = buildScheduleHtml(input());
    const svg = buildScheduleSvg(input());
    expect(html).toContain("絞り込み（ステータス: 進行中）");
    expect(html).toContain("見えるタスク");
    expect(html).toContain('fill="#ffffff"');
    expect(html).toContain("inset 3px 0 0 #7B5EA7");
    expect(svg).toContain("絞り込み（ステータス: 進行中）");
    expect(svg).toContain("見えるタスク");
    expect(svg.startsWith("<svg ")).toBe(true);
    expect(html).not.toContain("<pattern ");
    expect(svg).not.toContain("<pattern ");
  });

  it("escapes font-family in SVG attributes but not in HTML CSS", () => {
    const html = buildScheduleHtml(input());
    const svg = buildScheduleSvg(input());
    const escapedAttr =
      'font-family="system-ui, -apple-system, &quot;Segoe UI&quot;, &quot;Hiragino Sans&quot;, &quot;Yu Gothic UI&quot;, Meiryo, &quot;Noto Sans CJK JP&quot;, sans-serif"';
    expect(svg).toContain(escapedAttr);
    expect(html).toContain(escapedAttr);
    expect(html).toContain('font-family: system-ui, -apple-system, "Segoe UI"');
    expect(svg).not.toMatch(/font-family="[^"]*"[^>]*Segoe UI/);
  });

  it("hatches tentative bars and labels them, and leaves committed bars solid", () => {
    const milestoneId = "00000000-0000-4000-8000-000000000010";
    const groupId = "e1000001-0000-4000-8000-000000000001";
    const tentative: Task = {
      ...task,
      id: "00000000-0000-4000-8000-000000000002",
      name: "未確定タスク",
      confidence: "tentative",
      milestoneId,
    };
    const both = {
      ...input(),
      milestones: [
        {
          id: milestoneId,
          name: "要件",
          date: "2026-04-01",
          confidence: "committed" as const,
          groupId,
        },
      ],
      milestoneBandLayout: layoutMilestoneBand(
        [{ id: groupId, name: "G" }],
        [
          {
            id: milestoneId,
            name: "要件",
            date: "2026-04-01",
            confidence: "committed",
            groupId,
          },
        ],
        new Set([groupId]),
        22,
        11,
        11,
        26,
        "export",
      ),
      milestoneBandHeight: 26,
      visibleRows: [
        { type: "task" as const, task, y: 0 },
        { type: "task" as const, task: tentative, y: 32 },
      ],
    };
    const html = buildScheduleHtml(both);
    const svg = buildScheduleSvg(both);
    expect(html).toContain("未確定");
    expect(html).toContain("<pattern ");
    expect(svg).toContain("未確定");
    expect(svg).toContain("<pattern ");
    expect(svg).toContain('rx="4" fill="#DEE3FB"');
    expect(svg).toContain('rx="4" fill="url(#hatch-dee3fb)"');
    const light = hatchStripeColor("#DEE3FB", "light");
    const dark = hatchStripeColor("#DEE3FB", "dark");
    expect(html).toContain('fill="#DEE3FB"');
    expect(html).toContain('fill="url(#hatch-dee3fb)"');
    expect(html).toContain(`stroke="${light}"`);
    expect(Number.parseInt(light.slice(1), 16)).toBeLessThan(
      Number.parseInt("DEE3FB", 16),
    );
    expect(Number.parseInt(dark.slice(1), 16)).toBeGreaterThan(
      Number.parseInt("DEE3FB", 16),
    );
    const column = labelColumnWidth(svg);
    expect(widestLabelRect(svg)).toBeLessThanOrEqual(column);
    const solid = buildScheduleSvg({
      ...both,
      visibleRows: both.visibleRows.map((row) =>
        row.type === "task"
          ? { ...row, task: { ...row.task, confidence: "committed" as const } }
          : row,
      ),
    });
    expect(column).toBeGreaterThan(labelColumnWidth(solid));
  });

  it("renders a hollow tentative milestone and a solid committed one", () => {
    const committedId = "00000000-0000-4000-8000-000000000010";
    const tentativeId = "00000000-0000-4000-8000-000000000011";
    const groupId = "e1000001-0000-4000-8000-000000000001";
    const milestones = [
      {
        id: committedId,
        name: "確定",
        date: "2026-04-01",
        confidence: "committed" as const,
        groupId,
      },
      {
        id: tentativeId,
        name: "未確定",
        date: "2026-04-03",
        confidence: "tentative" as const,
        groupId,
      },
    ];
    const svg = buildScheduleSvg({
      ...input(),
      milestoneBandHeight: 26,
      milestones,
      milestoneBandLayout: layoutMilestoneBand(
        [{ id: groupId, name: "G" }],
        milestones,
        new Set([groupId]),
        22,
        11,
        11,
        26,
        "export",
      ),
    });
    expect(svg).toContain('fill="#111827"');
    expect(svg).toContain('fill="none"');
    expect(svg).not.toContain(`fill="url(#${hatchPatternId("#111827")})"`);
  });

  it("draws guide lines only for milestones in milestoneGuideLineIds", () => {
    const milestoneId = "00000000-0000-4000-8000-000000000010";
    const offId = "00000000-0000-4000-8000-000000000011";
    const groupId = "e1000001-0000-4000-8000-000000000001";
    const milestones = [
      {
        id: milestoneId,
        name: "オン",
        date: "2026-04-01",
        confidence: "committed" as const,
        groupId,
      },
      {
        id: offId,
        name: "オフ",
        date: "2026-04-03",
        confidence: "committed" as const,
        groupId,
      },
    ];
    const bandLayout = layoutMilestoneBand(
      [{ id: groupId, name: "G" }],
      milestones,
      new Set([groupId]),
      22,
      11,
      11,
      26,
      "export",
    );
    const base = input();
    const headerHeight = 40;
    const bandHeight = 26;
    const laneCenterY = 13;
    const guide = milestoneMarkGuideGeometry(
      11,
      11,
      "オン",
      laneCenterY,
      0,
      bandHeight,
    );
    const timelineStart = base.timelineStart;
    const onX =
      daysBetween(timelineStart, parseDate("2026-04-01")) * base.pxPerDay;
    const offX =
      daysBetween(timelineStart, parseDate("2026-04-03")) * base.pxPerDay;
    const centerY = headerHeight + laneCenterY;
    const bandBottomY = centerY + guide.bandVerticalY2;
    const bandVertical = `<line x1="${onX}" y1="${centerY}" x2="${onX}" y2="${bandBottomY}" stroke="#697586" stroke-width="1" stroke-dasharray="4 3"/>`;
    const withGuide = buildScheduleSvg({
      ...base,
      milestoneBandHeight: bandHeight,
      milestones,
      milestoneBandLayout: bandLayout,
      milestoneGuideLineIds: new Set([milestoneId]),
    });
    const withoutGuide = buildScheduleSvg({
      ...base,
      milestoneBandHeight: bandHeight,
      milestones,
      milestoneBandLayout: bandLayout,
      milestoneGuideLineIds: new Set(),
    });
    expect(withGuide).toContain(bandVertical);
    expect(withoutGuide).not.toContain(bandVertical);
    expect(withGuide).not.toMatch(
      new RegExp(
        `<line x1="${offX}" y1="${centerY}" x2="${offX}" y2="${bandBottomY}"`,
      ),
    );
  });

  it("draws the overrun frame when that milestone is left off the band", () => {
    const milestoneId = "00000000-0000-4000-8000-000000000010";
    const linked: Task = {
      ...task,
      end: "2026-04-10",
      milestoneId,
    };
    const svg = buildScheduleSvg({
      ...input(),
      milestones: [
        {
          id: milestoneId,
          name: "隠した線",
          date: "2026-04-01",
          confidence: "committed",
          groupId: "e1000001-0000-4000-8000-000000000001",
        },
      ],
      visibleRows: [{ type: "task", task: linked, y: 0 }],
    });
    expect(svg).toContain("超過");
    expect(svg).toContain('stroke="#C4351A"');
    expect(svg).not.toContain("隠した線");
  });

  it("omits overlapping month header labels in month export but keeps grid lines", () => {
    const timelineStart = new Date(Date.UTC(2026, 5, 1));
    const timelineEnd = new Date(Date.UTC(2026, 8, 1));
    const julyStart = new Date(Date.UTC(2026, 6, 1));
    const augustStart = new Date(Date.UTC(2026, 7, 1));
    const headerHeight = 40;
    const scale = headerHeight / LAYOUT_HEADER_HEIGHT;
    const monthFontSize = 12 * scale;
    const gapPx = MONTH_HEADER_LABEL_GAP_BASE_PX * scale;
    const junWidth = monthHeaderLabelWidth("2026年6月", monthFontSize);
    const minPxPerDay =
      (6 + junWidth + gapPx - 6) / daysBetween(timelineStart, augustStart);
    const maxPxPerDay =
      (6 + junWidth + gapPx - 6) / daysBetween(timelineStart, julyStart);
    const tightPxPerDay = (minPxPerDay + maxPxPerDay) / 2;
    const base = {
      ...input(),
      tier: "month" as const,
      tierLabel: "月表示",
      timelineStart,
      timelineEnd,
      totalDays: 92,
      headerHeight,
      visibleRows: [],
      milestones: [],
      milestoneBandHeight: 0,
      milestoneBandLayout: layoutMilestoneBand(
        [],
        [],
        new Set(),
        3,
        11,
        11,
        26,
        "export",
      ),
    };
    const monthLabels = (svg: string) =>
      [...svg.matchAll(/>(\d{4}年\d{1,2}月)</g)].map((match) => match[1]);
    const verticalGridLines = (svg: string) =>
      [...svg.matchAll(/<line x1="([0-9.]+)" y1="0" x2="[0-9.]+" y2="[0-9.]+"/g)].map(
        (match) => Number(match[1]),
      );
    const wide = buildScheduleSvg({ ...base, pxPerDay: 40 });
    const tight = buildScheduleSvg({ ...base, pxPerDay: tightPxPerDay });
    expect(monthLabels(wide)).toEqual(["2026年6月", "2026年7月", "2026年8月"]);
    expect(monthLabels(tight)).toEqual(["2026年6月", "2026年8月"]);
    const julyGridX =
      daysBetween(timelineStart, julyStart) * tightPxPerDay;
    const lines = verticalGridLines(tight);
    expect(lines).toContain(0);
    expect(lines).toContain(Math.round(julyGridX * 100) / 100);
  });

  it("uses dark palette when colorScheme is dark", () => {
    const dark = buildScheduleHtml({ ...input(), colorScheme: "dark" });
    expect(dark).toContain("background: #1c1f26");
    expect(dark).toContain('fill="#1c1f26"');
    expect(dark).toContain("inset 3px 0 0 #a888d8");
    const svg = buildScheduleSvg({ ...input(), colorScheme: "dark" });
    expect(svg).toContain('fill="#1c1f26"');
    expect(svg).toContain('fill="#a8b0bf"');
  });

  it("fills hierarchy chart rows like the sidebar", () => {
    const { chart, css } = paletteFor("light");
    const summary = {
      start: "2026-04-01",
      end: "2026-04-03",
      covered: [{ start: "2026-04-01", end: "2026-04-03" }],
    };
    const top: VisibleRow = {
      type: "hierarchy",
      id: "h0",
      label: "工程",
      y: 0,
      collapsed: false,
      summary,
      rollupPercent: 10,
      levelIndex: 0,
      depth: 0,
      rowKind: "top",
      ancestorIds: [],
    };
    const middle: VisibleRow = {
      type: "hierarchy",
      id: "h1",
      label: "機能",
      y: 32,
      collapsed: false,
      summary: null,
      rollupPercent: null,
      levelIndex: 1,
      depth: 1,
      rowKind: "middle",
      ancestorIds: ["h0"],
    };
    const parent: VisibleRow = {
      type: "hierarchy",
      id: "h2",
      label: "作業",
      y: 64,
      collapsed: false,
      summary,
      rollupPercent: 20,
      levelIndex: 2,
      depth: 2,
      rowKind: "taskParent",
      ancestorIds: ["h0", "h1"],
    };
    expect(exportChartRowFill(top, chart, css.bg, null, "light")).toBe(chart.categoryRow);
    expect(exportChartRowFill(middle, chart, css.bg, null, "light")).toBe(css.bg);
    expect(exportChartRowFill(parent, chart, css.bg, null, "light")).toBe(chart.groupRow);

    const svg = buildScheduleSvg({
      ...input(),
      visibleRows: [top, middle, parent, { type: "task", task, y: 96 }],
    });
    expect(svg).toContain(`fill="${chart.categoryRow}"`);
    expect(svg).toContain(`fill="${chart.groupRow}"`);
    expect(svg).toContain(`fill="${css.bg}"`);
  });

  it("paints task row background from colors catalog in SVG", () => {
    const colored: Task = { ...task, colorId: "focus" };
    const exp = {
      ...input(),
      visibleRows: [{ type: "task" as const, task: colored, y: 0 }],
      colors: [
        {
          id: "focus",
          name: "注力",
          description: "x",
          color: {
            light: { bg: "#FEF3C7" },
            dark: { bg: "#78350F" },
          },
        },
      ],
    };
    const svg = buildScheduleSvg(exp);
    expect(svg).toContain('fill="#FEF3C7"');
  });

  it("omits fieldValues from HTML and SVG export", () => {
    const marker = "追加項目の値は書き出さない";
    const taskWithFields: Task = {
      ...task,
      fieldValues: { demo_score: 42, demo_memo: marker },
    };
    const exp = {
      ...input(),
      visibleRows: [{ type: "task" as const, task: taskWithFields, y: 0 }],
    };
    const html = buildScheduleHtml(exp);
    const svg = buildScheduleSvg(exp);
    expect(html).not.toContain(marker);
    expect(html).not.toContain("demo_score");
    expect(svg).not.toContain(marker);
    expect(svg).not.toContain("demo_score");
  });
});
