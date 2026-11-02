import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  applyMcpEditPlanOps,
  cloneDocumentForMcpEditPlan,
  coerceOutlineStorageDocument,
  parseMcpEditPlanOps,
  scheduleDocumentForMcpEditPlan,
  tryMcpMoveTaskInCategories,
  tryMcpSetAssigneeIds,
  tryMcpSetPredecessors,
  tryMcpSetTaskDates,
} from "./mcpEditPlan";
import { computeVisibleRows } from "./rows";
import type { Category, ScheduleDocument, ScheduleFilters, Task, VisibleRow } from "./types";
import { cloneOutlineRoot, findTaskInDocument } from "./hierarchy";
import { parseScheduleText, serializeScheduleDocument } from "./scheduleFile";
import { documentToJsonString } from "./serialize";
import {
  createDocumentHistory,
  pushDocumentHistory,
  redoDocumentHistory,
  undoDocumentHistory,
  type DocumentSnapshot,
} from "./history";
import { cloneCategories } from "./tasks";
import { cloneConnections } from "./connections";
import { SCHEDULE_SCHEMA_VERSION } from "./types";

const CAT_A = "c1000001-0000-4000-8000-000000000001";
const GRP_A = "d1000001-0000-4000-8000-000000000001";
const GRP_B = "d1000001-0000-4000-8000-000000000002";
const TASK_A = "e1000001-0000-4000-8000-000000000001";
const TASK_B = "e1000001-0000-4000-8000-000000000002";
const MEMBER_1 = "f1000001-0000-4000-8000-000000000001";

function task(id: string, extra?: Partial<Task>): Task {
  return {
    id,
    name: "作業",
    start: "2026-04-01",
    end: "2026-04-02",
    assigneeIds: [],
    status: "not-started",
    progress: 0,
    confidence: "committed",
    predecessors: [],
    milestoneId: null,
    ...extra,
  };
}

function playgroundVisibleRows(doc: ScheduleDocument): VisibleRow[] {
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
    fieldFilters: {},
  };
  return computeVisibleRows(
    doc.categories,
    filters,
    new Set(["c2000001-0000-4000-8000-000000000001"]),
    "2026-09-01",
    null,
    undefined,
    null,
    undefined,
    {
      levels: doc.levels ?? null,
      outline: doc.outline,
      useLegacyCategoryRows: false,
      levelCount: doc.levels?.length ?? 0,
    },
  );
}

function loadPlaygroundDocument(): ScheduleDocument {
  const text = readFileSync(
    join(import.meta.dirname, "../../examples/playground.schedule.json"),
    "utf8",
  );
  const parsed = parseScheduleText(text);
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) throw new Error(parsed.message);
  return parsed.document;
}

function documentViaMcpEditPlanNormalization(doc: ScheduleDocument): ScheduleDocument {
  const normalized = scheduleDocumentForMcpEditPlan(documentToJsonString(doc));
  expect(normalized.ok).toBe(true);
  if (!normalized.ok) throw new Error(normalized.message);
  return normalized.document;
}

function baseCategories(): Category[] {
  return [
    {
      id: CAT_A,
      name: "設計",
      groups: [
        {
          id: GRP_A,
          name: "上流",
          tasks: [task(TASK_A), task(TASK_B)],
        },
        { id: GRP_B, name: "詳細", tasks: [] },
      ],
    },
  ];
}

function documentFromCategories(categories: Category[]): ScheduleDocument {
  return {
    schemaVersion: 8,
    title: "計画",
    milestones: [],
    milestoneGroups: [],
    categories,
  };
}

const visibleRows: VisibleRow[] = [
  {
    type: "category",
    id: CAT_A,
    label: "設計",
    y: 0,
    collapsed: false,
    summary: null,
    rollupPercent: null,
  },
  {
    type: "group",
    id: GRP_A,
    categoryId: CAT_A,
    category: "設計",
    label: "上流",
    y: 24,
    collapsed: false,
    summary: null,
    rollupPercent: null,
  },
  { type: "task", y: 48, task: task(TASK_A) },
  { type: "task", y: 72, task: task(TASK_B) },
];

