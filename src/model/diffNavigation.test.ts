import { describe, expect, it } from "vitest";
import { collectScheduleDiffEntries } from "./scheduleDiff";
import { resolveDiffNavigation, type DiffNavigationContext } from "./diffNavigation";
import { computeVisibleRows } from "./rows";
import type { Category, ScheduleDocument, Task } from "./types";
import { SCHEDULE_SCHEMA_VERSION } from "./types";
import { defaultScheduleFilterViewState } from "./scheduleFilterPersistence";
import { collapsedSetFromIds } from "./scheduleFilterPersistence";

const TASK_A = "00000000-0000-4000-8000-00000000000a";
const CAT_A = "c1000001-0000-4000-8000-000000000001";
const GRP_A = "d1000001-0000-4000-8000-000000000001";

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

function doc(categories: Category[], title = "計画"): ScheduleDocument {
  return {
    schemaVersion: SCHEDULE_SCHEMA_VERSION,
    title,
    milestoneGroups: [],
    milestones: [],
    categories,
  };
}

function design(tasks: Task[]): Category[] {
  return [{ id: CAT_A, name: "設計", groups: [{ id: GRP_A, name: "上流", tasks }] }];
}

function baseContext(
  screen: ScheduleDocument,
  overrides: Partial<DiffNavigationContext> = {},
): DiffNavigationContext {
  const filters = defaultScheduleFilterViewState().filters;
  const collapsed = new Set<string>();
  const visibleRows = computeVisibleRows(
    screen.categories,
    filters,
    collapsed,
    "2026-04-01",
    null,
  );
  return {
    visibleRows,
    categories: screen.categories,
    collapsed,
    filters,
    today: "2026-04-01",
    memberMap: null,
    lineageIds: null,
    hiddenMilestoneGroupIds: new Set(),
    milestones: screen.milestones,
    scrollY: 0,
    rowHeight: 32,
    bodyHeight: 320,
    dateToX: () => 0,
    pxPerDay: 10,
    taskBarWidthPx: () => 100,
    ...overrides,
  };
}

