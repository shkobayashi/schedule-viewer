import { describe, expect, it } from "vitest";
import {
  appendMilestone,
  applyMilestoneEdit,
  ensureMilestoneGroupForAdd,
  layoutMilestoneBand,
  layoutMilestonesInGroup,
  milestoneFilterAfterDelete,
  milestoneGroupIdAtBandY,
  milestoneLinkedByAnyTask,
  removeMilestone,
  validateNewMilestone,
} from "./milestones";
import { collectScheduleIds, uniqueScheduleId } from "./tasks";
import { NO_MILESTONE_FILTER, type Category, type Milestone, type Task } from "./types";

const TASK_A = "00000000-0000-4000-8000-00000000000a";
const TASK_B = "00000000-0000-4000-8000-00000000000b";
const MS_A = "00000000-0000-4000-8000-0000000000a1";
const MS_B = "00000000-0000-4000-8000-0000000000b1";
const MS_C = "00000000-0000-4000-8000-0000000000c1";
const GRP = "e1000001-0000-4000-8000-000000000001";
const GRP_B = "e1000001-0000-4000-8000-000000000002";

function milestone(
  overrides: Partial<Milestone> & Pick<Milestone, "id" | "name" | "date">,
): Milestone {
  return {
    confidence: "committed",
    groupId: GRP,
    ...overrides,
  };
}

function task(overrides: Partial<Task> & Pick<Task, "id" | "name">): Task {
  return {
    start: "2026-04-01",
    end: "2026-04-10",
    assigneeId: null,
    status: "not-started",
    progress: 0,
    confidence: "committed",
    predecessors: [],
    milestoneId: null,
    ...overrides,
  };
}

describe("validateNewMilestone", () => {
  it("rejects a blank name and an empty or impossible date", () => {
    expect(validateNewMilestone({ name: "   ", date: "2026-04-01" })).toBe(
      "名前を入力してください",
    );
    expect(validateNewMilestone({ name: "要件確定", date: "" })).toBe(
      "日付を入力してください",
    );
    expect(validateNewMilestone({ name: "要件確定", date: "2026-02-31" })).toBe(
      "日付を入力してください",
    );
  });

  it("accepts a name that is only padded with spaces", () => {
    expect(validateNewMilestone({ name: "  要件確定  ", date: "2026-04-01" })).toBe(
      null,
    );
  });
});

describe("appendMilestone", () => {
  it("appends a milestone without sorting or rejecting duplicates", () => {
    const later = milestone({ id: MS_A, name: "要件確定", date: "2026-04-01" });
    const earlier = milestone({ id: MS_B, name: "要件確定", date: "2026-03-01" });
    const same = milestone({ id: MS_C, name: "要件確定", date: "2026-04-01" });
    const before = [later];
    const next = appendMilestone(appendMilestone(before, earlier), same);
    expect(before).toEqual([later]);
    expect(next).toEqual([later, earlier, same]);
  });
});

describe("removeMilestone", () => {
  it("removes the milestone and clears only matching milestoneId", () => {
    const linked = task({
      id: TASK_A,
      name: "基本設計",
      status: "in-progress",
      progress: 40,
      predecessors: [TASK_B],
      milestoneId: MS_A,
      note: "メモ",
    });
    const other = task({
      id: TASK_B,
      name: "詳細設計",
      milestoneId: MS_B,
    });
    const categories: Category[] = [
      {
        id: "c1000001-0000-4000-8000-000000000001",
        name: "設計",
        groups: [
          { id: "d1000001-0000-4000-8000-000000000001", name: "上流", tasks: [linked] },
          { id: "d1000001-0000-4000-8000-000000000002", name: "空", tasks: [] },
        ],
      },
      {
        id: "c1000001-0000-4000-8000-000000000002",
        name: "開発",
        groups: [{ id: "d1000001-0000-4000-8000-000000000003", name: "実装", tasks: [other] }],
      },
    ];
    const milestones: Milestone[] = [
      milestone({ id: MS_A, name: "要件確定", date: "2026-04-01" }),
      milestone({ id: MS_B, name: "設計完了", date: "2026-05-01" }),
    ];
    const next = removeMilestone(categories, milestones, MS_A);
    expect(next.milestones).toEqual([milestones[1]]);
    expect(next.categories).toEqual([
      {
        id: "c1000001-0000-4000-8000-000000000001",
        name: "設計",
        groups: [
          { id: "d1000001-0000-4000-8000-000000000001", name: "上流", tasks: [{ ...linked, milestoneId: null }] },
          { id: "d1000001-0000-4000-8000-000000000002", name: "空", tasks: [] },
        ],
      },
      {
        id: "c1000001-0000-4000-8000-000000000002",
        name: "開発",
        groups: [{ id: "d1000001-0000-4000-8000-000000000003", name: "実装", tasks: [other] }],
      },
    ]);
    expect(categories[0]?.groups[0]?.tasks[0]).toBe(linked);
  });
});

