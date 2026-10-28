import { describe, expect, it } from "vitest";
import levels5Sample from "../../examples/hierarchy/levels-5.schedule.json";
import levels3Sample from "../../examples/hierarchy/levels-3.schedule.json";
import {
  addTopLevelMenuLabel,
  assessHierarchyAlignment,
  hierarchyLayoutContext,
  HIERARCHY_MISMATCH_MESSAGE,
  hierarchyRowKind,
  levelBannerText,
  scheduleStoresTasksInOutline,
} from "./hierarchy";
import { computeVisibleRows } from "./rows";
import { documentToJson, scheduleToJson } from "./serialize";
import type { Category, OutlineRoot, ScheduleDocument, ScheduleLevelDef, Task } from "./types";
import { SCHEDULE_SCHEMA_VERSION } from "./types";
import { validateScheduleSemantics } from "./scheduleSemantics";
import { validateSchedule } from "./validateSchedule";

const MS_GROUP = "a1000001-0000-4000-8000-000000000001";

function task(id: string, start: string, end: string): Task {
  return {
    id,
    name: `作業 ${id.slice(0, 4)}`,
    start,
    end,
    assigneeIds: [],
    status: "in-progress",
    progress: 40,
    confidence: "committed",
    predecessors: [],
    milestoneId: null,
  };
}

function legacyCategories(): Category[] {
  return [
    {
      id: "c1000001-0000-4000-8000-000000000001",
      name: "設計",
      groups: [
        {
          id: "d1000001-0000-4000-8000-000000000001",
          name: "上流",
          tasks: [task("e1000001-0000-4000-8000-000000000001", "2026-10-01", "2026-10-05")],
        },
      ],
    },
  ];
}

describe("hierarchy storage", () => {
  it("keeps keys unchanged when saving without levels", () => {
    const doc = scheduleToJson("P", legacyCategories(), [], []);
    const json = documentToJson(doc);
    expect(json).not.toHaveProperty("levels");
    expect(json).not.toHaveProperty("outline");
    expect(json.categories).toHaveLength(1);
  });

  it("round-trips three levels with outline only", () => {
    const levels = [
      { name: "工程", meaning: "工程の意味" },
      { name: "機能", meaning: "機能の意味" },
      { name: "タスク", meaning: "タスクの意味" },
    ];
    const outline = [
      {
        id: "c1000001-0000-4000-8000-000000000001",
        name: "設計",
        children: [
          {
            id: "d1000001-0000-4000-8000-000000000001",
            name: "上流",
            children: [
              task("e1000001-0000-4000-8000-000000000001", "2026-10-01", "2026-10-05"),
            ],
          },
        ],
      },
    ];
    const doc = scheduleToJson("P", [], [], [], levels, outline);
    expect(doc.categories).toHaveLength(0);
    expect(doc.outline).toHaveLength(1);
    expect(doc.levels).toEqual(levels);
  });

  it("rejects levels with categories storage", () => {
    const doc: ScheduleDocument = {
      schemaVersion: SCHEDULE_SCHEMA_VERSION,
      title: "P",
      milestoneGroups: [],
      milestones: [],
      categories: legacyCategories(),
      levels: [
        { name: "工程", meaning: "工程" },
        { name: "機能", meaning: "機能" },
        { name: "タスク", meaning: "タスク" },
      ],
    };
    expect(assessHierarchyAlignment(doc, 3).aligned).toBe(false);
  });

  it("rejects level length 0 and 6 in semantics", () => {
    const base: ScheduleDocument = {
      schemaVersion: SCHEDULE_SCHEMA_VERSION,
      title: "P",
      milestoneGroups: [],
      milestones: [],
      categories: legacyCategories(),
      levels: [],
    };
    expect(validateScheduleSemantics(base).some((i) => i.path === "/levels")).toBe(
      true,
    );
    const six = { ...base, levels: Array.from({ length: 6 }, (_, i) => ({
      name: `L${i}`,
      meaning: "意味",
    })) };
    expect(validateScheduleSemantics(six).some((i) => i.path === "/levels")).toBe(
      true,
    );
  });

  it("opens misaligned files and exposes mismatch banner text", () => {
    const doc: ScheduleDocument = {
      schemaVersion: SCHEDULE_SCHEMA_VERSION,
      title: "P",
      milestoneGroups: [{ id: MS_GROUP, name: "マイルストン" }],
      milestones: [],
      categories: [],
      levels: [
        { name: "工程", meaning: "工程" },
        { name: "機能", meaning: "機能" },
        { name: "タスク", meaning: "タスク" },
      ],
      outline: [
        {
          id: "f1000001-0000-4000-8000-000000000001",
          name: "枝",
          children: [task("e1000001-0000-4000-8000-000000000002", "2026-10-01", "2026-10-02")],
        },
      ],
    };
    const alignment = assessHierarchyAlignment(doc, 3);
    expect(alignment.aligned).toBe(false);
    expect(HIERARCHY_MISMATCH_MESSAGE).toContain("定義");
  });
});

