import { describe, expect, it } from "vitest";
import levels2Sample from "../../examples/hierarchy/levels-2.schedule.json";
import levels3Sample from "../../examples/hierarchy/levels-3.schedule.json";
import {
  applyLevelEditorCommit,
  assessHierarchySave,
  assessReplaceScheduleLevelCount,
  EDITOR_LEGACY_THREE_LEVEL_DEFS,
  HIERARCHY_SAVE_MISMATCH_MESSAGE,
  isLevelDraftComplete,
  levelDefsForEditor,
  mcpLevelsFromDocument,
  normalizeLevelDefinition,
  reorderLevelDraft,
  REPLACE_SCHEDULE_HIERARCHY_DEPTH_MISMATCH,
  REPLACE_SCHEDULE_HIERARCHY_MISMATCH,
  shouldSkipLevelEditorCommit,
} from "./hierarchyLevelEdit";
import { validateSchedule } from "./validateSchedule";
import { isOutlineBranch } from "./hierarchy";
import type { DocumentSnapshot } from "./history";
import type { Category, ScheduleDocument, Task } from "./types";
import type { ScheduleFilters } from "./types";
import { SCHEDULE_SCHEMA_VERSION } from "./types";
import {
  buildFilteredTasksPayload,
  buildSelectedTaskPayload,
  buildSelectedTasksPayload,
} from "./screenContext";

function task(id: string): Task {
  return {
    id,
    name: "作業",
    start: "2026-10-01",
    end: "2026-10-02",
    assigneeIds: [],
    status: "not-started",
    progress: 0,
    confidence: "committed",
    predecessors: [],
    milestoneId: null,
  };
}

function legacySnapshot(): DocumentSnapshot {
  const categories: Category[] = [
    {
      id: "c1000001-0000-4000-8000-000000000001",
      name: "設計",
      groups: [
        {
          id: "d1000001-0000-4000-8000-000000000001",
          name: "上流",
          tasks: [task("e1000001-0000-4000-8000-000000000002")],
        },
      ],
    },
  ];
  return {
    title: "P",
    categories,
    milestoneGroups: [],
    milestones: [],
  };
}

describe("keepsLegacyShapeWhenDefinitionUnchanged", () => {
  it("keepsLegacyShapeWhenDefinitionUnchanged", () => {
    const snapshot = legacySnapshot();
    const result = applyLevelEditorCommit(
      snapshot,
      EDITOR_LEGACY_THREE_LEVEL_DEFS,
      false,
    );
    expect(result.next.levels).toBeUndefined();
    expect(result.next.outline).toBeUndefined();
    expect(result.next.categories).toHaveLength(1);
    expect(shouldSkipLevelEditorCommit(false, EDITOR_LEGACY_THREE_LEVEL_DEFS)).toBe(
      true,
    );
  });
});

describe("renamesWithoutMovingRows", () => {
  it("renamesWithoutMovingRows", () => {
    const snapshot = legacySnapshot();
    const draft = [
      { name: "工程", meaning: "工程の意味" },
      { name: "機能", meaning: "機能の意味" },
      { name: "タスク", meaning: "タスクの意味" },
    ];
    const result = applyLevelEditorCommit(snapshot, draft, false);
    expect(result.next.categories).toHaveLength(0);
    expect(result.next.levels).toEqual(draft);
    expect(result.next.outline).toHaveLength(1);
    expect(result.next.outline![0]!.id).toBe(
      "c1000001-0000-4000-8000-000000000001",
    );
    const root = result.next.outline![0];
    expect(isOutlineBranch(root)).toBe(true);
    if (!isOutlineBranch(root)) return;
    const group = root.children[0];
    expect(isOutlineBranch(group)).toBe(true);
    if (!isOutlineBranch(group)) return;
    expect(group.id).toBe("d1000001-0000-4000-8000-000000000001");
  });
});

