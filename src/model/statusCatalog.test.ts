import { describe, expect, it } from "vitest";
import {
  BUILTIN_STATUS_ITEMS,
  BUILTIN_STATUSES,
  defaultStatusId,
  isDoneStatus,
  labelColorOn,
  NEUTRAL_STATUS_COLOR,
  statusColorFor,
  statusLabel,
  type StatusItem,
} from "./statusCatalog";
import { validateStatuses } from "./validateStatuses";
import {
  barColors,
  barLabelFill,
  isOverdue,
  lightningDate,
} from "./timeline";
import { paletteFor } from "./palette";
import { computeVisibleRows, relaxFiltersForNewTask, taskMatchesFilter } from "./rows";
import { DEFAULT_FILTERS } from "./filterChips";
import type { Task } from "./types";

const review: StatusItem = {
  id: "review",
  name: "確認待ち",
  color: {
    light: { bg: "#FFF3C4", border: "#B58900" },
    dark: { bg: "#4a4020", border: "#d9b43a" },
  },
  role: "started",
  description: "作業は終わり、確認を待っている。",
};
const shipped: StatusItem = {
  id: "shipped",
  name: "出荷済み",
  color: {
    light: { bg: "#D6F0E0", border: "#2f7d57" },
    dark: { bg: "#254434", border: "#5fbf8f" },
  },
  role: "done",
  description: "出荷した。",
};
const parked: StatusItem = {
  id: "parked",
  name: "保留",
  color: {
    light: { bg: "#E2E6ED", border: "#7d8799" },
    dark: { bg: "#454b5c", border: "#8a94a6" },
  },
  role: "unmanaged",
  description: "進捗を追わない。",
};
const custom = [...BUILTIN_STATUS_ITEMS, review, shipped, parked];

function task(
  status: string,
  end = "2026-01-05",
  start = "2026-01-01",
  progress = 0,
): Task {
  return {
    id: `t-${status}-${end}`,
    name: status,
    start,
    end,
    assigneeId: null,
    status,
    progress,
    confidence: "committed",
    predecessors: [],
    milestoneId: null,
  };
}

describe("built-in statuses", () => {
  it("keeps the ids and roles of the old three values", () => {
    expect(BUILTIN_STATUS_ITEMS.map((s) => [s.id, s.role])).toEqual([
      ["not-started", "not-started"],
      ["in-progress", "started"],
      ["done", "done"],
    ]);
  });

  it("validates as a statuses document", () => {
    expect(validateStatuses(BUILTIN_STATUSES).ok).toBe(true);
  });
});

describe("status lookups", () => {
  it("shows the id of an unknown status and treats it as neutral", () => {
    expect(statusLabel(custom, "mystery")).toBe("mystery");
    expect(isDoneStatus(custom, "mystery")).toBe(false);
    expect(statusColorFor(custom, "mystery", "light")).toEqual(
      NEUTRAL_STATUS_COLOR.light,
    );
  });

  it("reads done from the item role", () => {
    expect(isDoneStatus(custom, "done")).toBe(true);
    expect(isDoneStatus(custom, "shipped")).toBe(true);
    expect(isDoneStatus(custom, "review")).toBe(false);
    expect(isDoneStatus(custom, "parked")).toBe(false);
  });

  it("picks not-started as the default, else the first non-done item", () => {
    expect(defaultStatusId(custom)).toBe("not-started");
    expect(defaultStatusId([shipped, review])).toBe("review");
    expect(defaultStatusId([shipped, parked])).toBe("parked");
    expect(defaultStatusId([shipped])).toBe("shipped");
  });

  it("picks the label color with the higher contrast", () => {
    expect(labelColorOn("#247A55", "#FFFFFF", "#1F2937")).toBe("#FFFFFF");
    expect(labelColorOn("#E2E6ED", "#FFFFFF", "#1F2937")).toBe("#1F2937");
  });
});

describe("overdue and bar colors", () => {
  const today = "2026-01-07";

  it("marks only not-started and started overdue after end", () => {
    expect(isOverdue(task("not-started"), today, custom)).toBe(true);
    expect(isOverdue(task("in-progress"), today, custom)).toBe(true);
    expect(isOverdue(task("review"), today, custom)).toBe(true);
    expect(isOverdue(task("mystery"), today, custom)).toBe(false);
    expect(isOverdue(task("done"), today, custom)).toBe(false);
    expect(isOverdue(task("shipped"), today, custom)).toBe(false);
    expect(isOverdue(task("parked"), today, custom)).toBe(false);
  });

  it("does not mark a task ending today overdue", () => {
    expect(isOverdue(task("review", today), today, custom)).toBe(false);
  });

  it("keeps the status fill when overdue and only reddens the border", () => {
    const chart = paletteFor("light").chart;
    const normal = barColors(task("review", "2026-01-09"), today, "light", custom);
    const late = barColors(task("review"), today, "light", custom);
    expect(late.bg).toBe(normal.bg);
    expect(late.fill).toBe(normal.fill);
    expect(normal.bg).toBe("#FFF3C4");
    expect(late.border).toBe(chart.overdueOther.border);
  });

  it("chooses a readable label color from the fill", () => {
    const chart = paletteFor("light").chart;
    expect(barLabelFill(task("done"), today, "light", custom)).toBe(
      chart.barLabelOnFill,
    );
    expect(barLabelFill(task("review"), today, "light", custom)).toBe(
      chart.barLabelMuted,
    );
  });
});