describe("hierarchy visible rows", () => {
  it("shows one-level tasks without header rows", () => {
    const outline = [
      task("e1000001-0000-4000-8000-000000000001", "2026-10-01", "2026-10-03"),
    ];
    const rows = computeVisibleRows(
      [],
      {
        assignee: "all",
        status: "all",
        confidence: "all",
        overdue: "all",
        relation: "all",
        milestone: "all",
        tags: [],
        search: "",
        noteSearch: "",
      },
      new Set(),
      "2026-10-15",
      null,
      28,
      null,
      undefined,
      {
        levels: [{ name: "タスク", meaning: "意味" }],
        outline,
        useLegacyCategoryRows: false,
        levelCount: 1,
      },
    );
    expect(rows.every((row) => row.type === "task")).toBe(true);
  });

  it("uses category and group summary bars for legacy three levels without levels", () => {
    const rows = computeVisibleRows(
      legacyCategories(),
      {
        assignee: "all",
        status: "all",
        confidence: "all",
        overdue: "all",
        relation: "all",
        milestone: "all",
        tags: [],
        search: "",
        noteSearch: "",
      },
      new Set(),
      "2026-10-15",
      null,
      28,
      null,
      undefined,
      {
        levels: null,
        outline: undefined,
        useLegacyCategoryRows: true,
        levelCount: 3,
      },
    );
    const category = rows.find((row) => row.type === "category");
    const group = rows.find((row) => row.type === "group");
    expect(category?.summary).not.toBeNull();
    expect(group?.summary).not.toBeNull();
  });

  it("labels five-level row kinds for top and task parent only", () => {
    expect(hierarchyRowKind(0, 5)).toBe("top");
    expect(hierarchyRowKind(3, 5)).toBe("taskParent");
    expect(hierarchyRowKind(1, 5)).toBe("middle");
  });

  it("builds level banner from definition names", () => {
    expect(
      levelBannerText([
        { name: "工程", meaning: "a" },
        { name: "機能", meaning: "b" },
      ]),
    ).toBe("工程 / 機能");
  });

  it("detects outline storage for non-legacy levels", () => {
    const doc: ScheduleDocument = {
      schemaVersion: SCHEDULE_SCHEMA_VERSION,
      title: "P",
      milestoneGroups: [],
      milestones: [],
      categories: [],
      levels: [
        { name: "まとまり", meaning: "意味" },
        { name: "タスク", meaning: "意味" },
      ],
      outline: [
        {
          id: "f1000001-0000-4000-8000-000000000001",
          name: "A",
          children: [task("e1000001-0000-4000-8000-000000000001", "2026-10-01", "2026-10-02")],
        },
      ],
    };
    expect(scheduleStoresTasksInOutline(doc)).toBe(true);
  });
});

describe("addTopLevelMenuLabel", () => {
  it("returns category label without levels and heading label with outline levels", () => {
    const legacy = hierarchyLayoutContext({
      schemaVersion: SCHEDULE_SCHEMA_VERSION,
      title: "P",
      milestoneGroups: [],
      milestones: [],
      categories: legacyCategories(),
    });
    expect(addTopLevelMenuLabel(legacy)).toBe("見出しを追加");

    const twoLevel: ScheduleDocument = {
      schemaVersion: SCHEDULE_SCHEMA_VERSION,
      title: "P",
      milestoneGroups: [],
      milestones: [],
      categories: [],
      levels: [
        { name: "まとまり", meaning: "m" },
        { name: "タスク", meaning: "t" },
      ],
      outline: [
        {
          id: "a1",
          name: "A",
          children: [task("t1", "2026-10-01", "2026-10-02")],
        },
      ],
    };
    expect(addTopLevelMenuLabel(hierarchyLayoutContext(twoLevel))).toBe(
      "見出しを追加",
    );

    const threeLevel: ScheduleDocument = {
      ...(levels3Sample as unknown as ScheduleDocument),
      categories: [],
    };
    expect(addTopLevelMenuLabel(hierarchyLayoutContext(threeLevel))).toBe(
      "見出しを追加",
    );

    const misaligned: ScheduleDocument = {
      ...threeLevel,
      categories: legacyCategories(),
    };
    expect(addTopLevelMenuLabel(hierarchyLayoutContext(misaligned))).toBeNull();

    const fiveLevel: ScheduleDocument = {
      schemaVersion: SCHEDULE_SCHEMA_VERSION,
      title: "P",
      milestoneGroups: [],
      milestones: [],
      categories: [],
      levels: levels5Sample.levels as ScheduleLevelDef[],
      outline: levels5Sample.outline as unknown as OutlineRoot,
    };
    expect(addTopLevelMenuLabel(hierarchyLayoutContext(fiveLevel))).toBe(
      "見出しを追加",
    );

    const oneLevel: ScheduleDocument = {
      schemaVersion: SCHEDULE_SCHEMA_VERSION,
      title: "P",
      milestoneGroups: [],
      milestones: [],
      categories: [],
      levels: [{ name: "タスク", meaning: "t" }],
      outline: [
        task("e1000001-0000-4000-8000-000000000001", "2026-10-01", "2026-10-02"),
      ],
    };
    expect(addTopLevelMenuLabel(hierarchyLayoutContext(oneLevel))).toBeNull();
  });
});

describe("hierarchy examples", () => {
  it("validates the five-level sample schedule file", () => {
    const result = validateSchedule(levels5Sample);
    expect(result.ok).toBe(true);
  });

  it("validates the three-level sample schedule file", () => {
    const result = validateSchedule(levels3Sample);
    expect(result.ok).toBe(true);
  });
});