describe("parseMcpEditPlanOps", () => {
  it("parses setTaskDates", () => {
    const parsed = parseMcpEditPlanOps({
      ops: [
        {
          type: "setTaskDates",
          taskId: TASK_A,
          start: "2026-05-01",
          end: "2026-05-03",
        },
      ],
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.ops).toEqual([
        {
          type: "setTaskDates",
          taskId: TASK_A,
          start: "2026-05-01",
          end: "2026-05-03",
        },
      ]);
    }
  });

  it("rejects empty ops", () => {
    expect(parseMcpEditPlanOps({ ops: [] }).ok).toBe(false);
  });

  it("rejects unknown op type", () => {
    expect(
      parseMcpEditPlanOps({ ops: [{ type: "paintTask", taskId: TASK_A }] }).ok,
    ).toBe(false);
  });
});

describe("tryMcpSetTaskDates", () => {
  it("updates dates when valid", () => {
    const doc = documentFromCategories(baseCategories());
    const result = tryMcpSetTaskDates(doc, TASK_A, "2026-05-01", "2026-05-05");
    expect(result.ok).toBe(true);
    if (result.ok) {
      const updated = result.document.categories[0].groups[0].tasks[0];
      expect(updated.start).toBe("2026-05-01");
      expect(updated.end).toBe("2026-05-05");
    }
  });

  it("rejects end before start", () => {
    const doc = documentFromCategories(baseCategories());
    expect(tryMcpSetTaskDates(doc, TASK_A, "2026-05-05", "2026-05-01").ok).toBe(
      false,
    );
  });
});

describe("tryMcpSetAssigneeIds", () => {
  it("sets assignee ids", () => {
    const doc = documentFromCategories(baseCategories());
    const result = tryMcpSetAssigneeIds(doc, TASK_A, [MEMBER_1]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.document.categories[0].groups[0].tasks[0].assigneeIds).toEqual([
        MEMBER_1,
      ]);
    }
  });
});

describe("tryMcpSetPredecessors", () => {
  it("sets predecessors without self id in list", () => {
    const doc = documentFromCategories(baseCategories());
    const result = tryMcpSetPredecessors(doc, TASK_B, [TASK_A, TASK_B]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("自分自身を先行に指定できません");
    }
  });

  it("rejects self as predecessor", () => {
    const doc = documentFromCategories(baseCategories());
    const result = tryMcpSetPredecessors(doc, TASK_A, [TASK_A]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("自分自身を先行に指定できません");
    }
  });

  it("rejects missing predecessor", () => {
    const doc = documentFromCategories(baseCategories());
    expect(
      tryMcpSetPredecessors(doc, TASK_A, ["00000000-0000-4000-8000-000000000099"])
        .ok,
    ).toBe(false);
  });
});

describe("tryMcpMoveTaskInCategories", () => {
  it("moves task within group", () => {
    const categories = baseCategories();
    const result = tryMcpMoveTaskInCategories(
      categories,
      visibleRows,
      TASK_A,
      GRP_A,
      1,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      const ids = result.document.categories[0].groups[0].tasks.map((t) => t.id);
      expect(ids).toEqual([TASK_B, TASK_A]);
    }
  });

  it("leaves document unchanged when insert index is invalid", () => {
    const categories = baseCategories();
    const result = tryMcpMoveTaskInCategories(
      categories,
      visibleRows,
      TASK_A,
      GRP_A,
      5,
    );
    expect(result.ok).toBe(false);
  });
});

