import { describe, expect, it } from "vitest";
import { BUILTIN_STATUS_ITEMS } from "./statusCatalog";
import { updateStatusItem } from "./statusEdit";
import {
  createStatusCatalogEditHistory,
  pushStatusCatalogEditHistory,
  redoStatusCatalogEditHistory,
  selectedIndexForSnapshot,
  undoStatusCatalogEditHistory,
  type StatusCatalogEditSnapshot,
} from "./statusCatalogEditHistory";
import { HISTORY_MAX } from "./history";

function snapshot(
  items: typeof BUILTIN_STATUS_ITEMS,
  selectedId: string | null,
): StatusCatalogEditSnapshot {
  return {
    items: items.map((item) => ({
      ...item,
      color: {
        light: { ...item.color.light },
        dark: { ...item.color.dark },
      },
    })),
    selectedId,
  };
}

describe("statusCatalogEditHistory", () => {
  it("undoes one character at a time", () => {
    let history = createStatusCatalogEditHistory();
    let current = snapshot(BUILTIN_STATUS_ITEMS, "not-started");
    const step1 = updateStatusItem(current.items, 0, {
      description: `${current.items[0].description}a`,
    });
    let pushed = pushStatusCatalogEditHistory(
      history,
      current,
      snapshot(step1, "not-started"),
    );
    expect(pushed?.applied).not.toBeNull();
    history = pushed!.history;
    current = snapshot(step1, "not-started");

    const step2 = updateStatusItem(step1, 0, {
      description: `${step1[0].description}b`,
    });
    pushed = pushStatusCatalogEditHistory(
      history,
      current,
      snapshot(step2, "not-started"),
    );
    history = pushed!.history;
    current = snapshot(step2, "not-started");

    const undone = undoStatusCatalogEditHistory(history, current);
    expect(undone?.snapshot.items[0].description).toBe(step1[0].description);
    const undoneAgain = undoStatusCatalogEditHistory(
      undone!.history,
      undone!.snapshot,
    );
    expect(undoneAgain?.snapshot.items[0].description).toBe(
      BUILTIN_STATUS_ITEMS[0].description,
    );
  });

  it("coalesces identical snapshots", () => {
    const history = createStatusCatalogEditHistory();
    const current = snapshot(BUILTIN_STATUS_ITEMS, "not-started");
    const pushed = pushStatusCatalogEditHistory(history, current, current);
    expect(pushed?.applied).toBeNull();
    expect(pushed?.history.presentKey).not.toBeNull();
  });

  it("undoes a role change in one step", () => {
    let history = createStatusCatalogEditHistory();
    const current = snapshot(BUILTIN_STATUS_ITEMS, "in-progress");
    const nextItems = updateStatusItem(BUILTIN_STATUS_ITEMS, 1, {
      role: "done",
    });
    const pushed = pushStatusCatalogEditHistory(
      history,
      current,
      snapshot(nextItems, "in-progress"),
    );
    history = pushed!.history;
    const undone = undoStatusCatalogEditHistory(
      history,
      snapshot(nextItems, "in-progress"),
    );
    expect(undone?.snapshot.items[1].role).toBe("started");
  });

  it("clears redo after a new edit", () => {
    let history = createStatusCatalogEditHistory();
    let current = snapshot(BUILTIN_STATUS_ITEMS, "not-started");
    const edited = updateStatusItem(BUILTIN_STATUS_ITEMS, 0, { name: "A" });
    let pushed = pushStatusCatalogEditHistory(
      history,
      current,
      snapshot(edited, "not-started"),
    );
    history = pushed!.history;
    current = snapshot(edited, "not-started");
    const undone = undoStatusCatalogEditHistory(history, current);
    history = undone!.history;
    current = undone!.snapshot;

    const editedAgain = updateStatusItem(current.items, 0, { name: "B" });
    pushed = pushStatusCatalogEditHistory(
      history,
      current,
      snapshot(editedAgain, "not-started"),
    );
    expect(pushed!.history.future).toEqual([]);
  });

  it("drops the oldest entry past the max", () => {
    let history = createStatusCatalogEditHistory();
    let current = snapshot(BUILTIN_STATUS_ITEMS, "not-started");
    for (let i = 0; i < HISTORY_MAX + 5; i += 1) {
      const nextItems = updateStatusItem(current.items, 0, {
        name: `name-${i}`,
      });
      const pushed = pushStatusCatalogEditHistory(
        history,
        current,
        snapshot(nextItems, "not-started"),
      );
      history = pushed!.history;
      current = snapshot(nextItems, "not-started");
    }
    expect(history.past.length).toBe(HISTORY_MAX);
  });

  it("restores selection when undoing a delete", () => {
    let history = createStatusCatalogEditHistory();
    const items = [...BUILTIN_STATUS_ITEMS];
    const current = snapshot(items, "in-progress");
    const removed = items.filter((item) => item.id !== "in-progress");
    const pushed = pushStatusCatalogEditHistory(
      history,
      current,
      snapshot(removed, "not-started"),
    );
    history = pushed!.history;
    const undone = undoStatusCatalogEditHistory(
      history,
      snapshot(removed, "not-started"),
    );
    expect(undone?.snapshot.items.some((item) => item.id === "in-progress")).toBe(
      true,
    );
    expect(undone?.snapshot.selectedId).toBe("in-progress");
    expect(selectedIndexForSnapshot(undone!.snapshot)).toBe(1);
  });

  it("coalesces a color edit session into one undo step", () => {
    let history = createStatusCatalogEditHistory();
    const current = snapshot(BUILTIN_STATUS_ITEMS, "not-started");
    const mid = updateStatusItem(BUILTIN_STATUS_ITEMS, 0, {
      color: {
        light: { bg: "#111111", border: BUILTIN_STATUS_ITEMS[0].color.light.border },
      },
    });
    const final = updateStatusItem(mid, 0, {
      color: {
        light: { bg: "#222222", border: mid[0].color.light.border },
      },
    });
    const pushed = pushStatusCatalogEditHistory(
      history,
      current,
      snapshot(final, "not-started"),
    );
    history = pushed!.history;
    const undone = undoStatusCatalogEditHistory(history, snapshot(final, "not-started"));
    expect(undone?.snapshot.items[0].color.light.bg).toBe(
      BUILTIN_STATUS_ITEMS[0].color.light.bg,
    );
  });

  it("redoes after undo", () => {
    let history = createStatusCatalogEditHistory();
    const current = snapshot(BUILTIN_STATUS_ITEMS, "done");
    const edited = updateStatusItem(BUILTIN_STATUS_ITEMS, 2, { name: "完了済" });
    const pushed = pushStatusCatalogEditHistory(
      history,
      current,
      snapshot(edited, "done"),
    );
    history = pushed!.history;
    const undone = undoStatusCatalogEditHistory(
      history,
      snapshot(edited, "done"),
    );
    const redone = redoStatusCatalogEditHistory(
      undone!.history,
      undone!.snapshot,
    );
    expect(redone?.snapshot.items[2].name).toBe("完了済");
  });
});