describe("uniqueScheduleId", () => {
  it("skips ids already used by a category, group, task, or milestone", () => {
    const categories: Category[] = [
      {
        id: "c1000001-0000-4000-8000-000000000001",
        name: "設計",
        groups: [
          { id: "d1000001-0000-4000-8000-000000000001", name: "上流", tasks: [task({ id: TASK_A, name: "基本設計" })] },
        ],
      },
    ];
    const milestones: Milestone[] = [
      milestone({ id: MS_A, name: "要件確定", date: "2026-04-01" }),
    ];
    const taken = collectScheduleIds(categories, [], milestones);
    const sequence = [
      MS_A,
      TASK_A,
      "c1000001-0000-4000-8000-000000000001",
      "d1000001-0000-4000-8000-000000000001",
      MS_B,
    ];
    let index = 0;
    expect(uniqueScheduleId(taken, () => sequence[index++] ?? MS_C)).toBe(MS_B);
    expect(index).toBe(5);

    let attempts = 0;
    expect(() =>
      uniqueScheduleId(new Set([MS_A]), () => {
        attempts += 1;
        return MS_A;
      }),
    ).toThrow(/スケジュール ID/);
    expect(attempts).toBe(32);
  });
});

describe("milestoneFilterAfterDelete", () => {
  it("resets the milestone filter only when it is the deleted id", () => {
    expect(milestoneFilterAfterDelete(MS_A, MS_A)).toBe("all");
    expect(milestoneFilterAfterDelete("all", MS_A)).toBe("all");
    expect(milestoneFilterAfterDelete(NO_MILESTONE_FILTER, MS_A)).toBe(
      NO_MILESTONE_FILTER,
    );
    expect(milestoneFilterAfterDelete(MS_B, MS_A)).toBe(MS_B);
  });
});

describe("milestoneLinkedByAnyTask", () => {
  it("reports whether any task points at the milestone", () => {
    const categories: Category[] = [
      {
        id: "c1000001-0000-4000-8000-000000000001",
        name: "設計",
        groups: [
          {
            id: "d1000001-0000-4000-8000-000000000001",
            name: "上流",
            tasks: [task({ id: TASK_A, name: "基本設計", milestoneId: MS_A })],
          },
          { id: "d1000001-0000-4000-8000-000000000002", name: "空", tasks: [] },
        ],
      },
    ];
    expect(milestoneLinkedByAnyTask(categories, MS_A)).toBe(true);
    expect(milestoneLinkedByAnyTask(categories, MS_B)).toBe(false);
    expect(milestoneLinkedByAnyTask([], MS_A)).toBe(false);
  });
});

