import { describe, expect, it } from "vitest";
import {
  defaultScheduleFilterViewState,
  isDefaultScheduleFilterViewState,
  parseScheduleFilterPersistence,
  pruneScheduleFilterViewState,
  serializeScheduleFilterPersistence,
  SCHEDULE_FILTER_PERSISTENCE_VERSION,
  viewStateFromPersistence,
} from "./scheduleFilterPersistence";
import { UNASSIGNED_FILTER } from "./types";

const PATH = "/tmp/project/schedule.json";

describe("parseScheduleFilterPersistence", () => {
  it("accepts a valid file", () => {
    const state = defaultScheduleFilterViewState();
    state.filters.assignee = "member-1";
    const text = serializeScheduleFilterPersistence(PATH, state);
    const parsed = parseScheduleFilterPersistence(text, PATH);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.version).toBe(SCHEDULE_FILTER_PERSISTENCE_VERSION);
    expect(parsed.data.filters.assignee).toBe("member-1");
  });

  it("rejects wrong path", () => {
    const text = serializeScheduleFilterPersistence(PATH, defaultScheduleFilterViewState());
    expect(parseScheduleFilterPersistence(text, "/other.json").ok).toBe(false);
  });

  it("rejects invalid JSON", () => {
    expect(parseScheduleFilterPersistence("{", PATH).ok).toBe(false);
  });

  it("rejects wrong version", () => {
    const text = JSON.stringify({
      version: 3,
      path: PATH,
      filters: defaultScheduleFilterViewState().filters,
      searchField: "name",
      hiddenMilestoneGroupIds: [],
    });
    expect(parseScheduleFilterPersistence(text, PATH).ok).toBe(false);
  });

  it("accepts version 2 with fieldFilters", () => {
    const text = JSON.stringify({
      version: 2,
      path: PATH,
      filters: {
        ...defaultScheduleFilterViewState().filters,
        fieldFilters: {
          memo: { empty: "any", text: "レビュー" },
        },
      },
      searchField: "name",
      hiddenMilestoneGroupIds: [],
    });
    const parsed = parseScheduleFilterPersistence(text, PATH);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.version).toBe(2);
    expect(parsed.data.filters.fieldFilters?.memo?.text).toBe("レビュー");
  });

  it("loads version 1 without fieldFilters as empty", () => {
    const text = JSON.stringify({
      version: 1,
      path: PATH,
      filters: defaultScheduleFilterViewState().filters,
      searchField: "name",
      hiddenMilestoneGroupIds: [],
    });
    const parsed = parseScheduleFilterPersistence(text, PATH);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const view = viewStateFromPersistence(parsed.data);
    expect(view.filters.fieldFilters).toEqual({});
  });

  it("accepts a file without collapse arrays", () => {
    const text = JSON.stringify({
      version: 1,
      path: PATH,
      filters: defaultScheduleFilterViewState().filters,
      searchField: "name",
      hiddenMilestoneGroupIds: [],
    });
    const parsed = parseScheduleFilterPersistence(text, PATH);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.collapsedCategoryIds).toEqual([]);
    expect(parsed.data.collapsedGroupIds).toEqual([]);
  });

  it("rejects invalid collapsedCategoryIds", () => {
    const text = JSON.stringify({
      version: 1,
      path: PATH,
      filters: defaultScheduleFilterViewState().filters,
      searchField: "name",
      hiddenMilestoneGroupIds: [],
      collapsedCategoryIds: "not-array",
    });
    expect(parseScheduleFilterPersistence(text, PATH).ok).toBe(false);
  });

  it("accepts a status id that is not in the built-in list", () => {
    const text = JSON.stringify({
      version: 1,
      path: PATH,
      filters: { ...defaultScheduleFilterViewState().filters, status: "review" },
      searchField: "name",
      hiddenMilestoneGroupIds: [],
    });
    expect(parseScheduleFilterPersistence(text, PATH).ok).toBe(true);
  });

  it("rejects an empty status", () => {
    const text = JSON.stringify({
      version: 1,
      path: PATH,
      filters: { ...defaultScheduleFilterViewState().filters, status: "" },
      searchField: "name",
      hiddenMilestoneGroupIds: [],
    });
    expect(parseScheduleFilterPersistence(text, PATH).ok).toBe(false);
  });

  it("serializes collapse ids in sorted order", () => {
    const state = defaultScheduleFilterViewState();
    state.collapsedCategoryIds = ["c2", "c1"];
    state.collapsedGroupIds = ["g2", "g1"];
    const text = serializeScheduleFilterPersistence(PATH, state);
    const parsed = JSON.parse(text) as {
      collapsedCategoryIds: string[];
      collapsedGroupIds: string[];
    };
    expect(parsed.collapsedCategoryIds).toEqual(["c1", "c2"]);
    expect(parsed.collapsedGroupIds).toEqual(["g1", "g2"]);
  });
});

describe("isDefaultScheduleFilterViewState", () => {
  it("is true for defaults", () => {
    expect(isDefaultScheduleFilterViewState(defaultScheduleFilterViewState())).toBe(
      true,
    );
  });

  it("is true when only searchField is note with empty searches", () => {
    const state = defaultScheduleFilterViewState();
    state.searchField = "note";
    expect(isDefaultScheduleFilterViewState(state)).toBe(true);
  });

  it("is false when a filter is active", () => {
    const state = defaultScheduleFilterViewState();
    state.filters.status = "in-progress";
    expect(isDefaultScheduleFilterViewState(state)).toBe(false);
  });

  it("is false when band lines are hidden", () => {
    const state = defaultScheduleFilterViewState();
    state.hiddenMilestoneGroupIds = ["g1"];
    expect(isDefaultScheduleFilterViewState(state)).toBe(false);
  });

  it("is false when a category is collapsed", () => {
    const state = defaultScheduleFilterViewState();
    state.collapsedCategoryIds = ["c1"];
    expect(isDefaultScheduleFilterViewState(state)).toBe(false);
  });

  it("is false when only collapse is set", () => {
    const state = defaultScheduleFilterViewState();
    state.collapsedGroupIds = ["g1"];
    expect(isDefaultScheduleFilterViewState(state)).toBe(false);
  });
});

