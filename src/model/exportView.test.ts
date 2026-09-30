import { describe, expect, it } from "vitest";
import { isoDate } from "./dates";
import {
  describeActiveFilters,
  exportTimelineRange,
  milestonesForExport,
} from "./exportView";
import { NO_MILESTONE_FILTER, type Milestone, type ScheduleFilters, type Task, type VisibleRow } from "./types";

const filters: ScheduleFilters = {
  assignee: "all",
  status: "all",
  confidence: "all",
  overdue: "all",
  relation: "all",
  milestone: "all",
  search: "",
  noteSearch: "",
};

const task = (patch: Partial<Task>): Task => ({
  id: "00000000-0000-4000-8000-000000000001",
  name: "Alpha",
  start: "2026-04-01",
  end: "2026-04-10",
  assigneeId: null,
  status: "not-started",
  progress: 0,
  confidence: "committed",
  predecessors: [],
  milestoneId: null,
  ...patch,
});

const row = (item: Task, y = 32): VisibleRow => ({ type: "task", task: item, y });

const near: Milestone = {
  id: "00000000-0000-4000-8000-000000000010",
  name: "近い",
  date: "2026-04-05",
  confidence: "committed",
};
const far: Milestone = {
  id: "00000000-0000-4000-8000-000000000011",
  name: "遠い",
  date: "2027-01-01",
  confidence: "tentative",
};
const linked: Milestone = {
  id: "00000000-0000-4000-8000-000000000012",
  name: "対応",
  date: "2026-03-01",
  confidence: "committed",
};

describe("milestonesForExport", () => {
  it("keeps milestones inside the visible span and referenced ones outside it", () => {
    const visible = [
      row(task({ milestoneId: linked.id })),
    ];
    const picked = milestonesForExport("all", [near, far, linked], visible);
    expect(picked.map((item) => item.id)).toEqual([near.id, linked.id]);
  });

  it("keeps only the selected milestone", () => {
    const picked = milestonesForExport(far.id, [near, far], [row(task({}))]);
    expect(picked).toEqual([far]);
  });

  it("drops milestones when the filter is none", () => {
    expect(
      milestonesForExport(NO_MILESTONE_FILTER, [near], [row(task({}))]),
    ).toEqual([]);
  });
});

describe("exportTimelineRange", () => {
  it("spans the visible tasks and exported milestones, not hidden dates", () => {
    const visible = [row(task({}))];
    const range = exportTimelineRange(visible, [linked], "2026-04-08");
    expect(isoDate(range.timelineStart)).toBe("2026-02-23");
    expect(isoDate(range.timelineEnd)).toBe("2026-04-17");
  });
});

describe("describeActiveFilters", () => {
  it("returns empty text when every filter is the default", () => {
    expect(describeActiveFilters(filters, [near], null)).toBe("");
  });

  it("lists only the filters that are on", () => {
    expect(
      describeActiveFilters(
        {
          ...filters,
          status: "in-progress",
          confidence: "tentative",
          search: "設計",
          milestone: near.id,
        },
        [near],
        null,
      ),
    ).toBe(
      "ステータス: 進行中、確度: 未確定、マイルストン: 近い（2026-04-05）、タスク名: 「設計」",
    );
  });
});