describe("lightning line", () => {
  const today = "2026-01-07";

  it("folds by role and period", () => {
    const before = { start: "2026-01-10", end: "2026-01-20" };
    const during = { start: "2026-01-01", end: "2026-01-10" };
    const after = { start: "2026-01-01", end: "2026-01-05" };

    expect(
      lightningDate({ ...task("not-started"), ...before }, today, custom),
    ).toBe(today);
    expect(
      lightningDate({ ...task("not-started"), ...during }, today, custom),
    ).toBe("2026-01-01");
    expect(
      lightningDate({ ...task("not-started"), ...after }, today, custom),
    ).toBe("2026-01-05");

    expect(lightningDate({ ...task("in-progress"), ...before }, today, custom)).toBe(
      "2026-01-10",
    );
    expect(lightningDate({ ...task("in-progress"), ...during }, today, custom)).toBe(
      today,
    );
    expect(lightningDate({ ...task("in-progress"), ...after }, today, custom)).toBe(
      "2026-01-05",
    );

    expect(lightningDate({ ...task("done"), ...before }, today, custom)).toBe(
      "2026-01-20",
    );
    expect(lightningDate({ ...task("done"), ...during }, today, custom)).toBe(
      "2026-01-10",
    );
    expect(lightningDate({ ...task("done"), ...after }, today, custom)).toBe(today);

    expect(lightningDate({ ...task("parked"), ...before }, today, custom)).toBe(
      today,
    );
    expect(lightningDate({ ...task("parked"), ...during }, today, custom)).toBe(
      today,
    );
    expect(lightningDate({ ...task("parked"), ...after }, today, custom)).toBe(
      today,
    );
  });

  it("keeps unknown ids at today in every period", () => {
    expect(lightningDate(task("mystery"), today, custom)).toBe(today);
    expect(
      lightningDate(
        { ...task("mystery"), start: "2026-01-10", end: "2026-01-20" },
        today,
        custom,
      ),
    ).toBe(today);
    expect(
      lightningDate(
        { ...task("mystery"), start: "2026-01-01", end: "2026-01-10" },
        today,
        custom,
      ),
    ).toBe(today);
  });

  it("ignores progress", () => {
    const t = task("in-progress");
    expect(lightningDate(t, today, custom)).toBe("2026-01-05");
    const withProgress = { ...t, progress: 10 } as typeof t & { progress: number };
    expect(lightningDate(withProgress, today, custom)).toBe("2026-01-05");
  });

  it("folds started tasks with a future start to the start date", () => {
    const future = { ...task("in-progress", "2026-02-01"), start: "2026-01-20" };
    expect(lightningDate(future, today, custom)).toBe("2026-01-20");
  });

  it("does not place lightning past end when end is today", () => {
    const base = { start: "2026-01-01", end: today };
    expect(
      lightningDate({ ...task("not-started", today), ...base }, today, custom),
    ).toBe("2026-01-01");
    expect(
      lightningDate({ ...task("in-progress", today), ...base }, today, custom),
    ).toBe(today);
    expect(lightningDate({ ...task("done", today), ...base }, today, custom)).toBe(
      today,
    );
    expect(
      lightningDate({ ...task("parked", today), ...base }, today, custom),
    ).toBe(today);
    expect(
      lightningDate({ ...task("mystery", today), ...base }, today, custom),
    ).toBe(today);
  });
});

describe("status filter", () => {
  const today = "2026-01-07";
  const filters = (status: string) => ({ ...DEFAULT_FILTERS, status });

  it("drops only done items for not-done", () => {
    expect(
      taskMatchesFilter(task("shipped"), filters("not-done"), today, null, undefined, null, custom),
    ).toBe(false);
    expect(
      taskMatchesFilter(task("parked"), filters("not-done"), today, null, undefined, null, custom),
    ).toBe(true);
    expect(
      taskMatchesFilter(task("review"), filters("not-done"), today, null, undefined, null, custom),
    ).toBe(true);
  });

  it("matches one id exactly", () => {
    expect(
      taskMatchesFilter(task("review"), filters("review"), today, null, undefined, null, custom),
    ).toBe(true);
    expect(
      taskMatchesFilter(task("done"), filters("review"), today, null, undefined, null, custom),
    ).toBe(false);
  });

  it("relaxes a status filter that hides a new task", () => {
    const relaxed = relaxFiltersForNewTask(
      filters("review"),
      task("not-started"),
      today,
      null,
      undefined,
      custom,
    );
    expect(relaxed.status).toBe("all");
  });

  it("computes visible rows with the catalog", () => {
    const categories = [
      {
        id: "c",
        name: "C",
        groups: [{ id: "g", name: "G", tasks: [task("shipped"), task("review")] }],
      },
    ];
    const rows = computeVisibleRows(
      categories,
      filters("not-done"),
      new Set(),
      today,
      null,
      32,
      null,
      custom,
    );
    expect(rows.filter((r) => r.type === "task")).toHaveLength(1);
  });
});

describe("validateStatuses", () => {
  it("rejects a duplicate id", () => {
    const result = validateStatuses({
      schemaVersion: 2,
      statuses: [BUILTIN_STATUS_ITEMS[0], BUILTIN_STATUS_ITEMS[0]],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a color that is not a 6 digit hex value", () => {
    const bad = {
      ...review,
      color: { ...review.color, light: { bg: "yellow", border: "#B58900" } },
    };
    expect(validateStatuses({ schemaVersion: 2, statuses: [bad] }).ok).toBe(false);
  });

  it("rejects an empty list and a missing description", () => {
    expect(validateStatuses({ schemaVersion: 2, statuses: [] }).ok).toBe(false);
    const noDescription: Record<string, unknown> = { ...review };
    delete noDescription.description;
    expect(
      validateStatuses({ schemaVersion: 2, statuses: [noDescription] }).ok,
    ).toBe(false);
  });
});
