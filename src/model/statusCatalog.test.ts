import { describe, expect, it } from "vitest";
import {
  BUILTIN_STATUS_ITEMS,
  BUILTIN_STATUSES,
  defaultStatusId,
  isClosedStatus,
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
  closed: false,
  description: "作業は終わり、確認を待っている。",
};
const shipped: StatusItem = {
  id: "shipped",
  name: "出荷済み",
  color: {
    light: { bg: "#D6F0E0", border: "#2f7d57" },
    dark: { bg: "#254434", border: "#5fbf8f" },
  },
  closed: true,
  description: "出荷した。",
};
const custom = [...BUILTIN_STATUS_ITEMS, review, shipped];

function task(status: string, end = "2026-01-05", progress = 0): Task {
  return {
    id: `t-${status}`,
    name: status,
    start: "2026-01-01",
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
  it("keeps the ids and the closed flag of the old three values", () => {
    expect(BUILTIN_STATUS_ITEMS.map((s) => [s.id, s.closed])).toEqual([
      ["not-started", false],
      ["in-progress", false],
      ["done", true],
    ]);
  });

  it("validates as a statuses document", () => {
    expect(validateStatuses(BUILTIN_STATUSES).ok).toBe(true);
  });
});

describe("status lookups", () => {
  it("shows the id of an unknown status and treats it as open and neutral", () => {
    expect(statusLabel(custom, "mystery")).toBe("mystery");
    expect(isClosedStatus(custom, "mystery")).toBe(false);
    expect(statusColorFor(custom, "mystery", "light")).toEqual(
      NEUTRAL_STATUS_COLOR.light,
    );
  });

  it("reads closed from the item, so several items can be closed", () => {
    expect(isClosedStatus(custom, "done")).toBe(true);
    expect(isClosedStatus(custom, "shipped")).toBe(true);
    expect(isClosedStatus(custom, "review")).toBe(false);
  });

  it("picks not-started as the default, else the first open item", () => {
    expect(defaultStatusId(custom)).toBe("not-started");
    expect(defaultStatusId([shipped, review])).toBe("review");
    expect(defaultStatusId([shipped])).toBe("shipped");
  });

  it("picks the label color with the higher contrast", () => {
    expect(labelColorOn("#247A55", "#FFFFFF", "#1F2937")).toBe("#FFFFFF");
    expect(labelColorOn("#E2E6ED", "#FFFFFF", "#1F2937")).toBe("#1F2937");
  });
});

describe("overdue and bar colors", () => {
  const today = "2026-01-07";

  it("does not mark any closed item overdue", () => {
    expect(isOverdue(task("done"), today, custom)).toBe(false);
    expect(isOverdue(task("shipped"), today, custom)).toBe(false);
    expect(isOverdue(task("review"), today, custom)).toBe(true);
    expect(isOverdue(task("mystery"), today, custom)).toBe(true);
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

  it("uses the dark color of the item in the dark scheme", () => {
    expect(barColors(task("review", "2026-01-09"), today, "dark", custom).bg).toBe(
      "#4a4020",
    );
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

  it("goes to the end date of an overdue task and to today otherwise", () => {
    expect(lightningDate(task("review"), today, custom)).toBe("2026-01-05");
    expect(lightningDate(task("shipped"), today, custom)).toBe(today);
  });

  it("does not look at the status for a task that starts in the future", () => {
    const future = { ...task("in-progress", "2026-02-01"), start: "2026-01-20" };
    expect(lightningDate(future, today, custom)).toBe(today);
  });
});

describe("status filter", () => {
  const today = "2026-01-07";
  const filters = (status: string) => ({ ...DEFAULT_FILTERS, status });

  it("drops every closed item for not-done", () => {
    expect(taskMatchesFilter(task("shipped"), filters("not-done"), today, null, undefined, null, custom)).toBe(false);
    expect(taskMatchesFilter(task("review"), filters("not-done"), today, null, undefined, null, custom)).toBe(true);
  });

  it("matches one id exactly, including ids added to the list", () => {
    expect(taskMatchesFilter(task("review"), filters("review"), today, null, undefined, null, custom)).toBe(true);
    expect(taskMatchesFilter(task("done"), filters("review"), today, null, undefined, null, custom)).toBe(false);
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
      schemaVersion: 1,
      statuses: [BUILTIN_STATUS_ITEMS[0], BUILTIN_STATUS_ITEMS[0]],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a color that is not a 6 digit hex value", () => {
    const bad = {
      ...review,
      color: { ...review.color, light: { bg: "yellow", border: "#B58900" } },
    };
    expect(validateStatuses({ schemaVersion: 1, statuses: [bad] }).ok).toBe(false);
  });

  it("rejects an empty list and a missing description", () => {
    expect(validateStatuses({ schemaVersion: 1, statuses: [] }).ok).toBe(false);
    const noDescription: Record<string, unknown> = { ...review };
    delete noDescription.description;
    expect(
      validateStatuses({ schemaVersion: 1, statuses: [noDescription] }).ok,
    ).toBe(false);
  });
});
