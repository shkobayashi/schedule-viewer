import { describe, expect, it } from "vitest";
import { assessHierarchyAlignment } from "./hierarchy";
import { isOutlineBranch } from "./hierarchy";
import {
  appendOutlineChildBranch,
  appendOutlineHeadingAtLevel,
  appendOutlineTopLevel,
  buildOutlineBranchWithDescendants,
  canDeleteOutlineBranch,
  insertOutlineSiblingAfter,
  outlineBranchSelectOptions,
  outlineBranchesAtLevelIndex,
  removeOutlineBranch,
  renameOutlineBranch,
} from "./outlineCrud";
import { validateScheduleSemantics } from "./scheduleSemantics";
import type { OutlineRoot, ScheduleDocument, ScheduleLevelDef } from "./types";
import { SCHEDULE_SCHEMA_VERSION } from "./types";

const levels2: ScheduleLevelDef[] = [
  { name: "まとまり", meaning: "m" },
  { name: "タスク", meaning: "t" },
];

const levels3: ScheduleLevelDef[] = [
  { name: "工程", meaning: "a" },
  { name: "機能", meaning: "b" },
  { name: "タスク", meaning: "c" },
];

const levels4: ScheduleLevelDef[] = [
  { name: "事業", meaning: "a" },
  { name: "工程", meaning: "b" },
  { name: "作業", meaning: "c" },
  { name: "タスク", meaning: "d" },
];

const levels5: ScheduleLevelDef[] = [
  { name: "事業", meaning: "a" },
  { name: "工程", meaning: "b" },
  { name: "機能", meaning: "c" },
  { name: "作業", meaning: "d" },
  { name: "タスク", meaning: "e" },
];

function taskNode(id: string, start: string, end: string) {
  return {
    id,
    name: `作業 ${id.slice(0, 4)}`,
    start,
    end,
    assigneeIds: [],
    status: "not-started" as const,
    progress: 0,
    confidence: "committed" as const,
    predecessors: [] as string[],
    milestoneId: null,
  };
}

function doc(outline: OutlineRoot, levelDefs: ScheduleLevelDef[]): ScheduleDocument {
  return {
    schemaVersion: SCHEDULE_SCHEMA_VERSION,
    title: "t",
    milestoneGroups: [],
    milestones: [],
    categories: [],
    levels: levelDefs,
    outline,
  };
}