describe("applyMcpEditPlanOps", () => {
  it("applies multiple ops in order", () => {
    const doc = documentFromCategories(baseCategories());
    const result = applyMcpEditPlanOps(
      doc,
      [
        {
          type: "setTaskDates",
          taskId: TASK_A,
          start: "2026-06-01",
          end: "2026-06-02",
        },
        { type: "setAssigneeIds", taskId: TASK_A, assigneeIds: [MEMBER_1] },
      ],
      visibleRows,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      const t = result.document.categories[0].groups[0].tasks[0];
      expect(t.start).toBe("2026-06-01");
      expect(t.assigneeIds).toEqual([MEMBER_1]);
    }
  });

  it("stops on first failure", () => {
    const doc = documentFromCategories(baseCategories());
    const result = applyMcpEditPlanOps(
      doc,
      [
        {
          type: "setTaskDates",
          taskId: TASK_A,
          start: "2026-06-02",
          end: "2026-06-01",
        },
        { type: "setAssigneeIds", taskId: TASK_A, assigneeIds: [MEMBER_1] },
      ],
      visibleRows,
    );
    expect(result.ok).toBe(false);
    expect(doc.categories[0].groups[0].tasks[0].assigneeIds).toEqual([]);
  });

  it("moveTask uses outline when levels argument is undefined", () => {
    const teamB = "65283a8a-3e6d-4fa4-8751-c1d4e1e4c89c";
    const review = "b1000001-0000-4000-8000-000000000003";
    const tanaka = "b1000001-0000-4000-8000-000000000001";
    const heading = "c2000001-0000-4000-8000-000000000001";
    const doc: ScheduleDocument = {
      schemaVersion: 8,
      title: "outline",
      milestones: [],
      milestoneGroups: [],
      categories: [],
      levels: [
        { name: "カテゴリ", meaning: "上" },
        { name: "チーム", meaning: "中" },
        { name: "タスク", meaning: "作業" },
      ],
      outline: [
        {
          id: heading,
          name: "要件定義",
          children: [
            {
              id: teamB,
              name: "チームB",
              children: [
                task(tanaka, { name: "ヒアリング" }),
                task(review, { name: "レビュー" }),
              ],
            },
          ],
        },
      ],
    };
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
      fieldFilters: {},
    };
    const visibleRows = computeVisibleRows(
      doc.categories,
      filters,
      new Set(),
      "2026-09-01",
      null,
      undefined,
      null,
      undefined,
      {
        levels: doc.levels ?? null,
        outline: doc.outline,
        useLegacyCategoryRows: false,
        levelCount: doc.levels?.length ?? 0,
      },
    );
    const result = applyMcpEditPlanOps(
      doc,
      [
        {
          type: "moveTask",
          taskId: review,
          targetGroupId: teamB,
          insertIndex: 0,
        },
      ],
      visibleRows,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    function taskIdsInBranch(
      nodes: NonNullable<ScheduleDocument["outline"]>,
      branchId: string,
    ): string[] {
      for (const node of nodes) {
        if (!("children" in node)) continue;
        if (node.id === branchId) {
          return node.children
            .filter((c): c is Task => "start" in c)
            .map((t) => t.id);
        }
        const nested = taskIdsInBranch(node.children, branchId);
        if (nested.length > 0) return nested;
      }
      return [];
    }
    const order = taskIdsInBranch(result.document.outline ?? [], teamB);
    expect(order).toEqual([review, tanaka]);
  });

  it("rejects outline moveTask when insert index is out of range", () => {
    const teamB = "65283a8a-3e6d-4fa4-8751-c1d4e1e4c89c";
    const review = "b1000001-0000-4000-8000-000000000003";
    const tanaka = "b1000001-0000-4000-8000-000000000001";
    const heading = "c2000001-0000-4000-8000-000000000001";
    const doc: ScheduleDocument = {
      schemaVersion: 8,
      title: "outline",
      milestones: [],
      milestoneGroups: [],
      categories: [],
      levels: [
        { name: "カテゴリ", meaning: "上" },
        { name: "チーム", meaning: "中" },
        { name: "タスク", meaning: "作業" },
      ],
      outline: [
        {
          id: heading,
          name: "要件定義",
          children: [
            {
              id: teamB,
              name: "チームB",
              children: [
                task(tanaka, { name: "ヒアリング" }),
                task(review, { name: "レビュー" }),
              ],
            },
          ],
        },
      ],
    };
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
      fieldFilters: {},
    };
    const visibleRows = computeVisibleRows(
      doc.categories,
      filters,
      new Set(),
      "2026-09-01",
      null,
      undefined,
      null,
      undefined,
      {
        levels: doc.levels ?? null,
        outline: doc.outline,
        useLegacyCategoryRows: false,
        levelCount: doc.levels?.length ?? 0,
      },
    );
    const result = applyMcpEditPlanOps(
      doc,
      [
        {
          type: "moveTask",
          taskId: review,
          targetGroupId: teamB,
          insertIndex: 99,
        },
      ],
      visibleRows,
    );
    expect(result.ok).toBe(false);
  });

  it("setTaskDates updates outline task when levels argument is undefined", () => {
    const taskId = "b1000001-0000-4000-8000-000000000002";
    const doc: ScheduleDocument = {
      schemaVersion: 8,
      title: "playground",
      milestones: [],
      milestoneGroups: [],
      categories: [],
      levels: [
        { name: "カテゴリ", meaning: "上" },
        { name: "チーム", meaning: "中" },
        { name: "タスク", meaning: "作業" },
      ],
      outline: [
        {
          id: "c2000001-0000-4000-8000-000000000001",
          name: "要件定義",
          children: [
            {
              id: "7f8b123f-a000-4e09-88b5-fa2bb024ee15",
              name: "チームA",
              children: [task(taskId, { start: "2026-09-18", end: "2026-09-21" })],
            },
          ],
        },
      ],
    };
    const result = applyMcpEditPlanOps(
      doc,
      [
        {
          type: "setTaskDates",
          taskId,
          start: "2026-09-01",
          end: "2026-09-05",
        },
      ],
      [],
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const updated = findTaskInDocument(
      result.document.categories,
      result.document.outline,
      taskId,
    );
    expect(updated?.start).toBe("2026-09-01");
  });

  it("moveTask reorders playground outline task to sibling index 0", () => {
    const text = readFileSync(
      join(import.meta.dirname, "../../examples/playground.schedule.json"),
      "utf8",
    );
    const parsed = parseScheduleText(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const doc = parsed.document;
    const review = "b1000001-0000-4000-8000-000000000003";
    const parentB = "65283a8a-3e6d-4fa4-8751-c1d4e1e4c89c";
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
      fieldFilters: {},
    };
    const visibleRows = computeVisibleRows(
      doc.categories,
      filters,
      new Set(["c2000001-0000-4000-8000-000000000001"]),
      "2026-09-01",
      null,
      undefined,
      null,
      undefined,
      {
        levels: doc.levels ?? null,
        outline: doc.outline,
        useLegacyCategoryRows: false,
        levelCount: doc.levels?.length ?? 0,
      },
    );
    const result = applyMcpEditPlanOps(
      doc,
      [
        {
          type: "moveTask",
          taskId: review,
          targetGroupId: parentB,
          insertIndex: 0,
        },
      ],
      visibleRows,
    );
    expect(result.ok).toBe(true);
  });

  it("moveTask after setTaskDates on playground outline", () => {
    const text = readFileSync(
      join(import.meta.dirname, "../../examples/playground.schedule.json"),
      "utf8",
    );
    const parsed = parseScheduleText(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    let doc = parsed.document;
    const taskId = "b1000001-0000-4000-8000-000000000002";
    const review = "b1000001-0000-4000-8000-000000000003";
    const parentB = "65283a8a-3e6d-4fa4-8751-c1d4e1e4c89c";
    const dates = tryMcpSetTaskDates(doc, taskId, "2026-09-01", "2026-09-05");
    expect(dates.ok).toBe(true);
    if (dates.ok) doc = dates.document;
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
      fieldFilters: {},
    };
    const visibleRows = computeVisibleRows(
      doc.categories,
      filters,
      new Set(["c2000001-0000-4000-8000-000000000001"]),
      "2026-09-01",
      null,
      undefined,
      null,
      undefined,
      {
        levels: doc.levels ?? null,
        outline: doc.outline,
        useLegacyCategoryRows: false,
        levelCount: doc.levels?.length ?? 0,
      },
    );
    const result = applyMcpEditPlanOps(
      doc,
      [
        {
          type: "moveTask",
          taskId: review,
          targetGroupId: parentB,
          insertIndex: 0,
        },
      ],
      visibleRows,
    );
    expect(result.ok).toBe(true);
  });

  it("deleteTask removes playground outline task when categories are empty", () => {
    const text = readFileSync(
      join(import.meta.dirname, "../../examples/playground.schedule.json"),
      "utf8",
    );
    const parsed = parseScheduleText(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const doc = { ...parsed.document, categories: [] };
    const target = "b1000001-0000-4000-8000-000000000001";
    const result = applyMcpEditPlanOps(
      doc,
      [{ type: "deleteTask", taskId: target }],
      [],
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      findTaskInDocument(result.document.categories, result.document.outline, target),
    ).toBeNull();
  });

  it("scheduleDocumentForMcpEditPlan clears categories on outline playground", () => {
    const doc = loadPlaygroundDocument();
    const withCategories: ScheduleDocument = {
      ...doc,
      categories: baseCategories(),
    };
    const normalized = scheduleDocumentForMcpEditPlan(
      documentToJsonString(withCategories),
    );
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) return;
    expect(normalized.document.categories).toEqual([]);
    expect(
      findTaskInDocument(
        normalized.document.categories,
        normalized.document.outline,
        "b1000001-0000-4000-8000-000000000003",
      ),
    ).not.toBeNull();
  });

  it("deleteTask on playground review task after e2e-like preamble uses normalized document", () => {
    const taskId = "b1000001-0000-4000-8000-000000000002";
    const review = "b1000001-0000-4000-8000-000000000003";
    let doc = loadPlaygroundDocument();
    const dates = applyMcpEditPlanOps(
      doc,
      [
        {
          type: "setTaskDates",
          taskId,
          start: "2026-09-01",
          end: "2026-09-05",
        },
      ],
      [],
    );
    expect(dates.ok).toBe(true);
    if (!dates.ok) return;
    doc = documentViaMcpEditPlanNormalization(dates.document);
    const deleted = applyMcpEditPlanOps(
      doc,
      [{ type: "deleteTask", taskId: review }],
      [],
    );
    expect(deleted.ok).toBe(true);
    if (!deleted.ok) return;
    expect(
      findTaskInDocument(
        deleted.document.categories,
        deleted.document.outline,
        review,
      ),
    ).toBeNull();
  });

  it("moveTask on playground review task after e2e-like preamble uses normalized document", () => {
    const taskId = "b1000001-0000-4000-8000-000000000002";
    const review = "b1000001-0000-4000-8000-000000000003";
    const parentB = "65283a8a-3e6d-4fa4-8751-c1d4e1e4c89c";
    let doc = loadPlaygroundDocument();
    const dates = applyMcpEditPlanOps(
      doc,
      [
        {
          type: "setTaskDates",
          taskId,
          start: "2026-09-01",
          end: "2026-09-05",
        },
      ],
      [],
    );
    expect(dates.ok).toBe(true);
    if (!dates.ok) return;
    doc = documentViaMcpEditPlanNormalization(dates.document);
    const moved = applyMcpEditPlanOps(
      doc,
      [
        {
          type: "moveTask",
          taskId: review,
          targetGroupId: parentB,
          insertIndex: 0,
        },
      ],
      playgroundVisibleRows(doc),
    );
    expect(moved.ok).toBe(true);
  });

  it("keeps review task through e2e plan preamble and snapshot getDocument", () => {
    const taskId = "b1000001-0000-4000-8000-000000000002";
    const review = "b1000001-0000-4000-8000-000000000003";
    const parentB = "65283a8a-3e6d-4fa4-8751-c1d4e1e4c89c";

    function snapshotFromDocument(doc: ScheduleDocument): DocumentSnapshot {
      return {
        title: doc.title,
        categories: cloneCategories(doc.categories ?? []),
        milestoneGroups: doc.milestoneGroups.map((group) => ({ ...group })),
        milestones: doc.milestones.map((milestone) => ({ ...milestone })),
        connections: cloneConnections(doc.connections),
        levels: doc.levels?.map((level) => ({ ...level })),
        outline:
          doc.outline != null ? cloneOutlineRoot(doc.outline) : undefined,
      };
    }

    function snapshotToDocument(snapshot: DocumentSnapshot): ScheduleDocument {
      return {
        schemaVersion: SCHEDULE_SCHEMA_VERSION,
        title: snapshot.title,
        categories: snapshot.categories,
        milestoneGroups: snapshot.milestoneGroups,
        milestones: snapshot.milestones,
        levels: snapshot.levels,
        outline: snapshot.outline,
        connections: snapshot.connections,
      };
    }

    function getDocumentLikeApp(snapshot: DocumentSnapshot): ScheduleDocument {
      return coerceOutlineStorageDocument(snapshotToDocument(snapshot));
    }

    function applyEditPlan(
      history: ReturnType<typeof createDocumentHistory>,
      current: DocumentSnapshot,
      ops: Parameters<typeof applyMcpEditPlanOps>[1],
    ): { history: ReturnType<typeof createDocumentHistory>; current: DocumentSnapshot } {
      const applied = applyMcpEditPlanOps(getDocumentLikeApp(current), ops, []);
      expect(applied.ok).toBe(true);
      if (!applied.ok) throw new Error(applied.message);
      const next = snapshotFromDocument(applied.document);
      const pushed = pushDocumentHistory(history, current, next);
      expect(pushed).not.toBeNull();
      if (!pushed?.applied) {
        return { history: pushed?.history ?? history, current };
      }
      return { history: pushed.history, current: pushed.applied };
    }

    let history = createDocumentHistory();
    let current = snapshotFromDocument(loadPlaygroundDocument());

    ({ history, current } = applyEditPlan(history, current, [
      {
        type: "setTaskDates",
        taskId,
        start: "2026-09-01",
        end: "2026-09-05",
      },
    ]));
    let undone = undoDocumentHistory(history, current);
    expect(undone).not.toBeNull();
    if (!undone) return;
    history = undone.history;
    current = undone.snapshot;

    let redone = redoDocumentHistory(history, current);
    expect(redone).not.toBeNull();
    if (!redone) return;
    history = redone.history;
    current = redone.snapshot;

    ({ history, current } = applyEditPlan(history, current, [
      { type: "setAssigneeIds", taskId, assigneeIds: ["suzuki"] },
    ]));
    undone = undoDocumentHistory(history, current);
    expect(undone).not.toBeNull();
    if (!undone) return;
    history = undone.history;
    current = undone.snapshot;

    ({ history, current } = applyEditPlan(history, current, [
      { type: "setPredecessors", taskId, predecessors: [] },
    ]));
    undone = undoDocumentHistory(history, current);
    expect(undone).not.toBeNull();
    if (!undone) return;
    current = undone.snapshot;

    const beforeDelete = getDocumentLikeApp(current);
    expect(
      findTaskInDocument([], beforeDelete.outline, review),
    ).not.toBeNull();
    const beforeDeleteCloned = cloneDocumentForMcpEditPlan(beforeDelete);
    expect(
      findTaskInDocument([], beforeDeleteCloned.outline, review),
    ).not.toBeNull();

    const deleted = applyMcpEditPlanOps(
      beforeDelete,
      [{ type: "deleteTask", taskId: review }],
      [],
    );
    expect(deleted.ok).toBe(true);

    const moved = applyMcpEditPlanOps(
      beforeDelete,
      [
        {
          type: "moveTask",
          taskId: review,
          targetGroupId: parentB,
          insertIndex: 0,
        },
      ],
      playgroundVisibleRows(beforeDelete),
    );
    expect(moved.ok).toBe(true);

    const invalid = applyMcpEditPlanOps(
      beforeDelete,
      [
        {
          type: "moveTask",
          taskId: review,
          targetGroupId: parentB,
          insertIndex: 99,
        },
      ],
      playgroundVisibleRows(beforeDelete),
    );
    expect(invalid.ok).toBe(false);
    if (invalid.ok) return;
    expect(invalid.message).toBe("置けない位置です。");
  });

  it("deleteTask after preamble survives scheduleDocumentForMcpEditPlan roundtrip", () => {
    const taskId = "b1000001-0000-4000-8000-000000000002";
    const review = "b1000001-0000-4000-8000-000000000003";

    function snapshotFromDocument(doc: ScheduleDocument): DocumentSnapshot {
      return {
        title: doc.title,
        categories: cloneCategories(doc.categories ?? []),
        milestoneGroups: doc.milestoneGroups.map((group) => ({ ...group })),
        milestones: doc.milestones.map((milestone) => ({ ...milestone })),
        connections: cloneConnections(doc.connections),
        levels: doc.levels?.map((level) => ({ ...level })),
        outline:
          doc.outline != null ? cloneOutlineRoot(doc.outline) : undefined,
      };
    }

    function snapshotToDocument(snapshot: DocumentSnapshot): ScheduleDocument {
      return {
        schemaVersion: SCHEDULE_SCHEMA_VERSION,
        title: snapshot.title,
        categories: snapshot.categories,
        milestoneGroups: snapshot.milestoneGroups,
        milestones: snapshot.milestones,
        levels: snapshot.levels,
        outline: snapshot.outline,
        connections: snapshot.connections,
      };
    }

    function applyEditPlan(
      history: ReturnType<typeof createDocumentHistory>,
      current: DocumentSnapshot,
      ops: Parameters<typeof applyMcpEditPlanOps>[1],
    ): { history: ReturnType<typeof createDocumentHistory>; current: DocumentSnapshot } {
      const applied = applyMcpEditPlanOps(
        coerceOutlineStorageDocument(snapshotToDocument(current)),
        ops,
        [],
      );
      expect(applied.ok).toBe(true);
      if (!applied.ok) throw new Error(applied.message);
      const next = snapshotFromDocument(applied.document);
      const pushed = pushDocumentHistory(history, current, next);
      expect(pushed).not.toBeNull();
      if (!pushed?.applied) {
        return { history: pushed?.history ?? history, current };
      }
      return { history: pushed.history, current: pushed.applied };
    }

    let history = createDocumentHistory();
    let current = snapshotFromDocument(loadPlaygroundDocument());

    ({ history, current } = applyEditPlan(history, current, [
      {
        type: "setTaskDates",
        taskId,
        start: "2026-09-01",
        end: "2026-09-05",
      },
    ]));
    let undone = undoDocumentHistory(history, current);
    expect(undone).not.toBeNull();
    if (!undone) return;
    history = undone.history;
    current = undone.snapshot;

    let redone = redoDocumentHistory(history, current);
    expect(redone).not.toBeNull();
    if (!redone) return;
    history = redone.history;
    current = redone.snapshot;

    ({ history, current } = applyEditPlan(history, current, [
      { type: "setAssigneeIds", taskId, assigneeIds: ["suzuki"] },
    ]));
    undone = undoDocumentHistory(history, current);
    expect(undone).not.toBeNull();
    if (!undone) return;
    history = undone.history;
    current = undone.snapshot;

    ({ history, current } = applyEditPlan(history, current, [
      { type: "setPredecessors", taskId, predecessors: [] },
    ]));
    undone = undoDocumentHistory(history, current);
    expect(undone).not.toBeNull();
    if (!undone) return;
    current = undone.snapshot;

    const roundtrip = scheduleDocumentForMcpEditPlan(
      documentToJsonString(snapshotToDocument(current)),
    );
    expect(roundtrip.ok).toBe(true);
    if (!roundtrip.ok) return;
    expect(
      findTaskInDocument(
        roundtrip.document.categories,
        roundtrip.document.outline,
        review,
      ),
    ).not.toBeNull();
    const deleted = applyMcpEditPlanOps(
      roundtrip.document,
      [{ type: "deleteTask", taskId: review }],
      [],
    );
    expect(deleted.ok).toBe(true);
  });
});