describe("pruneScheduleFilterViewState", () => {
  const categories = [
    {
      id: "c1",
      name: "C",
      groups: [
        {
          id: "g1",
          name: "G",
          tasks: [
            {
              id: "t1",
              name: "T",
              start: "2026-01-01",
              end: "2026-01-02",
              assigneeId: null,
              status: "not-started" as const,
              progress: 0,
              confidence: "tentative" as const,
              predecessors: [],
              milestoneId: null,
              tags: ["alpha"],
            },
          ],
        },
      ],
    },
  ];
  const milestones = [
    {
      id: "m1",
      name: "M",
      date: "2026-06-01",
      confidence: "committed" as const,
      groupId: "mg1",
    },
  ];
  const milestoneGroups = [{ id: "mg1", name: "MG" }, { id: "mg2", name: "MG2" }];

  it("clears unknown assignee", () => {
    const state = defaultScheduleFilterViewState();
    state.filters.assignee = "gone";
    const pruned = pruneScheduleFilterViewState(state, {
      categories,
      milestones,
      milestoneGroups,
      knownMemberIds: new Set(["m1"]),
    });
    expect(pruned.filters.assignee).toBe("all");
  });

  it("keeps unassigned filter without catalog", () => {
    const state = defaultScheduleFilterViewState();
    state.filters.assignee = UNASSIGNED_FILTER;
    const pruned = pruneScheduleFilterViewState(state, {
      categories,
      milestones,
      milestoneGroups,
      knownMemberIds: new Set(),
    });
    expect(pruned.filters.assignee).toBe(UNASSIGNED_FILTER);
  });

  it("clears unknown milestone and tags", () => {
    const state = defaultScheduleFilterViewState();
    state.filters.milestone = "gone";
    state.filters.tags = ["alpha", "beta"];
    const pruned = pruneScheduleFilterViewState(state, {
      categories,
      milestones,
      milestoneGroups,
      knownMemberIds: new Set(),
    });
    expect(pruned.filters.milestone).toBe("all");
    expect(pruned.filters.tags).toEqual(["alpha"]);
  });

  it("drops hidden group ids missing from document", () => {
    const state = defaultScheduleFilterViewState();
    state.hiddenMilestoneGroupIds = ["mg1", "missing"];
    const pruned = pruneScheduleFilterViewState(state, {
      categories,
      milestones,
      milestoneGroups,
      knownMemberIds: new Set(),
    });
    expect(pruned.hiddenMilestoneGroupIds).toEqual(["mg1"]);
  });

  it("keeps unknown assignee when assignee pruning is off", () => {
    const state = defaultScheduleFilterViewState();
    state.filters.assignee = "gone";
    const pruned = pruneScheduleFilterViewState(
      state,
      {
        categories,
        milestones,
        milestoneGroups,
        knownMemberIds: new Set(),
      },
      { pruneAssignee: false },
    );
    expect(pruned.filters.assignee).toBe("gone");
  });

  it("keeps hidden band lines for groups in the loaded document", () => {
    const state = defaultScheduleFilterViewState();
    state.hiddenMilestoneGroupIds = ["mg1", "mg2"];
    const pruned = pruneScheduleFilterViewState(state, {
      categories,
      milestones,
      milestoneGroups,
      knownMemberIds: new Set(),
    });
    expect(pruned.hiddenMilestoneGroupIds).toEqual(["mg1", "mg2"]);
  });

  it("drops collapsed ids missing from document", () => {
    const state = defaultScheduleFilterViewState();
    state.collapsedCategoryIds = ["c1", "missing-cat"];
    state.collapsedGroupIds = ["g1", "missing-grp"];
    const pruned = pruneScheduleFilterViewState(state, {
      categories,
      milestones,
      milestoneGroups,
      knownMemberIds: new Set(),
    });
    expect(pruned.collapsedCategoryIds).toEqual(["c1"]);
    expect(pruned.collapsedGroupIds).toEqual(["g1"]);
  });

  it("keeps unknown collapse ids when collapse pruning is off", () => {
    const state = defaultScheduleFilterViewState();
    state.collapsedCategoryIds = ["missing-cat"];
    const pruned = pruneScheduleFilterViewState(
      state,
      {
        categories,
        milestones,
        milestoneGroups,
        knownMemberIds: new Set(),
      },
      { pruneCollapse: false },
    );
    expect(pruned.collapsedCategoryIds).toEqual(["missing-cat"]);
  });
});

describe("viewStateFromPersistence", () => {
  it("copies arrays", () => {
    const data = {
      version: 1 as const,
      path: PATH,
      filters: { ...defaultScheduleFilterViewState().filters, tags: ["x"] },
      searchField: "note" as const,
      hiddenMilestoneGroupIds: ["g"],
      collapsedCategoryIds: ["c1"],
      collapsedGroupIds: ["g1"],
    };
    const view = viewStateFromPersistence(data);
    expect(view.searchField).toBe("note");
    expect(view.filters.tags).toEqual(["x"]);
    expect(view.hiddenMilestoneGroupIds).toEqual(["g"]);
    expect(view.collapsedCategoryIds).toEqual(["c1"]);
    expect(view.collapsedGroupIds).toEqual(["g1"]);
    expect(view.filters).not.toBe(data.filters);
  });
});