describe("outlineCrud add", () => {
  it("appends top level with empty task parent for two levels", () => {
    const outline: OutlineRoot = [
      {
        id: "a1",
        name: "北",
        children: [
          {
            id: "t1",
            name: "作業",
            start: "2026-10-01",
            end: "2026-10-02",
            assigneeIds: [],
            status: "not-started",
            progress: 0,
            confidence: "committed",
            predecessors: [],
            milestoneId: null,
          },
        ],
      },
    ];
    let n = 0;
    const allocateId = () => `new-${++n}`;
    const result = appendOutlineTopLevel(
      outline,
      2,
      levels2,
      "南",
      "new-0",
      allocateId,
    );
    expect(result.error).toBeNull();
    expect(result.outline).toHaveLength(2);
    const added = result.outline[1];
    expect(added).toMatchObject({ name: "南", children: [] });
    const alignment = assessHierarchyAlignment(doc(result.outline, levels2), 2);
    expect(alignment.aligned).toBe(true);
    expect(validateScheduleSemantics(doc(result.outline, levels2))).toEqual([]);
  });

  it("builds descendant chain for five levels", () => {
    let n = 0;
    const branch = buildOutlineBranchWithDescendants(
      0,
      5,
      levels5,
      "root",
      "事業甲",
      () => `id-${++n}`,
    );
    expect(branch.name).toBe("事業甲");
    const process = branch.children[0];
    expect(isOutlineBranch(process)).toBe(true);
    if (!isOutlineBranch(process)) return;
    expect(process).toMatchObject({ name: "工程" });
    const feature = process.children[0];
    expect(isOutlineBranch(feature)).toBe(true);
    if (!isOutlineBranch(feature)) return;
    expect(feature).toMatchObject({ name: "機能" });
    const work = feature.children[0];
    expect(isOutlineBranch(work)).toBe(true);
    if (!isOutlineBranch(work)) return;
    expect(work).toMatchObject({
      name: "作業",
      children: [],
    });
  });

  it("inserts sibling after and child branch", () => {
    const outline: OutlineRoot = [
      {
        id: "b1",
        name: "事業甲",
        children: [
          {
            id: "b2",
            name: "工程1",
            children: [
              {
                id: "b3",
                name: "機能1",
                children: [
                  {
                    id: "b4",
                    name: "作業A",
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ];
    let n = 0;
    const allocateId = () => `n${++n}`;
    const sibling = insertOutlineSiblingAfter(
      outline,
      "b1",
      5,
      levels5,
      "事業乙",
      "n1",
      allocateId,
    );
    expect(sibling.error).toBeNull();
    expect(sibling.outline.map((node) => (node as { name: string }).name)).toEqual([
      "事業甲",
      "事業乙",
    ]);
    const child = appendOutlineChildBranch(
      sibling.outline,
      "b1",
      5,
      levels5,
      "工程2",
      "n9",
      allocateId,
    );
    expect(child.error).toBeNull();
    const processes = (child.outline[0] as { children: { name: string }[] })
      .children;
    expect(processes.map((item) => item.name)).toEqual(["工程1", "工程2"]);
  });
});

describe("outlineBranchSelectOptions", () => {
  const outline: OutlineRoot = [
    {
      id: "biz-a",
      name: "事業甲",
      children: [
        {
          id: "proc-a",
          name: "同名",
          children: [
            { id: "feat-a", name: "機能1", children: [{ id: "w-a", name: "作業", children: [] }] },
          ],
        },
      ],
    },
    {
      id: "biz-b",
      name: "事業乙",
      children: [
        {
          id: "proc-b",
          name: "同名",
          children: [
            { id: "feat-b", name: "機能1", children: [{ id: "w-b", name: "作業", children: [] }] },
          ],
        },
      ],
    },
  ];

  it("uses branch name when unique at that level", () => {
    const top = outlineBranchSelectOptions(outline, 0);
    expect(top.map((item) => item.label)).toEqual(["事業甲", "事業乙"]);
    const topBranches = outlineBranchesAtLevelIndex(outline, 0);
    expect(topBranches[topBranches.length - 1]?.id).toBe("biz-b");
  });

  it("uses path when names duplicate at that level", () => {
    const processes = outlineBranchSelectOptions(outline, 1);
    expect(processes).toHaveLength(2);
    expect(processes.map((item) => item.label)).toEqual([
      "事業甲 / 同名",
      "事業乙 / 同名",
    ]);
    const processBranches = outlineBranchesAtLevelIndex(outline, 1);
    expect(processBranches[processBranches.length - 1]?.id).toBe("proc-b");
  });
});

describe("appendOutlineHeadingAtLevel", () => {
  it("appends top level at document end with descendant chain", () => {
    const outline: OutlineRoot = [
      {
        id: "b1",
        name: "事業甲",
        children: [
          {
            id: "b2",
            name: "工程1",
            children: [
              {
                id: "b3",
                name: "機能1",
                children: [{ id: "b4", name: "作業", children: [] }],
              },
            ],
          },
        ],
      },
    ];
    let n = 0;
    const allocateId = () => `h${++n}`;
    const result = appendOutlineHeadingAtLevel(
      outline,
      5,
      levels5,
      0,
      null,
      "事業乙",
      "h1",
      allocateId,
    );
    expect(result.error).toBeNull();
    expect(result.outline.map((node) => (node as { name: string }).name)).toEqual([
      "事業甲",
      "事業乙",
    ]);
    const added = result.outline[1] as { children: { name: string; children: unknown[] }[] };
    const process = added.children[0] as { name: string; children: { name: string; children: unknown[] }[] };
    expect(process.name).toBe("工程");
    const work = process.children[0].children[0] as { name: string; children: unknown[] };
    expect(work).toMatchObject({ name: "作業", children: [] });
  });

  it("appends under chosen parent at child level", () => {
    const outline: OutlineRoot = [
      {
        id: "b1",
        name: "事業甲",
        children: [
          {
            id: "b2",
            name: "工程1",
            children: [
              {
                id: "b3",
                name: "機能1",
                children: [{ id: "b4", name: "作業", children: [] }],
              },
            ],
          },
        ],
      },
      {
        id: "b5",
        name: "事業乙",
        children: [
          {
            id: "b6",
            name: "工程1",
            children: [
              {
                id: "b7",
                name: "機能1",
                children: [{ id: "b8", name: "作業", children: [] }],
              },
            ],
          },
        ],
      },
    ];
    let n = 0;
    const allocateId = () => `h${++n}`;
    const result = appendOutlineHeadingAtLevel(
      outline,
      5,
      levels5,
      1,
      "b5",
      "工程2",
      "h1",
      allocateId,
    );
    expect(result.error).toBeNull();
    const bizB = result.outline[1] as { children: { name: string }[] };
    expect(bizB.children.map((item) => item.name)).toEqual(["工程1", "工程2"]);
  });

  it("rejects wrong parent level and duplicate sibling names", () => {
    const outlineTop: OutlineRoot = [
      { id: "b1", name: "A", children: [] },
      { id: "b2", name: "B", children: [] },
    ];
    const outlineDeep: OutlineRoot = [
      {
        id: "b1",
        name: "事業甲",
        children: [
          {
            id: "b2",
            name: "工程1",
            children: [
              {
                id: "b3",
                name: "機能1",
                children: [{ id: "b4", name: "作業", children: [] }],
              },
            ],
          },
        ],
      },
    ];
    let n = 0;
    const allocateId = () => `h${++n}`;
    const wrongParent = appendOutlineHeadingAtLevel(
      outlineDeep,
      5,
      levels5,
      2,
      "b1",
      "機能2",
      "h1",
      allocateId,
    );
    expect(wrongParent.changed).toBe(false);
    expect(wrongParent.error).toBe("追加先を選んでください");

    const duplicate = appendOutlineHeadingAtLevel(
      outlineTop,
      2,
      levels2,
      0,
      null,
      "A",
      "h2",
      allocateId,
    );
    expect(duplicate.changed).toBe(false);
    expect(duplicate.error).toBe("同じ階層内で名前が重複しています");
  });
});

describe("appendOutlineHeadingAtLevel three and four levels", () => {
  it("appends at three levels with definition-named descendants", () => {
    const outline: OutlineRoot = [
      {
        id: "k1",
        name: "要件",
        children: [
          {
            id: "k2",
            name: "ヒアリング",
            children: [taskNode("t1", "2026-10-01", "2026-10-02")],
          },
        ],
      },
    ];
    let n = 0;
    const allocateId = () => `n${++n}`;
    const result = appendOutlineHeadingAtLevel(
      outline,
      3,
      levels3,
      0,
      null,
      "実装",
      "n1",
      allocateId,
    );
    expect(result.error).toBeNull();
    const added = result.outline[1] as {
      name: string;
      children: { name: string; children: unknown[] }[];
    };
    expect(added.name).toBe("実装");
    expect(added.children[0]).toMatchObject({ name: "機能", children: [] });
    expect(
      assessHierarchyAlignment(doc(result.outline, levels3), 3).aligned,
    ).toBe(true);
  });

  it("appends at four levels under chosen parent", () => {
    const outline: OutlineRoot = [
      {
        id: "b1",
        name: "事業甲",
        children: [
          {
            id: "b2",
            name: "工程1",
            children: [
              {
                id: "b3",
                name: "作業A",
                children: [taskNode("t1", "2026-10-01", "2026-10-02")],
              },
            ],
          },
        ],
      },
      {
        id: "b4",
        name: "事業乙",
        children: [
          {
            id: "b5",
            name: "工程1",
            children: [
              {
                id: "b6",
                name: "作業A",
                children: [taskNode("t2", "2026-10-03", "2026-10-04")],
              },
            ],
          },
        ],
      },
    ];
    let n = 0;
    const allocateId = () => `h${++n}`;
    const result = appendOutlineHeadingAtLevel(
      outline,
      4,
      levels4,
      2,
      "b5",
      "作業B",
      "h1",
      allocateId,
    );
    expect(result.error).toBeNull();
    const bizB = result.outline[1] as { children: { children: { name: string }[] }[] };
    const works = bizB.children[0].children;
    expect(works.map((item) => item.name)).toEqual(["作業A", "作業B"]);
    const wrongParent = appendOutlineHeadingAtLevel(
      outline,
      4,
      levels4,
      2,
      "b1",
      "作業B",
      "h2",
      allocateId,
    );
    expect(wrongParent.changed).toBe(false);
    expect(wrongParent.error).toBe("追加先を選んでください");
  });
});

describe("outlineCrud rename and delete", () => {
  const outline: OutlineRoot = [
    { id: "b1", name: "A", children: [] },
    { id: "b2", name: "B", children: [] },
  ];

  it("renames and deletes when allowed", () => {
    const renamed = renameOutlineBranch(outline, "b1", "  A2 ");
    expect(renamed.changed).toBe(true);
    expect(renamed.outline[0]).toMatchObject({ name: "A2" });
    expect(canDeleteOutlineBranch(renamed.outline, "b1")).toBe(true);
    const removed = removeOutlineBranch(renamed.outline, "b1");
    expect(removed).toHaveLength(1);
    expect(canDeleteOutlineBranch(removed, "b2")).toBe(false);
  });
});