describe("refusesSaveWhenCountMismatches", () => {
  it("refusesSaveWhenCountMismatches", () => {
    const snapshot = legacySnapshot();
    const draft = [
      { name: "A", meaning: "a" },
      { name: "B", meaning: "b" },
      { name: "C", meaning: "c" },
      { name: "タスク", meaning: "t" },
    ];
    const { next } = applyLevelEditorCommit(snapshot, draft, false);
    const doc: ScheduleDocument = {
      schemaVersion: SCHEDULE_SCHEMA_VERSION,
      title: next.title,
      milestoneGroups: next.milestoneGroups,
      milestones: next.milestones,
      categories: next.categories,
      levels: next.levels,
      outline: next.outline,
    };
    const gate = assessHierarchySave(doc);
    expect(gate.ok).toBe(false);
    if (!gate.ok) {
      expect(gate.message).toBe(HIERARCHY_SAVE_MISMATCH_MESSAGE);
    }
    expect(next.outline).toHaveLength(1);
    const rootAfter = next.outline![0];
    expect(isOutlineBranch(rootAfter)).toBe(true);
    if (!isOutlineBranch(rootAfter)) return;
    expect(rootAfter.children).toHaveLength(1);
  });
});

describe("prefixesLevelsOnce", () => {
  it("prefixesLevelsOnce", () => {
    const categories = legacySnapshot().categories;
    const filters: ScheduleFilters = {
      assignee: "all",
      status: "all",
      confidence: "all",
      overdue: "all",
      relation: "all",
      milestone: "all",
      tags: [],
      search: "",
      noteSearch: "",
    };
    const filtered = buildFilteredTasksPayload({
      categories,
      filters,
      lineageTaskId: null,
      hiddenMilestoneGroupIds: [],
      milestoneGroups: [],
      milestones: [],
      today: "2026-10-15",
      memberCatalog: null,
      lineageIds: null,
    });
    expect(Object.keys(filtered)[0]).toBe("levels");
    expect(filtered.levels).toHaveLength(3);
    expect(filtered.levels[2]?.task).toBe(true);
    expect(filtered.levels[0]?.meaning).toBe("上のまとまり");

    const selected = buildSelectedTaskPayload({
      categories,
      filters,
      today: "2026-10-15",
      memberCatalog: null,
      lineageIds: null,
      selectedTaskId: "e1000001-0000-4000-8000-000000000002",
    });
    expect(Object.keys(selected)[0]).toBe("levels");

    const selectedMany = buildSelectedTasksPayload({
      categories,
      selectedTaskIds: ["e1000001-0000-4000-8000-000000000002"],
    });
    expect(Object.keys(selectedMany)[0]).toBe("levels");

    const explicit = mcpLevelsFromDocument({
      levels: levels3Sample.levels as ScheduleDocument["levels"],
    });
    expect(explicit[0]?.name).toBe("工程");
  });
});

describe("replaceScheduleLevelCount", () => {
  it("acceptsAlignedIncomingWhenLevelCountDiffers", () => {
    const screen: ScheduleDocument = {
      schemaVersion: SCHEDULE_SCHEMA_VERSION,
      title: "P",
      milestoneGroups: [],
      milestones: [],
      categories: legacySnapshot().categories,
    };
    const incoming = {
      ...levels2Sample,
      schemaVersion: SCHEDULE_SCHEMA_VERSION,
      categories: [],
    } as unknown as ScheduleDocument;
    const result = assessReplaceScheduleLevelCount(screen, incoming);
    expect(result.ok).toBe(true);
  });

  it("rejectsLegacyIncomingWhenScreenIsNotThreeLevels", () => {
    const screen: ScheduleDocument = {
      schemaVersion: SCHEDULE_SCHEMA_VERSION,
      title: "P",
      milestoneGroups: [],
      milestones: [],
      categories: [],
      levels: levels2Sample.levels as ScheduleDocument["levels"],
    };
    const incoming: ScheduleDocument = {
      schemaVersion: SCHEDULE_SCHEMA_VERSION,
      title: "P",
      milestoneGroups: [],
      milestones: [],
      categories: legacySnapshot().categories,
    };
    const result = assessReplaceScheduleLevelCount(screen, incoming);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe(REPLACE_SCHEDULE_HIERARCHY_DEPTH_MISMATCH);
    }
  });

  it("rejectsMisalignedIncomingWhenLevelCountDiffers", () => {
    const screen: ScheduleDocument = {
      schemaVersion: SCHEDULE_SCHEMA_VERSION,
      title: "P",
      milestoneGroups: [],
      milestones: [],
      categories: legacySnapshot().categories,
    };
    const snapshot = legacySnapshot();
    const draft = [
      { name: "A", meaning: "a" },
      { name: "B", meaning: "b" },
      { name: "C", meaning: "c" },
      { name: "タスク", meaning: "t" },
    ];
    const { next } = applyLevelEditorCommit(snapshot, draft, false);
    const incoming: ScheduleDocument = {
      schemaVersion: SCHEDULE_SCHEMA_VERSION,
      title: next.title,
      milestoneGroups: next.milestoneGroups,
      milestones: next.milestones,
      categories: next.categories,
      levels: next.levels,
      outline: next.outline,
    };
    const result = assessReplaceScheduleLevelCount(screen, incoming);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe(REPLACE_SCHEDULE_HIERARCHY_MISMATCH);
    }
  });
});

