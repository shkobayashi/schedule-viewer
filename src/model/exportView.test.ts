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
  tag: "",
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

const GRP = "e1000001-0000-4000-8000-000000000001";
const groups = [{ id: GRP, name: "G" }];
const allGroups = new Set([GRP]);

const near: Milestone = {
  id: "00000000-0000-4000-8000-000000000010",
  name: "近い",
  date: "2026-04-05",
  confidence: "committed",
  groupId: GRP,
};
const far: Milestone = {
  id: "00000000-0000-4000-8000-000000000011",
  name: "遠い",
  date: "2027-01-01",
  confidence: "tentative",
  groupId: GRP,
};
const linked: Milestone = {
  id: "00000000-0000-4000-8000-000000000012",
  name: "対応",
  date: "2026-03-01",
  confidence: "committed",
  groupId: GRP,
};

describe("milestonesForExport", () => {
  it("keeps milestones inside the visible span and referenced ones outside it", () => {
    const visible = [
      row(task({ milestoneId: linked.id })),
    ];
    const picked = milestonesForExport(
      "all",
      groups,
      allGroups,
      [near, far, linked],
      visible,
    );
    expect(picked.map((item) => item.id)).toEqual([near.id, linked.id]);
  });

  it("keeps only the selected milestone", () => {
    const picked = milestonesForExport(
      far.id,
      groups,
      allGroups,
      [near, far],
      [row(task({}))],
    );
    expect(picked).toEqual([far]);
  });

  it("drops a hidden group's milestone from the lines and the range", () => {
    const hiddenGroup = "e1000001-0000-4000-8000-000000000002";
    const hidden: Milestone = {
      ...far,
      id: "00000000-0000-4000-8000-000000000013",
      name: "隠した",
      date: "2028-01-01",
      groupId: hiddenGroup,
    };
    const rows = [row(task({ milestoneId: hidden.id }))];
    const picked = milestonesForExport(
      "all",
      [...groups, { id: hiddenGroup, name: "H" }],
      allGroups,
      [near, hidden],
      rows,
    );
    expect(rows).toHaveLength(1);
    expect(picked.map((item) => item.id)).toEqual([near.id]);
    const range = exportTimelineRange(rows, picked, "2026-04-08");
    expect(isoDate(range.timelineEnd)).toBe("2026-04-17");
  });

  it("drops milestones when the filter is none", () => {
    expect(
      milestonesForExport(
        NO_MILESTONE_FILTER,
        groups,
        allGroups,
        [near],
        [row(task({}))],
      ),
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

  it("lists a hidden milestone group line", () => {
    expect(describeActiveFilters(filters, [near], null, groups, [GRP])).toBe(
      "帯の線: Gを非表示",
    );
  });
});
