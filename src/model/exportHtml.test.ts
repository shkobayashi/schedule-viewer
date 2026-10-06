import { describe, expect, it } from "vitest";
import { buildScheduleHtml, buildScheduleSvg, type ScheduleExportInput } from "./exportHtml";
import { hatchPatternId, hatchStripeColor } from "./hatch";
import type { Task } from "./types";

const task: Task = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "見えるタスク",
  start: "2026-04-01",
  end: "2026-04-03",
  assigneeId: null,
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
    milestoneLanes: new Map(),
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

  it("hatches tentative bars and labels them, and leaves committed bars solid", () => {
    const milestoneId = "00000000-0000-4000-8000-000000000010";
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
        },
      ],
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

  it("hatches a tentative milestone and leaves a committed one solid", () => {
    const committedId = "00000000-0000-4000-8000-000000000010";
    const tentativeId = "00000000-0000-4000-8000-000000000011";
    const svg = buildScheduleSvg({
      ...input(),
      milestoneBandHeight: 26,
      milestones: [
        {
          id: committedId,
          name: "確定",
          date: "2026-04-01",
          confidence: "committed" as const,
        },
        {
          id: tentativeId,
          name: "未確定",
          date: "2026-04-03",
          confidence: "tentative" as const,
        },
      ],
      milestoneLanes: new Map([
        [committedId, 0],
        [tentativeId, 0],
      ]),
    });
    expect(svg).toContain('fill="#111827"');
    expect(svg).toContain(`fill="url(#${hatchPatternId("#111827")})"`);
    expect(svg).toContain("<pattern ");
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
});