describe("layoutMilestonesInGroup", () => {
  it("stacks diamonds on the same day and reuses a lane after they end", () => {
    const crowded = Array.from({ length: 8 }, (_, index) => {
      const id = `00000000-0000-4000-8000-0000000001${index.toString(16)}`;
      return milestone({ id, name: "MS", date: "2026-04-01" });
    });
    const later = milestone({
      id: "00000000-0000-4000-8000-0000000001f1",
      name: "後",
      date: "2026-06-01",
    });
    const lanes = layoutMilestonesInGroup(
      [...crowded, later],
      12,
      13,
      14,
      "screen",
    );
    const used = crowded.map((item) => lanes.get(item.id));
    expect(new Set(used).size).toBe(crowded.length);
    expect(Math.min(...used.map((lane) => lane ?? 99))).toBe(0);
    expect(lanes.get(later.id)).toBe(0);
  });

  it("keeps a long name on one lane when the diamonds do not overlap", () => {
    const lanes = layoutMilestonesInGroup(
      [
        milestone({
          id: MS_A,
          name: "あいうえおかきくけこ",
          date: "2026-04-01",
        }),
        milestone({ id: MS_B, name: "次", date: "2026-04-02" }),
      ],
      40,
      11,
      11,
      "screen",
    );
    expect(lanes.get(MS_A)).toBe(0);
    expect(lanes.get(MS_B)).toBe(0);
  });

  it("splits a lane when diamonds overlap", () => {
    const lanes = layoutMilestonesInGroup(
      [
        milestone({ id: MS_A, name: "A", date: "2026-04-01" }),
        milestone({ id: MS_B, name: "B", date: "2026-04-02" }),
      ],
      8,
      11,
      11,
      "screen",
    );
    expect(lanes.get(MS_A)).not.toBe(lanes.get(MS_B));
  });

  it("adds an export lane only when the full name runs past the next diamond", () => {
    const fit = layoutMilestonesInGroup(
      [
        milestone({ id: MS_A, name: "あい", date: "2026-04-01" }),
        milestone({ id: MS_B, name: "次", date: "2026-04-02" }),
      ],
      40,
      11,
      11,
      "export",
    );
    expect(fit.get(MS_A)).toBe(0);
    expect(fit.get(MS_B)).toBe(0);
    const overflow = layoutMilestonesInGroup(
      [
        milestone({ id: MS_A, name: "あいう", date: "2026-04-01" }),
        milestone({ id: MS_B, name: "次", date: "2026-04-02" }),
      ],
      40,
      11,
      11,
      "export",
    );
    expect(overflow.get(MS_A)).not.toBe(overflow.get(MS_B));
  });
});

describe("applyMilestoneEdit", () => {
  const groups = [
    { id: GRP, name: "G" },
    { id: GRP_B, name: "H" },
  ];

  it("updates groupId and keeps array order and id", () => {
    const milestones = [
      milestone({ id: MS_A, name: "A", date: "2026-04-01" }),
      milestone({ id: MS_B, name: "B", date: "2026-04-02" }),
    ];
    const next = applyMilestoneEdit(milestones, MS_A, groups, {
      name: "A",
      date: "2026-04-01",
      confidence: "committed",
      groupId: GRP_B,
    });
    expect(next.map((item) => item.id)).toEqual([MS_A, MS_B]);
    expect(next[0]?.groupId).toBe(GRP_B);
    expect(next[1]?.groupId).toBe(GRP);
  });

  it("keeps the original name when the patch name is only spaces", () => {
    const milestones = [milestone({ id: MS_A, name: "要件確定", date: "2026-04-01" })];
    const next = applyMilestoneEdit(milestones, MS_A, groups, {
      name: "   ",
      date: "2026-04-02",
      confidence: "tentative",
      groupId: GRP,
    });
    expect(next[0]?.name).toBe("要件確定");
    expect(next[0]?.date).toBe("2026-04-02");
    expect(next[0]?.confidence).toBe("tentative");
  });

  it("keeps the original groupId when the patch groupId is unknown", () => {
    const milestones = [milestone({ id: MS_A, name: "A", date: "2026-04-01" })];
    const next = applyMilestoneEdit(milestones, MS_A, groups, {
      name: "A",
      date: "2026-04-01",
      confidence: "committed",
      groupId: "00000000-0000-4000-8000-000000000099",
    });
    expect(next[0]?.groupId).toBe(GRP);
  });
});