describe("resolveDiffNavigation", () => {
  it("reveals a changed task on screen", () => {
    const file = doc(design([task({ id: TASK_A, name: "基本設計" })]));
    const screen = doc(
      design([
        task({
          id: TASK_A,
          name: "基本設計",
          start: "2026-04-08",
          end: "2026-04-17",
        }),
      ]),
    );
    const [entry] = collectScheduleDiffEntries(screen, file);
    const outcome = resolveDiffNavigation(entry, baseContext(screen));
    expect(outcome.status).toBe("ok");
    if (outcome.status === "ok") {
      expect(outcome.reveal.kind).toBe("task");
      expect(outcome.mark.sidebar).toEqual({ type: "task", id: TASK_A });
    }
  });

  it("blocks a task hidden by collapse", () => {
    const file = doc(design([task({ id: TASK_A, name: "基本設計" })]));
    const screen = doc(
      design([
        task({
          id: TASK_A,
          name: "基本設計",
          start: "2026-04-08",
          end: "2026-04-17",
        }),
      ]),
    );
    const [entry] = collectScheduleDiffEntries(screen, file);
    const collapsed = collapsedSetFromIds([CAT_A], []);
    const outcome = resolveDiffNavigation(
      entry,
      baseContext(screen, {
        collapsed,
        visibleRows: computeVisibleRows(
          screen.categories,
          defaultScheduleFilterViewState().filters,
          collapsed,
          "2026-04-01",
          null,
        ),
      }),
    );
    expect(outcome).toEqual({
      status: "blocked",
      message: "折りたたみで隠れています",
    });
  });

  it("reveals the parent group for a deleted task", () => {
    const file = doc(design([task({ id: TASK_A, name: "基本設計" })]));
    const screen = doc(design([]));
    const entries = collectScheduleDiffEntries(screen, file);
    const deleted = entries.find((entry) => entry.nav.kind === "deleteTask");
    expect(deleted).toBeDefined();
    const outcome = resolveDiffNavigation(deleted!, baseContext(screen));
    expect(outcome.status).toBe("ok");
    if (outcome.status === "ok") {
      expect(outcome.reveal.kind).toBe("group");
      expect(outcome.mark.sidebar).toEqual({ type: "group", id: GRP_A });
    }
  });

  it("blocks order rows from navigation", () => {
    const first = task({ id: TASK_A, name: "A" });
    const second = task({ id: "00000000-0000-4000-8000-00000000000b", name: "B" });
    const file = doc(design([first, second]));
    const screen = doc(design([second, first]));
    const orderEntry = collectScheduleDiffEntries(screen, file).find(
      (entry) => entry.nav.kind === "order",
    );
    expect(orderEntry).toBeDefined();
    const outcome = resolveDiffNavigation(orderEntry!, baseContext(screen));
    expect(outcome.status).toBe("blocked");
  });

  it("reveals an added task", () => {
    const file = doc(design([]));
    const screen = doc(design([task({ id: TASK_A, name: "新規" })]));
    const added = collectScheduleDiffEntries(screen, file).find(
      (entry) => entry.nav.kind === "task",
    );
    expect(added).toBeDefined();
    const outcome = resolveDiffNavigation(added!, baseContext(screen));
    expect(outcome.status).toBe("ok");
    if (outcome.status === "ok") {
      expect(outcome.reveal.kind).toBe("task");
    }
  });

  it("blocks a task hidden by filter", () => {
    const file = doc(design([task({ id: TASK_A, name: "基本設計" })]));
    const screen = doc(
      design([
        task({
          id: TASK_A,
          name: "基本設計",
          status: "done" as const,
        }),
      ]),
    );
    const [entry] = collectScheduleDiffEntries(screen, file);
    const filters = {
      ...defaultScheduleFilterViewState().filters,
      status: "not-started" as const,
    };
    const outcome = resolveDiffNavigation(
      entry,
      baseContext(screen, {
        filters,
        visibleRows: computeVisibleRows(
          screen.categories,
          filters,
          new Set(),
          "2026-04-01",
          null,
        ),
      }),
    );
    expect(outcome).toEqual({
      status: "blocked",
      message: "絞り込みで出ていません",
    });
  });

  it("keeps scrollY when the task row is already visible", () => {
    const file = doc(design([task({ id: TASK_A, name: "基本設計" })]));
    const screen = doc(
      design([
        task({
          id: TASK_A,
          name: "基本設計",
          start: "2026-04-08",
          end: "2026-04-17",
        }),
      ]),
    );
    const [entry] = collectScheduleDiffEntries(screen, file);
    const outcome = resolveDiffNavigation(
      entry,
      baseContext(screen, { scrollY: 0 }),
    );
    expect(outcome.status).toBe("ok");
    if (outcome.status === "ok" && outcome.reveal.kind === "task") {
      expect(outcome.reveal.scrollY).toBe(0);
    }
    const scrolled = resolveDiffNavigation(
      entry,
      baseContext(screen, { scrollY: 200 }),
    );
    expect(scrolled.status).toBe("ok");
    if (scrolled.status === "ok" && scrolled.reveal.kind === "task") {
      expect(scrolled.reveal.scrollY).not.toBe(200);
    }
  });

  it("blocks milestone group navigation when the band line is off", () => {
    const groupId = "g1000001-0000-4000-8000-000000000001";
    const screen = doc(design([]));
    screen.milestoneGroups = [{ id: groupId, name: "リリース" }];
    screen.milestones = [
      {
        id: "m1000001-0000-4000-8000-000000000001",
        name: "GA",
        date: "2026-05-01",
        confidence: "committed",
        groupId,
      },
    ];
    const file = doc(design([]));
    file.milestoneGroups = [{ id: groupId, name: "旧" }];
    file.milestones = [];
    const entry = collectScheduleDiffEntries(screen, file).find(
      (entry) => entry.nav.kind === "milestoneGroup",
    );
    expect(entry).toBeDefined();
    const outcome = resolveDiffNavigation(
      entry!,
      baseContext(screen, {
        milestones: screen.milestones,
        hiddenMilestoneGroupIds: new Set([groupId]),
      }),
    );
    expect(outcome).toEqual({
      status: "blocked",
      message: "帯の線がオフ",
    });
  });

  it("blocks deleted milestone navigation when the band is gone", () => {
    const groupId = "g1000001-0000-4000-8000-000000000001";
    const milestoneId = "m1000001-0000-4000-8000-000000000001";
    const file = doc(design([]));
    file.milestoneGroups = [{ id: groupId, name: "リリース" }];
    file.milestones = [
      {
        id: milestoneId,
        name: "GA",
        date: "2026-05-01",
        confidence: "committed",
        groupId,
      },
    ];
    const screen = doc(design([]));
    const deleted = collectScheduleDiffEntries(screen, file).find(
      (entry) => entry.nav.kind === "deleteMilestone",
    );
    expect(deleted).toBeDefined();
    const outcome = resolveDiffNavigation(deleted!, baseContext(screen));
    expect(outcome).toEqual({
      status: "blocked",
      message: "画面には無い",
    });
  });

  it("marks title changes", () => {
    const file = doc(design([task({ id: TASK_A, name: "A" })]), "旧");
    const screen = doc(design([task({ id: TASK_A, name: "A" })]), "新");
    const titleEntry = collectScheduleDiffEntries(screen, file).find(
      (entry) => entry.nav.kind === "title",
    );
    expect(titleEntry).toBeDefined();
    const outcome = resolveDiffNavigation(titleEntry!, baseContext(screen));
    expect(outcome.status).toBe("ok");
    if (outcome.status === "ok") {
      expect(outcome.reveal.kind).toBe("title");
      expect(outcome.mark.title).toBe(true);
    }
  });
});