describe("levelDefsForEditor", () => {
  it("uses defaults when levels absent", () => {
    expect(levelDefsForEditor({})).toEqual(EDITOR_LEGACY_THREE_LEVEL_DEFS);
  });

  it("isLevelDraftComplete rejects empty meaning", () => {
    expect(
      isLevelDraftComplete([{ name: "A", meaning: " " }]),
    ).toBe(false);
  });

  it("isLevelDraftComplete allows empty instruction", () => {
    expect(
      isLevelDraftComplete([{ name: "A", meaning: "置くもの", instruction: "" }]),
    ).toBe(true);
  });
});

describe("normalizeLevelDefinition", () => {
  it("drops a blank instruction", () => {
    expect(
      normalizeLevelDefinition({
        name: "工程",
        meaning: "工程単位",
        instruction: "   ",
      }),
    ).toEqual({ name: "工程", meaning: "工程単位" });
  });

  it("keeps a non-blank instruction", () => {
    expect(
      normalizeLevelDefinition({
        name: "工程",
        meaning: "工程単位",
        instruction: " 日付は工程の先頭に揃える。 ",
      }),
    ).toEqual({
      name: "工程",
      meaning: "工程単位",
      instruction: "日付は工程の先頭に揃える。",
    });
  });
});

describe("reorderLevelDraft", () => {
  const three = [
    { name: "A", meaning: "a" },
    { name: "B", meaning: "b" },
    { name: "タスク", meaning: "t" },
  ];

  it("swaps heading rows without moving the task row", () => {
    expect(reorderLevelDraft(three, 0, 1)?.map((level) => level.name)).toEqual([
      "B",
      "A",
      "タスク",
    ]);
    expect(reorderLevelDraft(three, 1, -1)?.map((level) => level.name)).toEqual([
      "B",
      "A",
      "タスク",
    ]);
  });

  it("refuses to move the task row or past headings", () => {
    expect(reorderLevelDraft(three, 2, -1)).toBeNull();
    expect(reorderLevelDraft(three, 0, -1)).toBeNull();
    expect(reorderLevelDraft(three, 1, 1)).toBeNull();
  });
});

describe("mcpLevelsFromDocument instruction", () => {
  it("includes instruction only when non-blank", () => {
    const levels = mcpLevelsFromDocument({
      levels: [
        { name: "工程", meaning: "工程", instruction: "守ること" },
        { name: "タスク", meaning: "作業" },
      ],
    });
    expect(levels[0].instruction).toBe("守ること");
    expect(levels[1]).not.toHaveProperty("instruction");
    expect(levels[1].task).toBe(true);
  });
});

describe("validateSchedule levels instruction", () => {
  it("accepts levels with a blank instruction removed before schema check", () => {
    const base = {
      ...levels3Sample,
      schemaVersion: SCHEDULE_SCHEMA_VERSION,
      categories: [],
    };
    const withBlank = {
      ...base,
      levels: base.levels!.map((level, index) =>
        index === 0
          ? { ...level, instruction: "   " }
          : level,
      ),
    };
    const result = validateSchedule(withBlank);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.document.levels![0]).not.toHaveProperty("instruction");
    }
  });
});