describe("milestoneGroupIdAtBandY", () => {
  it("returns the group for a y inside a block and null outside", () => {
    const layout = layoutMilestoneBand(
      [
        { id: GRP, name: "G" },
        { id: GRP_B, name: "H" },
      ],
      [
        milestone({ id: MS_A, name: "A", date: "2026-04-01" }),
        milestone({
          id: MS_B,
          name: "B",
          date: "2026-04-02",
          groupId: GRP_B,
        }),
      ],
      new Set([GRP, GRP_B]),
      40,
      11,
      11,
      26,
      "screen",
    );
    const first = layout.blocks[0]!;
    const second = layout.blocks[1]!;
    expect(milestoneGroupIdAtBandY(layout.blocks, first.offsetY)).toBe(GRP);
    expect(
      milestoneGroupIdAtBandY(layout.blocks, first.offsetY + first.height - 1),
    ).toBe(GRP);
    expect(milestoneGroupIdAtBandY(layout.blocks, second.offsetY)).toBe(GRP_B);
    expect(milestoneGroupIdAtBandY(layout.blocks, -1)).toBeNull();
    expect(
      milestoneGroupIdAtBandY(layout.blocks, layout.totalHeight),
    ).toBeNull();
  });
});

describe("ensureMilestoneGroupForAdd", () => {
  const groups = [
    { id: GRP, name: "G" },
    { id: GRP_B, name: "H" },
  ];
  const taken = new Set<string>();

  it("uses the preferred group when it exists", () => {
    const result = ensureMilestoneGroupForAdd(
      groups,
      taken,
      () => "new-id",
      GRP_B,
    );
    expect(result.groupId).toBe(GRP_B);
    expect(result.milestoneGroups).toBe(groups);
  });

  it("falls back to the first group when the preferred id is missing", () => {
    const result = ensureMilestoneGroupForAdd(
      groups,
      taken,
      () => "new-id",
      "00000000-0000-4000-8000-000000000099",
    );
    expect(result.groupId).toBe(GRP);
  });
});

describe("layoutMilestoneBand", () => {
  const other = GRP_B;

  it("truncates a lone screen label at the 24 full-width character cap", () => {
    const longName = "あ".repeat(30);
    const layout = layoutMilestoneBand(
      [{ id: GRP, name: "G" }],
      [milestone({ id: MS_A, name: longName, date: "2026-04-01" })],
      new Set([GRP]),
      40,
      11,
      11,
      26,
      "screen",
    );
    const label = layout.displayLabels.get(MS_A);
    expect(label).toMatch(/…$/);
    expect(label!.length).toBeLessThan(longName.length);
  });

  it("cuts a screen label before the next diamond on the same lane", () => {
    const layout = layoutMilestoneBand(
      [{ id: GRP, name: "G" }],
      [
        milestone({ id: MS_A, name: "あいうえお", date: "2026-04-01" }),
        milestone({ id: MS_B, name: "次", date: "2026-04-02" }),
      ],
      new Set([GRP]),
      40,
      11,
      11,
      26,
      "screen",
    );
    expect(layout.displayLabels.get(MS_A)).toBe("あ…");
    expect(layout.displayLabels.get(MS_B)).toBe("次");
  });

  it("skips empty groups and hidden groups", () => {
    const layout = layoutMilestoneBand(
      [
        { id: GRP, name: "G" },
        { id: other, name: "H" },
        { id: "e1000001-0000-4000-8000-000000000003", name: "空" },
      ],
      [
        milestone({ id: MS_A, name: "見", date: "2026-04-01" }),
        milestone({
          id: MS_B,
          name: "隠",
          date: "2026-04-02",
          groupId: other,
        }),
      ],
      new Set([GRP]),
      40,
      11,
      11,
      26,
      "screen",
    );
    expect(layout.blocks.map((block) => block.group.name)).toEqual(["G"]);
    expect(layout.totalHeight).toBe(26);
  });
});
