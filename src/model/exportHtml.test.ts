import { describe, expect, it } from "vitest";
import { buildScheduleHtml, buildScheduleSvg, type ScheduleExportInput } from "./exportHtml";
import type { Task } from "./types";

const task: Task = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "見えるタスク",
  start: "2026-04-01",
  end: "2026-04-03",
  assigneeId: null,
  status: "in-progress",
  progress: 40,
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
  };
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
